# CI Migrations Research

## Problem

Database migrations fail in GitHub Actions because:

1. **Direct connection is IPv6-only** (free tier): `db.lxxstgzlmbziwdpkillo.supabase.co` resolves to AAAA only, no A record. GitHub Actions runners have no IPv6 outbound → `ENETUNREACH`.

2. **Supavisor pooler (IPv4) was returning "tenant/user not found"**: the pooler hostname region/zone was wrong. The project is on `aws-1-eu-central-1` (zone 1), not the default `aws-0-{region}` shown in docs examples. All `aws-0-*` hostnames return "tenant/user not found" because the project isn't registered there.

## Solution

Use the Supavisor session pooler (IPv4, port 5432) connection string for CI migrations:

```
postgresql://postgres.lxxstgzlmbziwdpkillo:[PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

Session mode (port 5432) is required for drizzle-kit migrations (not transaction mode / 6543, which doesn't support prepared statements).

Verified: `DATABASE_URL=<pooler-url> pnpm --filter @dnd-weekend/api exec tsx src/migrate.ts` → "Migrations applied successfully".

## Confirmation from community

GitHub discussion #20955 ("Github action: supabase link with ipv6 enabled issue") confirms the exact same problem: Supabase switched to IPv6-only direct connections (Jan 2024), GitHub Actions runners have no IPv6. The Supabase CLI (≥1.136.3) auto-routes through Supavisor, but for `drizzle-kit migrate` we must provide the pooler connection string manually. Our solution (pooler session mode, IPv4) is the correct approach.

## Action items

- [ ] Update GitHub secrets `DATABASE_URL_TEST` and `DATABASE_URL_PROD` to use the pooler connection strings (IPv4)
- [ ] Re-add migration step to deploy workflows
- [ ] Update spec/design to restore migrations as pre-deploy gate
