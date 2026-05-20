# Panduan Perekaman Video Demo Luxtrace

Dokumen ini menyediakan panduan langkah demi langkah yang konstan dan terstruktur untuk merekam video demonstrasi (demo) fungsionalitas utama sistem Luxtrace, mulai dari pembelian pertama di Butik resmi hingga proses transaksi P2P Handover (antarpengguna) menggunakan QR dinamis dan NFC.

---

## 🎥 Konsep Video yang Direkomendasikan
*   **Format**: Perekaman layar ganda (*side-by-side*) atau transisi halus antara layar **Mobile App** (dapat menggunakan emulator/ponsel asli yang dicerminkan via SCRCPY) dan **Web Terminal** (untuk menjalankan skrip simulasi pembayaran dan blockchain).
*   **Durasi Efektif**: ~2 hingga 3 menit.
*   **Fokus Utama**: Menampilkan proses verifikasi keaslian barang mewah secara instan, transisi status kepemilikan, dan animasi *Luxury Loader* (Web3 block confirmation).

---

## 🛠️ Langkah Persiapan Sebelum Rekaman

### 1. Jalankan Aplikasi Web & Mobile
Pastikan backend Next.js dan Expo bundler berjalan di terminal Anda.
```bash
# Terminal 1: Jalankan Web Backend
cd luxtrace-web
npm run dev

# Terminal 2: Jalankan Mobile Expo
cd luxtrace-mobile
npm run start
```

### 2. Bersihkan Basis Data (Reset State)
Gunakan skrip pembersih agar tidak ada data produk lama yang mengacaukan visualisasi demo Anda.
```bash
# Terminal 3: Jalankan pembersihan produk
node luxtrace-web/scripts/clean-products.js
```

---

## 🎬 Skenario Perekaman Langkah Demi Langkah

### Bagian 1: Autentikasi & Awal Kepemilikan (0:00 - 0:30)
1. **Mulai Rekaman** pada layar Mobile App yang menampilkan halaman Login.
2. Masuk menggunakan akun pembeli pertama:
   *   **Email**: `buyer@luxtrace.com`
   *   **Password**: `password123`
3. Tunjukkan layar **Dashboard** yang kosong (*Empty State*), membuktikan bahwa akun ini belum memiliki barang mewah terikat di dompet digitalnya.

### Bagian 2: Pembelian Pertama dari Boutique (0:30 - 1:15)
1. Tampilkan layar Terminal/Web di sebelah layar Mobile.
2. Jalankan skrip simulasi pembelian butik:
   ```bash
   node luxtrace-web/scripts/simulate-boutique-buy.js
   ```
   > [!NOTE]
   > Biarkan skrip berjalan dan tunjukkan log transaksi Sepolia Ethereum serta konfirmasi Thirdweb Engine pada video. Ini memberikan kesan "Web3 Provenance Engine" yang nyata.
3. Kembali ke layar **Mobile App**, lakukan gestur *pull-to-refresh* atau tunggu refresh otomatis.
4. Tunjukkan produk tas mewah (contoh: *Hermes Birkin 30*) sekarang muncul di daftar koleksi pembeli dengan status **`OWNED`**.
5. Klik produk tersebut untuk menampilkan detail **Provenance Timeline** yang menunjukkan log `MANUFACTURED` ➔ `REGISTERED` ➔ `BRAND_OUTLET`.

### Bagian 3: Inisiasi P2P Handover (1:15 - 1:45)
1. Jalankan skrip simulasi inisiasi handover ke pembeli kedua:
   ```bash
   node luxtrace-web/scripts/simulate-p2p-handover.js
   ```
2. Buka berkas [P2P_HANDOVER_QR.md](file:///home/beta/Desktop/juaravibecoding-luxtrace/P2P_HANDOVER_QR.md) di editor kode Anda, tunjukkan kode QR yang digenerasi beserta **NFC Tag UID**-nya.
3. Di layar Mobile App, lakukan *Log Out* dari akun `buyer@luxtrace.com`.

### Bagian 4: Verifikasi & Serah Terima NFT (1:45 - 2:30)
1. Log in di Mobile App sebagai pembeli kedua:
   *   **Email**: `buyer2@luxtrace.com`
   *   **Password**: `password123`
2. Tekan tombol **"Scan QR"** pada aplikasi mobile, lalu arahkan kamera (atau arahkan simulator) ke kode QR di berkas `P2P_HANDOVER_QR.md`.
3. Setelah terpindai, masukkan **NFC Tag UID** sesuai dengan yang tertulis di berkas markdown tersebut.
4. Tekan **"TRIGGER DIRECT HANDOVER"**.
5. **SOROTAN PENTING**: Biarkan video merekam seluruh animasi **Luxury Loader** selama **12.5 detik** beserta teks log verifikasinya (*"Initializing Sepolia Web3 handshake..."*, dst.) untuk menunjukkan pengalaman pengguna kelas atas.
6. Tampilkan pop-up dialog sukses **"AUTHENTICITY VERIFIED"** beserta hash blockchain Sepolia Etherscan.
7. Tekan *Dismiss* dan tunjukkan produk tas mewah tersebut kini telah sukses berpindah ke tab koleksi `buyer2@luxtrace.com`.
8. Buka kembali linimasa produk dan tunjukkan log baru **`TRANSFERRED`** telah terbit di rantai kepemilikan.

---

## 💡 Tips Tambahan untuk Hasil Video Terbaik

*   **Pencahayaan & Resolusi**: Jika merekam ponsel fisik, pastikan kamera perekam fokus dan tidak silau terkena pantulan cahaya. Jika menggunakan emulator, gunakan resolusi minimal 1080p.
*   **Fokus pada Detail NFT**: Saat dialog sukses muncul, Anda dapat menyalin hash transaksi blockchain (`tx_hash`) dan menunjukkannya di situs web [Sepolia Etherscan](https://sepolia.etherscan.io) untuk membuktikan keabsahan on-chain platform Anda secara transparan.
