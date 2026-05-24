# 🎯 [NAMA FITUR] - AI Implementation Spec

⚠️ **Instruksi untuk AI:** Baca spesifikasi ini secara menyeluruh sebelum mulai _coding_. Pastikan semua *Edge Cases* dan *Acceptance Criteria* terpenuhi.

## 1. 📖 RINGKASAN & TUJUAN
- **Deskripsi:** [Jelaskan apa fitur ini secara singkat]
- **Tujuan Bisnis:** [Kenapa fitur ini dibuat? Apa *value*-nya bagi *user*?]
- **Platform:** [ ] Web  [ ] Mobile  [ ] Backend  [ ] Semua
- **Tipe Pekerjaan:** [ ] Fullstack Data Feature  [ ] Frontend-only  [ ] Mobile-only  [ ] Bugfix  [ ] Infra/Deploy  [ ] Docs/Spec
- **Repo Mode:** [ ] Existing repo  [ ] Target monorepo  [ ] Migration menuju target monorepo

## 2. 👤 USER ROLES & PERMISSIONS (TAMBAHAN)
- **Aktor:** [Siapa saja yang bisa mengakses fitur ini? misal: Admin, Customer, Guest]
- **Otorisasi:** [Apa syarat aksesnya? misal: Harus login, harus punya role 'Manager']
- **Data Sensitivity:** [Public / User-specific / Admin-only / Payment / Ownership]

## 3. 🗄️ DATA MODEL / SCHEMA (TAMBAHAN)
*(Penting agar AI bisa mengenerate Prisma Schema dengan tepat)*
- **Backend Mode:** [ ] NestJS + Prisma  [ ] Supabase-first  [ ] Tidak ada perubahan backend
- **Tabel Utama:** `NamaTabel`
- **Field Baru:**
  - `namaField` (Tipe Data) - [Keterangan/Validasi, misal: varchar max 100, tidak boleh null]
- **Relasi:** [misal: 1-to-Many dengan tabel `User`]
- **Migration Note:** [Apakah butuh expand/contract, backfill, index, atau rollback?]

## 4. 🔌 API CONTRACTS & DTO (TAMBAHAN)
*(Format data yang mengalir antara Web/Mobile ke Backend)*
- **Endpoint:** `[GET/POST/PUT/DELETE] /api/v1/nama-fitur`
- **Payload Request (Zod):**
  ```json
  {
    "field": "string"
  }
  ```
- **Response Format:** Standar envelope (sukses/gagal).
- **Cache Policy:** [Public static: force-cache/revalidate | Private/dynamic: no-store | React Query staleTime]
- **Error Codes:** [VALIDATION_FAILED, NOT_FOUND, DB_CONFLICT, dll]

## 5. 🎨 UI/UX FLOW & STATES (TAMBAHAN)
*(Penting agar UI tidak asal-asalan saat data belum siap/gagal)*
- **Initial State:** [Apa yang dilihat user saat pertama kali buka?]
- **Loading State:** [Apakah pakai Skeleton, Spinner, atau non-blocking?]
- **Empty State:** [Jika data kosong, tampilkan apa? misal: Ilustrasi dan tombol "Buat Baru"]
- **Error State:** [Bagaimana menampilkan pesan error? Toast, Alert Dialog, inline text?]
- **Success State:** [Feedback setelah berhasil, misal: Toast hijau dan redirect ke list]

## 6. ✅ ACCEPTANCE CRITERIA (AC)
*(Syarat mutlak fitur ini dianggap SELESAI)*
1. [ ] *User* harus bisa melakukan X...
2. [ ] Sistem harus memvalidasi Y...
3. [ ] Jika X terjadi, maka Z harus di-update...

## 7. 🚧 EDGE CASES & ERROR HANDLING
*(Kasus ekstrem/batas yang sering bikin aplikasi crash)*
- **Kasus 1:** Bagaimana jika *user* menekan tombol *submit* 2 kali berturut-turut?
- **Kasus 2:** Bagaimana jika *database* lambat atau *timeout*?
- **Kasus 3:** Bagaimana jika *user* memasukkan input di luar batas (misal file gambar > 10MB)?
- **Permission/Offline:** [Mobile permission denied, offline mode, retry/rollback jika relevan]

## 8. ⚙️ INTEGRASI & CONSTRAINTS (TAMBAHAN)
- **External API:** [Apakah memanggil API pihak ketiga seperti Stripe, AWS S3, dll?]
- **Background Job:** [Apakah ada proses asinkron/Cron Job yang berjalan di belakang?]
- **Performa/Cache:** [Apakah data ini perlu di-cache di Redis? Berapa lama TTL-nya?]
- **Testing Risk:** [Low / Medium / High] - [Unit/Integration/E2E/manual verification yang wajib]
- **Deployment/Rollback:** [Apakah butuh env baru, migration, feature flag, atau rollback plan?]
