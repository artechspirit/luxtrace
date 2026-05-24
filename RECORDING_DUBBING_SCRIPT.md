# LuxTrace - Shot List & Script Narasi Dubbing

> Target video: maksimal 3 menit  
> Format: rekaman asli dashboard laptop + rekaman asli mobile app, lalu audio asli dimute dan diganti voice-over/dubbing.

## Alur Video Singkat

| Scene | Durasi Target | Visual yang Direkam | Narasi Dubbing |
|---|---:|---|---|
| 1. Opening Cloud Run | 5-8 detik | Buka URL Cloud Run LuxTrace di browser laptop. Pastikan URL live terlihat sebentar. | "Ini adalah LuxTrace, aplikasi verifikasi produk luxury yang sudah berjalan live di Google Cloud Run." |
| 2. Problem Statement | 10-15 detik | Bisa pakai opening AI/b-roll luxury product, atau tampilan dashboard LuxTrace. | "Barang luxury palsu makin sulit dibedakan. Untuk pembeli preloved, masalahnya bukan cuma asli atau palsu, tapi juga siapa pemilik sahnya dan apakah riwayat produknya jelas." |
| 3. Dashboard Admin | 20-30 detik | Tampilkan dashboard admin, summary, tabel produk, dan status seperti REGISTERED, OWNED, IN_TRANSIT. | "Dari sisi brand admin, LuxTrace menyediakan dashboard untuk melihat seluruh produk, status registry, transaksi, dan pergerakan ownership dalam satu tempat." |
| 4. Product Registry / CSV Upload | 20-30 detik | Tampilkan area product registry, upload CSV, atau daftar produk yang sudah terdaftar. | "Brand bisa mendaftarkan produk luxury ke registry. Setiap produk punya serial number, status, dan identitas digital yang nantinya bisa diverifikasi oleh customer." |
| 5. Product Detail + Provenance | 20-30 detik | Klik salah satu produk. Tampilkan brand, serial number, NFT token ID, status, dan timeline MANUFACTURED, REGISTERED, BRAND_OUTLET, TRANSFERRED. | "Di halaman detail, setiap produk memiliki provenance chain. Riwayatnya tercatat dari manufactured, registered, penjualan boutique, sampai perpindahan ownership antar customer." |
| 6. Boutique Sale / Generate QR | 25-35 detik | Buka Boutique Sell, pilih produk REGISTERED, isi buyer email, pilih Direct Handover atau Escrow, lalu generate QR. | "Saat produk dijual, operator bisa membuat sesi transaksi. Sistem menghasilkan QR untuk pembayaran atau handover, sehingga proses serah terima bisa dimulai secara aman dan terarah." |
| 7. Mobile App Home | 10-15 detik | Buka app LuxTrace di HP. Tampilkan home, product list, transaction list, atau wallet. | "Di sisi customer, aplikasi mobile digunakan untuk melihat produk, transaksi, wallet, dan melakukan verifikasi langsung dari perangkat mereka." |
| 8. Scan QR | 20-30 detik | HP membuka scanner LuxTrace, lalu scan QR dari laptop/dashboard. Setelah berhasil, tampilkan NFC Simulator Terminal. | "Customer cukup scan QR dari sesi transaksi. QR ini membawa session ID yang digunakan untuk menghubungkan transaksi digital dengan produk fisik." |
| 9. NFC Verification | 30-40 detik | Di layar NFC Simulator Terminal, tap physical NFC jika tersedia, atau paste NFC UID. Klik TRIGGER DIRECT HANDOVER atau TRIGGER REMOTE P2P HANDOVER. Tampilkan LuxuryLoader. | "Setelah QR valid, customer melakukan verifikasi NFC. LuxTrace mencocokkan UID chip fisik dengan data yang tersimpan di backend, lalu memproses transfer ownership secara aman." |
| 10. Authenticity Verified + Proof | 15-25 detik | Tampilkan popup AUTHENTICITY VERIFIED, tx hash, status OWNED. Lalu potong ke Thirdweb Explorer atau dashboard proof. | "Jika QR dan NFC cocok, sistem menampilkan authenticity verified. Ownership berpindah, transaksi tercatat, dan bukti on-chain dapat ditelusuri melalui Thirdweb di jaringan Sepolia." |

## Script Voice-over Full

Gunakan script ini kalau kamu ingin dubbing satu kali dari awal sampai akhir.

```text
Ini adalah LuxTrace, aplikasi verifikasi produk luxury yang sudah berjalan live di Google Cloud Run.

Barang luxury palsu makin sulit dibedakan. Untuk pembeli preloved, masalahnya bukan cuma asli atau palsu, tapi juga siapa pemilik sahnya dan apakah riwayat produknya jelas.

Dari sisi brand admin, LuxTrace menyediakan dashboard untuk melihat seluruh produk, status registry, transaksi, dan pergerakan ownership dalam satu tempat.

Brand bisa mendaftarkan produk luxury ke registry. Setiap produk punya serial number, status, dan identitas digital yang nantinya bisa diverifikasi oleh customer.

Di halaman detail, setiap produk memiliki provenance chain. Riwayatnya tercatat dari manufactured, registered, penjualan boutique, sampai perpindahan ownership antar customer.

Saat produk dijual, operator bisa membuat sesi transaksi. Sistem menghasilkan QR untuk pembayaran atau handover, sehingga proses serah terima bisa dimulai secara aman dan terarah.

Di sisi customer, aplikasi mobile digunakan untuk melihat produk, transaksi, wallet, dan melakukan verifikasi langsung dari perangkat mereka.

Customer cukup scan QR dari sesi transaksi. QR ini membawa session ID yang digunakan untuk menghubungkan transaksi digital dengan produk fisik.

Setelah QR valid, customer melakukan verifikasi NFC. LuxTrace mencocokkan UID chip fisik dengan data yang tersimpan di backend, lalu memproses transfer ownership secara aman.

Jika QR dan NFC cocok, sistem menampilkan authenticity verified. Ownership berpindah, transaksi tercatat, dan bukti on-chain dapat ditelusuri melalui Thirdweb di jaringan Sepolia.

Dengan LuxTrace, brand mendapat product registry, customer mendapat verifikasi keaslian, dan pasar luxury punya lapisan trust baru.

LuxTrace: verify luxury, prove ownership.
```

## Versi Narasi Lebih Singkat

Gunakan versi ini kalau durasi video mulai mepet.

```text
LuxTrace adalah aplikasi verifikasi produk luxury dengan QR, NFC, dan digital ownership, live di Google Cloud Run.

Masalahnya, barang luxury palsu makin sulit dibedakan, terutama di pasar preloved. Pembeli butuh cara untuk mengecek keaslian, riwayat, dan ownership produk.

Dari dashboard, brand admin bisa mendaftarkan produk, melihat status registry, dan memantau transaksi. Setiap produk memiliki serial number, NFT token ID, dan provenance chain.

Saat produk dijual, sistem menghasilkan QR untuk sesi transaksi. Customer membuka aplikasi mobile, scan QR, lalu melakukan verifikasi NFC pada produk fisik.

Jika QR dan NFC cocok, LuxTrace menampilkan authenticity verified, memindahkan ownership, dan mencatat bukti transaksi secara on-chain.

LuxTrace membantu brand menjaga registry resmi, dan membantu customer membeli produk luxury dengan lebih aman dan transparan.
```

## Teks Overlay yang Disarankan

Tambahkan teks pendek saja di CapCut/Canva agar video mudah dipahami tanpa menutupi UI.

- "Live on Google Cloud Run"
- "Brand Admin Dashboard"
- "Product Registry"
- "Provenance Chain"
- "Generate Transaction QR"
- "Customer Mobile Verification"
- "QR + NFC Match"
- "Authenticity Verified"
- "Ownership Transfer"
- "On-chain Proof"

## Checklist Rekaman

- [ ] URL Cloud Run terlihat
- [ ] Dashboard admin terlihat
- [ ] Product registry/status terlihat
- [ ] Product detail dan provenance timeline terlihat
- [ ] QR transaksi berhasil dibuat
- [ ] Mobile app berhasil scan QR
- [ ] NFC verification / UID input terlihat
- [ ] LuxuryLoader terlihat sebentar
- [ ] Popup `AUTHENTICITY VERIFIED` terlihat
- [ ] Thirdweb / proof on-chain terlihat
