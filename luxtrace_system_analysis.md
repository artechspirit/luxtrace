# Luxtrace — System Architecture Analysis
> Mode: Strict Production Engineering  
> Sumber: blueprint.md · backend.md · frontend.md · design-system.md  
> Tanggal: 2026-05-19

---

## 1. Product State Machine (Detail)

### State yang Valid

```
MANUFACTURED → REGISTERED → OWNED ⇄ IN_TRANSIT
```

| State | Meaning | Trigger | Guard |
|---|---|---|---|
| `MANUFACTURED` | Produk baru dibuat, belum terdaftar di chain | CSV upload + DB insert | Hanya admin/brand |
| `REGISTERED` | NFT di-mint, NFC di-bind ke produk | Blockchain tx confirmed + NFC hash saved | NFT tx_hash harus ada, nfc_uid harus unik |
| `OWNED` | Produk dimiliki buyer, NFT ada di wallet mereka | Primary sale PAID atau P2P complete | NFT transfer harus confirmed on-chain |
| `IN_TRANSIT` | Produk dalam proses P2P Remote Shipping | Escrow dikunci, buyer sudah bayar | Produk harus di state `OWNED`, bukan `MANUFACTURED` |

### Aturan Transisi (Immutable Rules)

```
MANUFACTURED  ──(NFT mint + NFC bind)──▶  REGISTERED
REGISTERED    ──(primary sale paid)──────▶  OWNED
OWNED         ──(P2P remote initiated)───▶  IN_TRANSIT
IN_TRANSIT    ──(NFC verified + escrow release)──▶  OWNED      [sukses]
IN_TRANSIT    ──(fraud detected / timeout)──────▶  OWNED       [rollback ke seller]
```

> [!IMPORTANT]
> - **Hanya backend** yang boleh melakukan perubahan state.
> - State `IN_TRANSIT` adalah **LOCKED**: tidak bisa di-transfer ulang, tidak bisa dibatalkan secara sepihak.
> - Tidak ada transisi mundur dari `OWNED` ke `REGISTERED` atau `MANUFACTURED`.
> - Setiap transisi **wajib** menghasilkan satu record baru di `product_logs`.

### State × Transaksi Matrix

| State Awal | Transaksi Type | State Akhir |
|---|---|---|
| `REGISTERED` | `PRIMARY_BOUTIQUE` (sukses) | `OWNED` |
| `OWNED` | `P2P_REMOTE_SHIPPING` (initiated) | `IN_TRANSIT` |
| `IN_TRANSIT` | NFC verified → escrow released | `OWNED` (buyer) |
| `IN_TRANSIT` | Fraud / timeout | `OWNED` (seller, rollback) |
| `OWNED` | `P2P_DIRECT_HANDOVER` (verified) | `OWNED` (buyer baru) |

---

## 2. Flow Backend (Detail)

### 2.1 Manufacturing Flow

```
[Admin Web]
    │
    ▼
POST /api/products/batch (CSV upload)
    │
    ▼
[product.service] → validateCSVSchema()
    │   ── duplicate serial check via product.repository
    ▼
INSERT products (status=MANUFACTURED) [atomic batch]
    │
    ▼
[blockchain.service] → thirdweb.batchMintNFT(brandWallet, serialNumbers[])
    │   ── via Thirdweb Engine (gasless relayer)
    │   ── pollingInterval: ~15 detik (Sepolia finality)
    ▼
ON TX_CONFIRMED:
    │
    ├─▶ UPDATE products SET nft_token_id = [...] WHERE serial_number IN [...]
    │
    ▼
[nfc.service] → generateNFCBinding(serial_number)
    │   ── generate uid (UUID v4 or hardware-synced)
    │   ── hash = SHA256(uid + SALT)  [SALT dari ENV: NFC_SECRET_SALT]
    │   ── INSERT nfc_tags (nfc_uid, secure_key_hash, product_id)
    │
    ▼
UPDATE products SET status='REGISTERED'
INSERT product_logs (event='REGISTERED', product_id, metadata)

```

**Service chain:** `product.service` → `blockchain.service` → `nfc.service` → `product.repository`

---

### 2.2 Primary Sale (Boutique)

```
[Mobile / Web Buyer]
    │
    ▼
POST /api/transactions/primary (product_id, buyer_user_id)
    │
    ▼
[transaction.service]
    ├─▶ LOCK product (verify status = REGISTERED, no active tx)
    ├─▶ [payment.service] → midtrans.createInvoice(amount, order_id)
    │       └─ returns payment_url + order_id
    ▼
INSERT transactions (type=PRIMARY_BOUTIQUE, status=PENDING, payment_ref=order_id)
    │
    ▼
User bayar via QRIS / Virtual Account
    │
    ▼
POST /api/webhooks/midtrans  ← Midtrans async callback
    │
    ▼
[payment.service]
    ├─▶ validateSignature(payload, MIDTRANS_SERVER_KEY)  [wajib, reject jika gagal]
    ├─▶ checkIdempotency(order_id)  [jika sudah diproses → return 200 tanpa re-process]
    │
    ▼
IF payment_status = 'settlement':
    │
    ├─▶ UPDATE transactions SET status='PAID'
    │
    ├─▶ [blockchain.service] → thirdweb.transferNFT(brandWallet → buyerWallet, tokenId)
    │       └─ simpan tx_hash ke transactions.blockchain_tx_hash
    │
    ├─▶ UPDATE products SET status='OWNED', current_owner_id=buyer_user_id
    │
    └─▶ INSERT product_logs (event='BRAND_OUTLET', from=brand, to=buyer)

```

**Critical:** Webhook harus idempotent. Jika `order_id` sudah ada di DB dengan status PAID → skip, return 200.

---

### 2.3 P2P Remote Shipping (Escrow)

```
PHASE 1 — BUYER COMMIT
──────────────────────
[Buyer Mobile]
    │
    ▼
POST /api/transactions/p2p-remote (product_id, seller_id, buyer_id, price)
    │
    ▼
[transaction.service]
    ├─▶ Verify product status = OWNED, owner = seller
    ├─▶ LOCK product (set in-progress flag)
    ├─▶ [payment.service] → midtrans.createEscrowInvoice(amount, order_id)
    ▼
INSERT transactions (type=P2P_REMOTE_SHIPPING, status=PENDING)
    │
    ▼
Buyer bayar → Webhook midtrans diterima
    │
    ▼
[payment.service] → validateSignature()
    │
    ├─▶ UPDATE transactions SET status='PAID'
    └─▶ UPDATE products SET status='IN_TRANSIT'  ← LOCKED


PHASE 2 — SELLER PREPARE HANDOVER
───────────────────────────────────
[Seller Mobile]
    │
    ▼
GET /api/transactions/:id/qr-payload
    │
    ▼
[transaction.service]
    ├─▶ Verify caller = seller (RLS check)
    ├─▶ Fetch: transaction_id, product_id, nfc_uid (dari nfc_tags)
    └─▶ Encrypt payload (AES-256, key dari ENV: QR_ENCRYPTION_KEY)
    │
    ▼
Return: encrypted_qr_string  → Seller tampilkan sebagai QR code


PHASE 3 — BUYER VERIFY
───────────────────────
[Buyer Mobile]
    │
    ▼
1. Scan QR → decrypt payload → dapat transaction_id + product_id + expected_nfc_uid
2. Tap NFC pada fisik produk → dapat raw_nfc_uid dari chip
    │
    ▼
POST /api/transactions/:id/verify-nfc
    Body: { scanned_uid: raw_nfc_uid }
    │
    ▼
[nfc.service]
    ├─▶ Hash scanned_uid: SHA256(scanned_uid + NFC_SECRET_SALT)
    ├─▶ Bandingkan dengan nfc_tags.secure_key_hash WHERE product_id = X
    │
    IF MATCH:
    │
    ├─▶ [payment.service] → midtrans.releaseEscrow(order_id)
    ├─▶ [blockchain.service] → thirdweb.transferNFT(sellerWallet → buyerWallet, tokenId)
    │       └─ simpan tx_hash
    ├─▶ UPDATE products SET status='OWNED', current_owner_id=buyer_id
    ├─▶ UPDATE transactions SET status='COMPLETED'
    └─▶ INSERT product_logs (event='TRANSFERRED', from=seller, to=buyer)
    │
    IF NO MATCH:
    │
    ├─▶ UPDATE transactions SET status='FRAUD_FLAGGED'
    ├─▶ INSERT product_logs (event='FRAUD_ATTEMPT', metadata={scanned_uid})
    └─▶ Return 400 { error: { code: 'NFC_MISMATCH', message: '...' } }

```

---

### 2.4 P2P Direct Handover

```
PHASE 1 — SELLER CREATE SESSION
─────────────────────────────────
[Seller Mobile]
    │
    ▼
POST /api/transactions/p2p-direct (product_id, buyer_id, price?)
    │
    ▼
[transaction.service]
    ├─▶ Verify product status = OWNED, owner = seller
    ├─▶ INSERT transactions (type=P2P_DIRECT_HANDOVER, status=PENDING)
    └─▶ Generate session token (short-lived, TTL: 5 menit)
    │
    ▼
[nfc.service]
    ├─▶ Fetch nfc_uid WHERE product_id = X
    └─▶ Encrypt: AES-256(transaction_id + nfc_uid, key=QR_ENCRYPTION_KEY)
    │
    ▼
Return: encrypted_qr_string  → Seller tampilkan QR


PHASE 2 — BUYER SCAN + NFC PROXIMITY VERIFY
─────────────────────────────────────────────
[Buyer Mobile]
    │
    ▼
1. Scan QR → decrypt → dapat expected_nfc_uid + transaction_id
2. Tap NFC fisik → dapat raw_nfc_uid
    │
    ▼
POST /api/transactions/:id/direct-verify
    Body: { scanned_uid: raw_nfc_uid }
    │
    ▼
[nfc.service] → hash + compare (sama dengan Remote Shipping)
    │
    IF VALID:
    │
    ├─▶ [blockchain.service] → thirdweb.transferNFT(sellerWallet → buyerWallet, tokenId)
    ├─▶ UPDATE products SET status='OWNED', current_owner_id=buyer_id
    ├─▶ UPDATE transactions SET status='COMPLETED'
    └─▶ INSERT product_logs (event='TRANSFERRED', via='DIRECT_HANDOVER')

```

> [!NOTE]
> P2P Direct **tidak menggunakan escrow/payment gateway**. Transfer terjadi pure berdasarkan NFC proximity verification. Cocok untuk transaksi tunai fisik antara dua pihak.

---

## 3. Critical System Deep Dive

### 3.1 Escrow System

```
Escrow di Luxtrace = Midtrans payment hold (bukan smart contract escrow)
```

| Komponen | Detail |
|---|---|
| **Provider** | Midtrans (ENV: `MIDTRANS_SERVER_KEY`) |
| **Trigger lock** | Saat buyer bayar & webhook `settlement` diterima |
| **Trigger release** | Saat NFC verification sukses |
| **Trigger refund** | Fraud detected / timeout (manual atau otomatis) |
| **Idempotency key** | `order_id` = `transaction_id` dari DB |
| **Timeout policy** | Harus didefinisikan (rekomendasi: 24-48 jam) |

**Invariant:** Escrow tidak pernah di-release sebelum NFC match confirmed server-side. Client tidak bisa trigger release langsung.

**Failure scenario:**
- NFT transfer berhasil tapi escrow release gagal → **inconsistent state** (lihat Risk section)
- Escrow released tapi NFT transfer gagal → buyer bayar tapi tidak dapat NFT

---

### 3.2 NFT Transfer System

```
Provider: Thirdweb Engine (gasless via relayer)
Network: Sepolia (testnet) / Ethereum Mainnet (production)
Finality: ±12–15 detik
```

| Step | Action | Constraint |
|---|---|---|
| **Mint** | `batchMintNFT(brandWallet, metadata[])` | Dilakukan saat Manufacturing |
| **Transfer Primary** | `transferNFT(brandWallet → buyerWallet, tokenId)` | Hanya setelah payment `settlement` |
| **Transfer P2P** | `transferNFT(sellerWallet → buyerWallet, tokenId)` | Hanya setelah NFC verified |

**Rules:**
- Semua operasi via Thirdweb Engine — tidak ada direct RPC call dari client.
- Simpan `tx_hash` ke `transactions.blockchain_tx_hash` sebelum return response.
- UI wajib menampilkan loader 12–15 detik (Sepolia finality constraint).
- Retry logic: jika tx gagal (gas spike, nonce issue) → backend retry max 3x dengan exponential backoff.

**Wallet model:**
- Brand wallet: 1 wallet per brand, custodial di Thirdweb.
- User wallet: 1 wallet per user, di-generate otomatis saat register (Thirdweb In-App Wallet).
- Wallet address disimpan di `profiles.wallet_address`.

---

### 3.3 NFC Validation System

```
NFC = physical proxy untuk verifikasi kepemilikan produk
```

**Bind Flow (Manufacturing time):**
```
1. generate uid (UUID v4 atau hardware-sync)
2. hash = SHA256(uid + NFC_SECRET_SALT)
3. INSERT nfc_tags { nfc_uid, secure_key_hash, product_id }
```

**Verify Flow (Transaction time):**
```
1. Client scan NFC → kirim raw_uid ke backend
2. Backend: hash = SHA256(raw_uid + NFC_SECRET_SALT)
3. SELECT * FROM nfc_tags WHERE product_id = X AND secure_key_hash = hash
4. IF found → valid
5. IF not found → fraud attempt
```

**Security rules:**
- `nfc_uid` **tidak pernah** dikirim ke client dalam response.
- Client hanya kirim `scanned_uid` ke backend.
- `NFC_SECRET_SALT` adalah ENV variable, tidak boleh hardcode.
- Tidak ada endpoint yang expose `secure_key_hash`.
- QR payload yang berisi `expected_nfc_uid` harus di-encrypt (AES-256).

---

## 4. Risk & Failure Points

### 🔴 CRITICAL — Data Inconsistency

| # | Skenario | Impact | Mitigasi |
|---|---|---|---|
| R1 | NFT transfer sukses tapi DB update gagal | Owner di chain ≠ owner di DB | Idempotent retry + blockchain event listener sebagai ground truth |
| R2 | Escrow released tapi NFT transfer gagal | Buyer bayar, tidak dapat NFT | Rollback escrow via Midtrans Refund API + alert admin |
| R3 | Webhook Midtrans diterima duplikat | Double NFT transfer | Idempotency check by `order_id` sebelum setiap proses |
| R4 | State machine bypass dari client | Fraud ownership transfer | Zero-trust: semua validasi state di service layer, bukan route |

### 🟠 HIGH — Transaction Integrity

| # | Skenario | Impact | Mitigasi |
|---|---|---|---|
| R5 | Product tidak di-LOCK sebelum payment | Race condition: 2 buyer bayar 1 produk | Status locking + atomic DB update (`WHERE status='REGISTERED'`) |
| R6 | NFC chip cloned / spoofed | Counterfeit claim | Secure key hash + salt; raw UID tidak pernah expose ke client |
| R7 | QR payload dari session expired dipakai | Replay attack | Session TTL (5 menit) + invalidasi setelah digunakan 1x |
| R8 | Thirdweb Engine downtime | NFT transfer gagal semua | Retry queue + manual recovery tool di admin dashboard |

### 🟡 MEDIUM — System Reliability

| # | Skenario | Impact | Mitigasi |
|---|---|---|---|
| R9 | Sepolia network congestion | Tx finality > 15 detik | UI loader flexible + timeout notification |
| R10 | Midtrans webhook tidak terdelivery | Payment stuck di PENDING | Polling fallback: cek Midtrans API per 5 menit untuk PENDING tx |
| R11 | Batch mint CSV corrupt / duplikat | Produk ganda atau gagal mint | CSV schema validation + duplicate serial check sebelum insert |
| R12 | Rate limit hit | API down untuk user | Rate limiter per IP + per user_id; exponential backoff di client |

### 🟢 LOW — Operational

| # | Skenario | Impact | Mitigasi |
|---|---|---|---|
| R13 | `NFC_SECRET_SALT` leaked | Semua hash bisa dicompute | Rotate salt + re-hash semua nfc_tags (migration script) |
| R14 | Admin CSV upload salah data | Data produk salah di chain | Preview + confirmation step sebelum batch mint |
| R15 | product_logs tidak sync | Provenance incomplete | Log setiap state change, bukan hanya final state |

---

## 5. Summary: Backend Service Responsibility Map

```
auth.service        → register, login, wallet generation
product.service     → MANUFACTURED, REGISTERED state management
transaction.service → orchestrate all payment + P2P flows
nfc.service         → bind, hash, verify NFC chips
blockchain.service  → mint NFT, transfer NFT via Thirdweb Engine
payment.service     → create invoice, validate webhook, escrow
```

**Pattern wajib:** Route → Service → Repository → Database  
**Dilarang:** Business logic di route/controller, query langsung di route.

---

## 6. ENV Variables Required

| Variable | Used By | Keterangan |
|---|---|---|
| `SUPABASE_URL` | Semua repository | DB connection |
| `SUPABASE_KEY` | Semua repository | Service role key (server only) |
| `THIRDWEB_SECRET` | blockchain.service | Engine API auth |
| `MIDTRANS_SERVER_KEY` | payment.service | Invoice + escrow + refund |
| `NFC_SECRET_SALT` | nfc.service | Hash seed, rahasia mutlak |
| `QR_ENCRYPTION_KEY` | nfc.service, transaction.service | AES-256 key untuk QR payload |
| `THIRDWEB_ENGINE_URL` | blockchain.service | Self-hosted Engine URL |
| `BRAND_WALLET_ADDRESS` | blockchain.service | Default minter wallet |

