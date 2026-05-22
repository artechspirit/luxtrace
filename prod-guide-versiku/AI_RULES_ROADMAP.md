⚠️ Extends root AI_CONTEXT.md. Aturan wajib bagi AI saat memecah spesifikasi (AI_FEATURE_TEMPLATE) menjadi Roadmap.

## 1. STRATEGI EKSEKUSI (INSIDE-OUT)
AI WAJIB membangun fitur dari lapisan terdalam (Database) menuju lapisan terluar (UI). 
🚫 DILARANG mulai membangun UI/Frontend jika skema database dan kontrak API belum disepakati/dibuat.

## 2. STANDAR FASE ROADMAP (THE 5 PHASES)
Setiap *roadmap* fitur yang di-generate oleh AI HARUS mengikuti urutan 5 fase baku berikut:
- **Phase 1: Data Layer (Prisma)** → Update `schema.prisma`, generate migration, validasi relasi.
- **Phase 2: Backend Logic (NestJS)** → Setup Module, Controller, Service, Zod DTO, dan Swagger OpenAPI.
- **Phase 3: Shared Contracts (Monorepo)** → Generate/Sync tipe data ke `@repo/api-contracts` dan setup UI dasar di `@repo/ui`.
- **Phase 4: Client Implementation (Web/Mobile)** → Integrasi API via React Query/Server Actions, *routing*, dan fungsionalitas UI utama.
- **Phase 5: Polish & Edge Cases** → Implementasi *Loading/Error/Empty states*, batasan limit, dan skenario tak terduga.

## 3. CHECKPOINT & VERIFIKASI (WAJIB)
Setiap fase HARUS memiliki "Gembok" (Checkpoint) berupa perintah CLI Turborepo/pnpm. AI dilarang berasumsi sukses dan melanjutkan ke fase berikutnya jika verifikasi ini belum berstatus ✅ *Passed*.
- *Phase 1 Check:* `prisma validate` / `prisma migrate dev`
- *Phase 2 Check:* `turbo run test --filter=apps/api`
- *Phase 3 Check:* `pnpm run generate:types` / `turbo run typecheck`
- *Phase 4 Check:* `turbo run build --filter=apps/web...`

## 4. ATURAN INTERAKSI DENGAN USER
- **Pacing (Kecepatan):** AI harus bertanya: *"Ini adalah Roadmap-nya. Apakah kita akan mulai mengeksekusi Fase 1 sekarang?"*
- **Checklist:** Roadmap harus di-generate menggunakan markdown *checkbox* (`[ ]`) agar user bisa melacak kemajuan.
- **Strict Scope:** Jika di spesifikasi *platform* yang dicentang hanya "Web", AI dilarang memasukkan eksekusi "Mobile" ke dalam roadmap.

## ✅ CHECKLIST UNTUK AI
- [ ] Pendekatan *Inside-Out* (DB -> API -> Client)
- [ ] Ada CLI verifikasi di akhir setiap fase
- [ ] Menggunakan format Checkbox Markdown
- [ ] Meminta *Approval* user sebelum mengeksekusi *step* pertama
