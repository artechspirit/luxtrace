⚠️ Extends root AI_CONTEXT.md. Next.js App Router execution rules.

## PATTERNS
- Default: Server Components. `'use client'` HANYA untuk state/event/browser API.
- Fetching: `fetch()` di server jika cocok. Public/static data → `force-cache`/`revalidate`. User-specific/auth/dashboard/payment/ownership data → `no-store` default.
- AI WAJIB menulis alasan caching per fetch yang menyentuh data penting.
- Routing: Group `(auth)`, `(dashboard)`. Wajib `loading.tsx`, `error.tsx`, `not-found.tsx`. Wajib pakai `<Suspense>` untuk streaming data agar FCP lebih cepat.
- Mutations: Server Actions (`"use server"`). Zod validasi di awal. Return standard envelope.
- Styling: Tailwind only. Conditional: `clsx` + `tailwind-merge`. 🚫 No CSS Modules / inline `style={}`.
- Auth: `httpOnly` cookies via `cookies()`/`next-auth`. 🚫 No localStorage.

## 🚫 ANTI-PATTERNS
- `useEffect` data fetch → GANTI Server Component / React Query
- `force-cache` untuk dashboard/auth/payment/private data → GANTI `no-store` atau revalidation policy yang jelas
- `window`/`document` di server → PINDAH ke client + guard
- Global state untuk remote data → GANTI React Query
- `any` di props/hooks → WAJIB interface/generics
- Direct import `apps/api` → GANTI `@repo/api-contracts` + fetch jika monorepo. Untuk repo non-monorepo, pakai API client/contract lokal yang disepakati.

## ✅ CHECKLIST
- [ ] Server/Client boundary jelas
- [ ] Fetch cache policy match data sensitivity
- [ ] Error/Loading boundaries present
- [ ] Tailwind + clsx only
- [ ] Types from `@repo/api-contracts` or approved local contract
- [ ] No console.log / any / direct API import
