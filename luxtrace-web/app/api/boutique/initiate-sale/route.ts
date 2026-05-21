import { NextRequest } from 'next/server'
import { paymentService } from '@/services/payment.service'
import { transactionService } from '@/services/transaction.service'
import { profileRepository } from '@/repositories/profile.repository'
import { productRepository } from '@/repositories/product.repository'
import { notificationService } from '@/services/notification.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, serverError } from '@/lib/response'

/**
 * POST /api/boutique/initiate-sale
 *
 * Boutique staff (OPERATOR) selects a product and a buyer, then creates
 * a Midtrans Snap invoice. A payment link is sent to the buyer's push
 * notification so they can complete the payment on their phone.
 *
 * Role required: OPERATOR or ADMIN
 *
 * Request:
 * {
 *   "product_id": "uuid",
 *   "buyer_email": "buyer@example.com"   // staff looks up buyer by email
 *   // OR
 *   "buyer_id": "uuid"                   // if staff already knows the ID
 * }
 *
 * Response 201:
 * {
 *   "transaction_id": "uuid",
 *   "order_id": "LUX-uuid",
 *   "product": { "brand": "Rolex", "name": "Submariner Date", "serial": "LUX-2026-00101" },
 *   "buyer": { "full_name": "...", "email": "..." },
 *   "amount_idr": 350000000,
 *   "payment_url": "https://app.sandbox.midtrans.com/snap/v4/...",
 *   "snap_token": "abc123...",
 *   "expires_at": "ISO8601"
 * }
 *
 * After this call:
 *  - Buyer receives a push notification with the payment link
 *  - Buyer pays on their phone via Midtrans Snap
 *  - Midtrans webhook → NFT transferred to buyer automatically
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()

    if (user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
      return forbidden('Only ADMIN or OPERATOR can initiate boutique sales')
    }

    const body = await request.json()
    const { product_id, buyer_id, buyer_email, sale_mode = 'escrow' } = body

    if (!product_id) {
      return err('INVALID_PAYLOAD', 'product_id is required', 422)
    }
    if (!buyer_id && !buyer_email) {
      return err('INVALID_PAYLOAD', 'buyer_id or buyer_email is required', 422)
    }
    if (sale_mode !== 'escrow' && sale_mode !== 'direct') {
      return err('INVALID_PAYLOAD', 'sale_mode must be "escrow" or "direct"', 422)
    }

    // 1. Resolve buyer
    let resolvedBuyerId = buyer_id
    if (!resolvedBuyerId && buyer_email) {
      const profile = await profileRepository.findByEmail(buyer_email.trim().toLowerCase())
      if (!profile) {
        return err('BUYER_NOT_FOUND', `No user found with email: ${buyer_email}`, 404)
      }
      resolvedBuyerId = profile.user_id
    }

    // 2. Validate product is REGISTERED and available
    const product = await productRepository.findById(product_id)
    if (!product) {
      return err('PRODUCT_NOT_FOUND', 'Product not found', 404)
    }
    if (product.status !== 'REGISTERED') {
      return err(
        'PRODUCT_NOT_AVAILABLE',
        `Product is not available for boutique sale (status: ${product.status})`,
        409
      )
    }

    // 3. Handle based on sale_mode
    const buyer = await profileRepository.findByUserId(resolvedBuyerId)

    if (sale_mode === 'direct') {
      const directResult = await transactionService.initiatePrimaryDirectHandover(
        product_id,
        resolvedBuyerId
      )

      return ok(
        {
          transaction_id: directResult.transaction.transaction_id,
          order_id: `LUX-${directResult.transaction.transaction_id}`,
          product: {
            product_id: product.product_id,
            brand: product.brand,
            name: product.name,
            serial_number: product.serial_number,
          },
          buyer: buyer
            ? { full_name: buyer.full_name, email: buyer.email }
            : { full_name: null, email: null },
          amount_idr: product.price_idr,
          qr_payload: directResult.qr_payload,
          session_id: directResult.session_id,
          expires_at: directResult.expires_at,
          sale_mode: 'direct',
          initiated_by: user.user_id,
          note: 'Boutique direct handover initiated. Show the QR to the buyer.',
        },
        201
      )
    }

    // Default: sale_mode === 'escrow'
    const paymentResult = await paymentService.createPayment({
      type: 'PRIMARY_BOUTIQUE',
      productId: product_id,
      buyerId: resolvedBuyerId,
    })

    // Send push notification to buyer with payment link
    if (buyer) {
      notificationService
        .sendPushNotification(
          resolvedBuyerId,
          '🏛️ Boutique Purchase Invitation',
          `${product.brand} ${product.name} is ready for you. Complete your payment to receive the digital certificate of authenticity.`
        )
        .catch((e) => console.error('[Boutique Sale] Failed to notify buyer:', e))
    }

    return ok(
      {
        transaction_id: paymentResult.transaction_id,
        order_id: paymentResult.order_id,
        product: {
          product_id: product.product_id,
          brand: product.brand,
          name: product.name,
          serial_number: product.serial_number,
        },
        buyer: buyer
          ? { full_name: buyer.full_name, email: buyer.email }
          : { full_name: null, email: null },
        amount_idr: paymentResult.amount_idr,
        payment_url: paymentResult.payment_url,
        snap_token: paymentResult.snap_token,
        expires_at: paymentResult.expires_at,
        sale_mode: 'escrow',
        initiated_by: user.user_id,
        note: 'Buyer has been notified via push notification with the payment link.',
      },
      201
    )
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string }
    if (e.code === 'NOT_FOUND') return err('NOT_FOUND', e.message ?? 'Resource not found', 404)
    if (e.code === 'PRODUCT_NOT_AVAILABLE') {
      return err('PRODUCT_NOT_AVAILABLE', e.message ?? 'Product not available', 409)
    }
    if (e.code === 'PAYMENT_INIT_FAILED') {
      return err('PAYMENT_INIT_FAILED', 'Payment gateway error — check Midtrans credentials', 502)
    }
    console.error('[POST /api/boutique/initiate-sale]', error)
    return serverError()
  }
}
