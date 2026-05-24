# 🎬 Luxtrace — Video Demo Script (Maks. 3 Menit)

> Hackathon: Juaravibecoding  
> Platform: Anti-Counterfeit Luxury Goods via NFT + NFC + Escrow Payment

---

## 📋 Struktur Video

| Segmen | Durasi | Isi |
|--------|--------|-----|
| **1. Hook & Problem** | 0:00 – 0:30 | Narasi masalah + value prop |
| **2. Demo Langsung** | 0:30 – 2:30 | 4 alur utama sistem |
| **3. Tech Stack & Closing** | 2:30 – 3:00 | Arsitektur + call to action |

---

## 🎙️ SEGMEN 1 — Hook & Problem Statement (30 detik)

**[Screen: Judul animasi "Luxtrace 💎"]**

> *"Bagi kolektor, membeli barang preloved punya risiko besar tertipu barang 'super-fake'. Pembeli di pasar P2P tidak punya cara 100% aman untuk membuktikan keaslian barang.*
>
> *Luxtrace hadir sebagai solusi: sistem Digital Twin berbasis NFT + NFC chip fisik yang membuat setiap tas, jam tangan, dan barang mewah memiliki identitas digital yang tidak bisa dipalsukan.*
>
> *Dalam 3 menit ini, mari lihat bagaimana sistem ini bekerja dari ujung ke ujung."*

---

## 🖥️ SEGMEN 2 — Demo Langsung (2 menit)

### 2A. Web Dashboard — Registrasi Aset Baru (20 detik)
**[Screen: Web Dashboard Admin — https://luxtrace-web-76989259968.asia-southeast1.run.app]**

- Login otomatis pakai tombol **Autofill** → masuk sebagai Admin
- Buka menu **Products / Upload CSV**
- Upload `sample_products.csv` → tampilkan loading proses minting
- Highlight: *"Setiap produk otomatis di-mint sebagai NFT di Sepolia Ethereum via Thirdweb Engine"*

---

### 2B. Mobile App — Pembelian di Butik (Primary Sale) (25 detik)
**[Screen: Mobile App — login sebagai `buyer@luxtrace.com`]**

- Buka halaman produk di mobile
- Klik beli → muncul **invoice Midtrans Sandbox**
- Simulasikan pembayaran berhasil
- Highlight: *"Pembayaran sukses → NFT otomatis berpindah ke wallet pembeli — tanpa manual, gasless!"*

---

### 2C. Mobile App — Transaksi P2P via Escrow (35 detik)
**[Screen: Mobile App — dua akun: buyer & buyer2]**

1. `buyer@luxtrace.com` → initiasi transfer P2P ke `buyer2`
2. Tampilkan dana tertahan di escrow
3. Penjual generate **QR Code dinamis terenkripsi**
4. Pembeli scan QR → tap **NFC chip fisik** di produk
5. Sistem verifikasi cocok → NFT transfer + escrow released

- Highlight: *"NFC fisik tidak bisa dipalsukan — hash UID chip dicocokkan dengan data on-chain di backend"*

---

### 2D. Mobile App — P2P Direct Handover (Tatap Muka) (25 detik)
**[Screen: Mobile App — sisi penjual dan pembeli berdampingan]**

1. Penjual tampilkan QR sesi terenkripsi
2. Pembeli scan QR
3. Pembeli tempelkan NFC ke produk → verified
4. NFT berpindah tangan secara gasless

- Highlight: *"Dua mode P2P: Remote Escrow & Direct Handover — untuk semua skenario jual beli"*

---

### 2E. Bukti Blockchain (15 detik)
**[Screen: Thirdweb Explorer — Smart Contract di Sepolia]**

- Buka: `https://thirdweb.com/sepolia/0x6d87293F44D68365De7cE9c29dAF752971237239`
- Tunjukkan history transaksi NFT yang baru saja dibuat
- Highlight: *"Semua transaksi tercatat permanen dan transparan di blockchain"*

---

## ⚡ SEGMEN 3 — Tech Stack, Vibe Coding & Closing (30 detik)

**[Screen: Tampilan IDE bersama Antigravity / Prompt Google AI Studio, disandingkan dengan Arsitektur Luxtrace]**

> *"Membangun ekosistem sekompleks ini (Web, Mobile, Web3) biasanya butuh tim besar dan waktu berbulan-bulan. Rahasia kami? Kami jujur menggunakan metode **Vibe Coding**.*
>
> *Dengan bantuan **Google Gemini** dan asisten AI **Antigravity**, kami merancang guardrails yang ketat, dan mereka mengeksekusi penulisan kode dengan sangat presisi. Mulai dari backend NestJS, integrasi NFC di Expo, hingga deployment ke **Google Cloud Run**.*
>
> *Ini bukan sekadar prototype, ini adalah masa depan software engineering.*
>
> *Luxtrace — keaslian tanpa kompromi, didukung oleh AI."*

---

## 💡 Tips Recording

- **Pakai HP fisik** untuk demo NFC — jangan emulator
- **Koneksi internet stabil** — backend di Cloud Run, perlu internet
- **Rekam screen HP** pakai Scrcpy (Android) atau mirror ke laptop
- **Gunakan 2 HP** atau 2 akun untuk demo P2P (buyer ↔ buyer2)
- **Subtitle/teks** di video sangat membantu juri memahami alur
- **Background musik** ringan agar tidak monoton
- **Resolusi minimal 1080p**, landscape untuk web dashboard

---

## ✅ Checklist Sebelum Upload

- [ ] Web dashboard tampil dan bisa login
- [ ] CSV upload dan minting berhasil
- [ ] Midtrans payment flow selesai
- [ ] NFC scan berhasil di HP fisik
- [ ] Blockchain explorer tampil transaksi terbaru
- [ ] Durasi video ≤ 3:00 menit
- [ ] Audio narasi jelas
