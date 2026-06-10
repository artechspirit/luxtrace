# Luxtrace — API Contract (Mobile App & Web Backend)
> Status: **SYNCHRONIZED WITH CODEBASE**  
> Version: 1.1.0 | Base URL: `http://localhost:3000/api` (or matching deployment host)  
> Format: JSON only | Auth: Bearer JWT (Supabase)

---

## Global Conventions

### Request Headers (for all protected endpoints)
```http
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
```

### Success Response Envelope
```json
{
  "success": true,
  "data": {}
}
```

### Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Global Error Codes
| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | JWT missing or expired |
| `FORBIDDEN` | 403 | Role permissions insufficient |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Invalid state for request |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 1. Auth + Wallet

### POST /auth/register
Register a new user. Backend automatically derives a unique custodial Ethereum wallet address.

**Request:**
```json
{
  "email": "buyer@example.com",
  "password": "Min8CharStrongPass!"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid-v4",
    "email": "buyer@example.com",
    "wallet_address": "0xABCD...1234",
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci..."
  }
}
```

---

### POST /auth/login
Authenticate with email/password.

**Request:**
```json
{
  "email": "buyer@example.com",
  "password": "Min8CharStrongPass!"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid-v4",
    "email": "buyer@example.com",
    "wallet_address": "0xABCD...1234",
    "role": "CONSUMER",
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci..."
  }
}
```

---

### POST /auth/oauth/google
Exchange a Google Auth Authorization Code for a system JWT.

**Request:**
```json
{
  "code": "4/0AdQt8q..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid-v4",
    "email": "buyer@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://lh3.googleusercontent.com/...",
    "wallet_address": "0xABCD...1234",
    "role": "CONSUMER",
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci..."
  }
}
```

---

### POST /auth/refresh
Refresh expired JWT tokens.

**Request:**
```json
{
  "refresh_token": "eyJhbGci..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci..."
  }
}
```

---

### GET /auth/me
Retrieve the profile of the currently logged-in user.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid-v4",
    "email": "buyer@example.com",
    "wallet_address": "0xABCD...1234",
    "role": "CONSUMER",
    "full_name": "John Doe",
    "avatar_url": null,
    "created_at": "2026-05-19T05:00:00Z",
    "updated_at": "2026-05-19T05:00:00Z"
  }
}
```

---

## 2. Products

### GET /products
Retrieve products. Admins/Operators can view all products. Consumers can only view products they currently own.

**Query Parameters:**
- `status` (optional: `MANUFACTURED` \| `REGISTERED` \| `OWNED` \| `IN_TRANSIT`)
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": "uuid-v4",
      "serial_number": "LUX-2026-00001",
      "brand": "Hermès",
      "name": "Birkin 30",
      "description": "Togo leather, Gold hardware",
      "price_idr": 350000000,
      "status": "OWNED",
      "nft_token_id": "42",
      "nfc_bound": true,
      "current_owner_id": "uuid-v4",
      "blockchain_tx_hash": "0xabc...def",
      "created_at": "2026-05-01T00:00:00Z",
      "updated_at": "2026-05-19T05:00:00Z"
    }
  ]
}
```

---

### GET /products/:product_id
Retrieve a specific product's details.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "product_id": "uuid-v4",
    "serial_number": "LUX-2026-00001",
    "brand": "Hermès",
    "name": "Birkin 30",
    "description": "Togo leather, Gold hardware",
    "price_idr": 350000000,
    "status": "OWNED",
    "nft_token_id": "42",
    "nfc_bound": true,
    "current_owner_id": "uuid-v4",
    "blockchain_tx_hash": "0xabc...def",
    "created_at": "2026-05-01T00:00:00Z",
    "updated_at": "2026-05-19T05:00:00Z"
  }
}
```

---

### POST /products/upload
**Admin/Operator only.** Batch manufacture products using a CSV file.

**Request:** `multipart/form-data`
- `file`: `<CSV file>` (CSV schema headers: `serial_number, brand, name, description, price_idr`)

**Response 202 (Accepted):**
```json
{
  "success": true,
  "data": {
    "batch_id": "uuid-v4",
    "status": "PROCESSING",
    "total_submitted": 2,
    "estimated_seconds": 15,
    "message": "Batch of 2 products submitted. Poll /api/products/batch/uuid-v4 for status."
  }
}
```

---

### GET /products/batch/:batch_id
**Admin/Operator only.** Poll status of batch manufacturing.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "batch_id": "uuid-v4",
    "status": "COMPLETED",
    "total_submitted": 2,
    "processed": 2,
    "results": [
      {
        "serial_number": "LUX-2026-00001",
        "product_id": "uuid-v4",
        "nft_token_id": "42",
        "tx_hash": "0xabc...def"
      }
    ],
    "failed": []
  }
}
```

---

## 3. Boutique Operations

### GET /boutique/products
**Operator/Admin only.** Retrieve a list of products available for boutique transactions (e.g. products at `REGISTERED` status).

**Query Parameters:** `limit`, `page`

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": "uuid-v4",
      "serial_number": "LUX-2026-00001",
      "brand": "Hermès",
      "name": "Birkin 30",
      "status": "REGISTERED",
      "price_idr": 350000000
    }
  ]
}
```

---

### POST /boutique/initiate-sale
**Operator/Admin only.** Initiate boutique sale checkout for a consumer.

**Request:**
```json
{
  "product_id": "uuid-v4",
  "buyer_email": "buyer@example.com", // lookup by email
  // OR
  "buyer_id": "uuid-v4",
  "sale_mode": "escrow" // optional, default: "escrow". Can be "escrow" or "direct"
}
```

**Response 201 (Escrow Mode):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid-v4",
    "order_id": "LUX-uuid-v4",
    "product": {
      "product_id": "uuid-v4",
      "brand": "Hermès",
      "name": "Birkin 30",
      "serial_number": "LUX-2026-00001"
    },
    "buyer": {
      "full_name": "John Doe",
      "email": "buyer@example.com"
    },
    "amount_idr": 350000000,
    "payment_url": "https://app.sandbox.midtrans.com/snap/v4/...",
    "snap_token": "abc123snaptoken...",
    "expires_at": "2026-05-19T06:00:00Z",
    "sale_mode": "escrow",
    "initiated_by": "uuid-operator-id",
    "note": "Buyer has been notified via push notification with the payment link."
  }
}
```

**Response 201 (Direct Mode - Over-the-counter Cash):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid-v4",
    "order_id": "LUX-uuid-v4",
    "product": {
      "product_id": "uuid-v4",
      "brand": "Hermès",
      "name": "Birkin 30",
      "serial_number": "LUX-2026-00001"
    },
    "buyer": {
      "full_name": "John Doe",
      "email": "buyer@example.com"
    },
    "amount_idr": 350000000,
    "qr_payload": "AES256_ENCRYPTED_BASE64_STRING",
    "session_id": "uuid-session-id",
    "expires_at": "2026-05-19T05:05:00Z",
    "sale_mode": "direct",
    "initiated_by": "uuid-operator-id",
    "note": "Boutique direct handover initiated. Show the QR to the buyer."
  }
}
```

---

## 4. NFC Operations

### POST /nfc/activate
**Operator/Admin only.** Bind a real scanned physical NFC UID to a product at `MANUFACTURED` status, upgrading it to `REGISTERED`.

**Request:**
```json
{
  "serial_number": "LUX-2026-00001",
  "nfc_uid": "04:A3:2B:C1:12:34:56"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "product_id": "uuid-v4",
    "serial_number": "LUX-2026-00001",
    "brand": "Hermès",
    "name": "Birkin 30",
    "nfc_uid": "04:A3:2B:C1:12:34:56",
    "status": "REGISTERED",
    "nft_token_id": "42"
  }
}
```

---

### POST /nfc/bind
**Operator/Admin only.** Manually bind NFC tag mapping.

**Request:**
```json
{
  "product_id": "uuid-v4"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "product_id": "uuid-v4",
    "nfc_bound": true
  }
}
```

---

### POST /nfc/verify
**Public Endpoint (No Auth required).** Standalone verify authenticity of a product by scanning its NFC chip.

**Request:**
```json
{
  "nfc_uid": "04:A3:2B:C1:12:34:56"
}
```

**Response 200 (Authentic):**
```json
{
  "success": true,
  "data": {
    "is_authentic": true,
    "message": "Product is authentic and verified by Luxtrace.",
    "product": {
      "product_id": "uuid-v4",
      "serial_number": "LUX-2026-00001",
      "brand": "Hermès",
      "name": "Birkin 30",
      "nft_token_id": "42",
      "current_status": "OWNED",
      "timeline": [
        {
          "log_id": "uuid-v4",
          "event": "MANUFACTURED",
          "actor_role": "brand",
          "metadata": {},
          "timestamp": "2026-05-01T00:00:00Z"
        }
      ]
    }
  }
}
```

---

## 5. Transactions & P2P

### GET /transactions
Retrieve transaction history. Admins/Operators view all records. Consumers view only their involved transactions.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "transaction_id": "uuid-v4",
      "type": "PRIMARY_BOUTIQUE",
      "status": "COMPLETED",
      "product_id": "uuid-v4",
      "seller_id": null,
      "buyer_id": "uuid-v4",
      "amount_idr": 350000000,
      "payment_ref": "LUX-uuid-v4",
      "blockchain_tx_hash": "0xabc...def",
      "created_at": "2026-05-19T05:00:00Z",
      "completed_at": "2026-05-19T05:01:30Z"
    }
  ]
}
```

---

### GET /transactions/:id
Retrieve transaction details. Includes `payment_url` if the transaction is pending checkout.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid-v4",
    "type": "PRIMARY_BOUTIQUE",
    "status": "PENDING",
    "product_id": "uuid-v4",
    "seller_id": null,
    "buyer_id": "uuid-v4",
    "amount_idr": 350000000,
    "payment_ref": "LUX-uuid-v4",
    "blockchain_tx_hash": null,
    "created_at": "2026-05-19T05:00:00Z",
    "completed_at": null,
    "payment_url": "https://app.sandbox.midtrans.com/snap/v4/..."
  }
}
```

---

### POST /transactions/:id/ship
**Seller only.** Mark a `PAID` remote shipping transaction as `IN_TRANSIT`.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid-v4",
    "status": "IN_TRANSIT",
    "product_status": "IN_TRANSIT"
  }
}
```

---

### POST /transactions/:id/simulate-payment
**Developer Helper.** Simulate payment settlement trigger. Runs the minting/custodial transfer process immediately.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "settled": true
  }
}
```

---

### POST /transactions/:id/verify-nfc
**Deprecated (Kept for backward compatibility).** Proxies remote shipping verification. Requires `session_id` to prevent replay attacks.

**Request:**
```json
{
  "scanned_uid": "04:A3:2B:C1:12:34:56",
  "session_id": "uuid-session-id"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid-v4",
    "status": "COMPLETED",
    "nfc_verified": true,
    "nft_transfer": {
      "tx_hash": "0xabc...def",
      "from_wallet": "0xSELLER...",
      "to_wallet": "0xBUYER...",
      "token_id": "42"
    },
    "escrow_released": true,
    "product_status": "OWNED"
  }
}
```

---

### POST /transactions/:id/direct-verify
**Buyer only.** Submit NFC verification for a direct face-to-face handover. If no `session_id` is supplied, backend automatically looks up or dynamically generates the session.

**Request:**
```json
{
  "scanned_uid": "04:A3:2B:C1:12:34:56",
  "session_id": "uuid-session-id" // optional
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid-v4",
    "status": "COMPLETED",
    "nfc_verified": true,
    "nft_transfer": {
      "tx_hash": "0xabc...def",
      "from_wallet": "0xSELLER...",
      "to_wallet": "0xBUYER...",
      "token_id": "42"
    },
    "product_status": "OWNED",
    "via": "DIRECT_HANDOVER"
  }
}
```

---

### POST /p2p/remote/init
**Seller (Consumer) only.** Initiate P2P Remote Shipping. Creates escrow invoice.

**Request:**
```json
{
  "product_id": "uuid-v4",
  "buyer_id": "uuid-v4",
  "agreed_price_idr": 300000000
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid-v4",
    "order_id": "LUX-uuid-v4",
    "amount_idr": 300000000,
    "snap_token": "abc123snaptoken...",
    "payment_url": "https://app.sandbox.midtrans.com/snap/v4/...",
    "expires_at": "2026-05-20T05:00:00Z"
  }
}
```

---

### POST /p2p/direct/init
**Seller (Consumer) only.** Initiate direct P2P face-to-face handover. Generates a QR session valid for 5 minutes.

**Request:**
```json
{
  "product_id": "uuid-v4",
  "buyer_id": "uuid-v4"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "transaction": {
      "transaction_id": "uuid-v4",
      "type": "P2P_DIRECT_HANDOVER",
      "status": "PENDING",
      "product_id": "uuid-v4",
      "seller_id": "uuid-v4",
      "buyer_id": "uuid-v4",
      "amount_idr": 0
    },
    "qr_payload": "AES256_ENCRYPTED_BASE64_STRING",
    "session_id": "uuid-session-id",
    "expires_at": "2026-06-10T12:25:00Z"
  }
}
```

---

### GET /p2p/remote/:transaction_id/qr
*Alias Route: `GET /api/transactions/:id/qr`*  
**Seller (Consumer) only.** Generates or retrieves the single-use handover QR session for a given remote shipping transaction.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "qr_payload": "AES256_ENCRYPTED_BASE64_STRING",
    "session_id": "uuid-session-id",
    "expires_at": "9999-12-31T23:59:59.999Z", // no expiry for remote shipping
    "instructions": "Show this QR to the buyer. They must scan this QR AND tap the NFC chip on the physical product to verify."
  }
}
```

---

### POST /p2p/verify
**Buyer (Consumer) only.** Submit NFC scan result to verify product authenticity and release escrow. This is the main gate for both `P2P_REMOTE_SHIPPING` and `P2P_DIRECT_HANDOVER`.

**Request:**
```json
{
  "session_id": "uuid-session-id",
  "scanned_uid": "04:A3:2B:C1:12:34:56",
  "mode": "remote" // optional: "remote" | "direct". Default: "remote"
}
```

**Response 200 (Success):**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "transaction_id": "uuid-v4",
    "nft_transfer": {
      "tx_hash": "0xabc...def",
      "from_wallet": "0xSELLER...",
      "to_wallet": "0xBUYER...",
      "token_id": "42"
    },
    "escrow_released": true,
    "product_status": "OWNED"
  }
}
```

---

### GET /users/lookup
**Auth required.** Look up user's internal ID by email (e.g. when setting up a P2P listing).

**Query Parameters:** `email`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid-v4",
    "email": "buyer@example.com"
  }
}
```

---

## 6. Payment Webhooks (Internal Callback)

### POST /webhooks/midtrans
*Alias Route: `POST /webhooks/payment`*  
Called by Midtrans servers to notify system of payment status changes.

**Payload:**
```json
{
  "transaction_id": "midtrans-uuid-v4",
  "order_id": "LUX-uuid-v4",
  "transaction_status": "settlement",
  "status_code": "200",
  "gross_amount": "300000000.00",
  "payment_type": "qris",
  "signature_key": "sha512_hash_from_midtrans"
}
```

---

## 7. Provenance

### GET /provenance/:product_id
**Public Endpoint (No Auth required).** Retrieve full timeline provenance records for a product.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "product_id": "uuid-v4",
    "serial_number": "LUX-2026-00001",
    "brand": "Hermès",
    "name": "Birkin 30",
    "nft_token_id": "42",
    "current_status": "OWNED",
    "timeline": [
      {
        "log_id": "uuid-v4",
        "event": "MANUFACTURED",
        "actor_role": "brand",
        "metadata": {
          "batch_id": "uuid-batch-id"
        },
        "timestamp": "2026-05-01T00:00:00Z"
      },
      {
        "log_id": "uuid-v4",
        "event": "REGISTERED",
        "actor_role": "brand",
        "metadata": {
          "nft_token_id": "42",
          "tx_hash": "0xabc...def"
        },
        "timestamp": "2026-05-01T00:00:15Z"
      }
    ]
  }
}
```

---

## 8. Endpoint Index

| Method | Path | Auth | Role | Domain |
|---|---|---|---|---|
| POST | `/auth/register` | ✗ | - | Auth |
| POST | `/auth/login` | ✗ | - | Auth |
| POST | `/auth/oauth/google` | ✗ | - | Auth |
| POST | `/auth/refresh` | ✗ | - | Auth |
| GET | `/auth/me` | ✓ | any | Auth |
| GET | `/products` | ✓ | any | Products |
| GET | `/products/:product_id` | ✓ | any | Products |
| POST | `/products/upload` | ✓ | admin / operator | Products |
| GET | `/products/batch/:batch_id` | ✓ | admin / operator | Products |
| GET | `/boutique/products` | ✓ | admin / operator | Boutique |
| POST | `/boutique/initiate-sale` | ✓ | admin / operator | Boutique |
| POST | `/nfc/activate` | ✓ | admin / operator | NFC |
| POST | `/nfc/bind` | ✓ | admin / operator | NFC |
| POST | `/nfc/verify` | ✗ | - | NFC |
| GET | `/transactions` | ✓ | any | Transactions |
| GET | `/transactions/:id` | ✓ | any | Transactions |
| POST | `/transactions/:id/ship` | ✓ | consumer (seller) | Transactions |
| POST | `/transactions/:id/simulate-payment`| ✓ | any | Transactions |
| POST | `/transactions/:id/verify-nfc` | ✓ | consumer (buyer) | Transactions |
| POST | `/transactions/:id/direct-verify` | ✓ | consumer (buyer) | Transactions |
| POST | `/p2p/remote/init` | ✓ | consumer (seller) | P2P |
| POST | `/p2p/direct/init` | ✓ | consumer (seller) | P2P |
| GET | `/p2p/remote/:transaction_id/qr` | ✓ | consumer (seller) | P2P |
| POST | `/p2p/verify` | ✓ | consumer (buyer) | P2P |
| GET | `/users/lookup` | ✓ | any | Users |
| POST | `/webhooks/midtrans` | ✗ | - | Payment |
| POST | `/webhooks/payment` | ✗ | - | Payment |
| GET | `/provenance/:product_id` | ✗ | - | Provenance |

---

## 9. Event Enum Reference

### product.status
`MANUFACTURED` · `REGISTERED` · `OWNED` · `IN_TRANSIT`

### transaction.type
`PRIMARY_BOUTIQUE` · `P2P_REMOTE_SHIPPING` · `P2P_DIRECT_HANDOVER`

### transaction.status
`PENDING` · `PAID` · `IN_TRANSIT` · `COMPLETED` · `CANCELLED` · `FRAUD_FLAGGED`

### product_log.event
`MANUFACTURED` · `REGISTERED` · `BRAND_OUTLET` · `TRANSFERRED` · `FRAUD_ATTEMPT`

---

## 10. Required Environment Variables

| Variable | Scope / Service | Description |
|---|---|---|
| `SUPABASE_URL` | DB Client | Supabase instance API URL |
| `SUPABASE_SERVICE_KEY` | Backend Only | Service role key for bypass RLS |
| `SUPABASE_ANON_KEY` | Client / Web | Public anonymous access token |
| `MIDTRANS_SERVER_KEY` | payment.service | Midtrans private API key |
| `MIDTRANS_CLIENT_KEY` | Client UI | Midtrans client key |
| `MIDTRANS_ENV` | payment.service | Midtrans environment mode (`sandbox` \| `production`) |
| `NEXT_PUBLIC_APP_URL` | Web App | Main deployment domain URL (used for payment callbacks) |
| `THIRDWEB_SECRET_KEY` | blockchain.service | Thirdweb SDK v5 secret key |
| `BRAND_WALLET_PRIVATE_KEY`| blockchain.service | Private key of Brand authority wallet (signs mints) |
| `BRAND_WALLET_ADDRESS` | blockchain.service | Public address of Brand authority wallet |
| `NFT_CONTRACT_ADDRESS` | blockchain.service | Sepolia smart contract ERC-721 address |
| `WALLET_MASTER_SEED` | auth.service | Deterministic hex-encoded master seed to generate user custodial keys |
| `NFC_SECRET_SALT` | nfc.service | Cryptographic seed for secure hashing of NFC tags |
| `QR_ENCRYPTION_KEY` | nfc.service | 32-byte hex-encoded key for AES-256 payload encryption |
