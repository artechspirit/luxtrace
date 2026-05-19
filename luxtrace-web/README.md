# Luxtrace Web Portal — Developer Documentation

Sistem ini adalah portal administrasi dan API backend untuk platform **Luxtrace** (Digital Twin Asset untuk barang mewah berbasis NFT, NFC Proxy, dan Escrow Payment).

---

## 1. Arsitektur Sistem & Komponen Utama

Sistem dibangun menggunakan **Next.js App Router (v16)** dengan pola desain bersih berlapis:
```
[Client / Mobile App]
       │ (HTTP REST JSON & JWT Auth)
       ▼
[middleware.ts (Security Layer: Rate limit, Anti-replay, Input schema checking)]
       │
       ▼
[API Routes (app/api/*)]
       │
       ▼
[Services (services/*) — Business Logic & State transitions]
       ├─────────────────────────────────────────┐
       ▼                                         ▼
[Repositories (repositories/*)]         [Thirdweb Engine & Midtrans Snap]
       │ (Supabase JS client)                    │ (On-chain & Escrow Payment)
       ▼                                         ▼
[PostgreSQL Database]                  [Sepolia Ethereum & Bank Accounts]
```

---

## 2. Alur Kerja Sistem (System Flows)

### A. Manufacturing & NFT Minting Flow (Operator)
Alur ketika operator memuat CSV untuk mendaftarkan barang baru:
1. **Operator** mengunggah file CSV berisi data serial number dan spesifikasi produk.
2. Endpoint `/api/products/upload` menerima permintaan, memvalidasi integritas data, dan menyimpan produk dengan status awal `MANUFACTURED`.
3. Backend memulai antrean asinkronus (`_processBatchAsync`):
   * Memanggil **Thirdweb Engine** untuk melakukan *gasless minting* NFT produk ke dompet brand.
   * Membuat tag NFC virtual (membuat UID unik hardware, melakukan hashing SHA-256 dengan salt rahasia, dan menyimpannya di tabel `nfc_tags`).
   * Memperbarui status produk menjadi `REGISTERED` dan mencatat log kejadian `REGISTERED`.
4. Operator memantau progres antrean secara berkala melalui endpoint status `/api/products/batch/[batch_id]`.

### B. Primary Boutique Sale (Beli Langsung dari Brand)
1. Konsumen membeli produk yang berstatus `REGISTERED` dari boutique fisik/online.
2. Backend membuat tagihan pembayaran **Midtrans Snap Invoice** melalui `/api/payments/create` dan menyimpan ID tagihan di database.
3. Pembeli membayar tagihan via virtual account/QRIS.
4. Midtrans mengirim notifikasi webhook ke `/api/webhooks/midtrans`.
5. Backend melakukan verifikasi keaslian signature webhook. Jika valid:
   * Status transaksi diperbarui dari `PENDING` menjadi `PAID`.
   * **Thirdweb Engine** mentransfer kepemilikan NFT dari brand wallet ke dompet pembeli.
   * Status produk diperbarui menjadi `OWNED` dan pemilik saat ini diubah ke pembeli.
   * Log provenance produk mencatat kejadian `BRAND_OUTLET`.

### C. P2P Remote Shipping (Transaksi Jarak Jauh dengan Escrow)
Alur jual-beli antar pengguna dengan pengiriman ekspedisi:
```
[Buyer]                               [Seller]                              [Backend]
   │                                     │                                     │
   │ 1. Commit & Pay Escrow              │                                     │
   ├─────────────────────────────────────┼────────────────────────────────────>│
   │                                     │                                     │ (tx status -> PAID)
   │                                     │                                     │ (product status -> IN_TRANSIT)
   │                                     │ 2. Request Handover QR              │
   │                                     ├────────────────────────────────────>│
   │                                     │<────────────────────────────────────┤
   │                                     │    Returns Encrypted QR payload     │
   │                                     │                                     │
   │ 3. Scan QR & Tap NFC                │                                     │
   ├─────────────────────────────────────┼────────────────────────────────────>│
   │ 4. Verify & Release Escrow          │                                     │
   ├─────────────────────────────────────┴────────────────────────────────────>│
   │                                                                           │ (NFC UID match check)
   │                                                                           │ (NFT transferred via Thirdweb)
   │                                                                           │ (tx status -> COMPLETED)
   │                                                                           │ (product status -> OWNED)
```
*Jika UID NFC tidak cocok, status transaksi diubah menjadi `FRAUD_FLAGGED`, escrow ditahan untuk investigasi, dan aktivitas mencurigakan dicatat sebagai `FRAUD_ATTEMPT`.*

### D. P2P Direct Handover (Serah Terima Langsung)
Alur transaksi tatap muka tanpa keterlibatan pihak ketiga (tanpa escrow):
1. **Penjual** membuka aplikasi, membuat sesi serah terima, dan menunjukkan kode QR yang berisi payload sesi dinamis terenkripsi (berlaku 5 menit).
2. **Pembeli** memindai kode QR penjual dan menempelkan produk fisik ke modul NFC ponselnya.
3. Aplikasi pembeli mengirimkan UID NFC ke `/api/p2p/verify` dengan `mode: "direct"`.
4. Backend memverifikasi tanda tangan digital payload QR serta mencocokkan UID NFC dengan basis data produk.
5. Jika valid, backend memicu transfer NFT dari dompet penjual ke dompet pembeli secara gasless dan memperbarui log produk menjadi `TRANSFERRED`.

---

## 3. Skema Data (Database Entities)

### A. Profiles
Menghubungkan akun otentikasi Supabase dengan identitas dompet Web3 pembeli.
```json
{
  "user_id": "uuid (Primary Key)",
  "email": "string (Unique)",
  "wallet_address": "string (1:1 mapping ke user_id)",
  "role": "ADMIN | OPERATOR | CONSUMER",
  "full_name": "string (nullable)",
  "avatar_url": "string (nullable)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### B. Products
Aset kembar digital (*digital twin*) barang mewah.
```json
{
  "product_id": "uuid (Primary Key)",
  "serial_number": "string (Unique)",
  "brand": "string",
  "name": "string",
  "description": "string",
  "status": "MANUFACTURED | REGISTERED | OWNED | IN_TRANSIT",
  "nft_token_id": "string (nullable, referensi ERC-721 token)",
  "price_idr": "numeric",
  "current_owner_id": "uuid (nullable, relasi ke profiles.user_id)",
  "blockchain_tx_hash": "string (nullable)",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### C. NFC Tags
Menyimpan referensi kunci rahasia hardware NFC untuk autentikasi fisik.
```json
{
  "nfc_uid": "string (Primary Key, raw UID unik chip)",
  "product_id": "uuid (relasi ke products.product_id)",
  "secure_key_hash": "string (SHA256 hash dari uid + salt)",
  "created_at": "timestamp"
}
```

### D. Transactions
Log penampung transaksi escrow dan serah terima aset.
```json
{
  "transaction_id": "uuid (Primary Key)",
  "type": "PRIMARY_BOUTIQUE | P2P_REMOTE_SHIPPING | P2P_DIRECT_HANDOVER",
  "product_id": "uuid (relasi ke products.product_id)",
  "seller_id": "uuid (nullable, relasi ke profiles.user_id)",
  "buyer_id": "uuid (relasi ke profiles.user_id)",
  "amount_idr": "numeric",
  "status": "PENDING | PAID | IN_TRANSIT | COMPLETED | CANCELLED | FRAUD_FLAGGED",
  "payment_ref": "string (unique order ID untuk Midtrans)",
  "blockchain_tx_hash": "string (nullable)",
  "created_at": "timestamp",
  "completed_at": "timestamp"
}
```

### E. Product Logs
Rekaman linimasa provenance barang yang bersifat imutabel.
```json
{
  "log_id": "uuid (Primary Key)",
  "product_id": "uuid (relasi ke products.product_id)",
  "event": "MANUFACTURED | REGISTERED | BRAND_OUTLET | TRANSFERRED | FRAUD_ATTEMPT",
  "actor_id": "uuid (nullable, relasi ke profiles.user_id)",
  "actor_role": "string",
  "metadata": "jsonb",
  "created_at": "timestamp"
}
```

---

## 4. Dokumentasi API (API Reference)

Semua permintaan harus menggunakan header `Content-Type: application/json`.
Untuk endpoint berlabel **[Auth]**, sertakan header: `Authorization: Bearer <access_token>`.

### A. Autentikasi & Akun
#### `POST /api/auth/register`
Mendaftarkan pengguna konsumen baru. Secara otomatis menghasilkan dompet Web3 dinamis.
*   **Body**: `{ "email": "buyer@example.com", "password": "securepassword", "full_name": "John Doe" }`
*   **Response 200**: `{ "success": true, "data": { "user_id": "...", "wallet_address": "0x...", "access_token": "..." } }`

#### `POST /api/auth/login`
Autentikasi email dan password melalui Supabase Auth.
*   **Body**: `{ "email": "operator@luxtrace.com", "password": "securepassword" }`
*   **Response 200**: `{ "success": true, "data": { "user_id": "...", "role": "OPERATOR", "access_token": "..." } }`

#### `GET /api/auth/me` **[Auth]**
Mengambil detail profil pengguna aktif saat ini.
*   **Response 200**: `{ "success": true, "data": { "user_id": "...", "email": "...", "wallet_address": "..." } }`

---

### B. Manufaktur & Produk
#### `POST /api/products/upload` **[Auth: Operator/Admin]**
Membuat batch pendaftaran barang mewah baru via data CSV terurai.
*   **Body**: `{ "products": [ { "serial_number": "LUX-001", "brand": "Hermès", "name": "Birkin", "price_idr": 350000000 } ] }`
*   **Response 200**: `{ "success": true, "data": { "batch_id": "...", "status": "PROCESSING", "total_submitted": 1 } }`

#### `GET /api/products/batch/[batch_id]` **[Auth: Operator/Admin]**
Memeriksa status pengerjaan latar belakang batch minting NFT & NFC binding.
*   **Response 200**: `{ "success": true, "data": { "batch_id": "...", "status": "COMPLETED", "processed": 1, "results": [...] } }`

#### `GET /api/products` **[Auth]**
Mengambil daftar produk terdaftar. Administrator dapat melihat semua produk, sedangkan pembeli hanya dapat melihat produk miliknya.
*   **Query params**: `status`, `page`, `limit`
*   **Response 200**: `{ "success": true, "data": { "items": [...], "pagination": { "page": 1, "limit": 20, "total": 12 } } }`

#### `GET /api/products/[id]` **[Auth]**
Mengambil detail informasi properti satu produk.
*   **Response 200**: `{ "success": true, "data": { "product_id": "...", "serial_number": "...", "status": "OWNED", "current_owner_id": "..." } }`

---

### C. Alur Pembayaran & Escrow P2P
#### `POST /api/payments/create` **[Auth]**
Membuat invoice pembayaran Snap Midtrans untuk boutique sale maupun escrow P2P.
*   **Body**: `{ "type": "PRIMARY_BOUTIQUE", "product_id": "uuid-produk", "buyer_id": "uuid-pembeli" }`
*   **Response 200**: `{ "success": true, "data": { "transaction_id": "...", "snap_token": "...", "payment_url": "..." } }`

#### `POST /api/webhooks/midtrans`
Webhook penerima notifikasi pembayaran Midtrans (publik, dilindungi tanda tangan SHA-512).
*   **Response 200**: `{ "success": true }`

#### `POST /api/p2p/remote/init` **[Auth]**
Inisiasi transaksi escrow pengiriman jarak jauh oleh pembeli.
*   **Body**: `{ "product_id": "uuid-produk", "seller_id": "uuid-penjual", "agreed_price_idr": 120000000 }`
*   **Response 200**: `{ "success": true, "data": { "transaction_id": "...", "snap_token": "...", "payment_url": "..." } }`

#### `GET /api/p2p/remote/[transaction_id]/qr` **[Auth: Seller]**
Penjual meminta QR payload serah terima dinamis setelah escrow berstatus `PAID` / `IN_TRANSIT`.
*   **Response 200**: `{ "success": true, "data": { "qr_payload": "AES_ENCRYPTED_STRING", "session_id": "uuid", "expires_at": "..." } }`

#### `POST /api/p2p/verify` **[Auth: Buyer]**
Pembeli mengunggah sesi QR dan UID NFC fisik produk untuk verifikasi keaslian dan pelepasan dana escrow.
*   **Body**: `{ "session_id": "uuid-qr-session", "scanned_uid": "uid-nfc-fisik", "mode": "remote" }`
*   **Response 200**: `{ "success": true, "data": { "verified": true, "transaction_id": "...", "escrow_released": true, "product_status": "OWNED" } }`

#### `POST /api/p2p/direct/init` **[Auth: Seller]**
Inisiasi serah terima langsung tatap muka (direct handover) oleh penjual.
*   **Body**: `{ "product_id": "uuid-produk", "buyer_id": "uuid-pembeli" }`
*   **Response 200**: `{ "success": true, "data": { "transaction_id": "...", "qr_payload": "...", "session_id": "..." } }`

---

## 5. Menjalankan & Deployment

1.  **Instalasi Dependensi**:
    ```bash
    npm install
    ```
2.  **Menjalankan Mode Pengembangan**:
    ```bash
    npm run dev
    ```
3.  **Membangun Paket Produksi**:
    ```bash
    npm run build
    ```
