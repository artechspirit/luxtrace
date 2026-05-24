#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_OUTPUT_DIR="${SCRIPT_DIR}/generated"

usage() {
  cat <<'EOF'
Usage:
  ./prod-guide-versiku/setup.sh
  ./prod-guide-versiku/setup.sh --intake
  ./prod-guide-versiku/setup.sh --output docs/blueprints

This script interactively generates:
  - PROJECT_BLUEPRINT.md
  - ROADMAP.md

With --intake, it generates:
  - PROJECT_INTAKE.md
  - PROMPT_TO_BLUEPRINT.md

The generated files follow:
  - AI_PROJECT_INTAKE_TEMPLATE.md
  - AI_PROJECT_BLUEPRINT_TEMPLATE.md
  - AI_RULES_ROADMAP.md
EOF
}

OUTPUT_DIR="${DEFAULT_OUTPUT_DIR}"
MODE="blueprint"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --intake)
      MODE="intake"
      shift
      ;;
    --output|-o)
      OUTPUT_DIR="${2:-}"
      if [[ -z "${OUTPUT_DIR}" ]]; then
        echo "Missing value for --output" >&2
        exit 1
      fi
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

prompt() {
  local label="$1"
  local default_value="${2:-}"
  local value

  if [[ -n "${default_value}" ]]; then
    printf '%s [%s]: ' "${label}" "${default_value}" >&2
    read -r value
    echo "${value:-$default_value}"
  else
    while true; do
      printf '%s: ' "${label}" >&2
      read -r value
      if [[ -n "${value}" ]]; then
        echo "${value}"
        return
      fi
      echo "Value is required." >&2
    done
  fi
}

prompt_optional() {
  local label="$1"
  local default_value="${2:-}"
  local value

  if [[ -n "${default_value}" ]]; then
    printf '%s [%s]: ' "${label}" "${default_value}" >&2
    read -r value
    echo "${value:-$default_value}"
  else
    printf '%s: ' "${label}" >&2
    read -r value
    echo "${value}"
  fi
}

choose() {
  local label="$1"
  shift
  local options=("$@")
  local index

  echo "${label}" >&2
  for i in "${!options[@]}"; do
    printf '  %s) %s\n' "$((i + 1))" "${options[$i]}" >&2
  done

  while true; do
    printf 'Choose [1-%s]: ' "${#options[@]}" >&2
    read -r index
    if [[ "${index}" =~ ^[0-9]+$ ]] && (( index >= 1 && index <= ${#options[@]} )); then
      echo "${options[$((index - 1))]}"
      return
    fi
    echo "Invalid choice." >&2
  done
}

slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

checkbox() {
  local current="$1"
  local expected="$2"
  if [[ "${current}" == "${expected}" ]]; then
    echo "[x]"
  else
    echo "[ ]"
  fi
}

split_csv_to_checklist() {
  local csv="$1"
  local fallback="$2"

  if [[ -z "${csv// }" ]]; then
    printf -- '- [ ] %s\n' "${fallback}"
    return
  fi

  local old_ifs="${IFS}"
  IFS=','
  read -ra items <<< "${csv}"
  IFS="${old_ifs}"

  for item in "${items[@]}"; do
    item="$(echo "${item}" | sed -E 's/^ +//; s/ +$//')"
    if [[ -n "${item}" ]]; then
      printf -- '- [ ] %s\n' "${item}"
    fi
  done
}

split_csv_to_rows() {
  local csv="$1"
  local platform="$2"

  if [[ -z "${csv// }" ]]; then
    printf '| [Module] | [Deskripsi] | %s | P0 | [Public/Private] |\n' "${platform}"
    return
  fi

  local old_ifs="${IFS}"
  IFS=','
  read -ra items <<< "${csv}"
  IFS="${old_ifs}"

  for item in "${items[@]}"; do
    item="$(echo "${item}" | sed -E 's/^ +//; s/ +$//')"
    if [[ -n "${item}" ]]; then
      if [[ "$(echo "${item}" | tr '[:upper:]' '[:lower:]')" == "auth" ]]; then
        continue
      fi
      printf '| %s | %s module | %s | P0 | User-specific |\n' "${item}" "${item}" "${platform}"
    fi
  done
}

split_csv_to_feature_specs() {
  local csv="$1"
  local has_auth="false"
  local output=""

  if [[ -n "${csv// }" ]]; then
    local old_ifs="${IFS}"
    IFS=','
    read -ra items <<< "${csv}"
    IFS="${old_ifs}"

    for item in "${items[@]}"; do
      item="$(echo "${item}" | sed -E 's/^ +//; s/ +$//')"
      if [[ -z "${item}" ]]; then
        continue
      fi

      if [[ "$(echo "${item}" | tr '[:upper:]' '[:lower:]')" == "auth" ]]; then
        has_auth="true"
      fi

      output+="- [ ] Create feature spec for ${item}"$'\n'
    done
  fi

  if [[ "${has_auth}" == "false" ]]; then
    printf -- '- [ ] Create feature spec for Auth\n'
  fi

  printf '%s' "${output}"
}

platform_checkbox_line() {
  local platform="$1"
  printf '%s Web  %s Mobile  %s API  %s Semua' \
    "$(checkbox "${platform}" "Web")" \
    "$(checkbox "${platform}" "Mobile")" \
    "$(checkbox "${platform}" "API")" \
    "$(checkbox "${platform}" "Semua")"
}

repo_mode_checkbox_line() {
  local repo_mode="$1"
  printf '%s New target monorepo  %s Existing repo migration  %s Prototype dulu' \
    "$(checkbox "${repo_mode}" "New target monorepo")" \
    "$(checkbox "${repo_mode}" "Existing repo migration")" \
    "$(checkbox "${repo_mode}" "Prototype dulu")"
}

backend_mode_checkbox_line() {
  local backend_mode="$1"
  printf '%s NestJS + Prisma + PostgreSQL  %s Supabase-first  %s Hybrid with migration plan' \
    "$(checkbox "${backend_mode}" "NestJS + Prisma + PostgreSQL")" \
    "$(checkbox "${backend_mode}" "Supabase-first")" \
    "$(checkbox "${backend_mode}" "Hybrid with migration plan")"
}

roadmap_foundation_checkpoint() {
  local repo_mode="$1"
  if [[ "${repo_mode}" == "New target monorepo" ]]; then
    echo "pnpm install && turbo run lint typecheck build"
  elif [[ "${repo_mode}" == "Prototype dulu" ]]; then
    echo "pnpm install && pnpm lint && pnpm build"
  else
    echo "current repo scripts identified and migration gate approved"
  fi
}

api_phase_line() {
  local backend_mode="$1"
  if [[ "${backend_mode}" == "Supabase-first" ]]; then
    echo "Define Supabase schema/RLS/functions/storage rules and generate typed client/contracts."
  elif [[ "${backend_mode}" == "Hybrid with migration plan" ]]; then
    echo "Define migration boundary between Supabase legacy data and NestJS/Prisma target APIs."
  else
    echo "Design Prisma schema, migrations, NestJS modules, Zod DTOs, envelope, and OpenAPI contracts."
  fi
}

generate_intake() {
  echo "Simple Project Intake Generator"
  echo "-------------------------------"

  local project_name
  local project_slug
  local one_liner
  local target_users
  local problem
  local current_condition
  local desired_outcome
  local platform
  local must_have_features
  local user_roles
  local important_data
  local integrations
  local target_launch
  local top_priority
  local later_features
  local existing_app
  local stack_preference
  local deadline
  local hosting_preference
  local main_flow
  local confusion

  project_name="$(prompt "Nama project")"
  project_slug="$(slugify "${project_name}")"
  one_liner="$(prompt "Deskripsi 1 kalimat")"
  target_users="$(prompt "Target user")"
  problem="$(prompt "Masalah utama")"
  current_condition="$(prompt_optional "Kondisi sekarang" "manual/spreadsheet/app lama/belum ada")"
  desired_outcome="$(prompt "Hasil yang diinginkan")"
  platform="$(prompt_optional "Platform yang diinginkan" "Web, Mobile, API/Admin, atau belum tahu")"
  must_have_features="$(prompt "Fitur wajib, comma-separated")"
  user_roles="$(prompt_optional "Jenis user/role" "customer, admin")"
  important_data="$(prompt_optional "Data penting yang disimpan, comma-separated" "user, produk, aktivitas")"
  integrations="$(prompt_optional "Integrasi pihak ketiga" "email, upload file, analytics")"
  target_launch="$(prompt_optional "Target awal" "MVP")"
  top_priority="$(prompt_optional "Top 3 yang wajib jadi dulu" "${must_have_features}")"
  later_features="$(prompt_optional "Fitur yang boleh nanti" "analytics, notification, advanced admin")"
  existing_app="$(prompt_optional "Ada repo/app lama?" "Belum tahu")"
  stack_preference="$(prompt_optional "Stack wajib/preferensi" "Ikuti rekomendasi AI")"
  deadline="$(prompt_optional "Deadline" "Belum ditentukan")"
  hosting_preference="$(prompt_optional "Hosting preference" "Belum tahu")"
  main_flow="$(prompt_optional "Contoh alur user utama" "User login -> melakukan aksi utama -> melihat hasil")"
  confusion="$(prompt_optional "Hal yang masih bingung" "Belum tahu bagian teknis yang dibutuhkan")"

  local project_dir="${OUTPUT_DIR}/${project_slug}"
  local intake_file="${project_dir}/PROJECT_INTAKE.md"
  local prompt_file="${project_dir}/PROMPT_TO_BLUEPRINT.md"

  mkdir -p "${project_dir}"

  local feature_checklist
  local data_checklist
  feature_checklist="$(split_csv_to_checklist "${must_have_features}" "Fitur wajib")"
  data_checklist="$(split_csv_to_checklist "${important_data}" "Data penting")"

  cat > "${intake_file}" <<EOF
# ${project_name} - Simple Project Intake

⚠️ **Tujuan dokumen ini:** Form ringan untuk orang non-teknis / founder / PM / engineer yang belum mau mikir detail arsitektur. Isi bagian yang kamu tahu saja. AI wajib mengubah intake ini menjadi \`AI_PROJECT_BLUEPRINT_TEMPLATE.md\` dan \`ROADMAP.md\`.

## 1. PROJECT BASIC
- **Nama Project:** ${project_name}
- **Deskripsi 1 Kalimat:** ${one_liner}
- **Target User:** ${target_users}
- **Platform yang Diinginkan:** ${platform}

## 2. MASALAH & TUJUAN
- **Masalah Utama:** ${problem}
- **Kondisi Sekarang:** ${current_condition}
- **Hasil yang Diinginkan:** ${desired_outcome}

## 3. FITUR WAJIB VERSI AWAM
${feature_checklist}

## 4. USER & HAK AKSES
- **Jenis User:** ${user_roles}
- **Siapa yang boleh melihat data apa:** Assumption needed. AI harus turunkan permission matrix dari jenis user dan fitur.

## 5. DATA YANG DISIMPAN
${data_checklist}

## 6. INTEGRASI / PIHAK KETIGA
- **Kebutuhan Integrasi:** ${integrations}
- **Butuh Payment?** Belum tahu
- **Butuh Email/WhatsApp/Notification?** Belum tahu
- **Butuh Upload File/Gambar?** Belum tahu
- **Butuh API eksternal lain?** Belum tahu

## 7. PRIORITAS LAUNCH
- **Target Awal:** ${target_launch}
- **Yang paling wajib jadi dulu:** ${top_priority}
- **Yang boleh nanti:** ${later_features}

## 8. BATASAN & PREFERENSI
- **Ada repo/app lama?** ${existing_app}
- **Ada stack wajib?** ${stack_preference}
- **Ada deadline?** ${deadline}
- **Ada budget/hosting preference?** ${hosting_preference}

## 9. CONTOH ALUR USER
### Alur 1: Main Flow
1. ${main_flow}
2. AI wajib memecah alur ini menjadi journey yang lebih detail.
3. AI wajib menentukan loading, empty, error, success, dan permission/offline state jika relevan.

## 10. HAL YANG MASIH BINGUNG
- ${confusion}

---

## INSTRUKSI UNTUK AI
Setelah membaca intake ini:
1. Jangan langsung coding.
2. Jika informasi kurang, maksimal tanya 5 pertanyaan klarifikasi yang paling penting.
3. Jika masih bisa diinfer dengan aman, lanjutkan tanpa bertanya.
4. Ubah intake ini menjadi \`AI_PROJECT_BLUEPRINT_TEMPLATE.md\` yang production-ready.
5. Buat \`ROADMAP.md\` phase-by-phase.
6. Tandai bagian yang merupakan asumsi AI dengan label \`Assumption\`.
EOF

  cat > "${prompt_file}" <<EOF
# Prompt To Generate Project Blueprint

Tolong baca \`PROJECT_INTAKE.md\`.

Ubah intake awam itu menjadi \`PROJECT_BLUEPRINT.md\` yang mengikuti:
- \`prod-guide-versiku/AI_PROJECT_BLUEPRINT_TEMPLATE.md\`
- \`prod-guide-versiku/AI_CONTEXT.md\`

Lalu generate \`ROADMAP.md\` yang mengikuti:
- \`prod-guide-versiku/AI_RULES_ROADMAP.md\`

PENTING:
- Jangan coding dulu.
- Kalau ada informasi kurang, maksimal tanya 5 pertanyaan klarifikasi paling penting.
- Kalau bisa diinfer dengan aman, lanjutkan dan tandai sebagai \`Assumption\`.
- Jelaskan backend mode, repo mode, data model, API contract, UI/UX, testing risk, deployment, rollback, dan open questions.
EOF

  echo
  echo "Generated:"
  echo "  ${intake_file}"
  echo "  ${prompt_file}"
  echo
  echo "Next:"
  echo "  1. Review PROJECT_INTAKE.md"
  echo "  2. Give PROMPT_TO_BLUEPRINT.md to AI"
  echo "  3. AI generates PROJECT_BLUEPRINT.md and ROADMAP.md"
}

if [[ "${MODE}" == "intake" ]]; then
  generate_intake
  exit 0
fi

echo "Production Project Blueprint Generator"
echo "--------------------------------------"

PROJECT_NAME="$(prompt "Project name")"
PROJECT_SLUG="$(slugify "${PROJECT_NAME}")"
ONE_LINER="$(prompt "One-liner")"
PROBLEM="$(prompt "Problem solved")"
SOLUTION="$(prompt "Main solution")"
TARGET_LAUNCH="$(choose "Target launch" "MVP" "Beta" "Production v1")"
PLATFORM="$(choose "Primary platform" "Web" "Mobile" "API" "Semua")"
REPO_MODE="$(choose "Repo mode" "New target monorepo" "Existing repo migration" "Prototype dulu")"
BACKEND_MODE="$(choose "Backend mode" "NestJS + Prisma + PostgreSQL" "Supabase-first" "Hybrid with migration plan")"
BUSINESS_GOAL="$(prompt "Business goal")"
PRIMARY_USERS="$(prompt "Primary users")"
SECONDARY_USERS="$(prompt_optional "Secondary users" "Admin, ops, support")"
MVP_FEATURES="$(prompt "MVP features, comma-separated")"
POST_MVP_FEATURES="$(prompt_optional "Post-MVP features, comma-separated" "Analytics, notifications, advanced admin controls")"
NON_GOALS="$(prompt_optional "Non-goals, comma-separated" "Payments, multi-region deployment, advanced analytics")"
DESIGN_DIRECTION="$(prompt_optional "Design direction" "Operational dashboard with focused mobile flows")"
EXTERNAL_SERVICES="$(prompt_optional "External services" "Email, object storage, analytics")"
RISK_LEVEL="$(choose "Testing risk level" "Low" "Medium" "High")"
WEB_TARGET="$(prompt_optional "Web deploy target" "Vercel")"
API_TARGET="$(prompt_optional "API deploy target" "Cloud Run")"

PROJECT_DIR="${OUTPUT_DIR}/${PROJECT_SLUG}"
BLUEPRINT_FILE="${PROJECT_DIR}/PROJECT_BLUEPRINT.md"
ROADMAP_FILE="${PROJECT_DIR}/ROADMAP.md"

mkdir -p "${PROJECT_DIR}"

MVP_CHECKLIST="$(split_csv_to_checklist "${MVP_FEATURES}" "Define MVP feature")"
FEATURE_SPEC_CHECKLIST="$(split_csv_to_feature_specs "${MVP_FEATURES}")"
POST_MVP_CHECKLIST="$(split_csv_to_checklist "${POST_MVP_FEATURES}" "Define post-MVP feature")"
NON_GOALS_CHECKLIST="$(split_csv_to_checklist "${NON_GOALS}" "Define non-goal")"
FEATURE_ROWS="$(split_csv_to_rows "${MVP_FEATURES}" "${PLATFORM}")"
PLATFORM_LINE="$(platform_checkbox_line "${PLATFORM}")"
REPO_MODE_LINE="$(repo_mode_checkbox_line "${REPO_MODE}")"
BACKEND_MODE_LINE="$(backend_mode_checkbox_line "${BACKEND_MODE}")"
FOUNDATION_CHECKPOINT="$(roadmap_foundation_checkpoint "${REPO_MODE}")"
API_PHASE="$(api_phase_line "${BACKEND_MODE}")"

cat > "${BLUEPRINT_FILE}" <<EOF
# ${PROJECT_NAME} - Production Project Blueprint

⚠️ **Instruksi untuk AI:** Gunakan dokumen ini sebelum membuat repo/project baru atau melakukan migrasi besar. Dokumen ini adalah level project, bukan level fitur. Setelah blueprint ini disetujui, baru pecah menjadi roadmap dan \`AI_FEATURE_TEMPLATE.md\` per fitur.

## 1. EXECUTIVE SUMMARY
- **Nama Project:** ${PROJECT_NAME}
- **One-liner:** ${ONE_LINER}
- **Masalah yang Diselesaikan:** ${PROBLEM}
- **Solusi Utama:** ${SOLUTION}
- **Target Launch:** ${TARGET_LAUNCH}
- **Primary Platform:** ${PLATFORM_LINE}
- **Repo Mode:** ${REPO_MODE_LINE}

## 2. BUSINESS CONTEXT & GOALS
- **Business Goal:** ${BUSINESS_GOAL}
- **Primary Users:** ${PRIMARY_USERS}
- **Secondary Users:** ${SECONDARY_USERS}
- **Success Metrics:**
  - Activation rate target defined before build.
  - Critical path success rate > 95%.
  - p95 API latency < 500ms for core endpoints.
- **Non-goals:**
${NON_GOALS_CHECKLIST}

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
${MVP_CHECKLIST}

### Post-MVP Scope
${POST_MVP_CHECKLIST}

### Out of Scope
${NON_GOALS_CHECKLIST}

## 5. HIGH-LEVEL FEATURE MAP
| Module | Description | Platform | Priority | Data Sensitivity |
|---|---|---|---|---|
| Auth | Login, refresh token, session management | ${PLATFORM}/API | P0 | User-specific |
${FEATURE_ROWS}

## 6. ARCHITECTURE DECISIONS
- **Architecture Target:** ${REPO_MODE}
- **Backend Mode:** ${BACKEND_MODE_LINE}
- **Web Stack:** Next.js 16.x, React 19.x, Tailwind 4.x if Web is in scope.
- **Mobile Stack:** Expo SDK 55.x, React Native, Expo Router if Mobile is in scope.
- **Shared Packages Needed:**
  - [x] \`packages/api-contracts\`
  - [x] \`packages/ui\`
  - [x] \`packages/validation\`
  - [x] \`packages/env\`
  - [x] \`packages/tsconfig\`
  - [x] \`packages/eslint\`
- **External Services:** ${EXTERNAL_SERVICES}
- **Architecture Decision Notes:** Follow target guardrails. If repo mode is migration/prototype, AI must create a migration gate before structural changes.

## 7. TARGET REPOSITORY STRUCTURE
\`\`\`txt
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
\`\`\`

## 8. DOMAIN MODEL / DATA BLUEPRINT
| Entity | Purpose | Key Fields | Relations | Notes |
|---|---|---|---|---|
| User | Account identity | id, email, role, created_at | has many sessions/audit events | PII |
| AuditEvent | Track sensitive actions | id, actor_id, action, target_id, created_at | belongs to user | Required for production ops |
| CoreRecord | Main business object | id, status, owner_id, created_at, updated_at | belongs to user | Replace with project-specific entity |

### Data Rules
- **ID Strategy:** UUID.
- **Naming:** DB \`snake_case\`, Prisma model may use camelCase with \`@map\`.
- **Soft Delete:** Yes for user-owned business records where recovery/audit matters.
- **Audit Trail:** Auth, admin actions, ownership changes, payment-sensitive or data-sensitive actions.
- **Indexes Required:** All columns used in \`where\`, \`order by\`, joins, and unique business identifiers.
- **Migration Strategy:** Expand/contract, no destructive migration in one release.

## 9. API & CONTRACT BLUEPRINT
- **API Style:** REST + OpenAPI envelope.
- **Base URL:** \`/api/v1\`
- **Response Envelope:** \`{ success, data, meta, error }\`
- **Auth Scheme:** JWT RS256 or approved auth provider based on backend mode.

| Method | Endpoint | Purpose | Auth | Cache Policy |
|---|---|---|---|---|
| POST | \`/api/v1/auth/login\` | Login user | Public | no-store |
| GET | \`/api/v1/me\` | Current user profile | Required | no-store |
| GET | \`/api/v1/health\` | Health check | Public | no-store |
| GET | \`/api/v1/core-records\` | List core records | Required | no-store |
| POST | \`/api/v1/core-records\` | Create core record | Required | no-store |

### Validation Rules
- Zod is source of truth at request boundary.
- Unknown input stripped or rejected according to endpoint risk.
- Error format must use standard envelope and stable error codes.

## 10. UI/UX BLUEPRINT
- **Design Direction:** ${DESIGN_DIRECTION}
- **Design System Status:** [ ] Existing  [x] Need bootstrap  [ ] Use target \`packages/ui\`
- **Core Screens:**
  - Login/Auth - Account access - Web/Mobile
  - Main Workflow - Primary user outcome - ${PLATFORM}
  - Dashboard - Operational overview - Web
- **Required States:** Initial, loading, empty, error, success, offline if mobile.
- **Accessibility Requirements:** Keyboard navigation, semantic roles, focus-visible, contrast 4.5:1.
- **Responsive Requirements:** Mobile-first for consumer flows, dense but readable layout for operational dashboard.

## 11. SECURITY, PRIVACY & PERMISSIONS
- **Roles:** Guest, User, Admin.
- **Permission Matrix:**
| Action | Guest | User | Admin | Notes |
|---|---:|---:|---:|---|
| View public data | ✅ | ✅ | ✅ | Public |
| Manage own data | ❌ | ✅ | ✅ | Owner or admin |
| Manage users | ❌ | ❌ | ✅ | Admin-only |
| View audit logs | ❌ | ❌ | ✅ | Admin-only |

- **Sensitive Data:** User identity, operational records, audit logs.
- **Secrets Strategy:** Runtime env via secret manager. No secret in source code.
- **Rate Limit:** Default 100 req/min/IP, auth 10 req/min, stricter for sensitive mutations.
- **Threat Notes:** Unauthorized access, ID enumeration, replay, data leakage, weak auditability.

## 12. PERFORMANCE, RELIABILITY & OFFLINE
- **API Latency Target:** p95 < 500ms for core endpoints.
- **Frontend Performance Target:** Fast first load for public/auth pages; dashboard optimized for scan/read efficiency.
- **Database Query Rule:** EXPLAIN ANALYZE if query >100ms.
- **Caching Strategy:** Public data \`force-cache/revalidate\`, private data \`no-store\`, Redis hot-read if needed.
- **Offline Strategy:** None by default; mobile mutation queue only if MVP requires it.
- **Retry Policy:** Max 2 retries after initial request with exponential backoff.

## 13. OBSERVABILITY & OPERATIONS
- **Logging:** JSON logs with traceId, userId, module, duration_ms.
- **Tracing:** OpenTelemetry HTTP/DB/cache.
- **Error Tracking:** Sentry or approved equivalent.
- **Health Checks:** \`/health\` and \`/ready\`.
- **Dashboards/Alerts:** API error rate, latency, queue failures, DB connections, frontend errors, mobile crash rate if mobile exists.

## 14. TESTING STRATEGY
- **Risk Level:** ${RISK_LEVEL}
- **Unit Tests:** Core services, validation schemas, hooks/components for core flows.
- **Integration Tests:** API endpoints, DB access, auth/session, external service mocks.
- **E2E Critical Paths:**
  - Login -> perform main workflow -> confirm success state.
  - Admin login -> inspect dashboard -> perform approved admin action.
- **Manual Verification:** Browser/device/provider checks for platform-specific behavior.
- **Test Data:** Idempotent seed data and fake accounts per role.

## 15. DEPLOYMENT & ENVIRONMENTS
- **Environments:** development, preview/staging, production.
- **Web Target:** ${WEB_TARGET}
- **API Target:** ${API_TARGET}
- **Mobile Target:** EAS Build + preview/production channels if Mobile is in scope.
- **Database:** PostgreSQL with SSL in production.
- **Secrets:** Vercel/GCP/AWS secret manager or approved equivalent.
- **Migration Plan:** \`migrate deploy\` in CI/CD, expand/contract for risky changes.
- **Rollback Plan:** Feature flag for risky features, previous image/deployment, migration recovery note.

## 16. PROJECT ROADMAP
See \`ROADMAP.md\` generated next to this blueprint.

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
1. Buat roadmap detail mengikuti \`AI_RULES_ROADMAP.md\`.
2. Pecah setiap P0/P1 feature menjadi dokumen \`AI_FEATURE_TEMPLATE.md\`.
3. Jangan menulis kode sebelum roadmap fase pertama disetujui user.
4. Jika ada gap antara repo existing dan target architecture, buat migration plan dulu.
EOF

cat > "${ROADMAP_FILE}" <<EOF
# ${PROJECT_NAME} - Project Roadmap

Generated from \`PROJECT_BLUEPRINT.md\`.

## Roadmap Type
- **Type:** Project Blueprint Roadmap
- **Repo Mode:** ${REPO_MODE}
- **Backend Mode:** ${BACKEND_MODE}
- **Primary Platform:** ${PLATFORM}
- **Testing Risk:** ${RISK_LEVEL}

## Phase 0: Discovery & Blueprint Lock
- [ ] Review and approve project scope, non-goals, success metrics.
- [ ] Confirm repo mode: ${REPO_MODE}.
- [ ] Confirm backend mode: ${BACKEND_MODE}.
- [ ] Confirm platform scope: ${PLATFORM}.
- [ ] Checkpoint: Blueprint approved by product/engineering owner.

## Phase 1: Foundation / Repository Bootstrap
- [ ] Initialize or inspect repository according to repo mode.
- [ ] Setup package manager, TypeScript strict mode, ESLint, env validation, and workspace boundaries.
- [ ] Setup base CI commands for lint, typecheck, test, and build.
- [ ] Define initial \`packages/api-contracts\`, \`packages/validation\`, \`packages/env\`, and \`packages/ui\` plan.
- [ ] Checkpoint: \`${FOUNDATION_CHECKPOINT}\`.

## Phase 2: Data & API Foundation
- [ ] ${API_PHASE}
- [ ] Define response envelope, stable error codes, auth/session baseline, and rate limits.
- [ ] Define initial domain entities: User, AuditEvent, CoreRecord, and project-specific entities.
- [ ] Generate or document API contracts.
- [ ] Checkpoint: API contract reviewed and backend foundation tests pass.

## Phase 3: Design System & Client Foundation
- [ ] Bootstrap design tokens from product direction: ${DESIGN_DIRECTION}.
- [ ] Create foundation components: Button, Input, Card, Modal, Badge, Skeleton.
- [ ] Setup Web shell if Web is in scope.
- [ ] Setup Mobile shell if Mobile is in scope.
- [ ] Setup API client and React Query conventions.
- [ ] Checkpoint: client shell builds and basic navigation works.

## Phase 4: MVP Feature Implementation
${MVP_CHECKLIST}
- [ ] For each P0/P1 feature, create a dedicated \`AI_FEATURE_TEMPLATE.md\` spec before coding.
- [ ] Implement each feature one phase at a time using \`AI_RULES_ROADMAP.md\`.
- [ ] Checkpoint: MVP critical paths pass tests/manual verification.

## Phase 5: Production Hardening
- [ ] Add observability: structured logs, Sentry, OpenTelemetry, health/readiness.
- [ ] Add security pass: permission matrix, rate limit, secret review, audit logs.
- [ ] Performance pass for slow DB queries and key screens.
- [ ] Setup staging/prod deploy pipeline and rollback procedure.
- [ ] Checkpoint: production readiness checklist approved.

## Required Follow-up Specs
${FEATURE_SPEC_CHECKLIST}

## Execution Rule
Do not write application code until Phase 0 is approved and Phase 1 execution is explicitly requested.
EOF

echo
echo "Generated:"
echo "  ${BLUEPRINT_FILE}"
echo "  ${ROADMAP_FILE}"
echo
echo "Next:"
echo "  1. Review PROJECT_BLUEPRINT.md"
echo "  2. Approve or edit Open Questions"
echo "  3. Execute ROADMAP.md phase by phase"
