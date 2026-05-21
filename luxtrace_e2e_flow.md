# 💎 Luxtrace — End-to-End System Flow (Lengkap)

> Dokumentasi alur sistem Luxtrace dari ujung ke ujung: Web Dashboard (Admin/Operator) + Mobile App (Operator/Consumer).

---

## 🗺️ Peta Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                         AKTOR                                   │
│  👤 ADMIN (Web)  │  🏪 OPERATOR (Mobile)  │  📱 CONSUMER (Mobile) │
└─────────────────────────────────────────────────────────────────┘
         │                    │                        │
         ▼                    ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Next.js API (Cloud Run) — JWT Auth                 │
│  /api/auth/*  │  /api/products/*  │  /api/boutique/*            │
│  /api/nfc/*   │  /api/p2p/*       │  /api/payments/*            │
│  /api/webhooks/midtrans                                         │
└──────────┬────────────────────────┬────────────────────────────┘
           │                        │
    ┌──────▼──────┐         ┌───────▼──────┐
    │  Supabase   │         │  Thirdweb    │
    │ (PostgreSQL)│         │  Engine      │
    │ + Auth      │         │ (Blockchain) │
    └─────────────┘         └──────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   Sepolia Ethereum   │
                         │   ERC-721 Contract  │
                         └─────────────────────┘
```

---

## 🔑 Product Status State Machine

```
MANUFACTURED → REGISTERED → OWNED ⇄ IN_TRANSIT → OWNED
                                              ↓
                                       FRAUD_FLAGGED
```

| Status | Artinya |
|--------|---------|
| `MANUFACTURED` | Baru dibuat, NFT belum di-mint |
| `REGISTERED` | NFT sudah di-mint, NFC terikat, siap dijual di butik |
| `OWNED` | Dimiliki konsumen, bisa dijual P2P |
| `IN_TRANSIT` | Escrow terkunci saat pengiriman P2P Remote |
| `FRAUD_FLAGGED` | NFC tidak cocok, ditahan untuk review manual |

---

## 📋 ALUR 1 — Autentikasi (Web & Mobile)

### 1A. Login Email/Password

**Aktor:** Admin, Operator, Consumer  
**Platform:** Web Dashboard & Mobile App

```
[User] → Input email + password
      → POST /api/auth/login
      → [Backend] Supabase Auth verifikasi credentials
      → [Backend] Ambil profile dari tabel profiles
      → Response: { access_token (JWT), user_id, full_name, role, wallet_address }
[Mobile] → Simpan token ke SecureStore (expo-secure-store)
[Web]    → Simpan token ke cookies/session
```

**Endpoint:** `POST /api/auth/login`  
**Response Fields:** `access_token`, `user_id`, `email`, `full_name`, `role`, `wallet_address`, `avatar_url`

---

### 1B. Google OAuth Login (Mobile Only)

```
[User]    → Tap "Sign in with Google"
          → Expo AuthSession buka browser OAuth Google
          → Google redirect ke callback dengan ?code=xxx
[Mobile]  → auth-callback.tsx menerima code
          → POST /api/auth/oauth/google { code }
          → [Backend] Tukar code ke Supabase Google session
          → [Backend] Ambil/buat profile user
          → Response: JWT + profile
[Mobile]  → Simpan ke SecureStore, redirect ke home
```

---

### 1C. Load Session (Auto-Login)

```
[App/Web launch] → Cek SecureStore / cookie
→ GET /api/auth/me (dengan Authorization: Bearer {token})
→ [Backend] Verifikasi JWT via middleware.ts
→ Response: { user profile }
→ [App] Set state isAuthenticated = true, redirect ke home
```

---

## 📦 ALUR 2 — Registrasi Aset Baru (Manufacturing + NFT Minting)

**Aktor:** Admin  
**Platform:** Web Dashboard  

### Langkah-langkah:

```
[Admin] → Login ke Web Dashboard
        → Buka menu "Products" → "Batch Upload"
        → Unggah file CSV (format: brand, name, serial_number, price_idr, ...)
        → POST /api/products/upload (multipart/form-data)
```

### Proses Backend (Sequential per produk):

```
[Backend] → Parse + validasi CSV
          → Cek duplikat serial_number di DB
          → INSERT batch produk ke DB (status: MANUFACTURED)
          → Buat batch record (batch_id)
          → Return { batch_id, status: "PROCESSING" } ke client (IMMEDIATE)
          → [ASYNC - background per produk]:
              A. Mint NFT → Thirdweb Engine → Sepolia ERC-721
                 └→ Tunggu tx confirmed (~15 detik/item)
              B. Bind NFC → generate UUID, hash SHA-256, simpan ke nfc_tags
              C. Update status produk → MANUFACTURED → REGISTERED
              D. Log event MANUFACTURED + REGISTERED ke product_logs
              E. Simpan hasil ke batch.results
```

### Polling Status:

```
[Frontend] → GET /api/products/batch/{batch_id}
           → Response: { processed, failed, results: [{nft_token_id, tx_hash}] }
           → Loop sampai status = "COMPLETED" atau "FAILED"
```

**Endpoints:**
- `POST /api/products/upload` — Upload CSV
- `GET /api/products/batch/{batch_id}` — Poll status

---

## 🏪 ALUR 3 — NFC Activation di Butik (Operator Mobile)

**Aktor:** Operator  
**Platform:** Mobile App (tab Operator)  

> Produk sudah REGISTERED dengan NFC placeholder UUID. Operator perlu bind UID NFC chip **fisik** ke produk.

```
[Operator] → Login sebagai OPERATOR di mobile
           → Buka tab "Operator" → "Activate Product"
           → Tap chip NFC pada produk fisik (react-native-nfc-manager)
           → App membaca UID dari chip NFC hardware
           → POST /api/nfc/activate { product_id, nfc_uid }
```

```
[Backend] → Cek produk ada dan statusnya valid
          → hashNfcUid(nfc_uid) → SHA-256 + HMAC dengan NFC_SECRET_SALT
          → Simpan { nfc_uid, secure_key_hash, product_id } ke tabel nfc_tags
          → Update product.nfc_bound = true
          → Log event ke product_logs
          → Response: { success: true, product_id }
```

**Note:** Raw UID tidak pernah disimpan dalam plaintext untuk keamanan — hanya hash-nya yang tersimpan.

---

## 🛍️ ALUR 4 — Pembelian Butik (Primary Sale)

**Aktor:** Operator (inisiasi) + Consumer (bayar)  
**Platform:** Mobile App

### Phase 1: Operator Inisiasi Penjualan

```
[Operator] → Buka tab "Sell" → pilih produk REGISTERED
           → Pilih buyer (input email/ID konsumen)
           → POST /api/boutique/initiate-sale { product_id, buyer_id }
```

```
[Backend] → Validasi produk status = REGISTERED
          → Buat transaction record (type: PRIMARY_BOUTIQUE, status: PENDING)
          → Create Midtrans Snap invoice (POST ke Midtrans API)
          → Simpan payment_ref (order_id) ke transaction
          → Response: { snap_token, payment_url, transaction_id }
```

### Phase 2: Consumer Membayar

```
[Consumer Mobile] → Terima notifikasi invoice
                  → Buka payment_url → Midtrans Snap UI
                  → Pilih metode pembayaran (VA, QRIS, kartu, dll)
                  → Selesaikan pembayaran
```

### Phase 3: Webhook Settlement (Otomatis)

```
[Midtrans] → POST /api/webhooks/midtrans { order_id, transaction_status: "settlement", signature_key }
[Backend]  → Validasi SHA-512 signature (keamanan webhook)
           → Cari transaction via order_id
           → Idempotency check (skip jika sudah PAID/COMPLETED)
           → Update transaction status → PAID
           → Transfer NFT: Brand Wallet → Buyer Wallet (Thirdweb Engine)
           → Update product: status = OWNED, current_owner_id = buyer_id
           → Update transaction status → COMPLETED + simpan tx_hash
           → Log event BRAND_OUTLET ke product_logs
```

**Jika NFT transfer gagal setelah pembayaran:**
```
→ Midtrans Refund otomatis ke buyer
→ Transaction status → CANCELLED
→ Product status tetap REGISTERED
```

**Endpoints:**
- `POST /api/boutique/initiate-sale`
- `POST /api/webhooks/midtrans` (Midtrans callback, bukan dari client)

---

## 🔄 ALUR 5 — P2P Remote Escrow (Pengiriman)

**Aktor:** Seller (Consumer yang punya produk) + Buyer (Consumer lain)  
**Platform:** Mobile App (kedua pihak)

### Phase 1: Seller Inisiasi Escrow

```
[Seller Mobile] → Buka produk yang OWNED
               → Pilih "Sell via Remote Shipping"
               → Input buyer_id + agreed_price_idr
               → POST /api/p2p/remote/init { product_id, buyer_id, agreed_price_idr }
```

```
[Backend] → Validasi: produk OWNED, seller = current_owner
          → Buat Midtrans Snap invoice untuk buyer (escrow)
          → Buat transaction record (type: P2P_REMOTE_SHIPPING, status: PENDING)
          → Push notification ke buyer: "Ada request pembelian P2P"
          → Response: { snap_token, payment_url, transaction_id }
```

### Phase 2: Buyer Bayar Escrow

```
[Buyer Mobile] → Terima notifikasi
              → Buka link pembayaran Midtrans
              → Bayar → Midtrans webhook → /api/webhooks/midtrans
[Backend]     → Validasi signature
              → Update transaction → PAID
              → Update product status: OWNED → IN_TRANSIT (LOCKED)
              → Push notification ke Seller: "Escrow terkunci, siapkan barang"
              → Push notification ke Buyer: "Pembayaran dikunci di escrow"
```

### Phase 3: Seller Generate QR Handover

```
[Seller Mobile] → Produk sudah dikirim ke buyer
               → Buka transaksi → Tap "Generate QR"
               → POST /api/p2p/remote/{transaction_id}/qr
```

```
[Backend] → Guard: caller = seller, status = PAID atau IN_TRANSIT
          → Cari NFC tag milik produk
          → Generate session_id (UUID)
          → Buat encrypted QR payload:
              { v:1, session_id, transaction_id, product_id, nfc_uid, expires_at }
          → AES-256 encrypt dengan QR_ENCRYPTION_KEY
          → Simpan session ke tabel qr_sessions (TTL: 15 menit)
          → Response: { qr_payload (encrypted string), session_id, expires_at }
[Seller]  → Tampilkan QR code dari qr_payload
```

### Phase 4: Buyer Verifikasi NFC + Release Escrow

```
[Buyer Mobile] → Terima paket fisik
              → Buka app → Scan QR dari seller
              → App decrypt QR → dapat session_id + expected nfc_uid
              → Tempelkan HP ke chip NFC fisik pada produk
              → App baca nfc_uid dari chip
              → POST /api/p2p/verify { session_id, scanned_uid }
```

```
[Backend] → (1) Load & validasi QR session (tidak expired, belum dipakai)
          → (2) Load transaction, pastikan caller = buyer
          → (3) Pastikan transaction status = IN_TRANSIT
          → (4) ATOMIC: tandai session sebagai USED (prevent replay attack)
          → (5) Hash scanned_uid → bandingkan dengan stored hash

          [Jika NFC MATCH]:
          → (6) Transfer NFT: Seller Wallet → Buyer Wallet (Thirdweb Engine)
          → (7) Update product: status = OWNED, owner = buyer
          → (8) Update transaction → COMPLETED + tx_hash
          → (9) Log TRANSFERRED ke product_logs
          → (10) Push notification ke buyer: "NFT masuk ke wallet!"
          → (11) Push notification ke seller: "Escrow dilepas!"
          → Response: { verified: true, tx_hash, escrow_released: true }

          [Jika NFC MISMATCH]:
          → Update transaction → FRAUD_FLAGGED
          → Log FRAUD_ATTEMPT ke product_logs
          → Escrow tetap terkunci (manual review)
          → Response: 422 NFC_MISMATCH
          
          [Jika NFT transfer gagal setelah NFC verified]:
          → Refund otomatis ke buyer via Midtrans
          → Transaction → CANCELLED
```

**Endpoints:**
- `POST /api/p2p/remote/init`
- `POST /api/p2p/remote/{transaction_id}/qr`
- `POST /api/p2p/verify { session_id, scanned_uid }`

---

## 🤝 ALUR 6 — P2P Direct Handover (Tatap Muka)

**Aktor:** Seller + Buyer — bertemu langsung, tanpa escrow/pembayaran  
**Platform:** Mobile App (kedua pihak)

### Phase 1: Seller Inisiasi Sesi

```
[Seller Mobile] → Pilih produk → "Direct Handover"
               → Input buyer_id
               → POST /api/p2p/direct/init { product_id, buyer_id }
```

```
[Backend] → Validasi: seller = owner, product = OWNED
          → Buat transaction record (type: P2P_DIRECT_HANDOVER, amount: 0)
          → Generate QR payload (sama seperti Remote, TTL: 5 menit)
          → Push notification ke buyer: "Direct Handover siap, scan QR!"
          → Response: { qr_payload, session_id, expires_at }
[Seller]  → Tampilkan QR code ke buyer
```

### Phase 2: Buyer Scan QR + Tap NFC

```
[Buyer Mobile] → Scan QR dari layar seller
              → Tempelkan HP ke NFC chip produk
              → POST /api/p2p/direct/init { session_id, scanned_uid }
              (menggunakan endpoint verify yang sama)
```

```
[Backend] → Validasi session (TTL: 5 menit, single-use)
          → Caller = buyer, transaction status = PENDING
          → Atomic: consume session (prevent replay)
          → Verify NFC UID hash

          [Match]:
          → Transfer NFT: Seller → Buyer (Thirdweb Engine gasless)
          → Update product owner → buyer, status = OWNED
          → Update transaction → COMPLETED
          → Log TRANSFERRED
          → Push notification ke kedua pihak
          → Response: { verified: true, tx_hash, via: "DIRECT_HANDOVER" }

          [Mismatch]:
          → Transaction → FRAUD_FLAGGED
          → Log FRAUD_ATTEMPT
```

**Endpoints:**
- `POST /api/p2p/direct/init`
- `POST /api/p2p/verify` (shared dengan remote)

---

## 🔍 ALUR 7 — Scan Keaslian Standalone (Consumer)

**Aktor:** Consumer  
**Platform:** Mobile App (tab utama)

```
[Consumer] → Tap tombol "Scan NFC"
           → Tempelkan HP ke produk fisik
           → App baca UID chip
           → POST /api/nfc/verify { nfc_uid } (atau GET /api/products/scan?uid=...)
```

```
[Backend] → Hash scanned UID
          → Cari di tabel nfc_tags by hash
          → Load product + owner info
          → Response: { authentic: true, product: {...}, current_owner: {...} }
                   atau { authentic: false } jika tidak ditemukan
```

---

## 📊 ALUR 8 — Web Dashboard (Admin)

**Aktor:** Admin  
**Platform:** Web Browser (`/dashboard`)

| Fitur | API Endpoint |
|-------|-------------|
| Lihat semua produk + filter status | `GET /api/products?status=&page=&limit=` |
| Detail produk + provenance timeline | `GET /api/products/{id}` + `GET /api/provenance/{id}` |
| Upload CSV batch | `POST /api/products/upload` |
| Lihat semua transaksi | `GET /api/transactions` |
| Lihat semua users | `GET /api/users` |
| Update profile | `PUT /api/auth/profile` |

**Dashboard UI Features:**
- Tabel produk dengan filter status (MANUFACTURED / REGISTERED / OWNED / IN_TRANSIT)
- Progress polling batch minting (auto-refresh setiap 3 detik)
- Timeline provenance per produk (riwayat lengkap dari pabrik hingga owner terakhir)
- Alert dialog konfirmasi aksi destructive
- Sidebar fixed dengan navigasi dan logout

---

## 🔐 Keamanan Sistem

| Lapisan | Implementasi |
|---------|-------------|
| **Auth** | JWT Supabase, verified di `middleware.ts` setiap request |
| **NFC** | UID di-hash SHA-256 + HMAC salt, plaintext tidak disimpan |
| **QR Code** | AES-256 encrypted, single-use session, TTL enforced |
| **Webhook** | SHA-512 signature validation dari Midtrans |
| **Fraud** | NFC mismatch → `FRAUD_FLAGGED`, escrow ditahan, log forensik |
| **Replay Attack** | QR session di-consume secara atomic (DB-level) sebelum verifikasi |
| **Refund Safety** | NFT gagal setelah bayar → auto-refund via Midtrans |

---

## 🧩 Integrasi Eksternal

| Sistem | Fungsi | Kapan Dipanggil |
|--------|--------|-----------------|
| **Supabase Auth** | Autentikasi user, JWT management | Login, setiap request API |
| **Supabase PostgreSQL** | Semua data: products, transactions, nfc_tags, qr_sessions, logs | Semua operasi data |
| **Thirdweb Engine** | Mint NFT, Transfer NFT (gasless) | Batch manufacture, settlement payment, P2P verify |
| **Midtrans Snap** | Invoice pembayaran, escrow, refund | Primary sale & P2P Remote init; webhook settlement |
| **Expo Push Notifications** | Notifikasi real-time ke mobile | P2P init, escrow funded, transfer complete |
| **Sepolia Ethereum** | ERC-721 NFT contract (blockchain) | Dipanggil via Thirdweb Engine |

---

## 📱 Navigasi Mobile App

```
Root Layout (_layout.tsx)
├── (auth)/login.tsx          — Login screen
├── auth-callback.tsx         — Google OAuth callback handler
└── (authenticated)
    ├── (tabs)/               — Untuk role CONSUMER & ADMIN
    │   ├── index.tsx         — Home: daftar produk + scan NFC
    │   └── explore.tsx       — Eksplorasi / riwayat transaksi
    ├── (operator)/           — Hanya untuk role OPERATOR
    │   ├── index.tsx         — Dashboard operator
    │   ├── activate.tsx      — Scan & bind NFC chip fisik ke produk
    │   └── sell.tsx          — Inisiasi penjualan butik
    ├── (consumer)/           — Untuk role CONSUMER
    │   └── scan.tsx          — Full scan flow: NFC + QR + P2P verify
    └── products/             — Detail produk & provenance
```

---

## 🌐 Web Dashboard Pages

```
/                  — Landing page / redirect ke dashboard
/dashboard         — Main dashboard (produk, transaksi, batch status)
```

*(Single-page app dengan komponen modal dan tab internal)*
