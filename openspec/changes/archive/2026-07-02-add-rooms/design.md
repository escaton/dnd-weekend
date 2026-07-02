## Context

The app is a D&D character management tool with Supabase Auth, a tRPC API on Cloudflare Workers, and a React + TanStack Router frontend. The current data model has a single `characters` table (per-user, soft-deleted). Users can create, list, and soft-delete their own characters. There is no concept of multiplayer or shared spaces.

The goal is to add rooms — shared spaces where a game master can invite players by email, players can seat their existing characters, and the group can see each other's characters. This is the first feature requiring multi-user relationships beyond auth.

## Goals / Non-Goals

**Goals:**
- Add `rooms` and `room_members` tables with a Drizzle schema and migration
- Add a tRPC `room` router with full CRUD and membership operations
- Add frontend routes `/rooms` and `/rooms/:id`
- Support two roles: `game-master` and `player`
- Email-based invitations (no email sending, just a whitelist)
- Optional character seating per room member (reusable across rooms)
- GM transfer, member removal, leaving, and room deletion

**Non-Goals:**
- Real-time updates (no WebSocket/SSE — polling or manual refresh only)
- Email sending (the GM shares the room URL manually)
- In-room chat or dice rolling (out of scope for this change)
- Campaign/setting metadata on rooms (just a title for now)
- Invite expiration (pending invites last forever)

## Decisions

### 1. Two tables, no join table for membership

**Choice**: `rooms` (one row per room) and `room_members` (one row per membership/invitation). No separate invitations table.

**Why**: Invitations and memberships are the same entity at different lifecycle stages. A `room_members` row starts as `status=pending` (invitation), then becomes `status=active` (joined member). This avoids a separate table and a join step. Soft-deleted rows handle removal/leaving.

**Alternatives considered**:
- *Separate `room_invitations` table*: More normalized, but requires a migration step when a user joins (insert into `room_members`, delete from `room_invitations`). Two tables for one concept. Rejected for simplicity.
- *Single `rooms` table with a `members` JSON column*: No relational queries, no constraints, no RLS. Rejected — relational data belongs in relational tables.

### 2. `rooms.gameMasterId` is denormalized

**Choice**: Store `gameMasterId` on `rooms` as a denormalized copy of the `room_members` row where `role=game-master`. Update it on transfer.

**Why**: Quick lookup of "who is the GM of this room?" without joining `room_members`. The authoritative source for roles is `room_members.role`, but `rooms.gameMasterId` is a convenience for the common query. Both are updated in a transaction on transfer.

**Alternatives considered**:
- *Derive GM via query only*: `SELECT userId FROM room_members WHERE roomId=? AND role='game-master'`. Single source of truth, no drift risk. Slightly more expensive but negligible at this scale. Viable — the denormalized field is a convenience, not a necessity.

### 3. `room_members.userId` is nullable

**Choice**: `userId` is nullable. Pending invitations store only `email`. When the invited user authenticates and joins, `userId` is set.

**Why**: Invited users may not have an account yet. Storing the email allows matching on join. The email is the invitation key — when an authenticated user visits `/rooms/:id`, the server checks if their email matches a pending invite.

**Alternatives considered**:
- *Require invited users to have an account first*: Would need to look up Supabase Auth users by email before inviting. More friction — the GM would need to know who has an account. Rejected — email is the natural invitation primitive.

### 4. `room_members.characterId` is nullable and non-unique

**Choice**: `characterId` is nullable (members don't need a character) and has no unique constraint (characters are reusable across rooms).

**Why**: The GM typically doesn't have a character. Players may join without one and add it later. Characters are per-user roster items that can be seated in multiple rooms. A partial unique index would prevent reuse, which contradicts the requirement.

**Alternatives considered**:
- *Unique constraint on `characterId`*: Would enforce one-character-one-room. Rejected — the user explicitly wants reusable characters.

### 5. Character ownership validation on seating

**Choice**: When a member sets `characterId`, the server SHALL verify the character belongs to the authenticated user (`characters.userId = ctx.user.id`).

**Why**: Prevents seating another user's character. The `characters` table already has `userId` — a simple ownership check in the tRPC procedure.

### 6. Soft-deletes for rooms and room_members

**Choice**: Both `rooms` and `room_members` have `deletedAt` columns. Queries filter on `deletedAt IS NULL`.

**Why**: Consistent with the existing `characters` table pattern. Allows audit trail and potential undo. The `characters` table already uses this approach.

### 7. Access control via tRPC procedure guards

**Choice**: Each `room` procedure checks membership/role inline. A helper function `requireActiveMember(roomId, userId, db)` and `requireGM(roomId, userId, db)` will be used. No middleware abstraction — just inline checks with helpers.

**Why**: Simple, explicit, easy to audit. The app is small enough that a policy/permission framework is overkill. The helpers centralize the query logic.

## Risks / Trade-offs

- **[Email collision]** → Two users with the same email could both match a pending invite. **Mitigation**: Supabase Auth enforces unique emails per user, so `auth.uid()` is unique. The `room_members.userId` is set on join, and subsequent joins by the same email are blocked because the row is already `active`.
- **[GM abandons room]** → The GM could leave without transferring (blocked by spec), or the GM's account could be deleted in Supabase. **Mitigation**: The GM cannot leave without transferring. If the account is deleted in Supabase, the room is orphaned — a future admin tool could reassign. Acceptable for a personal tool.
- **[Denormalized `gameMasterId` drift]** → If a bug updates `room_members.role` without updating `rooms.gameMasterId`, they drift. **Mitigation**: The transfer procedure updates both in a transaction. The helper `requireGM` can check both for consistency.
- **[No real-time updates]** → Members won't see new invitations or character changes without refreshing. **Mitigation**: Acceptable for a casual D&D tool. The room view can poll on an interval or refresh manually. Real-time is a future enhancement.

## Migration Plan

1. **Add schema**: New `rooms` and `room_members` tables via Drizzle migration. No changes to existing `characters` table.
2. **Add API**: New `room` router with all procedures. No changes to existing `character` or `auth` routers.
3. **Add frontend**: New `/rooms` and `/rooms/:id` routes. Add a link to `/rooms` in the navigation.
4. **Deploy**: Migrations run as a pre-deploy gate (existing pattern). The new routes and API are additive — no breaking changes to existing functionality.
5. **Rollback**: If issues arise, revert the deploy. The new tables and routes are additive. Existing characters and auth remain unaffected.

## Open Questions

- **Should the characters list show which rooms each character is in?** The data model supports it (query `room_members` by `characterId`), but the UI doesn't need to show it in this change. Could be a follow-up.
- **Should there be a max member count per room?** No limit for now. A personal D&D tool with 5-6 players per room won't hit scaling issues. Can add later if needed.
