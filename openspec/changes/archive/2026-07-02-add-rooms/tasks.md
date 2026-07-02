## 1. Schema

- [x] 1.1 Add `rooms` table to `packages/api/src/db/schema.ts`: `id` (uuid PK), `title` (text, not null), `gameMasterId` (uuid, not null), `createdAt`, `updatedAt`, `deletedAt` (nullable). Add index on `gameMasterId` where `deletedAt IS NULL`.
- [x] 1.2 Add `room_members` table to `packages/api/src/db/schema.ts`: `id` (uuid PK), `roomId` (uuid, not null), `userId` (uuid, nullable), `email` (text, not null), `role` (text enum: `game-master` | `player`, not null), `status` (text enum: `pending` | `active`, not null), `characterId` (uuid, nullable), `invitedBy` (uuid, nullable), `invitedAt` (timestamp, nullable), `joinedAt` (timestamp, nullable), `createdAt`, `updatedAt`, `deletedAt` (nullable). Add index on `roomId` where `deletedAt IS NULL`, and index on `email` + `roomId` where `deletedAt IS NULL` (for join lookup).
- [x] 1.3 Run `pnpm --filter @dnd-weekend/api db:generate` to create the migration file.
- [x] 1.4 Run `pnpm --filter @dnd-weekend/api db:migrate` against the test Supabase to apply the migration.

## 2. API — Room Router

- [x] 2.1 Create `packages/api/src/routers/room.ts` with a `roomRouter` export.
- [x] 2.2 Add helper functions: `requireActiveMember(roomId, userId, db)` (returns the member row or throws FORBIDDEN) and `requireGM(roomId, userId, db)` (returns the room or throws FORBIDDEN).
- [x] 2.3 Implement `room.create` — `protectedProcedure` with input `{ title: string }`. Creates `rooms` row + `room_members` row (GM, active). Returns the room.
- [x] 2.4 Implement `room.list` — `protectedProcedure` query. Returns all rooms where the user is an active member, with role and member count.
- [x] 2.5 Implement `room.get` — `protectedProcedure` with input `{ id: uuid }`. Calls `requireActiveMember`. Returns room title, gameMasterId, and all members (pending + active) with their seated character info.
- [x] 2.6 Implement `room.invite` — `protectedProcedure` with input `{ roomId: uuid, email: string }`. Calls `requireGM`. Checks for duplicate email. Creates pending `room_members` row. Returns the invite.
- [x] 2.7 Implement `room.join` — `protectedProcedure` with input `{ roomId: uuid, characterId: uuid | null }`. Finds pending invite by email + roomId. Updates to active, sets userId, joinedAt, characterId. Returns the updated member.
- [x] 2.8 Implement `room.setCharacter` — `protectedProcedure` with input `{ roomId: uuid, characterId: uuid | null }`. Calls `requireActiveMember`. Validates character ownership (`characters.userId = ctx.user.id`). Updates `room_members.characterId`.
- [x] 2.9 Implement `room.transfer` — `protectedProcedure` with input `{ roomId: uuid, newGMUserId: uuid }`. Calls `requireGM`. Validates target is an active member. Updates both `room_members.role` rows and `rooms.gameMasterId` in a transaction.
- [x] 2.10 Implement `room.remove` — `protectedProcedure` with input `{ roomId: uuid, memberToRemoveId: uuid }`. Calls `requireGM`. Prevents removing self. Soft-deletes the `room_members` row.
- [x] 2.11 Implement `room.leave` — `protectedProcedure` with input `{ roomId: uuid }`. Calls `requireActiveMember`. Prevents GM from leaving (check if user is GM — return BAD_REQUEST). Soft-deletes the member's `room_members` row.
- [x] 2.12 Implement `room.delete` — `protectedProcedure` with input `{ roomId: uuid }`. Calls `requireGM`. Soft-deletes the `rooms` row and all `room_members` rows for that room.
- [x] 2.13 Register `roomRouter` in `packages/api/src/index.ts` as `room: roomRouter`.

## 3. Frontend — Routes & UI

- [x] 3.1 Create `apps/web/src/routes/rooms.tsx` — list of user's rooms. Calls `room.list`. Shows room cards (title, role, member count). "Create room" button. Links to `/rooms/:id`.
- [x] 3.2 Create `apps/web/src/routes/rooms.$id.tsx` — room detail view. Calls `room.get`. Shows room title, member list (with roles, statuses, seated character names), and management actions based on the user's role.
- [x] 3.3 Add "Create Room" form (modal or inline) on `/rooms` — title input, calls `room.create`.
- [x] 3.4 Add invite form on `/rooms/:id` (GM only) — email input, calls `room.invite`. Shows pending invites list.
- [x] 3.5 Add join flow on `/rooms/:id` — if user has a pending invite, show character picker (list of user's characters + "no character" option). Calls `room.join` with selected `characterId`.
- [x] 3.6 Add character seating control on `/rooms/:id` — dropdown to set/swap/clear the user's seated character. Calls `room.setCharacter`.
- [x] 3.7 Add GM actions on `/rooms/:id` — "Transfer GM" (select active member), "Remove member" (per member), "Delete room" (confirm). Calls respective procedures.
- [x] 3.8 Add "Leave room" button for players on `/rooms/:id`. Calls `room.leave`.
- [x] 3.9 Add navigation link to `/rooms` in the app header/menu (next to "Characters").

## 4. Verification

- [x] 4.1 Verify `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test --run` all pass.
- [x] 4.2 Verify local dev: create a room, invite by email, join with the debug user, seat a character, transfer GM, remove a member, leave, delete a room.
- [x] 4.3 Verify that existing characters functionality is unaffected — create, list, soft-delete a character still works.
- [x] 4.4 Verify that a character can be seated in multiple rooms simultaneously.
