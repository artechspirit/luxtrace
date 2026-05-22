# Architecture & System Design Rules

Untuk mencapai sistem yang **Production Ready, Scalable, Secure, dan Fast**, arsitektur dasar harus dirancang untuk menangani kegagalan, beban tinggi, dan keamanan sejak hari pertama. Panduan ini berlaku untuk semua jenis aplikasi modern (SaaS, E-Commerce, Dashboard, dll).

## 1. Scalability (Skalabilitas)
- **Decoupled Architecture:** Pisahkan Backend API, Frontend Web, dan Mobile App. Hal ini memungkinkan Anda melakukan *scale-up* secara independen (misalnya, menambah server hanya untuk Backend jika *traffic* API tinggi).
- **Stateless Backend:** Pastikan semua API bersifat *stateless* (tidak menyimpan *session* di memori server). Gunakan JWT (JSON Web Tokens) atau Redis untuk manajemen sesi agar *request* bisa ditangani oleh server (container) mana pun tanpa terputus.
- **Database Connection Pooling:** Gunakan *connection pooler* (seperti PgBouncer untuk PostgreSQL) untuk mencegah *database* kehabisan batas koneksi (*connection exhaustion*) saat *traffic spike*.
- **Caching Strategy:** Jangan *query* ke *database* berulang kali untuk data statis atau yang jarang berubah. Gunakan *Redis* untuk me-nge-*cache* hasil *query*, dan *CDN* (Content Delivery Network) untuk *asset statis* (gambar, file CSS/JS).

## 2. Security (Keamanan)
- **Strict Payload Validation:** Jangan pernah mempercayai input pengguna. Gunakan *library* seperti **Zod** atau **Yup** di *backend* untuk memvalidasi tipe data *request body*, *params*, dan *query*. Tolak input yang tidak sesuai skema sebelum menyentuh fungsi logika atau *database*.
- **Rate Limiting & DDoS Protection:** Terapkan *Rate Limiting* di level API (contoh: maksimal 100 *request*/menit per IP) pada *endpoint* publik seperti *Login* atau *Register* untuk mencegah serangan *Brute Force*.
- **Idempotency API:** Untuk transaksi pembayaran atau operasi kritis lainnya, wajib mengimplementasikan **Idempotency Key**. Jika *client* (frontend/mobile) melakukan *retry request* karena koneksi tidak stabil, sistem tidak boleh mengeksekusi aksi yang sama dua kali.
- **Environment Variables Secrecy:** Jangan pernah membocorkan *Private Key*, *API Key Payment Gateway*, atau rahasia server ke *frontend*. Semua eksekusi kritis harus dilakukan dan dijaga di sisi *Backend Server*.

## 3. Performance (Kecepatan)
- **Database Indexing:** Berikan *index* pada kolom *database* yang sering dijadikan parameter pencarian atau *filter* (seperti `email`, `status`, `created_at`).
- **Asynchronous Processing:** Proses berat yang memakan waktu lama (mengirim Email Notifikasi, pemrosesan gambar, *generate* laporan PDF) harus dilakukan di *background/worker* (contoh: BullMQ, RabbitMQ, Kafka) agar tidak menahan (*block*) *response* API kepada *user*.
- **Pagination & Infinite Scroll:** Jangan pernah me-ngembalikan ratusan/ribuan baris data dalam satu API call. Wajib gunakan Limit/Offset atau *Cursor-based Pagination*.

## 4. Reliability & Data Integrity
- **Database Transactions (ACID):** Jika satu proses melibatkan beberapa aksi *insert/update* ke tabel yang berbeda secara bersamaan, gunakan *Database Transactions* (`DB.transaction()`). Jika salah satu langkah gagal, seluruh proses harus di- *rollback* untuk mencegah anomali data.
- **Webhook Signature Verification:** Selalu verifikasi *signature* (hash) dari *webhook* penyedia layanan pihak ketiga (Payment Gateway, SMS Gateway) untuk memastikan notifikasi tersebut autentik dan bukan manipulasi pihak luar.
