## Why

The app currently has no concept of multiplayer sessions. Users can only manage their own characters in isolation. To play D&D together, users need shared spaces (rooms) where a game master can invite players by email, players can seat their characters, and the group can see each other's characters.

## What Changes

- Add `rooms` table: `id`, `title`, `gameMasterId` (references the current game master's user ID), `createdAt`, `updatedAt`, `deletedAt`.
- Add `room_members` table: `id`, `roomId`, `userId` (nullable — pending invites have no user yet), `email`, `role` (`game-master` | `player`), `status` (`pending` | `active`), `characterId` (nullable, references `characters.id`, reusable across rooms), `invitedBy`, `invitedAt`, `joinedAt` (nullable).
- Add tRPC `room` router with procedures: `create`, `list`, `get`, `invite`, `join`, `remove`, `transfer`, `leave`, `setCharacter`.
- Add frontend routes: `/rooms` (list of user's rooms), `/rooms/:id` (room view with members, characters, and management actions).
- Room creation: the creator becomes the game master (role `game-master`, status `active`). GM is not required to have a character.
- Invitation: GM invites by email. A `room_members` row is created with `userId=null`, `email`, `role=player`, `status=pending`. No email is sent — the GM shares the room URL.
- Joining: an authenticated user visiting `/rooms/:id` whose email matches a pending invite can join. They may optionally pick a character. On join, `userId` is set, `status` flips to `active`, `joinedAt` is set.
- Character seating: any active member can optionally set or swap their character (`room_members.characterId`). Characters are reusable across rooms — no unique constraint.
- Game master transfer: GM can transfer the role to another active member. Old GM becomes `player`, new GM becomes `game-master`, `rooms.gameMasterId` is updated.
- Removal: GM can remove any member (pending or active). Removed members are soft-deleted.
- Leaving: a player can leave a room. GM cannot leave without transferring first.
- Room deletion: GM can delete a room, which soft-deletes the room and all its members.

## Capabilities

### New Capabilities

- `room-management`: Rooms, membership, invitations, roles, and character seating. Covers the full lifecycle of rooms from creation through deletion, including the game-master/player role model, email-based invitations, and optional character assignment per room member.

### Modified Capabilities

_None_ — room management is a new capability that builds on top of existing `character-management` (characters are referenced by `room_members.characterId`) and `user-auth` (Supabase Auth user IDs and emails are used for membership). No existing requirements change.
