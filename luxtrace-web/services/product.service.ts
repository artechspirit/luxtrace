import { productRepository } from '@/repositories/product.repository'
import { productLogRepository } from '@/repositories/product-log.repository'
import { batchRepository } from '@/repositories/batch.repository'
import { nfcService } from '@/services/nfc.service'
import { blockchainService } from '@/services/blockchain.service'
import type { Product, ProductBatchItem, ProductStatus } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export const productService = {
  async getAll(filters: { status?: ProductStatus; page: number; limit: number }) {
    return productRepository.findAll(filters)
  },

  async getById(productId: string): Promise<Product> {
    const product = await productRepository.findById(productId)
    if (!product) {
      throw Object.assign(new Error('Product not found'), { code: 'NOT_FOUND' })
    }
    return product
  },

  /**
   * Validate CSV items against DB for duplicate serials.
   * Returns array of duplicate serial numbers found in DB.
   */
  async checkDuplicateSerials(serials: string[]): Promise<string[]> {
    const duplicates: string[] = []
    // Check in parallel batches of 10
    const chunks = []
    for (let i = 0; i < serials.length; i += 10) {
      chunks.push(serials.slice(i, i + 10))
    }
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (serial) => {
          const existing = await productRepository.findBySerialNumber(serial)
          if (existing) duplicates.push(serial)
        })
      )
    }
    return duplicates
  },

  /**
   * Manufacturing Flow:
   * 1. Check DB duplicates
   * 2. Insert all as MANUFACTURED (sync)
   * 3. Persist batch record
   * 4. Process each item async: mint NFT → bind NFC → mark REGISTERED → log
   *
   * Returns immediately with batch_id for polling.
   */
  async batchManufacture(
    items: ProductBatchItem[],
    operatorId: string
  ): Promise<{
    batch_id: string
    status: 'PROCESSING'
    total_submitted: number
    estimated_seconds: number
  }> {
    // 1. Check DB duplicates
    const serials = items.map((i) => i.serial_number)
    const duplicates = await productService.checkDuplicateSerials(serials)

    if (duplicates.length > 0) {
      throw Object.assign(
        new Error(`Duplicate serial numbers found in database: ${duplicates.join(', ')}`),
        { code: 'DUPLICATE_SERIAL', duplicates }
      )
    }

    // 2. Insert all products as MANUFACTURED (atomic batch)
    const products = await productRepository.insertBatch(items)

    // Log MANUFACTURED for each
    await Promise.all(
      products.map((p) =>
        productLogRepository.insert({
          product_id: p.product_id,
          event: 'MANUFACTURED',
          actor_id: operatorId,
          actor_role: 'OPERATOR',
          metadata: { batch_id: 'pending', serial_number: p.serial_number },
        })
      )
    )

    // 3. Create persistent batch record
    const batchId = uuidv4()
    await batchRepository.create({
      batch_id: batchId,
      total_submitted: items.length,
      created_by: operatorId,
    })

    // 4. Fire-and-forget async processing
    void productService._processBatchAsync(batchId, products, items)

    return {
      batch_id: batchId,
      status: 'PROCESSING',
      total_submitted: items.length,
      estimated_seconds: items.length * 15, // Sepolia finality per item
    }
  },

  /**
   * Poll batch status — reads from persistent DB, not in-memory.
   */
  async getBatchStatus(batchId: string) {
    const batch = await batchRepository.findById(batchId)
    if (!batch) {
      throw Object.assign(new Error('Batch not found'), { code: 'NOT_FOUND' })
    }
    return {
      batch_id: batch.batch_id,
      status: batch.status,
      total_submitted: batch.total_submitted,
      processed: batch.processed,
      results: batch.results,
      failed: batch.failed,
      created_at: batch.created_at,
      completed_at: batch.completed_at,
    }
  },

  /**
   * Internal: sequential async processing per product.
   * Sequential (not parallel) to avoid Thirdweb Engine nonce issues.
   */
  async _processBatchAsync(
    batchId: string,
    products: Product[],
    items: ProductBatchItem[]
  ): Promise<void> {
    let allFailed = true

    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      const item = items[i]

      try {
        // Step A: Mint NFT via Thirdweb Engine (blocks until tx mined, ~15s)
        const { nft_token_id, tx_hash } = await blockchainService.mintSingleNFT(
          product.product_id,
          item
        )

        // Step B: Bind NFC tag (generate UID, hash, persist)
        await nfcService.bindToProduct(product.product_id)

        // Step C: Atomic state → REGISTERED (guard: must be MANUFACTURED)
        const updated = await productRepository.updateStatus(
          product.product_id,
          'REGISTERED',
          'MANUFACTURED'
        )

        if (!updated) {
          throw new Error('State guard failed — product status was not MANUFACTURED')
        }

        // Step D: Immutable log
        await productLogRepository.insert({
          product_id: product.product_id,
          event: 'REGISTERED',
          actor_id: null,
          actor_role: 'system',
          metadata: { batch_id: batchId, nft_token_id, tx_hash },
        })

        // Step E: Persist result to batch record
        await batchRepository.appendResult(batchId, {
          serial_number: item.serial_number,
          product_id: product.product_id,
          nft_token_id,
          tx_hash,
          nfc_bound: true,
        })

        allFailed = false
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error'

        await batchRepository.appendFailed(batchId, item.serial_number, reason)

        // Log failure for audit
        await productLogRepository.insert({
          product_id: product.product_id,
          event: 'MANUFACTURED', // stays at MANUFACTURED on failure
          actor_id: null,
          actor_role: 'system',
          metadata: { batch_id: batchId, error: reason, step: 'mint_or_nfc' },
        }).catch(() => undefined) // don't fail the loop if logging fails
      }
    }

    // Mark batch terminal status
    const batch = await batchRepository.findById(batchId)
    const status =
      allFailed ? 'FAILED'
      : batch && batch.failed.length > 0 ? 'PARTIALLY_FAILED'
      : 'COMPLETED'

    await batchRepository.markCompleted(batchId, status)
  },

  /**
   * Manually trigger NFC bind for a product already REGISTERED.
   * Used when hardware NFC writer is applied post-mint.
   */
  async bindNfcToProduct(
    productId: string,
    operatorId: string
  ): Promise<{ product_id: string; nfc_bound: boolean }> {
    const product = await productRepository.findById(productId)
    if (!product) {
      throw Object.assign(new Error('Product not found'), { code: 'NOT_FOUND' })
    }

    if (product.status === 'MANUFACTURED') {
      throw Object.assign(
        new Error('Product must be REGISTERED (NFT minted) before NFC bind'),
        { code: 'INVALID_STATE' }
      )
    }

    if (product.nfc_bound) {
      throw Object.assign(
        new Error('NFC already bound to this product'),
        { code: 'NFC_ALREADY_BOUND' }
      )
    }

    await nfcService.bindToProduct(productId)

    await productLogRepository.insert({
      product_id: productId,
      event: 'REGISTERED',
      actor_id: operatorId,
      actor_role: 'OPERATOR',
      metadata: { action: 'NFC_BIND_MANUAL' },
    })

    return { product_id: productId, nfc_bound: true }
  },

  async getProvenance(productId: string) {
    const product = await productRepository.findById(productId)
    if (!product) {
      throw Object.assign(new Error('Product not found'), { code: 'NOT_FOUND' })
    }

    const logs = await productLogRepository.findByProductId(productId)

    const timeline = logs.map((log) => ({
      log_id: log.log_id,
      event: log.event,
      actor_role: log.actor_role,
      metadata: log.metadata,
      timestamp: log.created_at,
    }))

    return {
      product_id: product.product_id,
      serial_number: product.serial_number,
      brand: product.brand,
      name: product.name,
      nft_token_id: product.nft_token_id,
      current_status: product.status,
      timeline,
    }
  },
}
