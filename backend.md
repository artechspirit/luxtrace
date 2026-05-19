# Luxtrace Backend Engineering Rules

## 1. Architecture

Pattern:
Route → Service → Repository → Database

DILARANG:

- Query DB di route
- Business logic di controller

---

## 2. Folder Structure

/app/api
/services
/repositories
/lib
/types

---

## 3. Core Services

- auth.service.ts
- product.service.ts
- transaction.service.ts
- nfc.service.ts
- blockchain.service.ts
- payment.service.ts

---

## 4. API Rules

- JSON only
- Consistent format:

SUCCESS:
{
"success": true,
"data": {}
}

ERROR:
{
"success": false,
"error": {
"code": "",
"message": ""
}
}

---

## 5. Security Rules

- Validate webhook signature
- Rate limit semua endpoint
- No trust client
- Semua verifikasi server-side

---

## 6. Transaction Rules

- Idempotent
- Atomic update
- Gunakan status locking

---

## 7. Blockchain Rules

- Semua transaksi via Thirdweb Engine
- Gunakan relayer (gasless)
- Simpan tx_hash

---

## 8. NFC Validation

- Bandingkan nfc_uid
- Gunakan secure_key_hash
- Tidak expose raw UID ke client

---

## 9. Payment Rules

- Gunakan Midtrans sandbox
- Validasi signature
- Webhook async

---

## 10. ENV Requirements (bisa kamu tambah / adjust sesuai kebutuhan)

- SUPABASE_URL
- SUPABASE_KEY
- THIRDWEB_SECRET
- MIDTRANS_SERVER_KEY
