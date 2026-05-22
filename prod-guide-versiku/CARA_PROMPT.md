# 💬 CARA PROMPT (AI INTERACTION PLAYBOOK)

Agar sistem *guardrails*, aturan *monorepo*, dan template spesifikasi yang ada di folder ini berjalan maksimal, gunakan *template prompt* berikut saat menugaskan AI.

---

## 1️⃣ SKENARIO 1: Dari Ide Mentah ➡️ Menjadi Spesifikasi Teknis
Gunakan *prompt* ini jika Anda punya ide kasar dan ingin AI membantu menjabarkannya menjadi spesifikasi yang detail dan siap dieksekusi (Product Requirements Document).

**📝 KOPAS PROMPT INI:**
```text
Aku mau bikin fitur **[Sebutkan Nama Fitur, misal: Manajemen Diskon]**. 
Konsep singkatnya adalah **[Jelaskan sesukamu, misal: admin bisa buat kupon diskon persentase, dan ada tanggal kadaluarsanya]**.

Tolong bantu jabarkan ide ini menjadi spesifikasi teknis yang detail. 
WAJIB gunakan persis format 8 poin yang ada di file `prod-guide-versiku/AI_FEATURE_TEMPLATE.md`. 
Untuk bagian skema Database, endpoint API, dan UI States, tolong bantu pikirkan dan sarankan *best practice*-nya sesuai arsitektur monorepo kita.
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
Tampilkan roadmap 5 fasenya saja dulu dalam bentuk checkbox Markdown. 
JANGAN nulis kode aplikasi atau memodifikasi file apa pun sampai aku menyetujui roadmap ini dan memberikan aba-aba "Silakan laksanakan Fase 1".
```

---

## 💡 TIPS TAMBAHAN SAAT EKSEKUSI
- **Satu Fase, Satu Waktu:** Jangan biarkan AI mengerjakan Fase 1 sampai Fase 5 sekaligus dalam sekali jalan. Saat mengeksekusi, perintahkan perlahan: *"Roadmap bagus. Tolong kerjakan Fase 1 dulu. Beri tahu saya perintah verifikasi CLI-nya kalau sudah."*
- **Jangan Takut Menegur AI:** Jika AI memberikan *roadmap* yang melompat (misal Fase 1 langsung bikin halaman Web), tegur AI dengan tegas: *"Kamu melanggar aturan AI_RULES_ROADMAP.md, wajib mulai dari Prisma Database dulu!"*
