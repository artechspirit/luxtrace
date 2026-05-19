import { NextResponse } from 'next/server'
import type { ApiSuccess, ApiError } from '@/types'

/**
 * Standard success response with typed data.
 */
export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Standard error response matching API contract.
 */
export function err(
  code: string,
  message: string,
  status = 400
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  )
}

// ─── Named error helpers ─────────────────────────────────────────────────────

export const unauthorized = (message = 'Authentication required') =>
  err('UNAUTHORIZED', message, 401)

export const forbidden = (message = 'Insufficient permissions') =>
  err('FORBIDDEN', message, 403)

export const notFound = (resource = 'Resource') =>
  err('NOT_FOUND', `${resource} not found`, 404)

export const conflict = (code: string, message: string) =>
  err(code, message, 409)

export const unprocessable = (message: string) =>
  err('INVALID_PAYLOAD', message, 422)

export const serverError = (message = 'Internal server error') =>
  err('INTERNAL_ERROR', message, 500)

export const badGateway = (code: string, message: string) =>
  err(code, message, 502)
