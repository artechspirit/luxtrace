⚠️ Extends root AI_CONTEXT.md. Aturan wajib eksekusi CI/CD, Containerization, & Deployment.

## 1. DOCKER & CONTAINERIZATION
- **Strategy:** WAJIB *Multi-stage build* untuk API & Web jika di-host mandiri.
- **Base Image:** `node:20-alpine` (builder) → `gcr.io/distroless/nodejs20` atau minimal `alpine` (runner).
- **Size & Security:** Gunakan `turbo prune` atau `pnpm deploy`. 🚫 DILARANG menyertakan `devDependencies` di *image final*. WAJIB jalankan sebagai *non-root* user (`USER node`).

## 2. PIPELINE CI/CD (GitHub Actions / GitLab CI)
- **Speed:** WAJIB mengaktifkan *Turborepo Remote Caching* agar *build* tidak berulang.
- **Workflow PR:** Linting & Typecheck → Unit Tests (`--filter=...`) → Build Check.
- **Workflow Release:** CI Lulus → `prisma migrate deploy` → Build Docker/Web → Deploy.
- **Strictness:** 🚫 *Fail Fast!* Jika ada 1 *warning* pada TypeScript atau ESLint, pipeline WAJIB *failed*.

## 3. DEPLOYMENT TARGETS
- **Recommended Backend (NestJS):** Google Cloud Run / AWS ECS. WAJIB atur batas memori dan *auto-scaling* berdasar utilisasi CPU.
- **Recommended Web (Next.js):** Vercel untuk optimasi *Edge/CDN* bawaan. Jika self-host, gunakan *output mode* `standalone` Next.js di dalam Docker.
- **Recommended Mobile (Expo):** **EAS Build**. Gunakan *Release Channels* (Preview/Production) dan dukung OTA (*Over-The-Air*) Updates via `eas update`.
- **Allowed Alternatives:** Railway/Fly.io/Render/Netlify boleh untuk preview atau early production jika risiko, batasan, dan rollback plan dijelaskan.
- **Requires Approval:** Migrasi provider, deploy manual production, atau perubahan secret/storage/database production.

## 4. ENVIRONMENT & INFRASTRUCTURE
- **Tingkatan:** `development` (Lokal), `preview/staging` (UAT), `production` (Live).
- **Secrets:** Di-inject oleh *Secret Manager* (GCP/AWS/Vercel) pada saat *runtime*. 🚫 DILARANG meng-*hardcode* variabel rahasia ke dalam Docker Image pada saat *build time*.
- **Database:** Koneksi dari Container ke DB (PostgreSQL) di *production* WAJIB menggunakan `?sslmode=require`.
- **Rollback:** Setiap release production wajib punya rollback command/procedure dan migration recovery note.

## 🚫 ANTI-PATTERNS
- Build seluruh *workspace* dari nol di CI → GANTI ke *Affected Builds* (`turbo run build --filter=[HEAD^1]`).
- Migrasi DB manual dari terminal lokal ke *Production* → GANTI jadikan bagian otomatis dari tahap Deployment di CI.
- Menyimpan *Service Account JSON* di dalam repo → GANTI pakai mekanisme *Workload Identity Federation* atau OIDC.
- Deploy provider baru tanpa risk note → GANTI minta approval dan tulis rollback plan.

## ✅ CHECKLIST DEPLOYMENT
- [ ] Dockerfile *multi-stage* & *non-root*
- [ ] CI Pipeline memblokir *merge* jika Typecheck/Test gagal
- [ ] DB Migrations dieksekusi di Pipeline sebelum/saat *rolling update*
- [ ] Turborepo Remote Caching aktif
- [ ] Secrets 100% terisolasi dari *source code*
- [ ] Rollback plan tersedia
