# Universal Step-by-Step Implementation Guide

Setelah menyusun dan menyepakati *Blueprint* produk Anda, jangan langsung melompat untuk membuat halaman antarmuka (UI). Terapkan pendekatan bertahap (*Phased Approach*) dari hulu (Data) ke hilir (Tampilan) agar basis kode terstruktur solid dan *Production Ready*.

## Phase 1: Environment & Tooling Setup (Persiapan Dasar)
1. Inisialisasi *Version Control* (Git) dan struktur repositori awal.
2. Pasang perkakas standardisasi kode seperti Linter (ESLint) dan Formatter (Prettier) dengan aturan baku.
3. Tentukan dan konfigurasi variabel lingkungan (`.env`). Pastikan file `.env.example` dibuat, namun abaikan (`.gitignore`) file kredensial aslinya.

## Phase 2: Core Infrastructure & Database (Backend First)
1. **Database Schema:** Terjemahkan entitas dari Blueprint menjadi skema aktual (misal di file `schema.prisma` atau SQL Migrations). Jalankan migrasi basis data.
2. **API Routes Skeleton:** Rancang struktur direktori/rute API. Buat kontroler kosong yang mengembalikan respons *mock* (data buatan) untuk *endpoint* krusial (misal: `GET /api/users`, `POST /api/orders`).
3. **Data Validation Layer:** Definisikan skema validasi (Zod/Yup) yang secara ketat memeriksa *request payload* untuk setiap rute API (Cegah input kosong, tipe data salah).
4. **Authentication:** Konfigurasi sistem Login/Register (JWT, OAuth, atau Session Server-side) agar aliran proteksi teruji.

## Phase 3: Frontend Foundation & Design System (Fondasi Tampilan)
1. Konfigurasikan sistem *styling* (Tailwind CSS, Material UI, atau styled-components) menggunakan warna merek dan tipografi utama yang telah disepakati.
2. Buat direktori komponen atomik (`/components/ui/`) dan bangun balok-balok UI utama yang seragam:
   - `Button.tsx` (dilengkapi state *loading* dan varian utama/sekunder).
   - `InputField.tsx` (mendukung pesan *error* validasi di bawahnya).
   - `Modal.tsx` atau `Card.tsx` (dengan kerangka desain dasar).
   - `Toaster.tsx` (sistem notifikasi pop-up global).

## Phase 4: Data Fetching & State Management (Penghubung Data)
1. Siapkan sistem Global State jika diperlukan (Zustand/Redux) untuk menyimpan data Sesi Pengguna atau Preferensi (Tema/Bahasa).
2. Buat *hooks* atau fungsi utilitas khusus (*Fetcher*) yang bertugas memanggil API, menangani status *loading*, dan menangkap *error* (Bisa memanfaatkan React Query / SWR agar *caching* dan *retry* tertangani otomatis).

## Phase 5: Feature Integration (Membangun Halaman)
1. Saatnya merakit halaman aplikasi (misal: `app/dashboard/page.tsx` atau `pages/checkout.tsx`).
2. Jangan menulis baris kode UI mentah panjang lebar di sini. Panggil komponen yang sudah dirakit di Fase 3 dan 4. 
   ```tsx
   return (
      <DashboardLayout>
         {isLoading ? <TableSkeleton /> : <DataTable data={data} />}
      </DashboardLayout>
   )
   ```
3. Hubungkan aksi interaktif (klik tombol kirim) dengan API *Routes* terkait.

## Phase 6: Edge Cases, Security & UI Polish (Penyempurnaan Ekstrem)
1. Tes skenario ekstrem: "Apa yang terjadi pada UI saat koneksi internet putus sewaktu form di-*submit*?"
2. Implementasikan *Idempotency* (pencegahan pesanan ganda) pada tombol-tombol krusial.
3. Periksa tampilan responsif pada layar sempit dan tangani pergeseran *Virtual Keyboard* pada versi seluler.

## Phase 7: Testing, QA, and Deployment (Rilis Kualitas Tinggi)
1. Tulis dan jalankan pengujian (*Unit Tests* untuk logika kalkulasi, *E2E Tests* untuk alur login/checkout).
2. Terapkan alur CI/CD (misal: GitHub Actions). Jika *build* sistem gagal atau *Linter* mendeteksi kesalahan tipe (TypeScript error), kode HARUS ditolak masuk ke *Production*.
3. Rilis ke server *Staging/Development* untuk pengujian Beta oleh tim.
4. Rilis akhir ke server *Production* dengan pemantauan *uptime* (pemantauan aktif).
