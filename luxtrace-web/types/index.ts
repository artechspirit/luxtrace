// ─── Product ─────────────────────────────────────────────────────────────────

export type ProductStatus = 'MANUFACTURED' | 'REGISTERED' | 'OWNED' | 'IN_TRANSIT'

export interface Product {
  product_id: string
  serial_number: string
  brand: string
  name: string
  description: string
  price_idr: number
  status: ProductStatus
  nft_token_id: string | null
  nfc_bound: boolean
  current_owner_id: string | null
  blockchain_tx_hash: string | null
  created_at: string
  updated_at: string
}

export interface ProductBatchItem {
  serial_number: string
  brand: string
  name: string
  description: string
  price_idr: number
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export type TransactionType =
  | 'PRIMARY_BOUTIQUE'
  | 'P2P_REMOTE_SHIPPING'
  | 'P2P_DIRECT_HANDOVER'

export type TransactionStatus =
  | 'PENDING'
  | 'PAID'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FRAUD_FLAGGED'

export interface Transaction {
  transaction_id: string
  type: TransactionType
  status: TransactionStatus
  product_id: string
  seller_id: string | null
  buyer_id: string
  amount_idr: number
  payment_ref: string | null
  blockchain_tx_hash: string | null
  created_at: string
  completed_at: string | null
}

// ─── Profile ──────────────────────────────────────────────────────────────────

/** ADMIN: full system access | OPERATOR: brand/boutique | CONSUMER: end buyer */
export type UserRole = 'ADMIN' | 'OPERATOR' | 'CONSUMER'

export interface Profile {
  user_id: string
  email: string
  wallet_address: string
  role: UserRole
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ─── NFC ──────────────────────────────────────────────────────────────────────

export interface NfcTag {
  nfc_id: string
  nfc_uid: string
  secure_key_hash: string
  product_id: string
  created_at: string
}

// ─── Product Log ──────────────────────────────────────────────────────────────

export type ProductLogEvent =
  | 'MANUFACTURED'
  | 'REGISTERED'
  | 'BRAND_OUTLET'
  | 'TRANSFERRED'
  | 'FRAUD_ATTEMPT'

export interface ProductLog {
  log_id: string
  product_id: string
  event: ProductLogEvent
  actor_id: string | null
  actor_role: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Blockchain ───────────────────────────────────────────────────────────────

export interface BlockchainTxResult {
  tx_hash: string
  token_id?: string
}

export interface BatchMintResult {
  batch_id: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  results: Array<{
    serial_number: string
    product_id: string
    nft_token_id: string
    tx_hash: string
  }>
  failed: string[]
}
