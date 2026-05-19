import { NextRequest } from 'next/server'
import { productService } from '@/services/product.service'
import { getAuthenticatedUser } from '@/lib/auth'
import { parseCsvBuffer, CsvValidationError } from '@/lib/csv-parser'
import { ok, err, unauthorized, forbidden, serverError } from '@/lib/response'

/**
 * POST /api/products/upload
 *
 * Upload a CSV file to batch-manufacture products.
 * Role required: ADMIN or OPERATOR
 *
 * Request: multipart/form-data
 *   - file: <csv_file>
 *
 * CSV Schema (header row required):
 *   serial_number, brand, name, description, price_idr
 *
 * Example row:
 *   LUX-2026-00001, Hermès, Birkin 30, Togo leather Gold hardware, 350000000
 *
 * Response 202: batch processing started
 * Response 422: CSV validation errors (returned as structured array)
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth + role check
    const user = await getAuthenticatedUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN' && user.role !== 'OPERATOR') {
      return forbidden('Only ADMIN or OPERATOR can upload products')
    }

    // 2. Parse multipart form
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return err('INVALID_PAYLOAD', 'form field "file" is required (multipart/form-data)', 422)
    }

    if (!file.name.endsWith('.csv')) {
      return err('INVALID_FILE_TYPE', 'Only .csv files are accepted', 422)
    }

    // 3. Parse + validate CSV
    const buffer = Buffer.from(await file.arrayBuffer())
    const { items, total } = parseCsvBuffer(buffer)

    // 4. Trigger batch manufacture (async — returns immediately)
    const result = await productService.batchManufacture(items, user.user_id)

    return ok(
      {
        batch_id: result.batch_id,
        status: result.status,
        total_submitted: result.total_submitted,
        estimated_seconds: result.estimated_seconds,
        message: `Batch of ${total} products submitted. Poll /api/products/batch/${result.batch_id} for status.`,
      },
      202
    )
  } catch (error: unknown) {
    const e = error as { code?: string; message?: string; errors?: unknown; duplicates?: string[] }

    if (error instanceof CsvValidationError) {
      return ok(
        {
          valid: false,
          message: error.message,
          errors: error.errors,
        },
        422
      )
    }

    if (e.code === 'DUPLICATE_SERIAL') {
      return err(
        'DUPLICATE_SERIAL',
        `Duplicate serials found in database: ${e.duplicates?.join(', ')}`,
        409
      )
    }

    console.error('[POST /api/products/upload]', error)
    return serverError()
  }
}
