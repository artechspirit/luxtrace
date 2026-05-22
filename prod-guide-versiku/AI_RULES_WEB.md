⚠️ Extends root AI_CONTEXT.md. Next.js terbaru execution rules.

## PATTERNS
- Default: Server Components. `'use client'` HANYA untuk state/event/browser API.
- Fetching: `fetch()` di server. `cache: 'force-cache'` default. Gunakan `revalidate` atau `no-store` eksplisit.
- Routing: Group `(auth)`, `(dashboard)`. Wajib `loading.tsx`, `error.tsx`, `not-found.tsx`. Wajib pakai `<Suspense>` untuk streaming data agar FCP lebih cepat.
- Mutations: Server Actions (`"use server"`). Zod validasi di awal. Return standard envelope.
- Styling: Tailwind only. Conditional: `clsx` + `tailwind-merge`. 🚫 No CSS Modules / inline `style={}`.
- Auth: `httpOnly` cookies via `cookies()`/`next-auth`. 🚫 No localStorage.

## 🚫 ANTI-PATTERNS
- `useEffect` data fetch → GANTI Server Component / React Query
- `window`/`document` di server → PINDAH ke client + guard
- Global state untuk remote data → GANTI React Query
- `any` di props/hooks → WAJIB interface/generics
- Direct import `apps/api` → GANTI `@repo/api-contracts` + fetch

## ✅ CHECKLIST
- [ ] Server/Client boundary jelas
- [ ] Fetch pattern match scope
- [ ] Error/Loading boundaries present
- [ ] Tailwind + clsx only
- [ ] Types from `@repo/api-contracts`
- [ ] No console.log / any / direct API import