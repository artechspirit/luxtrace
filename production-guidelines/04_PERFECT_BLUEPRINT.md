# Master Blueprint Template (Cetak Biru Ideal)

Untuk mencapai hasil maksimal saat memulai proyek aplikasi baru—baik bersama tim engineer manusia maupun bantuan AI—berikan *Blueprint* komprehensif yang telah dipikirkan matang. Gunakan format (Template) di bawah ini:

---

# BLUEPRINT: [NAMA PROYEK ANDA]

## 1. Product Vision & Elevator Pitch
[Penjelasan singkat 1-3 kalimat mengenai masalah apa yang dipecahkan aplikasi ini, siapa target penggunanya, dan apa nilai jual utamanya (Unique Selling Proposition).]
*Contoh: "Aplikasi SaaS manajemen inventori lintas platform untuk UMKM ritel. Memungkinkan sinkronisasi stok secara real-time dari toko fisik dan toko online (e-commerce) dalam satu dashboard."*

## 2. Tech Stack Definition
Tentukan teknologi utama yang harus digunakan agar tidak terjadi asumsi liar:
- **Frontend Web:** [misal: Next.js 14 (App Router), Tailwind CSS]
- **Mobile App:** [misal: React Native (Expo) / Flutter / Kotlin]
- **Backend/API:** [misal: Golang / Node.js Express / Next.js Route Handlers]
- **Database:** [misal: PostgreSQL / MongoDB / Firebase]
- **3rd Party Integrations:** [misal: Stripe/Midtrans untuk Pembayaran, AWS S3 untuk File, SendGrid untuk Email]

## 3. Core Database Entities (Schema Overview)
Definisikan entitas inti (Tabel/Model) berserta relasinya secara garis besar:
1. **User:** ID, Name, Email, Role (Admin/Customer), PasswordHash.
2. **[Entitas Utama 1 - misal: Product]:** ID, Name, Price, StockQuantity, CategoryID.
3. **[Entitas Utama 2 - misal: Order]:** ID, UserID, TotalAmount, Status (PENDING, PAID, SHIPPED), CreatedAt.
4. **[Entitas Utama 3 - misal: OrderItem]:** ID, OrderID, ProductID, Quantity, Subtotal.

## 4. Key User Workflows (Alur Bisnis Kritis)
Jelaskan urutan langkah (Step-by-step) untuk fitur paling penting dari awal hingga akhir.
- **Flow 1: [Nama Alur - misal: Proses Checkout & Pembayaran]**
  1. Pengguna menambahkan item ke *Cart* dan mengklik tombol "Checkout".
  2. Sistem melakukan validasi ketersediaan *StockQuantity* di Database.
  3. Sistem membuat *Order* dengan status `PENDING` dan meminta URL Pembayaran ke *Payment Gateway*.
  4. Pengguna diarahkan ke halaman pembayaran dan menyelesaikan transaksi.
  5. *Payment Gateway* mengirimkan *Webhook* konfirmasi ke Backend.
  6. Backend memverifikasi *signature* webhook, memperbarui status Order menjadi `PAID`, dan mengirimkan Notifikasi Email.

## 5. Security & System Constraints (Aturan Batasan Sistem)
Berikan aturan-aturan mutlak yang tidak boleh dilanggar secara teknis.
- *Contoh: "Endpoint API pembayaran hanya bisa dipanggil oleh pengguna yang sudah memiliki Bearer Token valid."*
- *Contoh: "Stok produk tidak boleh minus; terapkan isolasi tingkat database (Row-level Locking) saat memotong stok."*
- *Contoh: "Upload foto pengguna maksimal berukuran 2MB dan di-compress sebelum masuk ke Storage."*

## 6. UI/UX & Design Direction
Arahkan bagaimana sistem antarmuka harus dirasakan oleh pengguna:
- **Tema Visual:** [misal: Bersih, Minimalis, Terang (Light Mode), nuansa profesional]
- **Warna Brand:** [misal: Warna utama Biru Korporat (#1E3A8A) dipadu latar putih/abu-abu netral]
- **Layout Guideline:** [misal: Gunakan sidebar untuk navigasi di Desktop, navigasi bawah (bottom tab) di Mobile App]

---
*(Dengan menyediakan dokumen lengkap seperti ini sejak awal, setiap pihak (AI maupun Developer) dapat menyusun skema database yang presisi, komponen yang tepat guna, dan meminimalisir bongkar-pasang kode di pertengahan proyek).*
