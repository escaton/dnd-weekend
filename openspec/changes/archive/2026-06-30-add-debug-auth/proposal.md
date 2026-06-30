## Why

Testing the app end-to-end currently requires a manual Google OAuth flow — clicking "Sign in with Google", completing the redirect, and getting back a session. This makes automated testing and quick debugging painful. We need a way for an agent (browser automation or test script) to authenticate with email/password directly, without the Google OAuth redirect, and without any visible UI changes.

## What Changes

- Add an invisible email/password sign-in method using Supabase Auth's native email/password provider
- Expose a `window.__debugLogin(email, password)` method on the window object that calls `supabase.auth.signInWithPassword()` and navigates to the app
- The method SHALL be invisible in the UI — no buttons, no form, no visible elements
- The method SHALL be available in all environments (test, prod, local) — no environment gating
- Supabase Auth must have the email/password provider enabled
- Debug users are pre-created in Supabase Auth; credentials are stored openly in the spec (not secrets) since this is a personal project with no sensitive data at risk

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-auth`: Adds an invisible email/password login method exposed on `window` for debugging and automated testing, bypassing Google OAuth in non-production environments

## Impact

- **Client code**: `apps/web/src/lib/supabase.ts` or a new debug module — expose `window.__debugLogin`
- **Supabase config**: Enable email/password provider in test Supabase project (already enabled by default in most Supabase projects)
- **No server changes**: JWT verification via JWKS works identically for email/password and Google OAuth tokens — Supabase issues the same type of JWT regardless of auth method
- **No UI changes**: Sign-in page remains unchanged; the debug method is invisible
- **Security**: Method is available in all environments; debug credentials are stored openly in the spec (personal project, no sensitive data at risk)
