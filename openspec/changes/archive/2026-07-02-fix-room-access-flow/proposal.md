## Why

When a user opens a room link (`/rooms/:id`), the `room.get` query throws `FORBIDDEN` for both pending invitees and non-members. Because TanStack Query retries failed queries by default, the user waits through 3 failed attempts before the error branch renders. Worse, the route treats every `room.get` error as an invitation to join, so non-members also see the join screen (and only discover they cannot join after attempting it). We need the correct screen to render immediately on the first response, with no retries.

## What Changes

- `room.get` SHALL return a successful response for pending invitees (instead of throwing `FORBIDDEN`), distinguished by a `viewerStatus` field so the client can branch without retries.
- `room.get` SHALL continue to throw `FORBIDDEN` for users with no membership row (not invited), so the client can show a forbidden screen rather than the join screen.
- The room detail route SHALL render three distinct states based on the query result: active member (room view), pending invitee (join screen), and non-member (forbidden screen — not a toast).
- The route SHALL disable TanStack Query retries for `room.get` so a `FORBIDDEN` renders the forbidden screen immediately instead of after 3 attempts.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `room-management`: `room.get` no longer throws for pending invitees — it returns a `viewerStatus: "pending"` success payload. Non-members still receive `FORBIDDEN`. The room detail route renders a dedicated forbidden screen for non-members and the join screen only for pending invitees.

## Impact

- **Backend**: `packages/api/src/routers/room.ts` — `room.get` gains a membership-status lookup that returns `viewerStatus` (`"active"` or `"pending"`) on success and throws `FORBIDDEN` only for non-members. Return shape becomes a discriminated union.
- **Frontend**: `apps/web/src/routes/rooms.$id.tsx` — branches on `viewerStatus` instead of `isError`; adds a forbidden screen; disables query retries for `room.get`.
- **Types**: The tRPC-inferred return type of `room.get` changes shape (adds `viewerStatus`), affecting any consumers. The route is the only consumer.
- **Tests**: Existing room-management tests that assert `FORBIDDEN` for pending members must be updated to assert a `viewerStatus: "pending"` success response.
