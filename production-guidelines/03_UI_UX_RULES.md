# UI/UX Rules & Design Principles

Sebuah aplikasi tingkat *Enterprise* tidak hanya bergantung pada backend yang kuat, tetapi juga pengalaman pengguna (*User Experience*) yang intuitif, aman, inklusif, dan terlihat profesional.

## 1. Filosofi Desain Konsisten & Elegan
- **Typography:** Gunakan font Sans-Serif modern (seperti *Inter*, *Roboto*, *Geist*, *Plus Jakarta Sans*). Patuhi hierarki *heading* (H1 hingga H6). Berikan jarak antar huruf (*letter-spacing*) yang tepat pada label huruf besar (UPPERCASE) untuk kesan premium.
- **Color Palette:** Tentukan Sistem Desain (*Design System*) sejak awal yang terdiri dari: *Primary*, *Secondary*, *Accent*, *Success*, *Warning*, dan *Danger*. Konsisten menggunakan skala warna (contoh: rentang warna 50 hingga 900 seperti di Tailwind).
- **Visual Depth:** Gunakan efek bayangan halus (*soft drop-shadows*) atau gaya batas elemen (*borders*) untuk membedakan lapisan antar kartu (*cards*), *dropdown*, dan latar belakang utama.

## 2. Interaksi Form & Layout (Menghindari Antarmuka Berantakan)
- **Aturan Penggunaan Modal:** JANGAN menggunakan *Modal*/*Popup* untuk pengisian form (*data entry*) yang panjang atau memiliki lebih dari 3 input (contoh: Checkout, Buat Laporan Panjang). *Modal* rentan terhadap masalah tertutup oleh *Virtual Keyboard* di perangkat Mobile atau konten terpotong pada layar kecil.
- **Dedicated Screens & Drawers:** Gunakan halaman penuh (*Dedicated Pages*) atau laci geser samping (*Side Drawers*) untuk form yang kompleks. Gunakan *Modal* HANYA untuk "Alert Konfirmasi Aksi" (Hapus Data? Ya/Tidak) atau menampilkan pesan sukses/ringkasan instan.

## 3. Feedback Loop (Umpan Balik kepada Pengguna)
- **Loading States:** Setiap tombol yang memicu interaksi ke server (API) harus menampilkan indikator *loading* (*spinner/dots* di dalam tombol) dan tombol harus dinonaktifkan sementara (`disabled`) untuk mencegah kasus klik ganda (*double submit*).
- **Skeleton Loaders:** Daripada menampilkan layar kosong dan membosankan dengan *spinner* putar di tengah layar, gunakan efek kerangka (*Skeleton UI*) yang menggambarkan struktur layout konten sebelum data asli selesai dimuat.
- **Toast & Snackbars:** Segera berikan notifikasi kecil (Sukses, Gagal, Info) yang otomatis menghilang dalam hitungan detik setelah pengguna melakukan tindakan (seperti menyimpan profil atau menghapus item).

## 4. Responsiveness (Responsivitas Penuh)
- **Mobile First Approach:** Biasakan mendesain dan menata CSS mulai dari tampilan layar kecil (*Mobile*), kemudian secara bertahap tingkatkan tata letaknya untuk ukuran *Tablet* dan layar lebar (*Desktop*).
- **Fluid Layouts:** Percayakan pada sistem bawaan Grid dan Flexbox untuk mengatur tata letak yang beradaptasi secara logis. Sangat dihindari memaksakan elemen menggunakan tata letak mutlak (*absolute positioning*), kecuali hanya untuk elemen dekoratif murni.

## 5. Accessibility (Aksesibilitas / a11y)
- Patuhi standar kontras warna teks terhadap latar belakang (minimal rasio 4.5:1 untuk teks biasa) agar mudah dibaca oleh semua orang.
- Pastikan seluruh elemen interaktif (Tombol, Tautan, Input) dapat dinavigasi secara penuh menggunakan *Keyboard* saja (tombol `Tab`, `Enter`, `Space`).
- Tambahkan deskripsi `aria-label` atau atribut `alt` pada tombol berbentuk ikon (yang tidak memiliki teks penjelasan) agar dapat terbaca oleh perangkat pembaca layar (*Screen Readers*).
