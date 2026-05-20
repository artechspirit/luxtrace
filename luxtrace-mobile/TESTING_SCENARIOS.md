# Panduan & Skenario Pengujian Aplikasi Mobile Customer (Luxtrace Mobile)

Dokumen ini menyediakan panduan terstruktur dan daftar skenario pengujian manual serta fungsional untuk aplikasi mobile customer **Luxtrace** (`luxtrace-mobile`). 

> [!NOTE]
> Pastikan backend Next.js (`luxtrace-web`) dan Thirdweb Engine lokal Anda berjalan dengan benar sebelum memulai pengujian ini.

---

## 1. Alur Autentikasi & Registrasi

Tujuan dari pengujian ini adalah memastikan pengguna dapat masuk dan mendaftar dengan aman, baik melalui jalur email standar maupun otentikasi Google OAuth.

| ID Skenario | Nama Pengujian | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | Registrasi Email Baru | 1. Buka aplikasi, masuk ke tab Registrasi.<br>2. Masukkan email baru, nama lengkap, dan kata sandi.<br>3. Klik tombol *Register*. | • Profil baru dibuat di PostgreSQL.<br>• Dompet Thirdweb (`0x...`) dibuat secara deterministik.<br>• Pengguna diarahkan ke beranda. |
| **TC-AUTH-02** | Login Email Terdaftar | 1. Masuk ke tab Login.<br>2. Masukkan email & kata sandi yang sudah didaftarkan.<br>3. Klik *Sign In*. | • Sesi tersimpan secara lokal.<br>• Teks loading premium berjalan.<br>• Diarahkan ke Dashboard Utama. |
| **TC-AUTH-03** | Google OAuth (Login Pertama) | 1. Pada layar Login, tekan tombol *Sign In with Google*.<br>2. Selesaikan login pada peramban web sistem.<br>3. Tunggu redirect kembali ke aplikasi. | • Redirect berjalan sukses tanpa error `LuxtraceMobile://auth-callback`.<br>• Profil baru dan dompet kripto secara otomatis dibuat via backend.<br>• Pengguna masuk dengan status `CONSUMER`. |
| **TC-AUTH-04** | Google OAuth (Login Ulang) | 1. Lakukan login dengan Google untuk akun yang sudah pernah terdaftar. | • Deteksi profil sukses instan.<br>• Langsung diarahkan ke halaman beranda tanpa membuat dompet baru. |
| **TC-AUTH-05** | Proteksi Halaman & Logout | 1. Di layar Dashboard, tekan tombol *Log Out* di kanan atas profil.<br>2. Coba akses rute beranda secara langsung. | • Sesi token lokal dihapus.<br>• Pengguna dialihkan kembali ke layar login.<br>• Rute terproteksi tidak dapat dibuka. |

---

## 2. Dashboard, Wallet, & Sinkronisasi Aset

Memastikan antarmuka utama menampilkan data kepemilikan aset riil dan informasi dompet secara akurat dari blockchain.

| ID Skenario | Nama Pengujian | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **TC-DASH-01** | Visualisasi Alamat Dompet | 1. Login ke aplikasi mobile.<br>2. Perhatikan bagian kartu dompet digital (Custody Wallet). | • Alamat dompet Ethereum Sepolia (`0x...`) tampil dengan benar.<br>• Nilai alamat dompet cocok dengan alamat yang ada di database web admin. |
| **TC-DASH-02** | Daftar Kepemilikan Produk | 1. Daftarkan produk baru atas nama dompet user melalui web portal.<br>2. Buka aplikasi mobile customer pada akun tersebut. | • Aset baru langsung tersinkronisasi dan muncul di daftar "My Collections" / "Owned Assets". |
| **TC-DASH-03** | Status Kosong (No Assets) | 1. Login menggunakan akun baru yang belum memiliki barang terdaftar. | • Tampilan menunjukkan ilustrasi premium "No physical assets bound to this wallet". |

---

## 3. Penelusuran Provenance & Riwayat Blockchain

Memastikan customer dapat memverifikasi keaslian barang mewah dengan melihat rantai kepemilikan (*provenance log*).

| ID Skenario | Nama Pengujian | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **TC-PROV-01** | Detail Produk & Metadata | 1. Klik salah satu aset di Dashboard. | • Halaman detail produk terbuka.<br>• Menampilkan Brand, Model, Serial Number, dan Token ID NFT yang sesuai. |
| **TC-PROV-02** | Audit Log Rantai Kepemilikan | 1. Gulir ke bagian *Timeline Provenance* di halaman detail. | • Menampilkan seluruh log peristiwa secara kronologis (MANUFACTURED, REGISTERED, TRANSFERRED).<br>• Setiap langkah menampilkan peran aktor, tanggal, dan metadata transaksi. |
| **TC-PROV-03** | Navigasi Hash Transaksi | 1. Klik hash transaksi (`tx_hash`) di salah satu langkah timeline. | • Mengalihkan pengguna ke situs penjelajah blockchain (Sepolia Etherscan) untuk memverifikasi keaslian di rantai publik. |

---

## 4. Scan NFC & P2P Handover (Serah Terima Langsung)

Menguji alur terpenting di mana customer menerima barang mewah secara fisik dari penjual lain atau dari butik, dilindungi oleh gerbang NFC & QR dinamis.

> [!WARNING]
> Verifikasi NFC memerlukan sinkronisasi kunci sesi QR sekali pakai (*single-use*). Pastikan data UID NFC yang terdaftar sama dengan kartu NFC fisik yang digunakan dalam simulasi/uji perangkat.

| ID Skenario | Nama Pengujian | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **TC-NFC-01** | Inisiasi Scan NFC QR | 1. Di halaman explore, pilih barang yang ingin dibeli, selesaikan pembayaran.<br>2. Tekan tombol *Start NFC Handover Scan*. | • Kamera memindai QR code transaksi penjual.<br>• Sesi enkripsi NFC diaktifkan di layar mobile. |
| **TC-NFC-02** | Penempelan Tag NFC (Verifikasi Sukses) | 1. Tempelkan kartu NFC fisik di bagian belakang ponsel. | • Ponsel mendeteksi UID tag secara instan.<br>• Mengirim data UID ke API backend.<br>• Loader premium "SECURE GATEWAY ENCRYPTION" muncul selama 12-15 detik.<br>• Kepemilikan NFT berpindah, status barang berubah menjadi `OWNED`. |
| **TC-NFC-03** | Verifikasi NFC Gagal (Tag Salah/Palsu) | 1. Tempelkan tag NFC lain yang tidak terikat dengan serial barang tersebut. | • Sistem menampilkan alert kesalahan "NFC Tag mismatch or invalid security key".<br>• Transaksi tetap terkunci di escrow dan NFT tidak berpindah tangan. |

---

## 5. Pasar Sekunder (Secondary Market & Escrow)

Menguji keandalan penahanan dana (*escrow*) ketika pengguna ingin menjual kembali barangnya.

| ID Skenario | Nama Pengujian | Langkah Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| **TC-MARKET-01** | Buka Penawaran Jual | 1. Buka detail produk yang dimiliki.<br>2. Klik tombol *Sell Asset*.<br>3. Masukkan nominal harga penawaran dan submit. | • Status barang berubah menjadi terdaftar di Secondary Market.<br>• Aset muncul di tab *Explore* pembeli lain. |
| **TC-MARKET-02** | Penguncian Escrow & Deposit Dana | 1. Login sebagai pembeli lain.<br>2. Pilih barang tersebut, selesaikan instruksi pembayaran (deposit dana). | • Status escrow transaksi berubah menjadi `PAID` / `Locked`.<br>• Penjual mendapatkan notifikasi dana terkunci di penampungan sementara. |
| **TC-MARKET-03** | Rilis Escrow & Payout | 1. Selesaikan langkah pemindaian NFC serah terima fisik (TC-NFC-02). | • Kontrak pintar memindahkan NFT ke pembeli.<br>• Midtrans IRIS merilis pencairan dana dari escrow ke rekening penjual secara otomatis. |
