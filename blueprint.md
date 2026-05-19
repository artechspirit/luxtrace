# Luxtrace Master System Blueprint (Final)

## 1. Core Concept

Luxtrace adalah sistem Digital Twin Asset berbasis:

- NFT (ownership proof)
- NFC Proxy (physical validation)
- Supabase (off-chain state)
- Thirdweb (on-chain execution)

Prinsip:

- Off-chain = logic & state
- On-chain = proof of ownership
- Backend = single source of truth

---

## 2. Product State Machine

STATE:

- MANUFACTURED
- REGISTERED
- OWNED
- IN_TRANSIT

RULES:

- Hanya backend yang boleh mengubah state
- State harus konsisten dengan transaksi

---

## 3. Database Entities

### profiles

- email → unique
- wallet_address → 1:1 mapping

### products

- serial_number → unique
- status → lifecycle state
- nft_token_id → on-chain reference

### nfc_tags

- nfc_uid → unique hardware proxy
- secure_key_hash → SHA256(uid + salt)

### transactions

- type:
  - PRIMARY_BOUTIQUE
  - P2P_REMOTE_SHIPPING
  - P2P_DIRECT_HANDOVER
- status:
  - PENDING
  - PAID
  - IN_TRANSIT
  - COMPLETED
  - CANCELLED

### product_logs

- immutable history
- ordered by created_at

---

## 4. Authentication Model

- Supabase Auth (email + Google)
- Setelah login:
  - create profile jika belum ada
  - generate wallet via Thirdweb
- Wallet adalah identity utama

---

## 5. Manufacturing Flow

1. Upload CSV
2. Insert products → status MANUFACTURED
3. Batch mint NFT → ke wallet brand
4. Bind NFC:
   - generate UID
   - hash UID
   - simpan ke nfc_tags
5. Update:
   - product → REGISTERED
   - log → REGISTERED

---

## 6. Primary Sale (Boutique)

Flow:

1. Create payment invoice
2. User bayar (QRIS/VA)
3. Webhook diterima backend
4. Validasi signature

Jika sukses:

- transaction → PAID
- transfer NFT → buyer wallet
- product → OWNED
- log → BRAND_OUTLET

---

## 7. P2P Remote Shipping (Escrow)

Flow:

1. Buyer commit → bayar escrow
2. transaction → PAID
3. product → IN_TRANSIT (LOCKED)

4. Seller generate QR:
   - transaction_id
   - product_id
   - nfc_uid

5. Buyer scan + verify

Backend check:

- nfc_uid cocok?

IF TRUE:

- release escrow
- transfer NFT
- product → OWNED
- log → TRANSFERRED

IF FALSE:

- reject
- flag fraud

---

## 8. P2P Direct Handover

Flow:

1. Seller create session
2. Generate QR (transaction + encrypted UID)
3. Buyer scan
4. Verify NFC proximity

Jika valid:

- transfer NFT
- product → OWNED
- log → TRANSFERRED

---

## 9. Provenance System

- Semua event masuk ke product_logs
- Timeline:
  - MANUFACTURED
  - REGISTERED
  - BRAND_OUTLET
  - TRANSFERRED

---

## 10. Critical System Rules

- Tidak boleh trust client
- Semua validasi di backend
- NFT hanya proof, bukan logic
- Semua transaksi harus idempotent

---

## 11. Blockchain Constraint

- Sepolia finality: ±12–15 detik
- UI wajib delay (loader)

---

## 12. Failure Handling

- Retry blockchain tx
- Idempotent webhook
- Lock product saat transaksi aktif
