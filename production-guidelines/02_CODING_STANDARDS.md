# Coding Standards & Maintainability

Agar basis kode (*codebase*) mudah dibaca, dirawat oleh tim besar, dan tidak menjadi usang (*technical debt*), aturan kode universal berikut wajib ditegakkan pada setiap proyek.

## 1. File Structure & Componentization
Jangan menumpuk ribuan baris kode dalam satu file utama. Pisahkan logika dan tampilan berdasarkan fungsionalitasnya (Aturan *Single Responsibility Principle*):
```text
src/
├── app/               # Routing & Layout System (misal: Next.js App Router)
├── components/        # Komponen UI (Dapat digunakan kembali)
│   ├── ui/            # Komponen dasar atomik (Button, Input, Modal, Badge)
│   └── modules/       # Komponen spesifik fitur (UserTable, CheckoutForm)
├── hooks/             # Custom React Hooks (Pemisahan logika UI & state)
├── lib/               # Konfigurasi Pihak Ketiga (Axios, ORM, SDK)
├── services/          # Logika pemanggilan API Backend (Fetchers)
├── store/             # Global State Management (Zustand, Redux)
├── types/             # Deklarasi TypeScript Interface/Type
└── utils/             # Helper functions (Formatting tanggal, mata uang, string)
```

## 2. Global State Management vs Local State
- **Local State (`useState` / `useReducer`):** Gunakan HANYA untuk status yang spesifik dan terbatas pada komponen itu saja (contoh: status buka/tutup *dropdown*, nilai teks pada input form, *toggle switch*).
- **Global State (Zustand / Redux / Context):** Gunakan untuk data yang perlu dibagikan dan diakses lintas komponen yang berbeda jauh dalam *tree* hirarki (contoh: Data Profil User yang sedang login, Status Tema Gelap/Terang, Notifikasi Global, Isi Keranjang Belanja).

## 3. Separation of Concerns (Pemisahan Logika Bisnis dari UI)
- **Komponen Presentasional:** Komponen harus "bodoh" (*dumb components*). Mereka murni hanya menerima properti (`props`) dan me-render UI tanpa peduli dari mana data itu berasal.
- **Komponen Kontainer:** Komponen tingkat atas yang bertanggung jawab mengambil data (*fetching API*), memproses logika, lalu meneruskannya ke Komponen Presentasional.
- *Jangan menulis logika bisnis murni (seperti manipulasi array kompleks atau pemanggilan API mentah) langsung di dalam struktur JSX.*

## 4. TypeScript Strict Mode
- Wajibkan penggunaan TypeScript yang ketat (*Strict Mode: True*). Hindari penggunaan tipe data `any` dengan segala cara.
- Selalu definisikan `interface` atau `type` untuk *props* komponen dan *response* API.
- Pendekatan ini akan otomatis menangkap hingga 80% *bug* dan potensi *crash* di level *Code Editor* sebelum kode dijalankan.

## 5. Error Handling & Fallbacks
- Gunakan `try...catch` secara disiplin pada semua fungsi asinkron (Promise/Async-Await).
- Buat komponen `ErrorBoundary` global di *root* aplikasi untuk mencegah layar menjadi putih kosong (*white screen of death*) ketika terjadi *crash* di level komponen React.
- Tangani setiap kemungkinan gagalnya API secara *graceful*: tampilkan pesan *Toast* atau pesan validasi di UI yang mudah dipahami oleh pengguna awam (jangan tampilkan *stack trace error* teknis ke pengguna).
