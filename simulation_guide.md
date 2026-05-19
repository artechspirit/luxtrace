# Luxtrace Platform — End-to-End Simulation Guide

Panduan ini mendokumentasikan langkah demi langkah, respons API yang diharapkan (*expected API response*), dan perubahan status basis data (*expected DB state*) untuk 5 alur transaksi utama di dalam ekosistem Luxtrace.

---

## Alur 1: Registrasi Pengguna Baru & Pembuatan Dompet (`Register → Wallet`)

### 1. Deskripsi Alur
Konsumen mendaftar melalui aplikasi mobile dengan email dan password. Backend Supabase Auth mendaftarkan pengguna, memicu pembuatan dompet kustodial secara deterministik melalui Thirdweb Engine, menyimpan profil baru di basis data, dan menghasilkan JWT session tokens.

### 2. Langkah Demi Langkah (Step-by-Step)
1. Pengguna memasukkan email, password, dan nama lengkap di formulir registrasi.
2. Klien mengirim permintaan `POST` ke endpoint `/api/auth/register`.
3. Backend mendaftarkan user di sistem Supabase Auth.
4. Backend menghasilkan alamat Ethereum baru secara deterministik via Thirdweb Engine menggunakan hash dari `user_id` dan seed master.
5. Profil pengguna beserta alamat dompet disimpan di tabel `profiles`.
6. Token akses JWT dikembalikan ke klien.

### 3. Respons API yang Diharapkan (Expected API Response)
**`POST /api/auth/register`**
*   **Status**: `200 OK`
*   **Body**:
    ```json
    {
      "success": true,
      "data": {
        "user_id": "8c59918a-7e3e-4b6d-9be2-4411b0f55acb",
        "email": "buyer@luxtrace.com",
        "wallet_address": "0x3f6A27318eCacdD8849b40003BC9223e2b289a22",
        "role": "CONSUMER",
        "access_token": "eyJhbGciOi...",
        "refresh_token": "d7b2a..."
      }
    }
    ```

### 4. Perubahan Status Basis Data (Expected DB State)
*   **Tabel `auth.users`**: Bertambah 1 record dengan ID `8c59918a-7e3e-4b6d-9be2-4411b0f55acb`.
*   **Tabel `profiles`**: Bertambah 1 record baru:
    ```sql
    SELECT * FROM profiles WHERE user_id = '8c59918a-7e3e-4b6d-9be2-4411b0f55acb';
    -- Hasil: email='buyer@luxtrace.com', wallet_address='0x3f6A...', role='CONSUMER'
    ```

---

## Alur 2: Pendaftaran Produk Massal & Minting NFT (`Manufacturing`)

### 1. Deskripsi Alur
Produsen/Operator mendaftarkan batch produk kembar digital (*digital twin*) baru melalui berkas CSV. NFT dicetak secara berurutan (*sequential gasless minting*) via Thirdweb Engine, chip NFC virtual dibuat dan dipetakan, dan status dipromosikan ke `REGISTERED`.

### 2. Langkah Demi Langkah (Step-by-Step)
1. Operator mengunggah file CSV berisi kolom `serial_number`, `brand`, `name`, `description`, dan `price_idr`.
2. Klien mengirimkan berkas melalui `POST /api/products/upload` (Form Data).
3. Backend langsung mengembalikan ID batch (`batch_id`) dengan status `202 Accepted` untuk memulai pemrosesan asinkronus.
4. Secara berurutan di latar belakang (*background job*):
    *   Mencetak NFT produk ke *Brand hot wallet* menggunakan Thirdweb Engine API.
    *   Membuat UID NFC hardware unik, melakukan enkripsi SHA-256 dengan salt, dan menyimpannya di tabel `nfc_tags`.
    *   Mengubah status produk dari `MANUFACTURED` ke `REGISTERED` di tabel `products`.
    *   Mencatat log `REGISTERED` di tabel `product_logs`.
5. Operator melakukan polling berkala ke `GET /api/products/batch/[batch_id]` untuk melihat progres.

### 3. Respons API yang Diharapkan (Expected API Response)
**`POST /api/products/upload`**
*   **Status**: `202 Accepted`
*   **Body**:
    ```json
    {
      "success": true,
      "data": {
        "batch_id": "4b6da285-7e3e-4b6d-9be2-4411b0f55acb",
        "status": "PROCESSING",
        "total_submitted": 1,
        "estimated_seconds": 15,
        "message": "Batch of 1 products submitted. Poll /api/products/batch/4b6da285-... for status."
      }
    }
    ```

**`GET /api/products/batch/4b6da285-7e3e-4b6d-9be2-4411b0f55acb`**
*   **Status**: `200 OK`
*   **Body**:
    ```json
    {
      "success": true,
      "data": {
        "batch_id": "4b6da285-7e3e-4b6d-9be2-4411b0f55acb",
        "status": "COMPLETED",
        "total_submitted": 1,
        "processed": 1,
        "results": [
          {
            "serial_number": "LUX-2026-00001",
            "product_id": "a9b2d8e4-7e3e-4b6d-9be2-4411b0f55acb",
            "nft_token_id": "12",
            "tx_hash": "0x5a1b...",
            "nfc_bound": true
          }
        ],
        "failed": []
      }
    }
    ```

### 4. Perubahan Status Basis Data (Expected DB State)
*   **Tabel `products`**: Bertambah record baru dengan status `REGISTERED` dan `nft_token_id` terisi.
*   **Tabel `nfc_tags`**: Bertambah mapping kunci NFC rahasia untuk produk.
*   **Tabel `product_logs`**: Bertambah 2 entri (`MANUFACTURED` dan `REGISTERED`).

---

## Alur 3: Pembelian di Toko Resmi (`Boutique Payment`)

### 1. Deskripsi Alur
Konsumen membeli barang di boutique fisik atau online. Invoice dibuat melalui Midtrans Snap. Setelah pembayaran terverifikasi via webhook, kepemilikan NFT langsung ditransfer dari Brand Wallet ke dompet pembeli, status produk berubah menjadi `OWNED`.

### 2. Langkah Demi Langkah (Step-by-Step)
1. Pembeli menginisiasi pembelian barang berstatus `REGISTERED`.
2. Klien memanggil `/api/payments/create` untuk membuat tagihan.
3. Backend mendaftarkan record transaksi berstatus `PENDING` di Supabase dan mengembalikan token pembayaran Midtrans Snap.
4. Klien membuka widget Midtrans Snap dan pembeli menyelesaikan transaksi.
5. Midtrans mengirimkan notifikasi callback aman ke `/api/webhooks/midtrans`.
6. Backend memverifikasi keaslian webhook signature key. Jika valid:
    *   Mengubah status transaksi di Supabase menjadi `COMPLETED`.
    *   Memicu Thirdweb Engine untuk mentransfer NFT produk ke alamat dompet pembeli.
    *   Memperbarui status produk menjadi `OWNED` dengan pemilik saat ini (`current_owner_id`) disetel ke pembeli.
    *   Mencatat log `BRAND_OUTLET` di linimasa produk.

### 3. Respons API yang Diharapkan (Expected API Response)
**`POST /api/payments/create`**
*   **Status**: `200 OK`
*   **Body**:
    ```json
    {
      "success": true,
      "data": {
        "transaction_id": "d7b2a9e5-7e3e-4b6d-9be2-4411b0f55acb",
        "snap_token": "a1b2c3d4-e5f6-7g8h...",
        "payment_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/a1b2c3d4..."
      }
    }
    ```

### 4. Perubahan Status Basis Data (Expected DB State)
*   **Tabel `transactions`**: Status diperbarui dari `PENDING` menjadi `COMPLETED`.
*   **Tabel `products`**: Status diperbarui menjadi `OWNED`, `current_owner_id` disetel ke pembeli.
*   **Tabel `product_logs`**: Record baru event `BRAND_OUTLET` tersimpan.

---

## Alur 4: Jual-Beli Escrow Jarak Jauh (`P2P Remote`)

### 1. Deskripsi Alur
Pembelian barang antar pengguna secara jarak jauh (menggunakan kurir). Dana disimpan di escrow. Setelah barang tiba di tujuan, pembeli memindai QR dinamis dan chip NFC fisik produk untuk melepaskan dana escrow ke penjual dan memindahkan NFT secara on-chain.

### 2. Langkah Demi Langkah (Step-by-Step)
1. Pembeli menginisiasi transaksi escrow via `POST /api/p2p/remote/init`. Klien membayar tagihan.
2. Webhook Midtrans memperbarui status transaksi menjadi `PAID` dan mengunci produk menjadi `IN_TRANSIT` (mencegah double-spend).
3. Penjual mengirimkan barang. Sebelum serah terima, penjual meminta payload QR melalui `GET /api/p2p/remote/[transaction_id]/qr`. Backend membuat sesi QR dinamis aktif di tabel `qr_sessions`.
4. Pembeli menerima paket fisik, memindai kode QR penjual, dan menempelkan produk fisik ke ponselnya untuk membaca UID tag NFC.
5. Klien pembeli mengirimkan data ke `POST /api/p2p/verify` dengan `session_id`, `scanned_uid`, dan `mode: "remote"`.
6. Backend memvalidasi sesi QR, mencocokkan kecocokan hash UID NFC, mentransfer NFT dari dompet penjual ke pembeli via Thirdweb Engine, merilis dana escrow, mengubah status transaksi menjadi `COMPLETED`, dan mengubah status produk menjadi `OWNED`.

### 3. Respons API yang Diharapkan (Expected API Response)
**`POST /api/p2p/verify`**
*   **Status**: `200 OK`
*   **Body**:
    ```json
    {
      "success": true,
      "data": {
        "verified": true,
        "transaction_id": "d7b2a9e5-7e3e-4b6d-9be2-4411b0f55acb",
        "nft_transfer": {
          "tx_hash": "0xbc1a...",
          "from_wallet": "0xSeller...",
          "to_wallet": "0xBuyer...",
          "token_id": "12"
        },
        "product_status": "OWNED",
        "via": "DIRECT_HANDOVER"
      }
    }
    ```

### 4. Perubahan Status Basis Data (Expected DB State)
*   **Tabel `qr_sessions`**: Record sesi diubah menjadi `is_used = true` (mencegah serangan replay).
*   **Tabel `transactions`**: Status diubah dari `PAID` menjadi `COMPLETED`.
*   **Tabel `products`**: Status kembali ke `OWNED`, pemilik terdaftar diubah ke dompet pembeli.
*   **Tabel `product_logs`**: Record baru event `TRANSFERRED` dengan detail transaksi dimasukkan.

---

## Alur 5: Serah Terima Langsung Tatap Muka (`Direct Handover`)

### 1. Deskripsi Alur
Penjual dan pembeli melakukan transaksi langsung di tempat secara tatap muka (tanpa escrow). Penjual memicu sesi serah terima, pembeli menempelkan produk fisik ke ponselnya untuk memverifikasi keaslian dan memindahkan kepemilikan NFT secara instan.

### 2. Langkah Demi Langkah (Step-by-Step)
1. Penjual menginisiasi serah terima langsung via `POST /api/p2p/direct/init`.
2. Backend menghasilkan kode QR dinamis berisi payload sesi terenkripsi (valid 5 menit).
3. Pembeli memindai kode QR penjual dan mendekatkan produk fisik ke pembaca NFC ponselnya.
4. Aplikasi pembeli mengirimkan UID NFC fisik dan ID sesi QR ke `POST /api/p2p/verify` dengan `mode: "direct"`.
5. Backend memverifikasi status sesi, memvalidasi kecocokan kunci hash hardware NFC, mentransfer NFT dari dompet penjual ke dompet pembeli secara gasless via Thirdweb Engine, mengubah status pemilik produk ke pembeli, dan mencatat provenance `TRANSFERRED`.

### 3. Respons API yang Diharapkan (Expected API Response)
**`POST /api/p2p/direct/init`**
*   **Status**: `200 OK`
*   **Body**:
    ```json
    {
      "success": true,
      "data": {
        "transaction_id": "e3b8d4f2-7e3e-4b6d-9be2-4411b0f55acb",
        "qr_payload": "U2FsdGVkX195y...",
        "session_id": "a9d8f7e6-7e3e-4b6d-9be2-4411b0f55acb"
      }
    }
    ```

**`POST /api/p2p/verify` (Direct Mode)**
*   **Status**: `200 OK`
*   **Body**:
    ```json
    {
      "success": true,
      "data": {
        "verified": true,
        "transaction_id": "e3b8d4f2-7e3e-4b6d-9be2-4411b0f55acb",
        "nft_transfer": {
          "tx_hash": "0x89ab...",
          "from_wallet": "0xSeller...",
          "to_wallet": "0xBuyer...",
          "token_id": "12"
        },
        "product_status": "OWNED",
        "via": "DIRECT_HANDOVER"
      }
    }
    ```

### 4. Perubahan Status Basis Data (Expected DB State)
*   **Tabel `qr_sessions`**: Kolom `is_used` disetel menjadi `true`.
*   **Tabel `products`**: Kolom `current_owner_id` diperbarui ke pembeli baru, status tetap `OWNED`.
*   **Tabel `product_logs`**: Record provenance baru dengan event `TRANSFERRED` berhasil dimasukkan.
