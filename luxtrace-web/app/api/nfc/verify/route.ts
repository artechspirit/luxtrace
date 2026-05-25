import { NextRequest } from 'next/server'
import { nfcService } from '@/services/nfc.service'
import { productService } from '@/services/product.service'
import { ok, err, serverError } from '@/lib/response'

/**
 * POST /api/nfc/verify
 * 
 * Public endpoint to verify the authenticity of a product by scanning its NFC chip.
 * This does not require authentication (anyone can scan a bag to verify it).
 * 
 * Request:
 * {
 *   "nfc_uid": "04:A3:2B:C1:12:34:56" // The raw UID scanned from the physical NFC chip
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "is_authentic": true,
 *     "message": "Product is authentic and verified by Luxtrace.",
 *     "product": { ...provenance_data... }
 *   }
 * }
 * 
 * Errors:
 * - PRODUCT_NOT_FOUND 404: NFC tag not recognized (Counterfeit / Not Registered)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nfc_uid } = body

    if (!nfc_uid || typeof nfc_uid !== 'string') {
      return err('INVALID_PAYLOAD', 'nfc_uid is required', 422)
    }

    // 1. Find product ID securely using the scanned UID
    // This function hashes the input and compares it with the database
    const productId = await nfcService.findProductByScannedUid(nfc_uid.trim())

    if (!productId) {
      // Return a specific 404 response to indicate a potential counterfeit or unregistered tag
      return err(
        'PRODUCT_NOT_FOUND', 
        'This NFC tag is not registered in the Luxtrace system. Potential counterfeit.', 
        404
      )
    }

    // 2. Fetch the public provenance data for this product
    // getProvenance returns all public data including timeline history
    const provenance = await productService.getProvenance(productId)

    // 3. Return the authenticity data
    return ok({
      is_authentic: true,
      message: 'Product is authentic and verified by Luxtrace.',
      product: provenance
    })

  } catch (error: unknown) {
    console.error('[POST /api/nfc/verify]', error)
    return serverError()
  }
}
