⚠️ Extends root AI_CONTEXT.md. Aturan wajib bagi AI saat memecah spesifikasi (AI_FEATURE_TEMPLATE) menjadi Roadmap.

## 1. PILIH TIPE ROADMAP TERLEBIH DULU
AI WAJIB mengklasifikasikan pekerjaan sebelum membuat fase:
- `Fullstack Data Feature`: ada perubahan DB/API/contract/client.
- `Frontend-only`: hanya UI/web tanpa perubahan backend contract.
- `Mobile-only`: hanya Expo/RN flow, device capability, atau offline behavior.
- `Bugfix`: memperbaiki bug existing.
- `Infra/Deploy`: CI/CD, Docker, env, observability.
- `Docs/Spec`: dokumentasi, prompt, acceptance criteria.

## 2. STRATEGI EKSEKUSI
- Untuk `Fullstack Data Feature`, AI WAJIB membangun dari lapisan terdalam menuju lapisan terluar: DB → API → Contract → Client → Polish.
- Untuk tipe lain, AI WAJIB memilih fase sesuai scope dan tidak memaksa Prisma/DB jika tidak relevan.
- 🚫 DILARANG mulai membangun UI yang bergantung pada data jika skema/contract API belum disepakati.
- Existing repo yang belum monorepo: roadmap harus menyebut "current repo mode" dan tidak boleh membuat path target baru tanpa approval.

## 3. STANDAR FASE — FULLSTACK DATA FEATURE
- **Phase 1: Data Layer (Prisma)** → Update `schema.prisma`, generate migration, validasi relasi.
- **Phase 2: Backend Logic (NestJS)** → Setup Module, Controller, Service, Zod DTO, dan Swagger OpenAPI.
- **Phase 3: Shared Contracts (Monorepo)** → Generate/Sync tipe data ke `@repo/api-contracts` dan setup UI dasar di `@repo/ui`.
- **Phase 4: Client Implementation (Web/Mobile)** → Integrasi API via React Query/Server Actions, *routing*, dan fungsionalitas UI utama.
- **Phase 5: Polish & Edge Cases** → Implementasi *Loading/Error/Empty states*, batasan limit, dan skenario tak terduga.

## 4. STANDAR FASE — FRONTEND-ONLY
- **Phase 1: Contract & UX Scope** → Pastikan tidak ada perubahan API/DB. Tentukan states, permissions, dan data source.
- **Phase 2: Component/Layout** → Implementasi UI sesuai design tokens dan existing patterns.
- **Phase 3: Client Logic** → Integrasi local state, query/action existing, form validation, dan error handling.
- **Phase 4: Tests & Accessibility** → Testing Library/Playwright sesuai risk.
- **Phase 5: Polish & Responsive** → Loading/empty/error, mobile/desktop, dark mode jika berlaku.

## 5. STANDAR FASE — MOBILE-ONLY
- **Phase 1: Navigation & Capability Scope** → Route, permissions, offline/device constraints.
- **Phase 2: Screen Logic** → State, query/mutation, secure storage/AsyncStorage jika perlu.
- **Phase 3: Native Interaction** → Camera/NFC/notifications/platform guards.
- **Phase 4: Offline/Error Recovery** → Queue, rollback, denied permission state.
- **Phase 5: Tests & Build Check** → Unit/component/manual simulator/device check sesuai risk.

## 6. STANDAR FASE — BUGFIX
- **Phase 1: Reproduce** → Jelaskan bug, affected path, dan expected behavior.
- **Phase 2: Regression Test** → Tambah minimal 1 test bermakna jika test harness tersedia.
- **Phase 3: Fix** → Patch minimal sesuai root cause.
- **Phase 4: Verify** → Jalankan test/lint/build relevan.
- **Phase 5: Risk Note** → Catat area yang belum ter-cover jika ada.

## 7. CHECKPOINT & VERIFIKASI (WAJIB)
Setiap fase HARUS memiliki "Gembok" (Checkpoint) berupa perintah CLI Turborepo/pnpm. AI dilarang berasumsi sukses dan melanjutkan ke fase berikutnya jika verifikasi ini belum berstatus ✅ *Passed*.
- Fullstack Phase 1 Check: `prisma validate` / `prisma migrate dev` jika mode Prisma.
- Backend Check: `turbo run test --filter=apps/api` atau script test API yang ada.
- Contract Check: `pnpm run generate:types` / `turbo run typecheck`.
- Web Check: `turbo run build --filter=apps/web...` atau `pnpm --dir <web-app> build`.
- Mobile Check: `pnpm --dir <mobile-app> lint` / `expo-doctor` / simulator check sesuai project.
- Bugfix Check: test spesifik yang gagal sebelum fix dan pass sesudah fix.

## 8. ATURAN INTERAKSI DENGAN USER
- **Pacing (Kecepatan):** AI harus bertanya: *"Ini adalah Roadmap-nya. Apakah kita akan mulai mengeksekusi Fase 1 sekarang?"*
- **Checklist:** Roadmap harus di-generate menggunakan markdown *checkbox* (`[ ]`) agar user bisa melacak kemajuan.
- **Strict Scope:** Jika di spesifikasi *platform* yang dicentang hanya "Web", AI dilarang memasukkan eksekusi "Mobile" ke dalam roadmap.
- **Migration Gate:** Jika roadmap mengubah struktur repo menuju target monorepo, AI wajib meminta approval eksplisit sebelum eksekusi.

## ✅ CHECKLIST UNTUK AI
- [ ] Tipe roadmap dipilih dan disebutkan
- [ ] Pendekatan *Inside-Out* hanya untuk fullstack data feature
- [ ] Ada CLI verifikasi di akhir setiap fase
- [ ] Menggunakan format Checkbox Markdown
- [ ] Meminta *Approval* user sebelum mengeksekusi *step* pertama
