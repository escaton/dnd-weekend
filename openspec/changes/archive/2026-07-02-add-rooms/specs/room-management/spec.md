## ADDED Requirements

### Requirement: Room creation

An authenticated user SHALL be able to create a room with a title. The creator SHALL become the game master of the room. A `room_members` row SHALL be created for the creator with `role=game-master`, `status=active`, `invitedBy=null`, `joinedAt=now`. The GM is not required to set a character.

#### Scenario: User creates a room
- **WHEN** an authenticated user creates a room with a title
- **THEN** a `rooms` row SHALL be created with `gameMasterId` set to the creator's user ID
- **AND** a `room_members` row SHALL be created with `userId=creator`, `role=game-master`, `status=active`, `joinedAt=now`
- **AND** the created room SHALL be returned with its ID and title

### Requirement: Room listing

An authenticated user SHALL be able to list all rooms where they are an active member. The list SHALL include the room title, the user's role, and the member count.

#### Scenario: User lists their rooms
- **WHEN** an authenticated user requests their room list
- **THEN** the system SHALL return all rooms where the user has a `room_members` row with `status=active` and the room is not soft-deleted
- **AND** each room SHALL include the room ID, title, the user's role, and the total count of active members

### Requirement: Room detail view

An authenticated user SHALL be able to view a room's details, including its title, member list (with roles, statuses, and seated characters), and the current game master. Only active members SHALL see room details.

#### Scenario: Active member views a room
- **WHEN** an active member requests a room by ID
- **THEN** the system SHALL return the room title, game master ID, and all `room_members` rows (both pending and active)
- **AND** each member SHALL include their email, role, status, seated character (if any), and display name (if the user has joined)

#### Scenario: Non-member attempts to view a room
- **WHEN** a user who is not an active member requests a room by ID
- **THEN** the system SHALL return a `FORBIDDEN` error

### Requirement: Invitation by email

The game master SHALL be able to invite users by email. An invitation SHALL create a `room_members` row with `userId=null`, `email=<invited email>`, `role=player`, `status=pending`, `invitedBy=<GM's userId>`, `invitedAt=now`. No email SHALL be sent — the GM shares the room URL. Pending invites SHALL not expire.

#### Scenario: GM invites a user by email
- **WHEN** the GM invites `alice@example.com` to a room
- **THEN** a `room_members` row SHALL be created with `email=alice@example.com`, `userId=null`, `role=player`, `status=pending`, `invitedBy=<GM's userId>`, `invitedAt=now`
- **AND** no email SHALL be sent

#### Scenario: GM invites a duplicate email
- **WHEN** the GM invites an email that already has a `room_members` row (pending or active) in that room
- **THEN** the system SHALL return a `CONFLICT` error

#### Scenario: Non-GM attempts to invite
- **WHEN** a player attempts to invite a user to a room
- **THEN** the system SHALL return a `FORBIDDEN` error

### Requirement: Joining a room

An authenticated user SHALL be able to join a room by visiting `/rooms/:id` if their email matches a pending invite. On join, the user SHALL optionally pick a character. The `room_members` row SHALL be updated: `userId=<user's ID>`, `status=active`, `joinedAt=now`, `characterId=<selected character or null>`.

#### Scenario: User joins with a character
- **WHEN** an authenticated user with a pending invite visits the room and picks a character
- **THEN** the `room_members` row SHALL be updated with `userId=<user's ID>`, `status=active`, `joinedAt=now`, `characterId=<selected character's ID>`
- **AND** the user SHALL see the room

#### Scenario: User joins without a character
- **WHEN** an authenticated user with a pending invite visits the room and skips character selection
- **THEN** the `room_members` row SHALL be updated with `userId=<user's ID>`, `status=active`, `joinedAt=now`, `characterId=null`
- **AND** the user SHALL see the room

#### Scenario: User without a pending invite attempts to join
- **WHEN** an authenticated user visits a room URL but their email is not on the pending invite list
- **THEN** the system SHALL return a `FORBIDDEN` error

#### Scenario: User with an active membership attempts to join again
- **WHEN** an active member visits the join flow again
- **THEN** the system SHALL redirect them to the room view (no re-join)

### Requirement: Character seating

Any active room member SHALL be able to set or swap their seated character. Characters are reusable — a character can be seated in multiple rooms simultaneously. `room_members.characterId` is nullable. The GM is not required to have a character.

#### Scenario: Member sets a character
- **WHEN** an active member sets their character to a character they own
- **THEN** the `room_members.characterId` SHALL be updated to the selected character's ID
- **AND** the character SHALL remain owned by the user (no ownership transfer)

#### Scenario: Member swaps characters
- **WHEN** an active member who already has a seated character selects a different character
- **THEN** the `room_members.characterId` SHALL be updated to the new character's ID

#### Scenario: Member clears their character
- **WHEN** an active member removes their seated character (sets it to null)
- **THEN** the `room_members.characterId` SHALL be set to `null`

#### Scenario: Member attempts to set another user's character
- **WHEN** a member attempts to set `characterId` to a character they do not own
- **THEN** the system SHALL return a `FORBIDDEN` error

### Requirement: Game master transfer

The game master SHALL be able to transfer the GM role to another active member. On transfer, the old GM's `room_members.role` SHALL become `player`, the new GM's `room_members.role` SHALL become `game-master`, and `rooms.gameMasterId` SHALL be updated to the new GM's userId. The transfer SHALL occur in a single transaction.

#### Scenario: GM transfers to an active player
- **WHEN** the GM transfers the role to an active player
- **THEN** the old GM's `room_members.role` SHALL be set to `player`
- **AND** the new GM's `room_members.role` SHALL be set to `game-master`
- **AND** `rooms.gameMasterId` SHALL be updated to the new GM's userId
- **AND** all three updates SHALL occur in a single transaction

#### Scenario: GM attempts to transfer to a pending member
- **WHEN** the GM attempts to transfer the role to a member with `status=pending`
- **THEN** the system SHALL return a `BAD_REQUEST` error

#### Scenario: Non-GM attempts to transfer
- **WHEN** a player attempts to transfer the GM role
- **THEN** the system SHALL return a `FORBIDDEN` error

### Requirement: Member removal

The game master SHALL be able to remove any member (pending or active) from a room. Removing a member SHALL soft-delete their `room_members` row. The removed member's character is unseated (the link is removed with the row). The GM cannot remove themselves.

#### Scenario: GM removes a player
- **WHEN** the GM removes an active player from a room
- **THEN** the player's `room_members` row SHALL be soft-deleted (`deletedAt=now`)
- **AND** the player SHALL no longer see the room or be listed as a member

#### Scenario: GM removes a pending invite
- **WHEN** the GM removes a pending invite
- **THEN** the pending `room_members` row SHALL be soft-deleted
- **AND** the invited email SHALL no longer be able to join

#### Scenario: GM attempts to remove themselves
- **WHEN** the GM attempts to remove their own membership
- **THEN** the system SHALL return a `BAD_REQUEST` error

### Requirement: Leaving a room

A player SHALL be able to leave a room. Leaving SHALL soft-delete the member's `room_members` row. The GM cannot leave without transferring the role first.

#### Scenario: Player leaves a room
- **WHEN** a player leaves a room
- **THEN** the player's `room_members` row SHALL be soft-deleted
- **AND** the player's character SHALL remain in their roster (not deleted)

#### Scenario: GM attempts to leave without transferring
- **WHEN** the GM attempts to leave a room without first transferring the role
- **THEN** the system SHALL return a `BAD_REQUEST` error

### Requirement: Room deletion

The game master SHALL be able to delete a room. Deleting a room SHALL soft-delete the `rooms` row and all `room_members` rows for that room. Characters are not affected — they remain in their owners' rosters.

#### Scenario: GM deletes a room
- **WHEN** the GM deletes a room
- **THEN** the `rooms` row SHALL be soft-deleted (`deletedAt=now`)
- **AND** all `room_members` rows for that room SHALL be soft-deleted
- **AND** no characters SHALL be deleted or modified

#### Scenario: Non-GM attempts to delete a room
- **WHEN** a player attempts to delete a room
- **THEN** the system SHALL return a `FORBIDDEN` error

### Requirement: Room access control

All room procedures SHALL verify that the authenticated user is an active member of the room (or the GM) before returning room data or allowing actions. Pending members SHALL only access the join flow.

#### Scenario: Active member accesses room data
- **WHEN** an active member requests room data or performs a room action
- **THEN** the system SHALL verify the user has an active `room_members` row for that room

#### Scenario: Pending member attempts to access room data
- **WHEN** a user with a pending invite attempts to access room data (not the join flow)
- **THEN** the system SHALL return a `FORBIDDEN` error
