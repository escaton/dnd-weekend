## Context

The room detail route (`/rooms/:id`) calls `room.get` on mount. Today `room.get` invokes `requireActiveMember`, which throws `TRPCError({ code: "FORBIDDEN" })` for anyone without an **active** `room_members` row — that includes pending invitees (who are *supposed* to see the join screen) and non-members (who are not). TanStack Query retries failed queries 3× by default, so the user sees "Loading..." for ~9 seconds before the error branch renders. The route then treats **any** error as an invitation to join, so non-members also see the join screen and only learn they are forbidden after pressing "Join room" (which surfaces a toast).

We want:
- Pending invitee → join screen renders immediately (first response, no retries).
- Non-member → forbidden screen renders immediately (first response, no retries, not a toast).
- Active member → room view as today.

## Goals / Non-Goals

**Goals:**
- `room.get` returns a successful response for pending invitees so no retry/error path is triggered.
- `room.get` throws `FORBIDDEN` only for users with no `room_members` row at all.
- The route renders a dedicated forbidden screen (full page, not a toast) for non-members.
- The route disables retries for `room.get` so a `FORBIDDEN` renders on the first failure.

**Non-Goals:**
- Changing the join mutation behavior or invitation flow.
- Sending invitation emails.
- Adding a separate "room preview" endpoint (we extend `room.get` instead).

## Decisions

### Decision 1: Extend `room.get` to return a discriminated union on `viewerStatus`

Replace the `requireActiveMember` guard in `room.get` with a membership-status lookup that returns one of:

- `{ viewerStatus: "active", id, title, gameMasterId, members: [...] }` — full room data (current shape plus `viewerStatus`).
- `{ viewerStatus: "pending", id, title }` — minimal data sufficient for the join screen (the join screen needs the room id, which is already in the URL params, and the title for a heading).
- Throws `TRPCError({ code: "FORBIDDEN" })` — no `room_members` row matches the user (by `userId` or `email`).

The lookup queries `room_members` for the room where `(userId = ctx.user.id OR email = ctx.user.email) AND deletedAt IS NULL`, ordered so active > pending, and inspects the `status`.

**Why over alternatives:**
- *Alternative A: A new `room.access` query returning only the viewer's status.* Rejected — doubles the roundtrips (status query, then `room.get` for active members) and complicates cache invalidation. We already have all the info in one query.
- *Alternative B: Keep throwing `FORBIDDEN` for pending and special-case the error code client-side.* Rejected — TanStack Query still retries before `onError`/`isError` settle, so the "immediate" goal is not met, and abusing errors for a normal flow (pending is an expected state) is a poor pattern.

### Decision 2: Frontend branches on `viewerStatus`, not `isError`

`rooms.$id.tsx` currently uses `roomQuery.isError` to render the join screen. It will instead:

- `isPending` → loading spinner.
- `data.viewerStatus === "active"` → room view (existing render).
- `data.viewerStatus === "pending"` → join screen (existing join UI, relocated out of the error branch).
- `isError` → forbidden screen (new full-page component, not a toast).

### Decision 3: Disable retries for `room.get` in the route

Pass `retry: false` (or `retry: (count) => false`) to `useQuery(trpc.room.get.queryOptions({ id }, { retry: false }))`. A `FORBIDDEN` for a non-member then renders the forbidden screen on the first response rather than after 3 attempts. This is safe because `FORBIDDEN` is a terminal state for this query — retrying never succeeds.

## Risks / Trade-offs

- **Return-shape change is breaking for any other consumer of `room.get`.** → Mitigation: `room.get` is only consumed by `rooms.$id.tsx` (verified via grep). The added `viewerStatus` field is additive for the active case; the pending case is a new shape handled by the new branch.
- **Pending members could now read the room title.** → Trade-off: acceptable. The title is low-sensitivity and the join screen benefits from showing which room is being joined. No member list or other sensitive data is returned for pending.
- **A user whose invite was removed (soft-deleted) and who is otherwise not a member gets `FORBIDDEN`.** → Desired: they are no longer invited and should see the forbidden screen.
- **`retry: false` could mask transient network errors for the active-member path.** → Trade-off: the room view already invalidates and refetches on mutations; a transient failure shows the forbidden screen briefly until a refetch/manual refresh. Acceptable given the primary goal. If this becomes an issue, a targeted `retry: (n) => error.data?.code !== 'FORBIDDEN' && n < 3` can scope retries to non-forbidden errors.
