⚠️ Extends root AI_CONTEXT.md. Database execution rules (PostgreSQL & Supabase RLS).

## PATTERNS

### 1. Schema & Data Types
- **Naming Conventions:** Table dan column names WAJIB menggunakan `snake_case`. Model name pada ORM (misal Prisma) boleh menggunakan PascalCase/camelCase dengan pemetaan `@map`/`@@map`.
- **Primary Keys:** WAJIB menggunakan tipe `UUID` (seperti `gen_random_uuid()` atau `uuid_generate_v4()`), kecuali untuk table static/metadata kecil yang memakai incrementing integer.
- **Audit Fields:** Setiap table transaksional atau data-sensitive WAJIB memiliki field:
  - `created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL`
  - `updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL`
- **Monetary/Decimals:** Kolom uang (IDR, USD, dll) WAJIB menggunakan tipe `NUMERIC`/`DECIMAL`. 🚫 DILARANG menggunakan `FLOAT` atau `REAL` karena potensi rounding error.
- **Relasi Cascade:** Gunakan `ON DELETE CASCADE` atau `ON DELETE SET NULL` dengan hati-hati. Untuk entity transaksional penting (misal `transactions`), gunakan `ON DELETE RESTRICT` atau `SET NULL` agar data audit history tidak hilang secara tidak sengaja.

### 2. Indexing Strategy (Performance & Scalability)
- **Foreign Keys Indexing:** PostgreSQL secara default *tidak* membuat index pada kolom Foreign Key. AI WAJIB menyertakan `CREATE INDEX` untuk setiap kolom Foreign Key yang sering digunakan dalam query `JOIN`, `WHERE`, atau `ORDER BY`.
- **Query Optimization Indexes:** Buat index pada kolom yang sering muncul di klausul `WHERE` atau `ORDER BY` untuk data berukuran besar (misal: `product_logs(product_id)`, `transactions(seller_id)`, `transactions(buyer_id)`).
- **Composite Indexes:** Gunakan composite index jika query sering mem-filter menggunakan kombinasi beberapa kolom sekaligus (misal: `WHERE product_id = X AND event = Y`).
- **Partial/Filtered Indexes:** Untuk kolom status atau flag dengan kardinalitas rendah, gunakan partial index jika query hanya mencari baris dengan status tertentu (misal: `CREATE INDEX idx_products_on_transit ON public.products (product_id) WHERE status = 'IN_TRANSIT'`).

### 3. Supabase RLS (Row Level Security) & Security
- **RLS Status:** Semua tabel baru di skema `public` WAJIB mengaktifkan Row Level Security (RLS): `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;`.
- **Policy Granularity:** Buat policy spesifik untuk setiap operasi (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). 🚫 DILARANG menggunakan policy `ALL` kecuali untuk role admin/system.
- **Helper Functions:** Manfaatkan Supabase helper functions seperti `auth.uid()` untuk membatasi akses baris data sesuai kepemilikan user (misal: `auth.uid() = user_id`).
- **Security Definer Functions:** Untuk RPC/Trigger yang membutuhkan akses ke schema internal (seperti `auth.users`), gunakan `SECURITY DEFINER` dan tentukan `search_path = public` secara eksplisit guna menghindari SQL injection/privilege escalation.

### 4. Query Optimization
- **N+1 Prevention:** Hindari looping query satu per satu di backend. Gunakan `JOIN` di SQL atau eager loading / `include` pada ORM (Prisma/NestJS) dengan batasan relasi yang ketat.
- **Pagination:** Gunakan *limit-offset* pagination untuk dataset sedang, dan *cursor-based pagination* (keyset pagination) untuk dataset besar (seperti `product_logs`) demi performa query konstan seiring bertambahnya data.
- **Exclusion of Heavy Fields:** Hindari `SELECT *`. Select hanya kolom-kolom yang diperlukan, terutama pada table yang memiliki kolom `JSONB` besar atau text panjang.
- **Slow Query Analysis:** Jalankan `EXPLAIN (ANALYZE, BUFFERS)` pada query yang memakan waktu > 100ms untuk memeriksa apakah query melakukan Sequential Scan (*Seq Scan*) atau Index Scan.

### 5. Migration Strategy (Zero Downtime)
- **Expand & Contract Pattern:** Untuk schema migration di production:
  1. *Expand:* Tambahkan kolom baru, update query di backend untuk menulis ke kolom lama dan baru (dual write).
  2. *Migrate:* Jalankan backfill script untuk menyalin data lama ke kolom baru.
  3. *Contract:* Ubah query backend agar hanya membaca dari kolom baru, lalu drop kolom lama pada rilis berikutnya.
- **CI/CD Integration:** Eksekusi migrasi DB (`prisma migrate deploy` atau migration tool lain) secara otomatis di pipeline CI/CD sebelum rolling-update backend dimulai, bukan dijalankan manual dari mesin lokal.

## 🚫 ANTI-PATTERNS
- **Over-indexing:** Menambahkan index pada seluruh kolom tabel → memperlambat performa operasi `INSERT`/`UPDATE`/`DELETE`.
- **Sequential Scan pada Data Besar:** Menjalankan query filter/join pada tabel jutaan baris tanpa index pendukung.
- **Soft Delete Tanpa Index:** Menambahkan kolom `deleted_at` tanpa menyertakan index pendukung pada kolom tersebut atau mengabaikan filter `{ deleted_at: null }` pada query.
- **Hard Delete pada Data Audit/Finansial:** Menghapus data transaksi langsung secara fisik (`DELETE FROM`) → GANTI dengan state `CANCELLED` atau Soft Delete.
- **Supabase RLS di-bypass secara default:** Menggunakan service_role key untuk query umum client-side → GANTI gunakan JWT autentikasi user biasa dengan policy RLS yang ketat.
- **Trigger Kompleks dengan Logic Bisnis:** Menaruh logic bisnis berat di dalam trigger DB PostgreSQL → GANTI kelola di level Application Service.

## ✅ CHECKLIST DATABASE
- [ ] RLS telah diaktifkan di semua tabel (`ENABLE ROW LEVEL SECURITY`)
- [ ] Policy spesifik (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) telah didefinisikan per role
- [ ] Kolom Foreign Key memiliki index pendukung (`CREATE INDEX`)
- [ ] Tipe data finansial/uang menggunakan `NUMERIC`/`DECIMAL`
- [ ] Semua query berat telah di-verify menggunakan `EXPLAIN ANALYZE`
- [ ] Script migrasi menggunakan pattern Expand & Contract jika mengubah schema eksisting
- [ ] Field `created_at` dan `updated_at` dengan default timezone UTC tersedia
