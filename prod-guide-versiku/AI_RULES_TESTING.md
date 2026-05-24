⚠️ Extends root AI_CONTEXT.md. Panduan wajib penulisan pengujian (Testing) untuk AI.

## 1. STACK PENGUJIAN (TESTING STACK)
- **Unit & Integration (Web/API):** `Vitest` atau `Jest`. (Pilih satu dan gunakan konsisten di seluruh monorepo).
- **E2E Web:** `Playwright`.
- **E2E Mobile:** `Detox` atau `Maestro`.
- **Database Mocking:** Gunakan `prisma-mock` untuk Unit Test, atau jalankan *Test Database* (PostgreSQL via Docker) untuk Integration Test.
- Jika repo existing belum punya test harness, AI wajib menjelaskan gap dan menambahkan harness minimal hanya bila scope/risk membenarkan.

## 1.1 TEST DEPTH BY RISK
- **Low Risk:** copy/UI kecil/non-critical → typecheck/lint + targeted manual check cukup.
- **Medium Risk:** form, query, state, validation → unit/component test + lint/typecheck.
- **High Risk:** auth, payment, ownership, QR/scan, inventory, database migration → unit + integration + E2E critical path jika harness tersedia.
- **Bugfix:** wajib regression test bermakna jika test harness tersedia; jika belum tersedia, AI wajib menjelaskan manual reproduction/verification.

## 2. ATURAN UNIT TESTING (ISOLASI)
- **API (NestJS):** Fokus uji logika bisnis di *Service*. Jangan menguji *Controller* secara berlebihan, karena *Controller* bersifat *thin* (tipis).
- **Frontend (Web/Mobile):** Wajib menggunakan `@testing-library/react` atau `@testing-library/react-native`. 
  - 🚫 DILARANG menguji *internal state* komponen (implementasi). 
  - WAJIB menguji apa yang berinteraksi dengan user (berdasarkan *Role/Aria*, label, atau teks yang tampil).
- **Boundary:** *Mock* semua *external API* (Stripe, Cloud Storage, dll). *Unit test* wajib bisa berjalan 100% tanpa koneksi internet.

## 3. ATURAN INTEGRATION & E2E TESTING
- **API:** Gunakan `Supertest` untuk menembak *endpoint* API secara langsung. Wajib menggunakan *Test Database* asli yang di-*seed* di `beforeAll` dan di-bersihkan di `afterAll`.
- **UI:** E2E Playwright/Detox HANYA fokus pada *Critical Paths* (misal: Alur Login, Checkout, Pembuatan Data Utama). Jangan membuat *E2E test* untuk mengecek *edge case* kecil (serahkan ke *Unit Test*).
- **Mobile device features:** Camera/NFC/permission flow minimal diuji manual di simulator/device jika E2E belum tersedia.

## 4. BUG FIXING & REGRESSION
- Setiap AI membetulkan sebuah *Bug*, AI **WAJIB** menulis minimal 1 baris tes baru yang dapat mendeteksi *bug* tersebut (Regression Test), memastikan *bug* yang sama tidak akan terulang di masa depan.
- 🚫 DILARANG menulis tes "bodoh" hanya untuk menaikkan persentase *coverage* (contoh: `expect(true).toBe(true)`). Tes harus memiliki *assertion* bermakna.

## 🚫 ANTI-PATTERNS
- Menaruh `console.log` di dalam file tes → HAPUS. Tes harus bersih *output*-nya.
- Tes yang saling bergantung (urutan `it()` berpengaruh) → GANTI pastikan tiap blok tes 100% independen menggunakan fungsi *setup/teardown* (`beforeEach`/`afterEach`).
- Menyentuh Database Production/Staging → GANTI pastikan `DATABASE_URL` di environment *testing* mengarah ke DB terisolasi.

## ✅ CHECKLIST TESTING
- [ ] Tes tidak butuh internet (*External API di-mock*)
- [ ] Level test sesuai risk
- [ ] Frontend diuji berdasarkan interaksi user (A11y/Testing Library)
- [ ] Tidak ada state memori bocor (bawaan) antar tes
- [ ] *Setup* & *Teardown* Database terjamin kebersihannya
