# Luxtrace — Final API Contract (Mobile App)
> Status: **FINAL — IMMUTABLE AFTER PUBLISH**  
> Version: 1.0.0 | Base URL: `https://api.luxtrace.id/v1`  
> Format: JSON only | Auth: Bearer JWT (Supabase)

---

## Global Conventions

### Request Headers (semua protected endpoint)
```http
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
X-Client-Version: 1.0.0
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
| `UNAUTHORIZED` | 401 | JWT missing / expired |
| `FORBIDDEN` | 403 | Role tidak cukup |
| `NOT_FOUND` | 404 | Resource tidak ada |
| `CONFLICT` | 409 | State tidak valid untuk operasi ini |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 1. Auth + Wallet

### POST /auth/register
Daftarkan user baru. Backend otomatis generate Thirdweb In-App Wallet.

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

**Errors:**
| Code | HTTP | Trigger |
|---|---|---|
| `EMAIL_ALREADY_EXISTS` | 409 | Email sudah terdaftar |
| `WEAK_PASSWORD` | 422 | Password tidak memenuhi policy |
| `WALLET_GENERATION_FAILED` | 502 | Thirdweb Engine error |

---

### POST /auth/login
```json
// Request
{
  "email": "buyer@example.com",
  "password": "Min8CharStrongPass!"
}

// Response 200
{
  "success": true,
  "data": {
    "user_id": "uuid-v4",
    "email": "buyer@example.com",
    "wallet_address": "0xABCD...1234",
    "role": "buyer",
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci..."
  }
}
```

**Errors:** `INVALID_CREDENTIALS` 401, `ACCOUNT_SUSPENDED` 403

---

### POST /auth/refresh
```json
// Request
{ "refresh_token": "eyJhbGci..." }

// Response 200
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
Ambil profil user yang sedang login.

```json
// Response 200
{
  "success": true,
  "data": {
    "user_id": "uuid-v4",
    "email": "buyer@example.com",
    "wallet_address": "0xABCD...1234",
    "role": "buyer",
    "created_at": "2026-05-19T05:00:00Z"
  }
}
```

---

## 2. Products

### GET /products
Ambil daftar produk. Admin: semua produk. Buyer: produk miliknya.

**Query params:** `status`, `page` (default 1), `limit` (default 20)

```json
// Response 200
{
  "success": true,
  "data": {
    "items": [
      {
        "product_id": "uuid-v4",
        "serial_number": "LUX-2026-00001",
        "brand": "Hermès",
        "name": "Birkin 30",
        "status": "OWNED",
        "nft_token_id": "42",
        "current_owner_id": "uuid-v4",
        "created_at": "2026-05-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 145
    }
  }
}
```

---

### GET /products/:product_id
```json
// Response 200
{
  "success": true,
  "data": {
    "product_id": "uuid-v4",
    "serial_number": "LUX-2026-00001",
    "brand": "Hermès",
    "name": "Birkin 30",
    "description": "Togo leather, Gold hardware",
    "status": "OWNED",
    "nft_token_id": "42",
    "nfc_bound": true,
    "current_owner_id": "uuid-v4",
    "current_owner_email": "buyer@example.com",
    "blockchain_tx_hash": "0xabc...def",
    "created_at": "2026-05-01T00:00:00Z",
    "updated_at": "2026-05-19T05:00:00Z"
  }
}
```

**Errors:** `NOT_FOUND` 404, `FORBIDDEN` 403 (buyer tidak boleh lihat produk orang lain)

---

### POST /products/batch
**Admin only.** Batch manufacturing dari CSV payload.

**Request:**
```json
{
  "products": [
    {
      "serial_number": "LUX-2026-00001",
      "brand": "Hermès",
      "name": "Birkin 30",
      "description": "Togo leather, Gold hardware",
      "price_idr": 350000000
    },
    {
      "serial_number": "LUX-2026-00002",
      "brand": "Chanel",
      "name": "Classic Flap Medium",
      "description": "Caviar leather, Silver hardware",
      "price_idr": 120000000
    }
  ]
}
```

**Response 202** (async — blockchain finality ~15 detik):
```json
{
  "success": true,
  "data": {
    "batch_id": "uuid-v4",
    "total_submitted": 2,
    "status": "PROCESSING",
    "estimated_seconds": 15
  }
}
```

**Errors:**
| Code | HTTP | Trigger |
|---|---|---|
| `DUPLICATE_SERIAL` | 409 | serial_number sudah ada di DB |
| `INVALID_PAYLOAD` | 422 | Field wajib kosong / format salah |
| `MINT_FAILED` | 502 | Thirdweb Engine gagal |

---

### GET /products/batch/:batch_id
Poll status batch manufacturing.

```json
// Response 200
{
  "success": true,
  "data": {
    "batch_id": "uuid-v4",
    "status": "COMPLETED",
    "results": [
      {
        "serial_number": "LUX-2026-00001",
        "product_id": "uuid-v4",
        "status": "REGISTERED",
        "nft_token_id": "42",
        "tx_hash": "0xabc...def"
      }
    ],
    "failed": []
  }
}
```

---

## 3. Transactions — Primary Boutique Sale

### POST /transactions/primary
Initiate pembelian produk baru dari boutique.

**Request:**
```json
{
  "product_id": "uuid-v4"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid-v4",
    "type": "PRIMARY_BOUTIQUE",
    "status": "PENDING",
    "product_id": "uuid-v4",
    "amount_idr": 350000000,
    "payment": {
      "order_id": "LUX-TXN-uuid-v4",
      "payment_url": "https://app.sandbox.midtrans.com/snap/v4/...",
      "va_number": "1234567890",
      "qris_url": "https://api.sandbox.midtrans.com/qris/..."
    },
    "expires_at": "2026-05-19T06:00:00Z"
  }
}
```

**Errors:**
| Code | HTTP | Trigger |
|---|---|---|
| `PRODUCT_NOT_AVAILABLE` | 409 | Status bukan REGISTERED |
| `PRODUCT_LOCKED` | 409 | Produk sedang dalam transaksi lain |
| `PAYMENT_INIT_FAILED` | 502 | Midtrans error |

---

### GET /transactions/:transaction_id
Ambil detail transaksi apapun.

```json
// Response 200
{
  "success": true,
  "data": {
    "transaction_id": "uuid-v4",
    "type": "PRIMARY_BOUTIQUE",
    "status": "COMPLETED",
    "product_id": "uuid-v4",
    "seller_id": null,
    "buyer_id": "uuid-v4",
    "amount_idr": 350000000,
    "payment_ref": "LUX-TXN-uuid-v4",
    "blockchain_tx_hash": "0xabc...def",
    "created_at": "2026-05-19T05:00:00Z",
    "completed_at": "2026-05-19T05:01:30Z"
  }
}
```

---

## 4. Payment Webhook (Internal — Midtrans Callback)

### POST /webhooks/midtrans
> **Tidak dipanggil oleh mobile app.** Dipanggil Midtrans server ke server.  
> Disertakan untuk kelengkapan contract.

**Midtrans akan POST:**
```json
{
  "order_id": "LUX-TXN-uuid-v4",
  "transaction_status": "settlement",
  "payment_type": "qris",
  "gross_amount": "350000000.00",
  "signature_key": "sha512_hash_dari_midtrans"
}
```

**Backend validates:**
1. `signature_key` = SHA512(`order_id` + `status_code` + `gross_amount` + `MIDTRANS_SERVER_KEY`)
2. Idempotency: jika `order_id` sudah PAID → return 200 tanpa proses ulang
3. Trigger NFT transfer + state update

**Response 200:**
```json
{ "received": true }
```

---

## 5. P2P Remote Shipping (Escrow)

### POST /transactions/p2p-remote
Seller initiate — buyer commit escrow.

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
    "type": "P2P_REMOTE_SHIPPING",
    "status": "PENDING",
    "product_id": "uuid-v4",
    "seller_id": "uuid-v4",
    "buyer_id": "uuid-v4",
    "amount_idr": 300000000,
    "payment": {
      "order_id": "LUX-P2P-uuid-v4",
      "payment_url": "https://app.sandbox.midtrans.com/snap/v4/...",
      "va_number": "9876543210"
    },
    "expires_at": "2026-05-20T05:00:00Z"
  }
}
```

**Errors:**
| Code | HTTP | Trigger |
|---|---|---|
| `NOT_OWNER` | 403 | Caller bukan owner produk |
| `PRODUCT_LOCKED` | 409 | Sudah IN_TRANSIT |
| `SELF_TRADE` | 422 | seller_id = buyer_id |

---

### GET /transactions/:transaction_id/qr-payload
**Seller only.** Generate QR untuk dikirim ke buyer setelah escrow terkunci.

```json
// Response 200
{
  "success": true,
  "data": {
    "transaction_id": "uuid-v4",
    "qr_payload": "AES256_ENCRYPTED_BASE64_STRING",
    "expires_at": "2026-05-19T05:05:00Z"
  }
}
```

> `qr_payload` = AES-256 encrypt dari `{ transaction_id, product_id, nfc_uid_hash_hint }`.  
> Raw NFC UID **tidak pernah** ada dalam response ini.

**Errors:**
| Code | HTTP | Trigger |
|---|---|---|
| `FORBIDDEN` | 403 | Caller bukan seller transaksi ini |
| `ESCROW_NOT_LOCKED` | 409 | Buyer belum bayar (status != PAID) |
| `SESSION_EXPIRED` | 410 | QR sudah expire atau sudah dipakai |

---

### POST /transactions/:transaction_id/verify-nfc
**Buyer only.** Submit NFC scan result untuk release escrow.

**Request:**
```json
{
  "scanned_uid": "raw_uid_dari_nfc_chip"
}
```

**Response 200 (NFC match):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid-v4",
    "status": "COMPLETED",
    "nfc_verified": true,
    "nft_transfer": {
      "tx_hash": "0xabc...def",
      "from_wallet": "0xSELLER...WALLET",
      "to_wallet": "0xBUYER...WALLET",
      "token_id": "42"
    },
    "escrow_released": true,
    "product_status": "OWNED"
  }
}
```

**Response 400 (NFC mismatch — fraud):**
```json
{
  "success": false,
  "error": {
    "code": "NFC_MISMATCH",
    "message": "Physical product does not match transaction record. Fraud attempt has been logged."
  }
}
```

**All errors:**
| Code | HTTP | Trigger |
|---|---|---|
| `NFC_MISMATCH` | 400 | UID tidak cocok |
| `FORBIDDEN` | 403 | Caller bukan buyer transaksi ini |
| `INVALID_STATE` | 409 | Transaksi bukan IN_TRANSIT |
| `NFT_TRANSFER_FAILED` | 502 | Thirdweb Engine error |
| `ESCROW_RELEASE_FAILED` | 502 | Midtrans refund API error |

---

## 6. P2P Direct Handover

### POST /transactions/p2p-direct
**Seller only.** Create sesi handover tatap muka.

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
    "transaction_id": "uuid-v4",
    "type": "P2P_DIRECT_HANDOVER",
    "status": "PENDING",
    "qr_payload": "AES256_ENCRYPTED_BASE64_STRING",
    "session_expires_at": "2026-05-19T05:05:00Z"
  }
}
```

> Session TTL: **5 menit**. QR hangus setelah 1x pakai atau TTL habis.

**Errors:** `NOT_OWNER` 403, `PRODUCT_LOCKED` 409, `SELF_TRADE` 422

---

### POST /transactions/:transaction_id/direct-verify
**Buyer only.** Submit NFC proximity scan untuk complete handover.

**Request:**
```json
{
  "scanned_uid": "raw_uid_dari_nfc_chip"
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
      "from_wallet": "0xSELLER...WALLET",
      "to_wallet": "0xBUYER...WALLET",
      "token_id": "42"
    },
    "product_status": "OWNED",
    "via": "DIRECT_HANDOVER"
  }
}
```

**Errors:**
| Code | HTTP | Trigger |
|---|---|---|
| `NFC_MISMATCH` | 400 | UID tidak cocok |
| `SESSION_EXPIRED` | 410 | TTL 5 menit habis |
| `FORBIDDEN` | 403 | Caller bukan buyer sesi ini |
| `NFT_TRANSFER_FAILED` | 502 | Thirdweb Engine error |

---

## 7. NFC Validation (Standalone)

### POST /nfc/verify-ownership
Verifikasi kepemilikan produk via NFC tanpa transaksi (untuk authenticity check).

**Request:**
```json
{
  "scanned_uid": "raw_uid_dari_nfc_chip"
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
    "status": "OWNED",
    "current_owner_id": "uuid-v4",
    "nft_token_id": "42",
    "verified": true
  }
}
```

**Response 404 (UID tidak dikenal):**
```json
{
  "success": false,
  "error": {
    "code": "NFC_NOT_REGISTERED",
    "message": "This NFC tag is not registered in the Luxtrace system."
  }
}
```

> Raw UID tidak pernah dikembalikan dalam response. Backend hanya kirim data produk.

---

## 8. Provenance

### GET /provenance/:product_id
Ambil timeline lengkap satu produk. **Public endpoint** (tanpa auth).

```json
// Response 200
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
          "batch_id": "uuid-v4"
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
      },
      {
        "log_id": "uuid-v4",
        "event": "BRAND_OUTLET",
        "actor_role": "brand",
        "metadata": {
          "transaction_id": "uuid-v4",
          "tx_hash": "0xdef...abc"
        },
        "timestamp": "2026-05-10T10:00:00Z"
      },
      {
        "log_id": "uuid-v4",
        "event": "TRANSFERRED",
        "actor_role": "owner",
        "metadata": {
          "transaction_id": "uuid-v4",
          "via": "P2P_REMOTE_SHIPPING",
          "tx_hash": "0x111...222"
        },
        "timestamp": "2026-05-19T05:01:30Z"
      }
    ]
  }
}
```

> Owner identifiers **tidak diexpose** di provenance publik. Hanya role dan metadata on-chain.

**Errors:** `NOT_FOUND` 404 jika product_id tidak ada.

---

## 9. Endpoint Index

| Method | Path | Auth | Role | Domain |
|---|---|---|---|---|
| POST | `/auth/register` | ✗ | - | Auth |
| POST | `/auth/login` | ✗ | - | Auth |
| POST | `/auth/refresh` | ✗ | - | Auth |
| GET | `/auth/me` | ✓ | any | Auth |
| GET | `/products` | ✓ | any | Products |
| GET | `/products/:id` | ✓ | any | Products |
| POST | `/products/batch` | ✓ | admin | Products |
| GET | `/products/batch/:batch_id` | ✓ | admin | Products |
| POST | `/transactions/primary` | ✓ | buyer | Transactions |
| GET | `/transactions/:id` | ✓ | any | Transactions |
| POST | `/transactions/p2p-remote` | ✓ | seller | P2P Remote |
| GET | `/transactions/:id/qr-payload` | ✓ | seller | P2P Remote |
| POST | `/transactions/:id/verify-nfc` | ✓ | buyer | P2P Remote |
| POST | `/transactions/p2p-direct` | ✓ | seller | Direct Handover |
| POST | `/transactions/:id/direct-verify` | ✓ | buyer | Direct Handover |
| POST | `/webhooks/midtrans` | IP whitelist | - | Payment |
| POST | `/nfc/verify-ownership` | ✓ | any | NFC |
| GET | `/provenance/:product_id` | ✗ | - | Provenance |

---

## 10. Event Enum Reference

### product.status
`MANUFACTURED` · `REGISTERED` · `OWNED` · `IN_TRANSIT`

### transaction.type
`PRIMARY_BOUTIQUE` · `P2P_REMOTE_SHIPPING` · `P2P_DIRECT_HANDOVER`

### transaction.status
`PENDING` · `PAID` · `IN_TRANSIT` · `COMPLETED` · `CANCELLED` · `FRAUD_FLAGGED`

### product_log.event
`MANUFACTURED` · `REGISTERED` · `BRAND_OUTLET` · `TRANSFERRED`

---

## 11. ENV Variables (Dibutuhkan Backend)

| Variable | Service |
|---|---|
| `SUPABASE_URL` | All repositories |
| `SUPABASE_SERVICE_KEY` | All repositories (server only) |
| `THIRDWEB_SECRET` | blockchain.service |
| `THIRDWEB_ENGINE_URL` | blockchain.service |
| `BRAND_WALLET_ADDRESS` | blockchain.service |
| `MIDTRANS_SERVER_KEY` | payment.service |
| `MIDTRANS_CLIENT_KEY` | payment.service |
| `NFC_SECRET_SALT` | nfc.service |
| `QR_ENCRYPTION_KEY` | nfc.service, transaction.service |
