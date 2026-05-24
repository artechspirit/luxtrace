# LuxTrace Rebuild - Production Project Blueprint

⚠️ **Instruksi untuk AI:** Gunakan dokumen ini sebelum membuat repo/project baru atau melakukan migrasi besar. Dokumen ini adalah level project, bukan level fitur. Setelah blueprint ini disetujui, baru pecah menjadi roadmap dan `AI_FEATURE_TEMPLATE.md` per fitur.

## 1. EXECUTIVE SUMMARY
- **Nama Project:** LuxTrace Rebuild
- **One-liner:** Production-grade luxury product authentication, traceability, and ownership platform for web and mobile
- **Masalah yang Diselesaikan:** Current LuxTrace needs a cleaner production architecture for QR/NFC verification, brand operations, ownership claims, and auditability
- **Solusi Utama:** Rebuild LuxTrace as a target monorepo with Next.js dashboard, Expo consumer mobile app, NestJS/Prisma API, shared contracts, and a tokenized design system
- **Target Launch:** MVP
- **Primary Platform:** [ ] Web  [ ] Mobile  [ ] API  [x] Semua
- **Repo Mode:** [ ] New target monorepo  [x] Existing repo migration  [ ] Prototype dulu

## 2. BUSINESS CONTEXT & GOALS
- **Business Goal:** Increase trust in luxury product authenticity, reduce counterfeit risk, and give brands a production-grade operating system for product traceability
- **Primary Users:** Brand admins, consumers, luxury resellers, and internal operations teams
- **Secondary Users:** Customer support, auditors, logistics partners, and brand verification teams
- **Success Metrics:**
  - QR/NFC verification success rate > 95% on supported devices.
  - Ownership claim duplicate rate = 0 via idempotency and DB constraints.
  - Brand admin product registration completion rate > 90%.
  - p95 API latency < 500ms for verify/product detail endpoints.
- **Non-goals:**
- [ ] Full marketplace
- [ ] escrow
- [ ] multi-chain provenance
- [ ] native ecommerce checkout
- [ ] multi-region active-active deployment

## 3. USER PERSONA & CORE JOURNEYS
- **Persona 1:** Primary User - Needs the core product outcome quickly - Pain point: current workflow is slow, manual, or unreliable.
- **Persona 2:** Admin/Ops - Needs visibility and control - Pain point: lacks trustworthy operational data.

### Core Journey 1: Primary User Activation
1. User opens the product and signs in or starts the allowed guest flow.
2. System guides the user through the main action with clear loading/error/success states.
3. User reaches the promised product outcome and can continue or review history.

### Core Journey 2: Admin/Ops Management
1. Admin signs in to the operational dashboard.
2. System shows relevant records, status, and actions.
3. Admin resolves or monitors the core workflow with auditability.

## 4. PRODUCT SCOPE
### MVP Scope
- [ ] Auth
- [ ] Product Registry
- [ ] QR/NFC Verification
- [ ] Ownership Claim
- [ ] Brand Dashboard
- [ ] Audit Trail

### Post-MVP Scope
- [ ] Counterfeit risk scoring
- [ ] ownership transfer
- [ ] public product passport
- [ ] subscription billing
- [ ] advanced analytics
- [ ] notifications

### Out of Scope
- [ ] Full marketplace
- [ ] escrow
- [ ] multi-chain provenance
- [ ] native ecommerce checkout
- [ ] multi-region active-active deployment

## 5. HIGH-LEVEL FEATURE MAP
| Module | Description | Platform | Priority | Data Sensitivity |
|---|---|---|---|---|
| Auth | Login, refresh token, session management | Semua/API | P0 | User-specific |
| Product Registry | Brand product catalog, serials, identities, status | Web/API | P0 | Admin-only |
| QR/NFC Verification | Consumer verification through QR/NFC scan | Mobile/API/Web fallback | P0 | Public + User-specific |
| Ownership Claim | Consumer claim flow and claim review state | Mobile/Web/API | P0 | Ownership |
| Brand Dashboard | Operational overview for products, scans, claims | Web/API | P0 | Admin-only |
| Audit Trail | Trace sensitive product, claim, and admin actions | API/Web | P0 | Admin-only |

## 6. ARCHITECTURE DECISIONS
- **Architecture Target:** Existing repo migration
- **Backend Mode:** [ ] NestJS + Prisma + PostgreSQL  [ ] Supabase-first  [x] Hybrid with migration plan
- **Web Stack:** Next.js 16.x, React 19.x, Tailwind 4.x if Web is in scope.
- **Mobile Stack:** Expo SDK 55.x, React Native, Expo Router if Mobile is in scope.
- **Shared Packages Needed:**
  - [x] `packages/api-contracts`
  - [x] `packages/ui`
  - [x] `packages/validation`
  - [x] `packages/env`
  - [x] `packages/tsconfig`
  - [x] `packages/eslint`
- **External Services:** Supabase legacy data, object storage, email, QR generation, NFC scanning, Sentry, analytics
- **Architecture Decision Notes:** Follow target guardrails. If repo mode is migration/prototype, AI must create a migration gate before structural changes.

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
| User | Account identity | id, email, role, created_at | has many sessions, claims, audit events | PII |
| Brand | Brand tenant/owner | id, name, slug, status | has many products and admins | Tenant boundary |
| Product | Registered luxury item | id, brand_id, name, serial_number_hash, status, created_at | belongs to brand, has identity/claims/scans | Core asset |
| ProductIdentity | QR/NFC identity binding | id, product_id, qr_code_hash, nfc_uid_hash | belongs to product | Unique verification surface |
| OwnershipClaim | Claim request/history | id, product_id, user_id, status, proof_type, created_at | belongs to product/user | Idempotent claim flow |
| ScanEvent | Verification audit event | id, product_id, user_id, scan_source, risk_score, created_at | belongs to product/user optional | Fraud analytics seed |
| AuditEvent | Track sensitive actions | id, actor_id, action, target_id, created_at | belongs to user | Required for production ops |

### Data Rules
- **ID Strategy:** UUID.
- **Naming:** DB `snake_case`, Prisma model may use camelCase with `@map`.
- **Soft Delete:** Yes for `Product`, `Brand`, and user-owned records where recovery/audit matters.
- **Audit Trail:** Auth, product registration, identity generation, scan verification, ownership claim state changes, admin actions.
- **Indexes Required:** `brand_id`, `product_id`, `user_id`, `qr_code_hash`, `nfc_uid_hash`, `status`, `created_at`, and unique product identifiers.
- **Migration Strategy:** Expand/contract, no destructive migration in one release.

## 9. API & CONTRACT BLUEPRINT
- **API Style:** REST + OpenAPI envelope.
- **Base URL:** `/api/v1`
- **Response Envelope:** `{ success, data, meta, error }`
- **Auth Scheme:** JWT RS256 or approved auth provider based on backend mode.

| Method | Endpoint | Purpose | Auth | Cache Policy |
|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Login user | Public | no-store |
| GET | `/api/v1/me` | Current user profile | Required | no-store |
| GET | `/api/v1/health` | Health check | Public | no-store |
| GET | `/api/v1/products` | Brand product list | Admin | no-store |
| POST | `/api/v1/products` | Register product | Admin | no-store |
| POST | `/api/v1/products/verify` | Verify QR/NFC payload | Public/User | no-store |
| POST | `/api/v1/products/:productId/claim` | Submit ownership claim | Required | no-store |
| GET | `/api/v1/claims` | List ownership claims | Required/Admin | no-store |
| GET | `/api/v1/audit-events` | Audit trail | Admin | no-store |

### Validation Rules
- Zod is source of truth at request boundary.
- Unknown input stripped or rejected according to endpoint risk.
- Error format must use standard envelope and stable error codes.

## 10. UI/UX BLUEPRINT
- **Design Direction:** Quiet luxury operational dashboard for brands with a fast mobile-first consumer verification and claim flow
- **Design System Status:** [ ] Existing  [x] Need bootstrap  [ ] Use target `packages/ui`
- **Core Screens:**
  - Login/Auth - Account access - Web/Mobile
  - Scan Product - QR/NFC verification and result state - Mobile
  - Product Passport - Authenticity status and public metadata - Web/Mobile
  - Claim Ownership - Proof submission and claim status - Mobile/Web
  - Product Registry - Brand product creation and identity management - Web
  - Brand Dashboard - Scan, claim, and product operations overview - Web
- **Required States:** Initial, loading, empty, error, success, offline if mobile.
- **Accessibility Requirements:** Keyboard navigation, semantic roles, focus-visible, contrast 4.5:1.
- **Responsive Requirements:** Mobile-first for consumer flows, dense but readable layout for operational dashboard.

## 11. SECURITY, PRIVACY & PERMISSIONS
- **Roles:** Guest, User, Admin.
- **Permission Matrix:**
| Action | Guest | User | Admin | Notes |
|---|---:|---:|---:|---|
| View public data | ✅ | ✅ | ✅ | Public |
| Verify product | ✅ | ✅ | ✅ | Public verify, private details gated |
| Claim ownership | ❌ | ✅ | ✅ | Requires login |
| Manage own data | ❌ | ✅ | ✅ | Owner or admin |
| Register products | ❌ | ❌ | ✅ | Brand admin-only |
| Manage users | ❌ | ❌ | ✅ | Admin-only |
| View audit logs | ❌ | ❌ | ✅ | Admin-only |

- **Sensitive Data:** User identity, product ownership, serial identifiers, scan telemetry, operational records, audit logs.
- **Secrets Strategy:** Runtime env via secret manager. No secret in source code.
- **Rate Limit:** Default 100 req/min/IP, auth 10 req/min, stricter for sensitive mutations.
- **Threat Notes:** Unauthorized access, ID enumeration, replay, data leakage, weak auditability.

## 12. PERFORMANCE, RELIABILITY & OFFLINE
- **API Latency Target:** p95 < 500ms for core endpoints.
- **Frontend Performance Target:** Fast first load for public/auth pages; dashboard optimized for scan/read efficiency.
- **Database Query Rule:** EXPLAIN ANALYZE if query >100ms.
- **Caching Strategy:** Public data `force-cache/revalidate`, private data `no-store`, Redis hot-read if needed.
- **Offline Strategy:** Mobile can queue scan attempts, but authenticity verification and ownership claim require online confirmation. Cached result must be labeled as last verified.
- **Retry Policy:** Max 2 retries after initial request with exponential backoff.

## 13. OBSERVABILITY & OPERATIONS
- **Logging:** JSON logs with traceId, userId, module, duration_ms.
- **Tracing:** OpenTelemetry HTTP/DB/cache.
- **Error Tracking:** Sentry or approved equivalent.
- **Health Checks:** `/health` and `/ready`.
- **Dashboards/Alerts:** API error rate, latency, queue failures, DB connections, frontend errors, mobile crash rate if mobile exists.

## 14. TESTING STRATEGY
- **Risk Level:** High
- **Unit Tests:** Core services, validation schemas, hooks/components for core flows.
- **Integration Tests:** API endpoints, DB access, auth/session, external service mocks.
- **E2E Critical Paths:**
  - Consumer opens mobile -> grants camera permission -> scans QR/NFC -> sees authenticity result.
  - Consumer login -> verifies product -> submits ownership claim -> sees pending/success state.
  - Brand admin login -> registers product -> generates identity -> sees product in dashboard.
  - Admin login -> reviews claim/audit trail -> performs approved admin action.
- **Manual Verification:** Browser/device/provider checks for platform-specific behavior.
- **Test Data:** Idempotent seed data and fake accounts per role.

## 15. DEPLOYMENT & ENVIRONMENTS
- **Environments:** development, preview/staging, production.
- **Web Target:** Vercel
- **API Target:** Google Cloud Run
- **Mobile Target:** EAS Build + preview/production channels if Mobile is in scope.
- **Database:** PostgreSQL with SSL in production.
- **Secrets:** Vercel/GCP/AWS secret manager or approved equivalent.
- **Migration Plan:** `migrate deploy` in CI/CD, expand/contract for risky changes.
- **Rollback Plan:** Feature flag for risky features, previous image/deployment, migration recovery note.

## 16. PROJECT ROADMAP
See `ROADMAP.md` generated next to this blueprint.

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
- Which MVP feature has the highest launch risk?
- Are there legal/compliance requirements for the sensitive data?
- Which external services are mandatory for MVP vs post-MVP?

## 19. AI EXECUTION INSTRUCTION
Setelah blueprint ini disetujui:
1. Buat roadmap detail mengikuti `AI_RULES_ROADMAP.md`.
2. Pecah setiap P0/P1 feature menjadi dokumen `AI_FEATURE_TEMPLATE.md`.
3. Jangan menulis kode sebelum roadmap fase pertama disetujui user.
4. Jika ada gap antara repo existing dan target architecture, buat migration plan dulu.
