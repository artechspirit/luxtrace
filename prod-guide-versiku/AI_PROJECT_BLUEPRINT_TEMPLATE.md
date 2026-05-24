# [NAMA PROJECT] - Production Project Blueprint

⚠️ **Instruksi untuk AI:** Gunakan dokumen ini sebelum membuat repo/project baru atau melakukan migrasi besar. Dokumen ini adalah level project, bukan level fitur. Setelah blueprint ini disetujui, baru pecah menjadi roadmap dan `AI_FEATURE_TEMPLATE.md` per fitur.

## 1. EXECUTIVE SUMMARY
- **Nama Project:** [Nama produk/aplikasi]
- **One-liner:** [Jelaskan produk ini dalam 1 kalimat]
- **Masalah yang Diselesaikan:** [Masalah utama user/bisnis]
- **Solusi Utama:** [Cara produk menyelesaikan masalah]
- **Target Launch:** [MVP / Beta / Production v1]
- **Primary Platform:** [ ] Web  [ ] Mobile  [ ] API  [ ] Semua
- **Repo Mode:** [ ] New target monorepo  [ ] Existing repo migration  [ ] Prototype dulu

## 2. BUSINESS CONTEXT & GOALS
- **Business Goal:** [Contoh: meningkatkan trust, mengurangi fraud, mempercepat operasional]
- **Primary Users:** [Siapa pengguna utama]
- **Secondary Users:** [Admin, ops, support, partner, auditor, dll]
- **Success Metrics:**
  - [Metric 1, contoh: activation rate > 40%]
  - [Metric 2, contoh: scan success rate > 95%]
  - [Metric 3, contoh: p95 API latency < 500ms]
- **Non-goals:** [Hal yang sengaja tidak dikerjakan di v1]

## 3. USER PERSONA & CORE JOURNEYS
- **Persona 1:** [Nama/role] - [Kebutuhan utama] - [Pain point]
- **Persona 2:** [Nama/role] - [Kebutuhan utama] - [Pain point]

### Core Journey 1: [Nama Journey]
1. [Step user melakukan X]
2. [Sistem merespons Y]
3. [User mencapai outcome Z]

### Core Journey 2: [Nama Journey]
1. [Step user melakukan X]
2. [Sistem merespons Y]
3. [User mencapai outcome Z]

## 4. PRODUCT SCOPE
### MVP Scope
- [ ] [Fitur wajib 1]
- [ ] [Fitur wajib 2]
- [ ] [Fitur wajib 3]

### Post-MVP Scope
- [ ] [Fitur nanti 1]
- [ ] [Fitur nanti 2]

### Out of Scope
- [ ] [Hal yang tidak dibuat sekarang]
- [ ] [Hal yang butuh approval terpisah]

## 5. HIGH-LEVEL FEATURE MAP
| Module | Description | Platform | Priority | Data Sensitivity |
|---|---|---|---|---|
| Auth | Login, refresh token, session management | Web/Mobile/API | P0 | User-specific |
| Dashboard | Overview operational data | Web | P1 | Admin-only |
| [Module] | [Deskripsi] | [Web/Mobile/API] | [P0/P1/P2] | [Public/Private] |

## 6. ARCHITECTURE DECISIONS
- **Architecture Target:** [ ] Monorepo `apps/*` + `packages/*`  [ ] Existing structure dulu
- **Backend Mode:** [ ] NestJS + Prisma + PostgreSQL  [ ] Supabase-first  [ ] Hybrid with migration plan
- **Web Stack:** [Next.js version, React version, Tailwind version]
- **Mobile Stack:** [Expo SDK, React Native, Expo Router]
- **Shared Packages Needed:**
  - [ ] `packages/api-contracts`
  - [ ] `packages/ui`
  - [ ] `packages/validation`
  - [ ] `packages/env`
  - [ ] `packages/tsconfig`
  - [ ] `packages/eslint`
- **External Services:** [Payment, storage, email, analytics, maps, blockchain, etc]
- **Architecture Decision Notes:** [Kenapa memilih stack ini, tradeoff, risiko]

## 7. TARGET REPOSITORY STRUCTURE
```txt
apps/
  web/
    app/
    components/
    features/
    lib/
    public/
    tests/

  mobile/
    src/
      app/
      components/
      features/
      lib/
      stores/
    assets/

  api/
    src/
      common/
      config/
      infra/
      modules/
      jobs/
    prisma/
    test/

packages/
  api-contracts/
  ui/
  validation/
  env/
  tsconfig/
  eslint/
```

## 8. DOMAIN MODEL / DATA BLUEPRINT
| Entity | Purpose | Key Fields | Relations | Notes |
|---|---|---|---|---|
| User | Account identity | id, email, role | has many sessions | PII |
| [Entity] | [Purpose] | [Fields] | [Relations] | [Notes] |

### Data Rules
- **ID Strategy:** UUID.
- **Naming:** DB `snake_case`, Prisma model may use camelCase with `@map`.
- **Soft Delete:** [Yes/No] - [Entity yang butuh soft delete]
- **Audit Trail:** [Entity/action yang wajib diaudit]
- **Indexes Required:** [Kolom where/order/join]
- **Migration Strategy:** Expand/contract, no destructive migration in one release.

## 9. API & CONTRACT BLUEPRINT
- **API Style:** REST + OpenAPI envelope.
- **Base URL:** `/api/v1`
- **Response Envelope:** `{ success, data, meta, error }`
- **Auth Scheme:** [JWT RS256 / Supabase Auth / OAuth / etc]

| Method | Endpoint | Purpose | Auth | Cache Policy |
|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Login user | Public | no-store |
| GET | `/api/v1/me` | Current user profile | Required | no-store |
| [METHOD] | `/api/v1/...` | [Purpose] | [Public/Required/Role] | [force-cache/revalidate/no-store] |

### Validation Rules
- Zod is source of truth at request boundary.
- Unknown input stripped or rejected according to endpoint risk.
- Error format must use standard envelope and stable error codes.

## 10. UI/UX BLUEPRINT
- **Design Direction:** [Operational dashboard / consumer app / marketplace / internal tool / etc]
- **Design System Status:** [ ] Existing  [ ] Need bootstrap  [ ] Use target `packages/ui`
- **Core Screens:**
  - [Screen 1] - [Purpose] - [Web/Mobile]
  - [Screen 2] - [Purpose] - [Web/Mobile]
- **Required States:** Initial, loading, empty, error, success, offline if mobile.
- **Accessibility Requirements:** Keyboard navigation, semantic roles, focus-visible, contrast 4.5:1.
- **Responsive Requirements:** [Mobile-first, tablet, desktop, admin dense layout, etc]

## 11. SECURITY, PRIVACY & PERMISSIONS
- **Roles:** [Guest, User, Admin, Super Admin, Partner, etc]
- **Permission Matrix:**
| Action | Guest | User | Admin | Notes |
|---|---:|---:|---:|---|
| View public data | ✅ | ✅ | ✅ | Public |
| Manage users | ❌ | ❌ | ✅ | Admin-only |
| [Action] | [✅/❌] | [✅/❌] | [✅/❌] | [Notes] |

- **Sensitive Data:** [PII, payment, ownership, health, location, etc]
- **Secrets Strategy:** Runtime env via secret manager. No secret in source code.
- **Rate Limit:** [Default 100 req/min/IP, auth 10 req/min, custom rules]
- **Threat Notes:** [Fraud, replay, enumeration, unauthorized access, data leakage]

## 12. PERFORMANCE, RELIABILITY & OFFLINE
- **API Latency Target:** p95 [target] ms.
- **Frontend Performance Target:** [FCP/LCP or practical target]
- **Database Query Rule:** EXPLAIN ANALYZE if query >100ms.
- **Caching Strategy:** Public data `force-cache/revalidate`, private data `no-store`, Redis hot-read if needed.
- **Offline Strategy:** [None / read-only cache / mutation queue / sync conflict rule]
- **Retry Policy:** Max 2 retries after initial request with exponential backoff.

## 13. OBSERVABILITY & OPERATIONS
- **Logging:** JSON logs with traceId, userId, module, duration_ms.
- **Tracing:** OpenTelemetry HTTP/DB/cache.
- **Error Tracking:** Sentry or approved equivalent.
- **Health Checks:** `/health` and `/ready`.
- **Dashboards/Alerts:** [API error rate, latency, queue failures, DB connections, mobile crash rate]

## 14. TESTING STRATEGY
- **Risk Level:** [Low / Medium / High]
- **Unit Tests:** [Core services/hooks/components]
- **Integration Tests:** [API endpoints, DB, external service mocks]
- **E2E Critical Paths:**
  - [Path 1, contoh: login → create data → verify dashboard]
  - [Path 2, contoh: scan → verify → claim]
- **Manual Verification:** [Device/browser/provider checks]
- **Test Data:** [Seed strategy, fixtures, fake accounts]

## 15. DEPLOYMENT & ENVIRONMENTS
- **Environments:** development, preview/staging, production.
- **Web Target:** [Vercel / self-host Docker / other]
- **API Target:** [Cloud Run / ECS / other]
- **Mobile Target:** EAS Build + preview/production channels.
- **Database:** PostgreSQL with SSL in production.
- **Secrets:** [Vercel/GCP/AWS secret manager]
- **Migration Plan:** `migrate deploy` in CI/CD, expand/contract for risky changes.
- **Rollback Plan:** [Feature flag, previous image, migration recovery note]

## 16. PROJECT ROADMAP
### Phase 0: Discovery & Blueprint Lock
- [ ] Confirm product scope, non-goals, success metrics.
- [ ] Choose backend mode and target repo mode.
- [ ] Approve data sensitivity and security requirements.
- [ ] Checkpoint: Blueprint approved.

### Phase 1: Foundation / Repository Bootstrap
- [ ] Initialize monorepo via CLI if greenfield.
- [ ] Setup package manager, TS config, ESLint, env validation.
- [ ] Setup CI skeleton.
- [ ] Checkpoint: `pnpm install`, `turbo run lint typecheck build` or equivalent passes.

### Phase 2: Data & API Foundation
- [ ] Design database schema and migrations.
- [ ] Implement API envelope, error filter, validation, auth base.
- [ ] Generate OpenAPI/contracts.
- [ ] Checkpoint: API tests pass and OpenAPI generated.

### Phase 3: Design System & Client Foundation
- [ ] Bootstrap design tokens and UI foundation.
- [ ] Setup Next.js layout/routes and Expo Router structure.
- [ ] Setup React Query/client API layer.
- [ ] Checkpoint: Web/mobile shell builds and basic navigation works.

### Phase 4: MVP Feature Implementation
- [ ] Implement P0 feature 1.
- [ ] Implement P0 feature 2.
- [ ] Implement P0 feature 3.
- [ ] Checkpoint: MVP critical paths pass integration/E2E/manual verification.

### Phase 5: Production Hardening
- [ ] Add observability, rate limit, audit logs, security review.
- [ ] Performance pass for slow queries and key screens.
- [ ] Deployment pipeline, staging smoke test, rollback plan.
- [ ] Checkpoint: Production readiness checklist approved.

## 17. PRODUCTION READINESS CHECKLIST
- [ ] Scope and non-goals approved.
- [ ] Backend mode approved.
- [ ] Repo structure approved.
- [ ] Data model and migration strategy approved.
- [ ] API contracts and envelope defined.
- [ ] Auth, roles, and permission matrix defined.
- [ ] Cache policy defined for public/private data.
- [ ] Design system plan approved.
- [ ] Testing strategy matches risk.
- [ ] CI/CD and rollback plan defined.
- [ ] Observability and health checks defined.

## 18. OPEN QUESTIONS
- [Question 1]
- [Question 2]
- [Question 3]

## 19. AI EXECUTION INSTRUCTION
Setelah blueprint ini disetujui:
1. Buat roadmap detail mengikuti `AI_RULES_ROADMAP.md`.
2. Pecah setiap P0/P1 feature menjadi dokumen `AI_FEATURE_TEMPLATE.md`.
3. Jangan menulis kode sebelum roadmap fase pertama disetujui user.
4. Jika ada gap antara repo existing dan target architecture, buat migration plan dulu.
