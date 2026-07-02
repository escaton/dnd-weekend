## 1. Backend: `room.get` membership-status lookup

- [x] 1.1 In `packages/api/src/routers/room.ts`, replace the `requireActiveMember(input.id, ctx.user.id, ctx.db)` call inside `room.get` with a membership-status lookup that queries `room_members` for the room where `(userId = ctx.user.id OR email = ctx.user.email) AND deletedAt IS NULL`, returning the row(s) so `status` can be inspected.
- [x] 1.2 When an **active** membership row exists, return the existing full payload with an added `viewerStatus: "active"` field (room id, title, gameMasterId, members).
- [x] 1.3 When only a **pending** membership row exists (email matches, `status=pending`), return `{ viewerStatus: "pending", id, title }` — query the `rooms` row for id/title only; do not return the member list.
- [x] 1.4 When **no** membership row matches (neither userId nor email), throw `TRPCError({ code: "FORBIDDEN" })`.
- [x] 1.5 Keep the existing `NOT_FOUND` throw when the `rooms` row itself is soft-deleted/missing (check this before returning the active payload, and for pending return the title from the same lookup or throw `NOT_FOUND` if the room is gone).

## 2. Backend: shared lookup helper (optional refactor)

- [x] 2.1 If the membership-status query is reused, extract a helper `findMembership(roomId, userId, email, db)` returning the best matching `room_members` row (active preferred over pending) or `null`. Otherwise inline the logic in `room.get`.

## 3. Backend: tests

- [x] 3.1 Add a `packages/api/src/__tests__/room.test.ts` (or extend existing tests) covering `room.get`:
  - active member → `viewerStatus: "active"` with members.
  - pending invitee → `viewerStatus: "pending"` with id/title only, no members.
  - non-member → rejects with `FORBIDDEN`.
  - soft-deleted room → rejects with `NOT_FOUND` (or appropriate) for pending/active lookups.
- [x] 3.2 Ensure the mock `db` in tests supports the new query chain (the existing `select().from().where()` mock may need `orderBy`/`limit` stubs if the lookup uses them, or use an in-memory test db if one exists).

## 4. Frontend: route branching on `viewerStatus`

- [x] 4.1 In `apps/web/src/routes/rooms.$id.tsx`, pass `retry: false` to `useQuery(trpc.room.get.queryOptions({ id }))` so a `FORBIDDEN` renders on the first response (e.g. `trpc.room.get.queryOptions({ id }, { retry: false })` or a queryOptions override).
- [x] 4.2 Replace the `roomQuery.isError` join-screen branch: render the join screen when `roomQuery.data?.viewerStatus === "pending"` instead.
- [x] 4.3 Render the room view when `roomQuery.data?.viewerStatus === "active"` (existing render, now reading members from the active payload).
- [x] 4.4 Add a new forbidden-screen branch for `roomQuery.isError`: a full-page view (e.g. "You don't have access to this room") with a `<Link to="/rooms">Back to rooms</Link>` — no toast.
- [x] 4.5 Remove the old `toast.error` reliance for the forbidden case; keep `joinMutation.onError` toast only for join failures (expected to surface a toast when a non-member tries to join, though the forbidden screen should now prevent that path).

## 5. Verification

- [x] 5.1 Run `pnpm typecheck` — confirm the discriminated union return type of `room.get` typechecks in the route.
- [x] 5.2 Run `pnpm lint` and `pnpm format:check`.
- [x] 5.3 Run `pnpm test` — confirm new room tests pass and existing character tests still pass.
- [x] 5.4 Manual check via `agent-browser` with the debug users: (a) active member opens `/rooms/:id` → room view immediately; (b) pending invitee (debug2 invited by debug) opens link → join screen immediately, no 3× retry; (c) non-member (debug3, not invited) opens link → forbidden screen immediately, no join screen, no toast.
