# AI CONTEXT — TARGET FULLSTACK MONOREPO GUARDRAILS
⚠️ RULE 0: Baca file ini sebelum generate. Jangan nebak. Ambigu → STOP & minta klarifikasi. Hierarchy: Root > Workspace > UI.

## 0. SCOPE & OPERATING MODE
- Dokumen ini adalah TARGET PRODUCTION ARCHITECTURE untuk arah monorepo masa depan.
- Jika repo existing belum sesuai struktur target, AI WAJIB inspect repo dulu, jelaskan gap, lalu buat migration plan. 🚫 DILARANG mengubah struktur repo besar-besaran tanpa approval eksplisit.
- Greenfield/new project: ikuti aturan target secara strict.
- Existing project/maintenance: ikuti pattern repo yang ada, buat minimal diff, dan hanya migrasi menuju target jika diminta.
- Istilah prioritas: `MUST/WAJIB` = wajib kecuali ada approval; `SHOULD` = default kuat; `MAY` = opsional sesuai konteks.

## 1. STACK & RUNTIME (EXACT)
- Package Manager: `pnpm` (wajib) | Node: `v20 LTS` | TS: `strict: true, noUncheckedIndexedAccess: true`
- Monorepo: `Turborepo v2+` | Workspaces: `["apps/*", "packages/*"]`
- Web baseline: `Next.js 16.x (App Router)`, `React 19.x`, `Tailwind 4.x`
- Backend baseline: `NestJS 10.x`, `Express adapter`, `Prisma 5.x/6.x`, `PostgreSQL 15+`
- Mobile baseline: `Expo SDK 55.x`, `expo-router` matching SDK, `React Query v5`, `Zustand v5`
- Shared baseline: `Zod 3.23+ atau chosen major`, `OpenAPI 3.0/3.1`, `pino 8+`, `OpenTelemetry`, `Sentry`
- Jika package manifest sudah ada, AI WAJIB mengikuti versi manifest kecuali user meminta upgrade.

## 2. MONOREPO & TURBOREPO (NON-NEGOTIABLE)
- Layout: `apps/{web,api,mobile}` | `packages/{tsconfig,eslint,validation,api-contracts,ui}`
- `turbo.json` Pipeline:
  `build`: `dependsOn: ["^build"]`, `outputs: [".next/**", "dist/**", "expo/dist/**"]`
  `dev`: `cache: false`, `persistent: true`
  `lint`, `test`, `typecheck`: `dependsOn: ["^build"]`
- Cross-Workspace: 🚫 DILARANG `../` lintas apps/packages. Hanya via `@repo/*`.
- Dependencies: `pnpm add <pkg>` (global) | `pnpm add <pkg> --filter=apps/web` (local). 🚫 Edit `node_modules` manual.
- TS: Setiap workspace extends `@repo/tsconfig/base.json`. Path alias resolve dalam workspace atau `@repo/*`.
- DAG: 🚫 Circular dependency. `turbo run build` wajib succeed.

## 3. PROJECT INITIALIZATION & EXISTING CHANGES
### 3.1 Greenfield/New Project (CLI-ONLY)
🚫 DILARANG KERAS: Buat boilerplate/config manual untuk project baru. AI hanya boleh output CLI → user run → AI verify.
✅ WAJIB untuk bootstrap baru:
- Monorepo: `npx create-turbo@latest -p pnpm`
- Backend: `npx @nestjs/cli@latest new apps/api --package-manager pnpm --strict`
- Web: `npx create-next-app@latest apps/web --typescript --tailwind --app --src-dir --use-pnpm`
- Mobile: `pnpm create expo-app@latest apps/mobile -t expo-template-blank-typescript`
- Prisma: `cd apps/api && pnpm add prisma @prisma/client && pnpm dlx prisma init --datasource-provider postgresql`
- Shared: `mkdir -p packages/api-contracts && cd $_ && pnpm init && pnpm add zod @types/node`
- Flow: Output CLI → User run → AI verify tree → `pnpm install` → `turbo run build --filter=...` → ✅
- Fail? STOP → show log → give official alternative. 🚫 No fallback manual.

### 3.2 Existing Project/Maintenance
- AI WAJIB inspect struktur, package manager, scripts, env pattern, dan existing conventions sebelum edit.
- AI BOLEH edit file manual mengikuti pattern repo existing, dengan minimal diff dan verifikasi lokal.
- Migrasi ke target monorepo harus dibuat sebagai roadmap terpisah dan menunggu approval.
- Jangan membuat `apps/*`/`packages/*` baru hanya karena dokumen target menyebutnya, kecuali user memang meminta migrasi.

### 3.3 Migration Protocol Toward Target Monorepo
- Step 1: Inventory current apps, scripts, env vars, shared code, data access, and deploy targets.
- Step 2: Map current structure to target `apps/*` and `packages/*`; list breaking changes and rollback plan.
- Step 3: Extract shared contracts/types first, then UI tokens/components, then app moves.
- Step 4: Move one app/package at a time with verification after each move.
- Step 5: Only remove legacy paths after imports, CI, deploy, and smoke tests pass.

## 4. BACKEND MODE DECISION
- Pilih satu mode backend per project/fase:
  - Mode A: `NestJS + Prisma + PostgreSQL`
  - Mode B: `Supabase-first`
- AI DILARANG mencampur Mode A dan Mode B dalam fitur yang sama tanpa ADR/approval.
- Jika repo existing memakai Supabase, AI wajib mengikuti Supabase-first sampai ada keputusan migrasi.
- Jika targetnya NestJS + Prisma, Supabase hanya boleh menjadi legacy integration atau migration source.

## 5. API CONTRACT & RESPONSE
- Envelope: `{ success: boolean, data?: T, meta?: { cursor: string|null, hasMore: boolean }, error?: { code: string, message: string, traceId: string, details?: Record<string,string[]> } }`
- Status: `200, 201, 400, 401, 403, 404, 409, 429, 500` (strict match)
- Validation source of truth: Zod schema di boundary request → `schema.parse()`/`safeParse()`. Fail fast. Strip unknown. Error: `zod.flatten()`.
- NestJS `ValidationPipe` hanya untuk transform primitive params jika diperlukan; request body wajib lewat Zod/custom Zod pipe.
- OpenAPI: `@nestjs/swagger` → `packages/api-contracts/openapi.yaml` wajib commit. Run `pnpm -r generate:types` sebelum merge.

## 6. SECURITY & AUTH
- JWT: Access `15m`, Refresh `7d`. `RS256`. Web: `httpOnly, secure, sameSite=strict, path=/api/auth/refresh`. Mobile: `expo-secure-store`.
- CORS: `origin: process.env.ALLOWED_ORIGINS.split(',')`. `credentials: true`. Headers: `Content-Type, Authorization, X-Request-ID`.
- Rate Limit: `@nestjs/throttler`. `100 req/min/IP`. Auth: `10 req/min`.
- Headers: `Helmet` enabled. HSTS, X-Frame: DENY, X-Content-Type: nosniff.
- Secrets: `.env` ONLY local. Validasi via Zod terpusat (misal `packages/env`). Sinkron antar workspace. Crash if missing. No fallback.
- Sanitization: DTO → Zod strip → Service. 🚫 Never pass `req.body` langsung ke Prisma.

## 7. DB, MIGRATION & QUERY
- DB column naming: `snake_case`. `id UUID`, `created_at/updated_at TIMESTAMPTZ`.
- Prisma model fields boleh camelCase dengan `@map("created_at")` / `@map("updated_at")`.
- Prisma: `select` eksplisit. Max 3 `include`. `$transaction` untuk multi-step.
- Index: Semua kolom di `where`, `order by`, `join`. Composite untuk unique.
- Migrations: `prisma migrate dev` (local), `prisma migrate deploy` (CI). WAJIB Expand/Contract pattern (Zero-Downtime). 🚫 DILARANG DROP/Rename kolom dalam 1 rilis.
- Soft Delete: DB `deleted_at TIMESTAMPTZ`; Prisma `deletedAt` boleh via `@map`. Filter: `{ deletedAt: null }`.
- Seeds: `prisma/seed.ts`. Idempotent. `@faker-js/faker`. 🚫 No auto-run di prod.

## 8. PERFORMANCE & CACHING
- DB: Pool `15` max. Timeout `5s`. `EXPLAIN ANALYZE` jika >100ms.
- Cache: Redis hot-read. Key: `v1:{resource}:{id}:{hash}`. TTL `5m`. Invalidate on mutation.
- Next.js: Server-first. Public/static data → `force-cache`/`revalidate`. User-specific/auth/dashboard/payment/ownership data → `no-store` default. AI wajib menjelaskan alasan caching per fetch.
- Expo: `react-native-screens` + `enableFreeze()`. List >20: `FlashList`. `Hermes: true`.
- NestJS: Async service wajib `try/catch`. Queue heavy task via `@nestjs/bull`. No sync DB di controller.

## 9. OBSERVABILITY & ERRORS
- Log: `{"level":"info","time":"ISO8601","msg":"...","traceId":"...","userId":"...","module":"...","duration_ms":45}`
- Codes: `AUTH_INVALID_TOKEN`, `VALIDATION_FAILED`, `DB_CONFLICT`, `RATE_LIMITED`, `EXTERNAL_SERVICE_DOWN`, `NOT_FOUND`.
- Tracing: OpenTelemetry auto-instrument HTTP/DB/cache. Inject `traceparent` outbound.
- Health: `GET /health` → `{"status":"ok","uptime":1234}`. `GET /ready` → cek DB/Redis. `503` if down.
- Retry: Max `2` retries after initial request, exp backoff (`1s,2s`). Circuit breaker after `5` consecutive errors.

## 10. STATE & SYNC
- Remote: `@tanstack/react-query`. Key: `['module','action',{params}]`. `staleTime:30s`, `gcTime:5m`.
- UI: `zustand` hanya local (modal, draft, theme). 🚫 No API data.
- Mobile Offline: Queue mutation di `AsyncStorage`. Sync on `NetInfo`. Server wins + `updatedAt`. Rollback wajib.
- SSR: Next.js fetch cache wajib eksplisit untuk data penting. Public data boleh `force-cache`; private/dynamic data wajib `no-store` atau policy revalidation jelas.

## 11. CI/CD & GIT
- Branch: `main` (protected), `feat/<scope>`, `fix/<scope>`.
- Pipeline: `turbo run lint typecheck test --filter=[affected]` → `turbo run build` → `preview` → `merge`. 🚫 Fail on warning.
- PR: Title `feat(module): desc`. Checklist: OpenAPI updated, `@repo` sync, Tests pass, Lint clean, Migration tested.
- Affected: `turbo run build --filter=...`. 🚫 Rebuild all jika tidak perlu.
- Commit: Conventional Commits. Squash merge. Auto-changelog.

## 12. AI INTERACTION PROTOCOL
1. Awali: `CONTEXT LOADED. TARGET ARCHITECTURE ACKNOWLEDGED. CURRENT REPO MODE WILL BE VERIFIED. READY.`
2. Format Output: `[PLAN] → [CLI CMD] → [CODE] → [TEST] → [TURBO CMD] → [CHECKLIST]`
3. Ambigu? `[CLARIFICATION NEEDED] Options: A/B + risk. Pilih?` 🚫 No generate until confirm.
4. Checklist Wajib: `✅ Zod`, `✅ Envelope`, `✅ Current repo mode checked`, `✅ @repo/* types if monorepo`, `✅ No unsafe structural migration`, `✅ Tests`, `✅ Turbo compatible if monorepo`
5. 🚫 DILARANG: Ubah arsitektur/auth/error tanpa konfirmasi. Skip validation. Manual config. Hardcode secrets.
