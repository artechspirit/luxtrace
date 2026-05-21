# 💎 Luxtrace — Master System Blueprint & Judges' Handbook

> **Submission for Juaravibecoding Hackathon**  
> **Platform Digital Twin & Anti-Counterfeit Barang Mewah Berbasis NFT, Secure NFC Proxy, dan Escrow Payment.**

Selamat datang di repositori utama **Luxtrace**. Repositori ini berisi sistem lengkap yang terdiri dari:
1. **Web Admin Dashboard / API Backend** (`luxtrace-web`): Next.js 16 (Standalone) deployed ke Google Cloud Run.
2. **Mobile Operator & Consumer App** (`luxtrace-mobile`): React Native / Expo App dengan NativeWind & Web3 Wallet integration.

---

## 🔗 Link Akses Cepat & Uji Coba

| Komponen | Akses |
|---|---|
| **Web Dashboard (Live)** | [https://luxtrace-web-76989259968.asia-southeast1.run.app](https://luxtrace-web-76989259968.asia-southeast1.run.app) |
| **Kredensial Login (Web)** | `admin@luxtrace.com` (Tersedia tombol **Autofill otomatis** di halaman login!) |
| **Password** | `password123` |
| **File Template CSV** | [Download sample_products.csv](./sample_products.csv) (Untuk test batch upload di dashboard) |
| **Smart Contract Explorer** | [https://thirdweb.com/sepolia/0x6d87293F44D68365De7cE9c29dAF752971237239](https://thirdweb.com/sepolia/0x6d87293F44D68365De7cE9c29dAF752971237239) |
| **Mobile App (Development)** | Jalankan `npx expo start --clear` di direktori `luxtrace-mobile` |

---

## 🎬 Panduan Penilaian Langkah Demi Langkah (Judges' Guide)

Untuk memudahkan proses penilaian, kami telah menyediakan skenario pengujian alur dari awal (Pabrik) hingga akhir (P2P Handover).

> [!TIP]
> Detail instruksi perekaman dan demo fungsionalitas penuh dapat dilihat di berkas **[recording_demo_guide.md](./recording_demo_guide.md)**.

### Alur Simulasi Utama:
1. **Registrasi Aset Baru (Pabrik)**: Operator mengunggah CSV data produk di Web Dashboard ➔ Aset otomatis di-minting di **Sepolia Ethereum** via **Thirdweb Engine** dan di-bind dengan tag **NFC secure hash**.
2. **Pembelian Butik (Primary Sale)**: Konsumen membeli produk baru melalui invoice **Midtrans Sandbox** ➔ Pembayaran sukses memicu transfer NFT secara otomatis dari dompet brand ke dompet pembeli.
3. **Transaksi P2P Remote (Escrow)**: Pembeli memicu transaksi P2P escrow ke penjual ➔ Dana tertahan di escrow ➔ Penjual mengirimkan barang dan memberikan QR Code dinamis ➔ Pembeli memindai QR dan menempelkan NFC fisik untuk mencocokkan UID ➔ Jika valid, NFT ditransfer dan dana escrow dilepas ke penjual.
4. **Transaksi P2P Direct (Handover Tatap Muka)**: Penjual menunjukkan QR sesi terenkripsi ➔ Pembeli memindai dan memverifikasi chip NFC fisik ➔ NFT berpindah tangan secara gasless di blockchain.

---

## 🛠️ Panduan Menjalankan & Memasang Mobile App

Aplikasi mobile Luxtrace dibuat menggunakan Expo SDK.

### 1. Prasyarat Ponsel
*   **Android / iOS**: Pastikan ponsel mendukung fitur **NFC** (untuk memindai chip fisik tag produk).
*   **Aplikasi Expo Go**: Unduh aplikasi **Expo Go** di Google Play Store atau App Store.

### 2. Menjalankan Kode Sumber (Source Code)
```bash
# Masuk ke folder mobile
cd luxtrace-mobile

# Install dependensi
npm install

# Jalankan Expo server
npx expo start --clear
```
Pindai kode QR yang muncul di terminal menggunakan kamera ponsel Anda (untuk iOS) atau aplikasi Expo Go (untuk Android).

### 3. Kredensial Uji Coba Akun Pembeli (Mobile App)
Gunakan akun ini untuk masuk ke aplikasi mobile:
*   **Email**: `buyer@luxtrace.com` (atau `buyer2@luxtrace.com` untuk simulasi penerima P2P)
*   **Password**: `password123`

---

## 📐 Arsitektur Sistem & Cetak Biru (Blueprints)

Sistem Luxtrace dibangun dengan standar keamanan enterprise di mana **backend bertindak sebagai single source of truth** untuk semua pembacaan sensor (NFC) dan perubahan data blockchain (NFT).

```
                      [ Client Mobile App / Expo ]
                                  │
                                  ▼ (HTTP REST JSON & JWT Auth)
                [ Middleware.ts (Security & Validation) ]
                                  │
                                  ▼
                     [ API Routes (app/api/*) ]
                                  │
                                  ▼
                [ Services (services/*) — Business Logic ]
                  ├───────────────────────────────┐
                  ▼                               ▼
      [ Repositories (Supabase) ]      [ Thirdweb Engine / Midtrans ]
                  │                               │
                  ▼                               ▼
       [ PostgreSQL Database ]         [ Sepolia Testnet Blockchain ]
```

### Detail Blueprint Lanjutan:
*   **[blueprint.md](./blueprint.md)** — Master System Blueprint & State Machine (Lengkap).
*   **[mobile_architecture.md](./mobile_architecture.md)** — Arsitektur Aplikasi Mobile & Struktur Komponen.
*   **[luxtrace_system_analysis.md](./luxtrace_system_analysis.md)** — Analisis Sistem Terintegrasi & Flow Diagram.
*   **[luxtrace_api_contract.md](./luxtrace_api_contract.md)** — API Contracts & Referensi Payload Endpoint lengkap untuk Web dan Mobile.

---

## ⚡ Teknologi yang Digunakan

*   **Frontend Web**: Next.js 16 (App Router), TailwindCSS v4, React 19.
*   **Mobile App**: React Native, Expo, NativeWind (Tailwind CSS untuk Native), Ionicons.
*   **Database & Auth**: Supabase PostgreSQL & Supabase Auth.
*   **Web3 (Blockchain)**: Thirdweb SDK & Thirdweb Engine (Gasless Transactions), Sepolia Ethereum Network.
*   **Payment Gateway**: Midtrans Snap Sandbox API (Escrow & Direct Payment).
