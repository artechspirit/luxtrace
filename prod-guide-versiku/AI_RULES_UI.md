⚠️ Extends root AI_CONTEXT.md. Design System & Theme execution rules.

## 1. DESIGN TOKENS (SINGLE SOURCE)
- File: `packages/ui/tokens/design-tokens.json`
- Struktur: `colors`, `typography`, `spacing`, `radii`, `shadows`, `breakpoints`, `zIndex`
- 🚫 DILARANG hardcode `#hex`/`rgb`/px di komponen. SELALU pakai token via utility class.
- Sync: Token → `tailwind.config.ts` (Web) & `nativewind.config.ts` (Mobile) via `pnpm run sync:ui-tokens`. Jalankan sebelum commit.

## 2. COMPONENT ARCHITECTURE
- Primitives: Unstyled, accessible (`@radix-ui/react-*` Web, `react-native-*` Mobile). No theme coupling.
- Foundation: Token-aware (`Button`, `Input`, `Card`, `Modal`, `Badge`, `Skeleton`).
- Exports: Conditional `package.json`: `"web": "./src/web/index.ts"`, `"mobile": "./src/mobile/index.ts"`, `"default": "./src/shared/index.ts"`
- 🚫 DILARANG: Buat komponen UI baru tanpa cek `packages/ui/` dulu. Extends, jangan fork.

## 3. THEME & DARK MODE
- Web: `next-themes` + `class="dark"`. Default: system preference.
- Mobile: `nativewind` + `useColorScheme()` + `ThemeProvider`. Sync OS.
- Override: Hanya via token `variants: { light: {...}, dark: {...} }`. 🚫 No inline theme object.
- Contrast: Min 4.5:1 text. Validasi CI via `axe-core` / `react-native-a11y`.

## 4. RESPONSIVE & LAYOUT
- Web: Mobile-first. `sm: 640, md: 768, lg: 1024, xl: 1280`. `grid`/`flex` + token spacing.
- Mobile: SafeArea root. `ScrollView`/`FlatList` padding via token. 🚫 No fixed px width.
- 🚫 Media query manual. Gunakan Tailwind utility (`md:flex-row`).

## 5. ACCESSIBILITY & INTERACTION
- Focus: `focus-visible:ring-2 focus-visible:ring-offset-2`. Keyboard navigable.
- Roles: Semantic HTML (`<nav>`, `<button>`) & RN `accessibilityRole`/`aria-*`.
- Loading: `Skeleton` / `aria-busy="true"` sebelum data ready.
- Error: `role="alert"`, `aria-describedby`, envelope `code + message` konsisten.

## 🚫 ANTI-PATTERNS
- Hardcode warna/spacing → GANTI `bg-brand-500`, `m-3`
- Inline `style={{}}` → GANTI utility class
- Custom lib tanpa token → REJECT
- Skip focus/keyboard → ADD `focus-visible` & `:active`
- Mobile hover → GANTI `active:` / `pressOpacity`
- Import UI dari apps → GANTI `@repo/ui`

## ✅ CHECKLIST
- [ ] Warna/spacing/radius pakai token
- [ ] Dark mode variant present
- [ ] Focus & hover/active defined
- [ ] Semantic tags + a11y roles
- [ ] Responsive via breakpoint utilities
- [ ] Imported `@repo/ui`, bukan buat baru
- [ ] `sync:ui-tokens` clean diff