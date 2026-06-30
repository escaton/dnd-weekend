## Context

The app currently only supports Google OAuth sign-in, which requires a full OAuth redirect flow. This makes automated browser testing and manual debugging painful — you can't just "log in as a test user" without clicking through Google's consent screen. Supabase Auth natively supports email/password authentication alongside OAuth, and the JWT issued is identical regardless of auth method. This means we can add an invisible email/password login path without any server-side changes.

## Goals / Non-Goals

**Goals:**
- Expose `window.__debugLogin(email, password)` that signs in via `supabase.auth.signInWithPassword()` and navigates to `/characters`
- Work in all environments (local, test, prod)
- Keep it invisible — no UI changes, no buttons, no form elements

**Non-Goals:**
- Self-registration UI for debug users — users are pre-created in Supabase dashboard
- Environment gating — available everywhere, debug credentials are open in the spec
- Server-side changes — JWT verification works identically for email/password tokens

## Decisions

### 1. Expose debug login on window object

**Choice**: A small module (`apps/web/src/lib/debug-auth.ts`) exports a function that calls `supabase.auth.signInWithPassword()` and navigates to `/characters` on success. This function is attached to `window.__debugLogin` at app startup in `main.tsx`.

**Rationale**: Simplest approach — browser automation tools (Playwright, agent-browser) can call `window.__debugLogin(email, pass)` directly via `page.evaluate()`. No UI, no routing changes, no new endpoints.

### 2. Supabase email/password provider

**Choice**: Enable the built-in email/password provider in Supabase Auth (it's enabled by default in most projects). Pre-create debug users manually in the Supabase dashboard.

**Rationale**: Zero code changes — Supabase Auth handles email/password natively. The JWT issued is the same format as Google OAuth JWT, so the server's JWKS verification works without modification.

### 3. Debug credentials stored in spec

**Choice**: Debug user email and password are documented openly in the spec. No secrets management.

**Rationale**: Personal project, no sensitive user data, credentials are for a test-only account. Keeping them in the spec makes them easy to share and update. Placeholder for now — user will provide actual credentials after creating the user in Supabase.

## Risks / Trade-offs

- **Debug login in prod** → anyone with the credentials can log in. Acceptable for a personal DnD tool with no sensitive data. The debug account has the same privileges as any Google user — it can create and manage characters.
- **Credentials in spec** → visible to anyone with repo access. Acceptable — the repo is private and the credentials are for a throwaway test account.
