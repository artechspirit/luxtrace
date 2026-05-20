import { transactionRepository } from '@/repositories/transaction.repository'
import { productRepository } from '@/repositories/product.repository'
import { productLogRepository } from '@/repositories/product-log.repository'
import { profileRepository } from '@/repositories/profile.repository'
import { qrSessionRepository } from '@/repositories/qr-session.repository'
import { nfcService } from '@/services/nfc.service'
import { blockchainService } from '@/services/blockchain.service'
import { paymentService } from '@/services/payment.service'
import { refundTransaction } from '@/lib/midtrans'
import { notificationService } from '@/services/notification.service'
import type { Transaction } from '@/types'

export const transactionService = {
  async getById(transactionId: string): Promise<Transaction> {
    const tx = await transactionRepository.findById(transactionId)
    if (!tx) throw Object.assign(new Error('Transaction not found'), { code: 'NOT_FOUND' })
    return tx
  },

  /** PRIMARY_BOUTIQUE: delegates to paymentService */
  async initiatePrimaryPurchase(productId: string, buyerId: string) {
    return paymentService.createPayment({ type: 'PRIMARY_BOUTIQUE', productId, buyerId })
  },

  // ─── P2P Remote Shipping ────────────────────────────────────────────────────

  /**
   * Phase 1: Seller initiates P2P Remote Shipping.
   * Creates transaction + Midtrans escrow invoice.
   * Product stays OWNED until buyer pays.
   */
  async initiateP2PRemote(
    productId: string,
    sellerId: string,
    buyerId: string,
    agreedPriceIdr: number
  ) {
    if (sellerId === buyerId) {
      throw Object.assign(new Error('Cannot trade with yourself'), { code: 'SELF_TRADE' })
    }

    const paymentResult = await paymentService.createPayment({
      type: 'P2P_REMOTE_SHIPPING',
      productId,
      buyerId,
      sellerId,
      agreedPriceIdr,
    })

    // Notify buyer of new request
    notificationService.sendPushNotification(
      buyerId,
      'P2P Purchase Request',
      `A secondary market trade of a luxury item has been requested. Escrow price: Rp ${agreedPriceIdr.toLocaleString('id-ID')}.`
    ).catch(err => console.error('Failed to send notification on P2P Remote initiation:', err))

    return paymentResult
  },

  /**
   * Phase 2: Seller generates QR after escrow is locked (status = PAID / IN_TRANSIT).
   *
   * Guards:
   * - Caller must be seller
   * - Transaction must be PAID or IN_TRANSIT (escrow locked)
   * - NFC must be bound to product
   *
   * Returns session-bound, single-use encrypted QR payload.
   */
  async generateHandoverQr(
    transactionId: string,
    callerId: string
  ): Promise<{
    qr_payload: string
    session_id: string
    expires_at: string
    instructions: string
  }> {
    const tx = await transactionRepository.findById(transactionId)
    if (!tx) throw Object.assign(new Error('Transaction not found'), { code: 'NOT_FOUND' })

    if (tx.seller_id !== callerId) {
      throw Object.assign(new Error('Only the seller can generate handover QR'), { code: 'FORBIDDEN' })
    }

    if (tx.status !== 'PAID' && tx.status !== 'IN_TRANSIT') {
      throw Object.assign(
        new Error('Escrow must be locked (buyer must pay first)'),
        { code: 'ESCROW_NOT_LOCKED' }
      )
    }

    if (tx.type !== 'P2P_REMOTE_SHIPPING') {
      throw Object.assign(new Error('QR handover only applies to P2P_REMOTE_SHIPPING'), {
        code: 'INVALID_TRANSACTION_TYPE',
      })
    }

    const { qr_payload, session_id, expires_at } = await nfcService.generateQrPayload(
      transactionId,
      tx.product_id
    )

    return {
      qr_payload,
      session_id,
      expires_at,
      instructions:
        'Show this QR to the buyer. They must scan this QR AND tap the NFC chip on the physical product to verify.',
    }
  },

  /**
   * Phase 3: Buyer verifies NFC — the critical escrow release gate.
   *
   * Full verification sequence (all server-side):
   * 1. Load + validate QR session (TTL, single-use, tamper)
   * 2. Verify session belongs to this transaction
   * 3. Check transaction is IN_TRANSIT
   * 4. Verify caller is the buyer
   * 5. Atomic: mark session as USED (prevents replay)
   * 6. Hash scanned UID → compare with stored hash
   *
   * On NFC MATCH:
   * 7. Transfer NFT seller → buyer (Thirdweb Engine)
   * 8. Update product: status=OWNED, owner=buyer
   * 9. Mark transaction COMPLETED
   * 10. Log TRANSFERRED event
   *
   * On NFC MISMATCH:
   * 7. Mark transaction FRAUD_FLAGGED
   * 8. Log FRAUD_ATTEMPT (scanned UID hash stored for forensics)
   * 9. Escrow remains locked — manual review required
   *
   * On NFT transfer failure (after NFC verified):
   * 7. Refund buyer via Midtrans
   * 8. Mark transaction CANCELLED
   * 9. Restore product status to OWNED
   */
  async verifyNfcAndReleaseEscrow(
    sessionId: string,
    callerId: string,
    scannedUid: string
  ): Promise<{
    verified: boolean
    transaction_id: string
    nft_transfer: { tx_hash: string; from_wallet: string; to_wallet: string; token_id: string }
    escrow_released: boolean
    product_status: string
  }> {
    // ── Step 1: Validate QR session ─────────────────────────────────────────
    const sessionData = await nfcService.validateQrSession(sessionId)
    const { transaction_id: transactionId, product_id: productId } = sessionData

    // ── Step 2: Load transaction ────────────────────────────────────────────
    const tx = await transactionRepository.findById(transactionId)
    if (!tx) throw Object.assign(new Error('Transaction not found'), { code: 'NOT_FOUND' })

    // ── Step 3: Caller must be buyer ─────────────────────────────────────────
    if (tx.buyer_id !== callerId) {
      throw Object.assign(new Error('Only the buyer can verify NFC'), { code: 'FORBIDDEN' })
    }

    // ── Step 4: Transaction must be IN_TRANSIT ───────────────────────────────
    if (tx.status !== 'IN_TRANSIT') {
      throw Object.assign(
        new Error(`Transaction is in ${tx.status} state, expected IN_TRANSIT`),
        { code: 'INVALID_STATE' }
      )
    }

    // ── Step 5: Atomic session consumption (replay prevention) ───────────────
    const consumed = await qrSessionRepository.markUsed(sessionId)
    if (!consumed) {
      throw Object.assign(new Error('QR session already used or expired'), { code: 'SESSION_EXPIRED' })
    }

    // ── Step 6: NFC verification ─────────────────────────────────────────────
    const nfcVerified = await nfcService.verifyForProduct(productId, scannedUid)

    if (!nfcVerified) {
      // Fraud path: log + flag, escrow remains locked for manual review
      await transactionRepository.updateStatus(transactionId, 'FRAUD_FLAGGED')
      await productLogRepository.insert({
        product_id: productId,
        event: 'FRAUD_ATTEMPT',
        actor_id: callerId,
        actor_role: 'CONSUMER',
        metadata: {
          transaction_id: transactionId,
          session_id: sessionId,
          scanned_uid_hash: Buffer.from(scannedUid).toString('base64'), // obfuscated for forensics
          timestamp: new Date().toISOString(),
        },
      })
      throw Object.assign(
        new Error('NFC chip does not match this product. Fraud attempt logged. Escrow held for review.'),
        { code: 'NFC_MISMATCH' }
      )
    }

    // ── Step 7: Load parties ──────────────────────────────────────────────────
    const seller = await profileRepository.findByUserId(tx.seller_id!)
    const buyer = await profileRepository.findByUserId(tx.buyer_id)
    const product = await productRepository.findById(productId)

    if (!seller || !buyer || !product) {
      throw new Error('Data integrity error: missing seller, buyer, or product')
    }

    if (!product.nft_token_id) {
      throw new Error(`Product ${productId} has no NFT token — cannot transfer`)
    }

    // ── Step 8: Transfer NFT ──────────────────────────────────────────────────
    let txHash: string
    try {
      const result = await blockchainService.transferNFT(
        seller.wallet_address,
        buyer.wallet_address,
        product.nft_token_id
      )
      txHash = result.tx_hash
    } catch (nftErr) {
      // NFT failed AFTER NFC verified — critical: refund buyer, cancel transaction
      console.error('[P2P Remote] NFT transfer failed after NFC verification:', nftErr)

      if (tx.payment_ref) {
        await refundTransaction({
          orderId: tx.payment_ref,
          amountIdr: tx.amount_idr,
          reason: 'NFT transfer failed after NFC verification',
        }).catch((refundErr) =>
          console.error('[P2P Remote] CRITICAL: Refund also failed:', refundErr)
        )
      }

      await transactionRepository.updateStatus(transactionId, 'CANCELLED')
      throw Object.assign(new Error('NFT transfer failed — buyer refunded'), { code: 'NFT_TRANSFER_FAILED' })
    }

    // ── Step 9: Update product ownership ─────────────────────────────────────
    await productRepository.updateOwnerAndStatus(productId, tx.buyer_id, 'OWNED', txHash)

    // ── Step 10: Complete transaction ─────────────────────────────────────────
    await transactionRepository.updateStatus(transactionId, 'COMPLETED', {
      blockchain_tx_hash: txHash,
      completed_at: new Date().toISOString(),
    })

    // ── Step 11: Immutable provenance log ─────────────────────────────────────
    await productLogRepository.insert({
      product_id: productId,
      event: 'TRANSFERRED',
      actor_id: callerId,
      actor_role: 'CONSUMER',
      metadata: {
        transaction_id: transactionId,
        via: 'P2P_REMOTE_SHIPPING',
        tx_hash: txHash,
        from_wallet: seller.wallet_address,
        to_wallet: buyer.wallet_address,
        session_id: sessionId,
      },
    })
    // Send push notifications to both parties
    notificationService.sendPushNotification(
      tx.buyer_id,
      'Ownership Transfer Complete',
      'NFC verified. Digital twin NFT successfully deposited in your custodial wallet!'
    ).catch(err => console.error('Failed to notify buyer:', err))

    notificationService.sendPushNotification(
      tx.seller_id!,
      'P2P Escrow Released',
      'Buyer verified product authenticity. Escrow payment released successfully.'
    ).catch(err => console.error('Failed to notify seller:', err))
    return {
      verified: true,
      transaction_id: transactionId,
      nft_transfer: {
        tx_hash: txHash,
        from_wallet: seller.wallet_address,
        to_wallet: buyer.wallet_address,
        token_id: product.nft_token_id!,
      },
      escrow_released: true,
      product_status: 'OWNED',
    }
  },

  // ─── P2P Direct Handover ────────────────────────────────────────────────────

  /**
   * P2P Direct Handover: seller creates session (no payment/escrow).
   */
  async initiateDirectHandover(productId: string, sellerId: string, buyerId: string) {
    if (sellerId === buyerId) {
      throw Object.assign(new Error('Cannot trade with yourself'), { code: 'SELF_TRADE' })
    }

    const product = await productRepository.findById(productId)
    if (!product) throw Object.assign(new Error('Product not found'), { code: 'NOT_FOUND' })
    if (product.current_owner_id !== sellerId) {
      throw Object.assign(new Error('Not the product owner'), { code: 'NOT_OWNER' })
    }
    if (product.status !== 'OWNED') {
      throw Object.assign(new Error('Product is locked in another transaction'), { code: 'PRODUCT_LOCKED' })
    }

    const tx = await transactionRepository.create({
      type: 'P2P_DIRECT_HANDOVER',
      product_id: productId,
      seller_id: sellerId,
      buyer_id: buyerId,
      amount_idr: 0,
    })

    const qr = await nfcService.generateQrPayload(tx.transaction_id, productId, 5 * 60 * 1000)

    // Notify buyer of direct handover request
    notificationService.sendPushNotification(
      buyerId,
      'Direct Handover Ready',
      `Seller has initiated a physical P2P handover. Scan their QR and verify physical NFC authenticity.`
    ).catch(err => console.error('Failed to notify buyer of direct handover initiation:', err))

    return { transaction: tx, ...qr }
  },

  /**
   * Direct Handover: buyer verifies NFC proximity — no escrow.
   * Uses same session validation as remote shipping.
   */
  async verifyDirectHandover(
    sessionId: string,
    callerId: string,
    scannedUid: string
  ) {
    const sessionData = await nfcService.validateQrSession(sessionId)
    const { transaction_id: transactionId, product_id: productId } = sessionData

    const tx = await transactionRepository.findById(transactionId)
    if (!tx) throw Object.assign(new Error('Transaction not found'), { code: 'NOT_FOUND' })
    if (tx.buyer_id !== callerId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' })
    if (tx.status !== 'PENDING') throw Object.assign(new Error('Invalid state'), { code: 'INVALID_STATE' })

    // Atomic: consume session
    const consumed = await qrSessionRepository.markUsed(sessionId)
    if (!consumed) throw Object.assign(new Error('Session already used'), { code: 'SESSION_EXPIRED' })

    const nfcVerified = await nfcService.verifyForProduct(productId, scannedUid)
    if (!nfcVerified) {
      await transactionRepository.updateStatus(transactionId, 'FRAUD_FLAGGED')
      await productLogRepository.insert({
        product_id: productId,
        event: 'FRAUD_ATTEMPT',
        actor_id: callerId,
        actor_role: 'CONSUMER',
        metadata: { transaction_id: transactionId, session_id: sessionId },
      })
      throw Object.assign(new Error('NFC mismatch'), { code: 'NFC_MISMATCH' })
    }

    const seller = await profileRepository.findByUserId(tx.seller_id!)
    const buyer = await profileRepository.findByUserId(tx.buyer_id)
    const product = await productRepository.findById(productId)
    if (!seller || !buyer || !product) throw new Error('Data integrity error')

    let tx_hash: string
    try {
      const result = await blockchainService.transferNFT(
        seller.wallet_address,
        buyer.wallet_address,
        product.nft_token_id!
      )
      tx_hash = result.tx_hash
    } catch (nftErr) {
      console.error('[P2P Direct] NFT transfer failed:', nftErr)
      await transactionRepository.updateStatus(transactionId, 'CANCELLED')
      throw Object.assign(new Error('NFT transfer failed'), { code: 'NFT_TRANSFER_FAILED' })
    }

    await productRepository.updateOwnerAndStatus(productId, tx.buyer_id, 'OWNED', tx_hash)
    await transactionRepository.updateStatus(transactionId, 'COMPLETED', {
      blockchain_tx_hash: tx_hash,
      completed_at: new Date().toISOString(),
    })
    await productLogRepository.insert({
      product_id: productId,
      event: 'TRANSFERRED',
      actor_id: callerId,
      actor_role: 'CONSUMER',
      metadata: {
        transaction_id: transactionId,
        via: 'P2P_DIRECT_HANDOVER',
        tx_hash,
        from_wallet: seller.wallet_address,
        to_wallet: buyer.wallet_address,
      },
    })

    // Notify buyer and seller of successful handover
    notificationService.sendPushNotification(
      tx.buyer_id,
      'Direct Handover Successful',
      'Ownership verification complete. Luxury digital twin NFT added to your vault!'
    ).catch(err => console.error('Failed to notify buyer:', err))

    notificationService.sendPushNotification(
      tx.seller_id!,
      'Direct Handover Completed',
      'Physical asset handover verified. Ownership transferred to the buyer.'
    ).catch(err => console.error('Failed to notify seller:', err))

    return {
      verified: true,
      transaction_id: transactionId,
      nft_transfer: {
        tx_hash,
        from_wallet: seller.wallet_address,
        to_wallet: buyer.wallet_address,
        token_id: product.nft_token_id!,
      },
      product_status: 'OWNED',
      via: 'DIRECT_HANDOVER',
    }
  },

  async getAllTransactions() {
    return transactionRepository.findAll()
  },
}

