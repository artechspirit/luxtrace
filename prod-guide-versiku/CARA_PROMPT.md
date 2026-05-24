# 💬 CARA PROMPT (AI INTERACTION PLAYBOOK)

Agar sistem *guardrails*, aturan *monorepo*, dan template spesifikasi yang ada di folder ini berjalan maksimal, gunakan *template prompt* berikut saat menugaskan AI.

---

## 0️⃣ SKENARIO 0: Dari Ide Project Baru ➡️ Menjadi Blueprint & Roadmap
Gunakan *prompt* ini jika Anda ingin membuat project/aplikasi baru dari nol, atau ingin merancang migrasi besar menuju target monorepo.

### 0A. Untuk Orang Awam / Input Singkat
Kalau belum siap menjawab detail teknis, isi dulu form ringan:

```bash
./prod-guide-versiku/setup.sh --intake
```

Output:
- `prod-guide-versiku/generated/<project-slug>/PROJECT_INTAKE.md`
- `prod-guide-versiku/generated/<project-slug>/PROMPT_TO_BLUEPRINT.md`

Setelah itu, berikan prompt ini ke AI:
```text
Tolong baca `PROJECT_INTAKE.md`.
Ubah intake awam itu menjadi `PROJECT_BLUEPRINT.md` yang mengikuti `prod-guide-versiku/AI_PROJECT_BLUEPRINT_TEMPLATE.md`.
Lalu generate `ROADMAP.md` yang mengikuti `prod-guide-versiku/AI_RULES_ROADMAP.md`.

PENTING:
- Jangan coding dulu.
- Kalau ada informasi kurang, maksimal tanya 5 pertanyaan klarifikasi paling penting.
- Kalau bisa diinfer dengan aman, lanjutkan dan tandai sebagai Assumption.
```

### 0B. Untuk Input Lebih Lengkap
**⚡ OPSI CEPAT VIA SCRIPT:**
```bash
./prod-guide-versiku/setup.sh
```
Output default:
- `prod-guide-versiku/generated/<project-slug>/PROJECT_BLUEPRINT.md`
- `prod-guide-versiku/generated/<project-slug>/ROADMAP.md`

Jika ingin output ke folder lain:
```bash
./prod-guide-versiku/setup.sh --output docs/blueprints
```

**📝 KOPAS PROMPT INI:**
```text
Aku mau bikin project baru bernama **[Nama Project]**.
Konsep singkatnya adalah **[Jelaskan produk, target user, masalah yang diselesaikan, dan platform yang diinginkan]**.

Tolong bantu jabarkan menjadi Production Project Blueprint.
WAJIB gunakan persis format di file `prod-guide-versiku/AI_PROJECT_BLUEPRINT_TEMPLATE.md`.

PENTING:
- Jangan tulis kode dulu.
- Tentukan repo mode, backend mode, high-level feature map, data blueprint, API blueprint, UI/UX blueprint, testing strategy, deployment strategy, dan project roadmap.
- Jika ada asumsi penting, tulis di bagian Open Questions.
```
> 💡 *Setelah blueprint disetujui, gunakan roadmap di dalamnya untuk memecah setiap fitur P0/P1 menjadi file spesifikasi menggunakan `AI_FEATURE_TEMPLATE.md`.*

---

## 1️⃣ SKENARIO 1: Dari Ide Mentah ➡️ Menjadi Spesifikasi Teknis
Gunakan *prompt* ini jika Anda punya ide kasar dan ingin AI membantu menjabarkannya menjadi spesifikasi yang detail dan siap dieksekusi (Product Requirements Document).

**📝 KOPAS PROMPT INI:**
```text
Aku mau bikin fitur **[Sebutkan Nama Fitur, misal: Manajemen Diskon]**. 
Konsep singkatnya adalah **[Jelaskan sesukamu, misal: admin bisa buat kupon diskon persentase, dan ada tanggal kadaluarsanya]**.

Tolong bantu jabarkan ide ini menjadi spesifikasi teknis yang detail. 
WAJIB gunakan persis format 8 poin yang ada di file `prod-guide-versiku/AI_FEATURE_TEMPLATE.md`. 
Untuk bagian repo mode, backend mode, skema Database, endpoint API, cache policy, UI States, testing risk, dan deployment/rollback, tolong bantu pikirkan dan sarankan *best practice*-nya sesuai target architecture kita.
PENTING: Jika ide ini hanya Web/Mobile/UI-only, jangan paksa ada perubahan Prisma/API.
```
> 💡 *Setelah AI merespons, review isinya. Jika setuju, simpan hasilnya ke dalam file baru, misal `fitur-diskon.md` untuk digunakan pada Skenario 2.*

---

## 2️⃣ SKENARIO 2: Dari Spesifikasi Fix ➡️ Menjadi Roadmap Eksekusi Kode
Gunakan *prompt* ini jika dokumen spesifikasi fitur sudah Anda anggap lengkap (sudah di-*approve*), dan Anda ingin AI mulai merencanakan fase penulisan kode.

**📝 KOPAS PROMPT INI:**
```text
Spesifikasi teknis untuk fitur **[Nama Fitur]** sudah siap. Tolong baca dengan teliti keseluruhan dokumennya.

Setelah itu, tolong buatkan Roadmap Implementasi berdasarkan panduan ketat dari file `prod-guide-versiku/AI_RULES_ROADMAP.md` dan patuhi aturan monorepo kita di `prod-guide-versiku/AI_CONTEXT.md`.

PENTING: 
Tentukan dulu tipe roadmap-nya: Fullstack Data Feature, Frontend-only, Mobile-only, Bugfix, Infra/Deploy, atau Docs/Spec.
Tampilkan roadmap fasenya saja dulu dalam bentuk checkbox Markdown. 
JANGAN nulis kode aplikasi atau memodifikasi file apa pun sampai aku menyetujui roadmap ini dan memberikan aba-aba "Silakan laksanakan Fase 1".
Jika repo existing belum sesuai target monorepo, buat migration gate dan jangan mengubah struktur repo tanpa approval eksplisit.
```

---

## 💡 TIPS TAMBAHAN SAAT EKSEKUSI
- **Satu Fase, Satu Waktu:** Jangan biarkan AI mengerjakan Fase 1 sampai Fase 5 sekaligus dalam sekali jalan. Saat mengeksekusi, perintahkan perlahan: *"Roadmap bagus. Tolong kerjakan Fase 1 dulu. Beri tahu saya perintah verifikasi CLI-nya kalau sudah."*
- **Jangan Takut Menegur AI:** Jika AI memberikan *roadmap* yang salah tipe (misal UI-only dipaksa mulai dari Prisma, atau fullstack data langsung bikin halaman Web), tegur AI dengan tegas: *"Kamu melanggar AI_RULES_ROADMAP.md, pilih tipe roadmap yang benar dan ikuti fasenya."*
- **Bedakan Target vs Existing:** Jika AI langsung membuat `apps/*` atau `packages/*` di repo existing tanpa aba-aba migrasi, hentikan dan minta migration plan dulu.
