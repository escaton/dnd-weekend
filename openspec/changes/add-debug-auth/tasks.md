## 1. Debug auth module

- [x] 1.1 Create `apps/web/src/lib/debug-auth.ts` — exports `debugLogin(email, password)` that calls `supabase.auth.signInWithPassword()` and returns the result
- [x] 1.2 In `apps/web/src/main.tsx`, attach `debugLogin` to `window.__debugLogin` at app startup
- [x] 1.3 Add TypeScript declaration for `window.__debugLogin` (extend `Window` interface)
- [x] 1.4 Verify no UI changes on sign-in page — debug login is invisible

## 2. Supabase email/password provider

- [x] 2.1 Verify email/password provider is enabled in test Supabase project (Authentication → Sign In / Providers → Email)
- [x] 2.2 Verify email/password provider is enabled in prod Supabase project
- [x] 2.3 Create a debug user in test Supabase project (Authentication → Users → Add user)
- [x] 2.4 Create a debug user in prod Supabase project (Authentication → Users → Add user)
- [x] 2.5 Document debug user credentials in the spec (email + password, open in the repo)

## 3. Verify

- [x] 3.1 Verify `window.__debugLogin(email, password)` works in local dev — signs in and navigates to `/characters`
- [ ] 3.2 Verify debug login works on test env (https://dnd-weekend-test.fly.dev)
- [x] 3.3 Verify tRPC calls succeed after debug login (character.list returns 200)
- [ ] 3.4 Verify Google OAuth still works alongside debug login
