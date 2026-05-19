import { supabase } from '@/lib/supabase'
import type { Product, ProductStatus, ProductBatchItem } from '@/types'

export const productRepository = {
  async findById(productId: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', productId)
      .single()

    if (error) return null
    return data as Product
  },

  async findBySerialNumber(serialNumber: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('serial_number', serialNumber)
      .single()

    if (error) return null
    return data as Product
  },

  async findAllByOwner(ownerId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('current_owner_id', ownerId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`productRepository.findAllByOwner: ${error.message}`)
    return (data ?? []) as Product[]
  },

  async findAll(filters: {
    status?: ProductStatus
    page: number
    limit: number
  }): Promise<{ items: Product[]; total: number }> {
    let query = supabase.from('products').select('*', { count: 'exact' })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    const from = (filters.page - 1) * filters.limit
    const to = from + filters.limit - 1

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw new Error(`productRepository.findAll: ${error.message}`)
    return { items: (data ?? []) as Product[], total: count ?? 0 }
  },

  async insertBatch(items: ProductBatchItem[]): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .insert(items.map((item) => ({ ...item, status: 'MANUFACTURED' })))
      .select()

    if (error) throw new Error(`productRepository.insertBatch: ${error.message}`)
    return data as Product[]
  },

  /**
   * Atomic status update with optimistic locking via expected_status.
   * Returns updated product or null if guard failed.
   */
  async updateStatus(
    productId: string,
    newStatus: ProductStatus,
    expectedStatus: ProductStatus
  ): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('product_id', productId)
      .eq('status', expectedStatus)
      .select()
      .single()

    if (error) return null
    return data as Product
  },

  async updateOwnerAndStatus(
    productId: string,
    newOwnerId: string,
    newStatus: ProductStatus,
    blockchainTxHash: string
  ): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({
        status: newStatus,
        current_owner_id: newOwnerId,
        blockchain_tx_hash: blockchainTxHash,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', productId)
      .select()
      .single()

    if (error) throw new Error(`productRepository.updateOwnerAndStatus: ${error.message}`)
    return data as Product
  },

  async setNftTokenId(
    productId: string,
    nftTokenId: string,
    txHash: string
  ): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({
        nft_token_id: nftTokenId,
        blockchain_tx_hash: txHash,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', productId)

    if (error) throw new Error(`productRepository.setNftTokenId: ${error.message}`)
  },
}
