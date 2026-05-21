import {
  createSnapInvoice,
  validateMidtransSignature,
  getMidtransTransactionStatus,
  refundTransaction,
} from "@/lib/midtrans";
import { transactionRepository } from "@/repositories/transaction.repository";
import { productRepository } from "@/repositories/product.repository";
import { productLogRepository } from "@/repositories/product-log.repository";
import { profileRepository } from "@/repositories/profile.repository";
import { blockchainService } from "@/services/blockchain.service";
import { notificationService } from "@/services/notification.service";
import type { TransactionType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MidtransWebhookPayload {
  transaction_id: string;
  order_id: string;
  transaction_status: string;
  status_code: string;
  gross_amount: string;
  payment_type: string;
  signature_key: string;
  fraud_status?: string;
  bank?: string;
  va_numbers?: Array<{ bank: string; va_number: string }>;
  settlement_time?: string;
  transaction_time: string;
}

export interface CreatePaymentResult {
  transaction_id: string;
  order_id: string;
  amount_idr: number;
  snap_token: string;
  payment_url: string;
  expires_at: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const paymentService = {
  /**
   * Create a payment invoice for any transaction type.
   * Handles: PRIMARY_BOUTIQUE, P2P_REMOTE_SHIPPING
   *
   * Steps:
   * 1. Validate product state
   * 2. Create transaction record
   * 3. Create Midtrans Snap invoice
   * 4. Save payment_ref to transaction
   */
  async createPayment(params: {
    type: TransactionType;
    productId: string;
    buyerId: string;
    sellerId?: string;
    agreedPriceIdr?: number;
  }): Promise<CreatePaymentResult> {
    const { type, productId, buyerId, sellerId, agreedPriceIdr } = params;

    // 1. Load buyer profile
    const buyer = await profileRepository.findByUserId(buyerId);
    if (!buyer)
      throw Object.assign(new Error("Buyer profile not found"), {
        code: "NOT_FOUND",
      });

    // 2. Load product
    const product = await productRepository.findById(productId);
    if (!product)
      throw Object.assign(new Error("Product not found"), {
        code: "NOT_FOUND",
      });

    // 3. State guard
    if (type === "PRIMARY_BOUTIQUE") {
      if (product.status !== "REGISTERED") {
        throw Object.assign(
          new Error("Product is not available for purchase"),
          {
            code: "PRODUCT_NOT_AVAILABLE",
          },
        );
      }
    } else if (type === "P2P_REMOTE_SHIPPING") {
      if (product.status !== "OWNED") {
        throw Object.assign(
          new Error("Product is not available for P2P sale"),
          {
            code: "PRODUCT_NOT_AVAILABLE",
          },
        );
      }
      if (product.current_owner_id !== sellerId) {
        throw Object.assign(new Error("Caller is not the product owner"), {
          code: "NOT_OWNER",
        });
      }
    }

    const amountIdr = agreedPriceIdr ?? product.price_idr;
    const itemName = `${product.brand} — ${product.name}`;

    // 4. Create transaction record (PENDING)
    const transaction = await transactionRepository.create({
      type,
      product_id: productId,
      seller_id: sellerId ?? null,
      buyer_id: buyerId,
      amount_idr: amountIdr,
    });

    // 5. Build order_id (Midtrans requires unique, max 50 chars)
    const orderId = `LUX-${transaction.transaction_id}`;

    // 6. Create Snap invoice
    let snapResult: { token: string; redirect_url: string };
    try {
      snapResult = await createSnapInvoice({
        orderId,
        amountIdr,
        customerName: buyer.full_name ?? buyer.email.split("@")[0],
        customerEmail: buyer.email,
        itemId: productId,
        itemName,
      });
    } catch (err) {
      // Log the original Midtrans error for debugging before rollback.
      console.error("[PaymentService] Midtrans createSnapInvoice failed", err);
      await transactionRepository.updateStatus(
        transaction.transaction_id,
        "CANCELLED",
      );
      throw Object.assign(new Error("Payment gateway error"), {
        code: "PAYMENT_INIT_FAILED",
        cause: err,
      });
    }

    // 7. Persist payment_ref for idempotent webhook lookup
    await transactionRepository.setPaymentRef(
      transaction.transaction_id,
      orderId,
    );

    // 8. Lock product for P2P Remote (prevent concurrent sale)
    if (type === "P2P_REMOTE_SHIPPING") {
      await productRepository.updateStatus(productId, "OWNED", "OWNED"); // touch to validate lock
    }

    // Snap tokens typically expire in 24h
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      transaction_id: transaction.transaction_id,
      order_id: orderId,
      amount_idr: amountIdr,
      snap_token: snapResult.token,
      payment_url: snapResult.redirect_url,
      expires_at: expiresAt,
    };
  },

  /**
   * Process Midtrans webhook notification.
   *
   * Security:
   * - Validate SHA512 signature first (reject if invalid)
   * - Idempotent: skip if already processed
   *
   * Handles status:
   * - settlement → mark PAID, trigger NFT transfer
   * - cancel / expire / deny → mark CANCELLED
   * - pending → no-op (still waiting for payment)
   * - fraud challenge → log and alert
   */
  async processWebhook(payload: MidtransWebhookPayload): Promise<void> {
    const {
      order_id,
      transaction_status,
      status_code,
      gross_amount,
      signature_key,
      fraud_status,
    } = payload;

    // ── Step 1: Validate signature ───────────────────────────────────────────
    const isValid = validateMidtransSignature(
      order_id,
      status_code,
      gross_amount,
      signature_key,
    );
    if (!isValid) {
      throw Object.assign(
        new Error(`Invalid Midtrans signature for order: ${order_id}`),
        { code: "INVALID_SIGNATURE" },
      );
    }

    // ── Step 2: Find transaction by payment_ref ──────────────────────────────
    const transaction = await transactionRepository.findByPaymentRef(order_id);
    if (!transaction) {
      // Could be a test ping or Midtrans internal order — safe to ignore
      console.warn(`[Webhook] No transaction found for order_id: ${order_id}`);
      return;
    }

    // ── Step 3: Idempotency check ────────────────────────────────────────────
    if (
      transaction.status === "PAID" ||
      transaction.status === "COMPLETED" ||
      transaction.status === "CANCELLED"
    ) {
      console.log(
        `[Webhook] Order ${order_id} already in terminal state: ${transaction.status}`,
      );
      return;
    }

    // ── Step 4: Handle by status ─────────────────────────────────────────────

    // Fraud challenge — payment gw flagged this as suspicious
    if (fraud_status === "challenge") {
      console.warn(`[Webhook] Fraud challenge for order: ${order_id}`);
      await transactionRepository.updateStatus(
        transaction.transaction_id,
        "FRAUD_FLAGGED",
      );
      return;
    }

    if (
      transaction_status === "settlement" ||
      transaction_status === "capture"
    ) {
      await paymentService._handleSettlement(
        transaction.transaction_id,
        order_id,
      );
      return;
    }

    if (
      transaction_status === "cancel" ||
      transaction_status === "expire" ||
      transaction_status === "deny"
    ) {
      await transactionRepository.updateStatus(
        transaction.transaction_id,
        "CANCELLED",
      );
      return;
    }

    // pending, authorize → no-op, wait for next notification
    console.log(
      `[Webhook] No action for status: ${transaction_status}, order: ${order_id}`,
    );
  },

  /**
   * Handle settled payment.
   * Called for PRIMARY_BOUTIQUE and P2P_REMOTE_SHIPPING.
   * Internal — not exported directly.
   */
  async _handleSettlement(
    transactionId: string,
    orderId: string,
  ): Promise<void> {
    // Mark PAID
    await transactionRepository.updateStatus(transactionId, "PAID");

    const transaction = await transactionRepository.findById(transactionId);
    if (!transaction)
      throw new Error("Transaction disappeared after PAID update");

    // ── P2P Remote: lock product → buyer must still NFC verify ──────────────
    if (transaction.type === "P2P_REMOTE_SHIPPING") {
      const locked = await productRepository.updateStatus(
        transaction.product_id,
        "IN_TRANSIT",
        "OWNED",
      );
      if (!locked) {
        // Product state changed concurrently — refund buyer
        await paymentService._refundOrder(
          orderId,
          transaction.amount_idr,
          "Product state conflict",
        );
        await transactionRepository.updateStatus(transactionId, "CANCELLED");
      } else {
        // Move the transaction into the IN_TRANSIT phase so NFC verification can complete.
        await transactionRepository.updateStatus(transactionId, "IN_TRANSIT");

        // Trigger push notifications
        notificationService
          .sendPushNotification(
            transaction.seller_id!,
            "P2P Escrow Funded",
            "The buyer has completed their deposit. Please prepare the product and present the handover QR.",
          )
          .catch((err) =>
            console.error("Failed to notify seller of escrow funding:", err),
          );

        notificationService
          .sendPushNotification(
            transaction.buyer_id,
            "Payment Locked",
            "Your payment is safely locked in escrow. Authenticate physical NFC upon arrival to complete.",
          )
          .catch((err) =>
            console.error("Failed to notify buyer of payment lock:", err),
          );
      }
      return;
    }

    // ── Primary Boutique: transfer NFT immediately ───────────────────────────
    const product = await productRepository.findById(transaction.product_id);
    const buyer = await profileRepository.findByUserId(transaction.buyer_id);

    if (!product || !buyer)
      throw new Error("Data integrity error: missing product or buyer");

    const brandWallet = process.env.BRAND_WALLET_ADDRESS!;
    if (!product.nft_token_id)
      throw new Error(`Product ${transaction.product_id} has no NFT token`);

    let txHash: string;
    try {
      const result = await blockchainService.transferNFT(
        brandWallet,
        buyer.wallet_address,
        product.nft_token_id,
      );
      txHash = result.tx_hash;
    } catch (err) {
      // NFT transfer failed after payment — critical: trigger refund
      console.error("[Webhook] NFT transfer failed after settlement:", err);
      await paymentService._refundOrder(
        orderId,
        transaction.amount_idr,
        "NFT transfer failed",
      );
      await transactionRepository.updateStatus(transactionId, "CANCELLED");
      throw err;
    }

    // Atomic ownership update
    await productRepository.updateOwnerAndStatus(
      transaction.product_id,
      transaction.buyer_id,
      "OWNED",
      txHash,
    );

    await transactionRepository.updateStatus(transactionId, "COMPLETED", {
      blockchain_tx_hash: txHash,
      completed_at: new Date().toISOString(),
    });

    await productLogRepository.insert({
      product_id: transaction.product_id,
      event: "BRAND_OUTLET",
      actor_id: transaction.buyer_id,
      actor_role: "CONSUMER",
      metadata: {
        transaction_id: transactionId,
        order_id: orderId,
        tx_hash: txHash,
      },
    });
  },

  /**
   * Issue a refund for an order.
   * Called when NFT transfer fails after payment.
   */
  async _refundOrder(
    orderId: string,
    amountIdr: number,
    reason: string,
  ): Promise<void> {
    try {
      await refundTransaction({ orderId, amountIdr, reason });
      console.log(`[Payment] Refund issued for ${orderId}: ${reason}`);
    } catch (err) {
      // Refund failed — alert ops team (webhook should be re-attempted manually)
      console.error(`[Payment] CRITICAL: Refund failed for ${orderId}:`, err);
    }
  },

  /**
   * Poll Midtrans for transaction status (fallback for missed webhooks).
   * Call this for PENDING transactions older than 5 minutes.
   */
  async syncTransactionStatus(transactionId: string): Promise<void> {
    const transaction = await transactionRepository.findById(transactionId);
    if (!transaction?.payment_ref) return;
    if (transaction.status !== "PENDING") return;

    const midtransStatus = await getMidtransTransactionStatus(
      transaction.payment_ref,
    );

    // Re-use webhook handler with synthesized payload
    if (
      midtransStatus.transaction_status === "settlement" ||
      midtransStatus.transaction_status === "capture"
    ) {
      await paymentService._handleSettlement(
        transactionId,
        transaction.payment_ref,
      );
    } else if (
      midtransStatus.transaction_status === "cancel" ||
      midtransStatus.transaction_status === "expire"
    ) {
      await transactionRepository.updateStatus(transactionId, "CANCELLED");
    }
  },
};
