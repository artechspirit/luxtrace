# AI CONTEXT — FULLSTACK MONOREPO GUARDRAILS
⚠️ RULE 0: Baca file ini sebelum generate. Jangan nebak. Ambigu → STOP & minta klarifikasi. Hierarchy: Root > Workspace > UI.

## 1. STACK & RUNTIME (EXACT)
- Package Manager: `pnpm` (wajib) | Node: `v20 LTS` | TS: `strict: true, noUncheckedIndexedAccess: true`
- Monorepo: `Turborepo v2+` | Workspaces: `["apps/*", "packages/*"]`
- Web: `Next.js Terbaru (App Router)`, `React 18.3+`, `Tailwind 3.4+`
- Backend: `NestJS 10.3+`, `Express adapter`, `Prisma 5.15+`, `PostgreSQL 15+`
- Mobile: `Expo SDK Terbaru`, `Expo Router v3`, `React Query v5`, `Zustand v4`
- Shared: `Zod 3.23+`, `OpenAPI 3.0`, `pino 8+`, `OpenTelemetry`, `Sentry`

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

## 3. CLI-ONLY INITIALIZATION (STRICT)
🚫 DILARANG KERAS: Buat boilerplate/config manual. AI hanya boleh output CLI → user run → AI verify.
✅ WAJIB:
- Monorepo: `npx create-turbo@latest -p pnpm`
- Backend: `npx @nestjs/cli@latest new apps/api --package-manager pnpm --strict`
- Web: `npx create-next-app@latest apps/web --typescript --tailwind --app --src-dir --use-pnpm`
- Mobile: `pnpm create expo-app@latest apps/mobile -t expo-template-blank-typescript`
- Prisma: `cd apps/api && pnpm add prisma @prisma/client && pnpm dlx prisma init --datasource-provider postgresql`
- Shared: `mkdir -p packages/api-contracts && cd $_ && pnpm init && pnpm add zod @types/node`
- Flow: Output CLI → User run → AI verify tree → `pnpm install` → `turbo run build --filter=...` → ✅
- Fail? STOP → show log → give official alternative. 🚫 No fallback manual.

## 4. API CONTRACT & RESPONSE
- Envelope: `{ success: boolean, data?: T, meta?: { cursor: string|null, hasMore: boolean }, error?: { code: string, message: string, traceId: string, details?: Record<string,string[]> } }`
- Status: `200, 201, 400, 401, 403, 404, 409, 429, 500` (strict match)
- Validation: Zod di DTO → `zod.parse()`. Fail fast. Strip unknown. Error: `zod.flatten()`.
- OpenAPI: `@nestjs/swagger` → `packages/api-contracts/openapi.yaml` wajib commit. Run `pnpm -r generate:types` sebelum merge.

## 5. SECURITY & AUTH
- JWT: Access `15m`, Refresh `7d`. `RS256`. Web: `httpOnly, secure, sameSite=strict, path=/api/auth/refresh`. Mobile: `expo-secure-store`.
- CORS: `origin: process.env.ALLOWED_ORIGINS.split(',')`. `credentials: true`. Headers: `Content-Type, Authorization, X-Request-ID`.
- Rate Limit: `@nestjs/throttler`. `100 req/min/IP`. Auth: `10 req/min`.
- Headers: `Helmet` enabled. HSTS, X-Frame: DENY, X-Content-Type: nosniff.
- Secrets: `.env` ONLY local. Validasi via Zod terpusat (misal `packages/env`). Sinkron antar workspace. Crash if missing. No fallback.
- Sanitization: DTO → Zod strip → Service. 🚫 Never pass `req.body` langsung ke Prisma.

## 6. DB, MIGRATION & QUERY
- Naming: `snake_case`. `id UUID`, `createdAt/updatedAt TIMESTAMPTZ`.
- Prisma: `select` eksplisit. Max 3 `include`. `$transaction` untuk multi-step.
- Index: Semua kolom di `where`, `order by`, `join`. Composite untuk unique.
- Migrations: `prisma migrate dev` (local), `prisma migrate deploy` (CI). WAJIB Expand/Contract pattern (Zero-Downtime). 🚫 DILARANG DROP/Rename kolom dalam 1 rilis.
- Soft Delete: `deletedAt TIMESTAMPTZ`. Filter: `{ deletedAt: null }`.
- Seeds: `prisma/seed.ts`. Idempotent. `@faker-js/faker`. 🚫 No auto-run di prod.

## 7. PERFORMANCE & CACHING
- DB: Pool `15` max. Timeout `5s`. `EXPLAIN ANALYZE` jika >100ms.
- Cache: Redis hot-read. Key: `v1:{resource}:{id}:{hash}`. TTL `5m`. Invalidate on mutation.
- Next.js: Server-first. `revalidate` static. Image/font opt wajib. Code-split >50KB.
- Expo: `react-native-screens` + `enableFreeze()`. List >20: `FlashList`. `Hermes: true`.
- NestJS: Async service wajib `try/catch`. Queue heavy task via `@nestjs/bull`. No sync DB di controller.

## 8. OBSERVABILITY & ERRORS
- Log: `{"level":"info","time":"ISO8601","msg":"...","traceId":"...","userId":"...","module":"...","duration_ms":45}`
- Codes: `AUTH_INVALID_TOKEN`, `VALIDATION_FAILED`, `DB_CONFLICT`, `RATE_LIMITED`, `EXTERNAL_SERVICE_DOWN`, `NOT_FOUND`.
- Tracing: OpenTelemetry auto-instrument HTTP/DB/cache. Inject `traceparent` outbound.
- Health: `GET /health` → `{"status":"ok","uptime":1234}`. `GET /ready` → cek DB/Redis. `503` if down.
- Retry: Max `2x` exp backoff (`1s,2s,4s`). Circuit breaker after `5` consecutive errors.

## 9. STATE & SYNC
- Remote: `@tanstack/react-query`. Key: `['module','action',{params}]`. `staleTime:30s`, `gcTime:5m`.
- UI: `zustand` hanya local (modal, draft, theme). 🚫 No API data.
- Mobile Offline: Queue mutation di `AsyncStorage`. Sync on `NetInfo`. Server wins + `updatedAt`. Rollback wajib.
- SSR: Next.js `fetch` cache `force-cache` default. `revalidate`/`no-store` sesuai konteks.

## 10. CI/CD & GIT
- Branch: `main` (protected), `feat/<scope>`, `fix/<scope>`.
- Pipeline: `turbo run lint typecheck test --filter=[affected]` → `turbo run build` → `preview` → `merge`. 🚫 Fail on warning.
- PR: Title `feat(module): desc`. Checklist: OpenAPI updated, `@repo` sync, Tests pass, Lint clean, Migration tested.
- Affected: `turbo run build --filter=...`. 🚫 Rebuild all jika tidak perlu.
- Commit: Conventional Commits. Squash merge. Auto-changelog.

## 11. AI INTERACTION PROTOCOL
1. Awali: `CONTEXT LOADED. MONOREPO & CLI BOUNDARIES ACKNOWLEDGED. READY.`
2. Format Output: `[PLAN] → [CLI CMD] → [CODE] → [TEST] → [TURBO CMD] → [CHECKLIST]`
3. Ambigu? `[CLARIFICATION NEEDED] Options: A/B + risk. Pilih?` 🚫 No generate until confirm.
4. Checklist Wajib: `✅ Zod`, `✅ Envelope`, `✅ @repo/* types`, `✅ No ../`, `✅ CLI-only`, `✅ Tests`, `✅ Turbo compatible`
5. 🚫 DILARANG: Ubah arsitektur/auth/error tanpa konfirmasi. Skip validation. Manual config. Hardcode secrets.