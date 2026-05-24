# LuxTrace Rebuild - Project Roadmap

Generated from `PROJECT_BLUEPRINT.md`.

## Roadmap Type
- **Type:** Project Blueprint Roadmap
- **Repo Mode:** Existing repo migration
- **Backend Mode:** Hybrid with migration plan
- **Primary Platform:** Semua
- **Testing Risk:** High

## Phase 0: Discovery & Blueprint Lock
- [ ] Review and approve project scope, non-goals, success metrics.
- [ ] Confirm repo mode: Existing repo migration.
- [ ] Confirm backend mode: Hybrid with migration plan.
- [ ] Confirm platform scope: Semua.
- [ ] Checkpoint: Blueprint approved by product/engineering owner.

## Phase 1: Foundation / Repository Bootstrap
- [ ] Inventory current `luxtrace-web`, `luxtrace-mobile`, Supabase usage, env vars, scripts, assets, and deploy assumptions.
- [ ] Map current structure to target `apps/{web,mobile,api}` and `packages/*`; document migration gate and rollback plan.
- [ ] Setup package manager, TypeScript strict mode, ESLint, env validation, and workspace boundaries.
- [ ] Setup base CI commands for lint, typecheck, test, and build.
- [ ] Define initial `packages/api-contracts`, `packages/validation`, `packages/env`, and `packages/ui` plan.
- [ ] Checkpoint: `current repo scripts identified and migration gate approved`.

## Phase 2: Data & API Foundation
- [ ] Define migration boundary between Supabase legacy data and NestJS/Prisma target APIs.
- [ ] Design target entities: Brand, Product, ProductIdentity, ScanEvent, OwnershipClaim, AuditEvent.
- [ ] Define response envelope, stable error codes, auth/session baseline, and rate limits.
- [ ] Define QR/NFC verification contract, ownership claim contract, and admin product registry contract.
- [ ] Generate or document API contracts.
- [ ] Checkpoint: API contract reviewed and backend foundation tests pass.

## Phase 3: Design System & Client Foundation
- [ ] Bootstrap design tokens from product direction: Quiet luxury operational dashboard for brands with a fast mobile-first consumer verification and claim flow.
- [ ] Create foundation components: Button, Input, Card, Modal, Badge, Skeleton.
- [ ] Setup Web shell if Web is in scope.
- [ ] Setup Mobile shell if Mobile is in scope.
- [ ] Setup API client and React Query conventions.
- [ ] Checkpoint: client shell builds and basic navigation works.

## Phase 4: MVP Feature Implementation
- [ ] Auth
- [ ] Product Registry
- [ ] QR/NFC Verification
- [ ] Ownership Claim
- [ ] Brand Dashboard
- [ ] Audit Trail
- [ ] For each P0/P1 feature, create a dedicated `AI_FEATURE_TEMPLATE.md` spec before coding.
- [ ] Implement each feature one phase at a time using `AI_RULES_ROADMAP.md`.
- [ ] Checkpoint: scan -> verify -> claim, admin product registration, and audit trail critical paths pass tests/manual verification.

## Phase 5: Production Hardening
- [ ] Add observability: structured logs, Sentry, OpenTelemetry, health/readiness.
- [ ] Add security pass: permission matrix, rate limit, secret review, audit logs.
- [ ] Performance pass for slow DB queries and key screens.
- [ ] Setup staging/prod deploy pipeline and rollback procedure.
- [ ] Checkpoint: production readiness checklist approved.

## Required Follow-up Specs
- [ ] Create feature spec for Auth
- [ ] Create feature spec for Product Registry
- [ ] Create feature spec for QR/NFC Verification
- [ ] Create feature spec for Ownership Claim
- [ ] Create feature spec for Brand Dashboard
- [ ] Create feature spec for Audit Trail

## Execution Rule
Do not write application code until Phase 0 is approved and Phase 1 execution is explicitly requested.
