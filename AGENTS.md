# AGENTS.md

## Workflow

This project uses [OpenSpec](https://github.com/OpenSpec-dev/openspec) for spec-driven changes. Before making non-trivial changes, check for an existing change or propose a new one (see the openspec skills: `openspec-propose`, `openspec-apply-change`, `openspec-explore`).

## Verification

Before declaring work done, run:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
```

## Testing against Supabase

Use the existing debug user — do **not** create temporary users in Supabase Auth.

- Email: `debug@dnd-weekend.local`
- Password: `111111`
- These credentials are documented openly in `openspec/specs/user-auth/spec.md`

If you need anything from the Supabase dashboard (connection strings, API keys, pooler config, enabling features, etc.), **do not attempt to do it yourself**. Ask the user and guide them on exactly what to do and where to find it.

### App testing

For end-to-end testing, use the `agent-browser` skill. The app exposes a hidden login method — call `window.__debugLogin("debug@dnd-weekend.local", "111111")` from the browser console to sign in via Supabase email/password auth and navigate to `/characters`. This avoids clicking through the Google OAuth flow.

`__debugLogin` returns the JWT access token, so you can grab it from the browser and reuse it with curl:

```js
// In the browser console (or via agent-browser):
const token = await window.__debugLogin("debug@dnd-weekend.local", "111111");
console.log(token); // use with curl -H "Authorization: Bearer <token>"
```

Local dev credentials and connection strings live in the gitignored `.env` (see `.env.example` for the full list). Never commit secrets.
