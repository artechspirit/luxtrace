⚠️ Extends root AI_CONTEXT.md. Expo SDK Terbaru / React Native execution rules.

## PATTERNS
- Navigation: Expo Router (file-based). Group `(tabs)`, `(auth)`, `(modals)`. `router.push`/`replace`.
- Primitives: `View`, `Text`, `Pressable`, `Image`, `FlashList`. 🚫 No `div`, `span`, `window`.
- Styling: `nativewind`/`react-native-css` + Tailwind scale. SafeArea via layout root.
- State: `@tanstack/react-query` API. `zustand` UI. `expo-secure-store`/`AsyncStorage` persist.
- Offline: Mutation queue + `@react-native-community/netinfo`. Sync on reconnect. Optimistic + rollback wajib.
- Native: Only Expo SDK / vetted `expo-*`/`react-native-*`. Wrap `Platform.OS`.

## 🚫 ANTI-PATTERNS
- Web DOM APIs (`window`, `localStorage`) → GANTI Expo equivalents
- Unoptimized lists (>20) → WAJIB `FlashList` + `keyExtractor`
- Heavy compute di render → PINDAH `useMemo`/`useCallback` / background
- Inline functions/styles di list → EKSTRAK `React.memo`
- Ignore SafeArea/Status bar → WAJIB handle root
- Direct import `apps/web`/`apps/api` → GANTI `@repo/api-contracts` + fetch

## ✅ CHECKLIST
- [ ] Expo Router structure match
- [ ] Only RN primitives
- [ ] Lists optimized + memoized
- [ ] Offline queue + sync logic (if mutation)
- [ ] SafeArea/Status bar handled
- [ ] Types from `@repo/api-contracts`
- [ ] No web APIs / direct imports