## MODIFIED Requirements

### Requirement: Room detail view

An authenticated user SHALL be able to view a room's details, including its title, member list (with roles, statuses, and seated characters), and the current game master. `room.get` SHALL determine the viewer's relationship to the room and return a discriminated result:

- An **active member** SHALL receive the full room data (`viewerStatus: "active"`) — room title, game master ID, and all `room_members` rows (both pending and active), each including email, role, status, seated character (if any), and display name (if the user has joined).
- A **pending invitee** (a `room_members` row with `status=pending` matching the viewer's email and `deletedAt IS NULL`) SHALL receive `viewerStatus: "pending"` with the room id and title only — no member list or other sensitive data.
- A **non-member** (no `room_members` row matching the viewer's `userId` or `email` with `deletedAt IS NULL`) SHALL receive a `FORBIDDEN` error.

#### Scenario: Active member views a room
- **WHEN** an active member requests a room by ID
- **THEN** the system SHALL return `viewerStatus: "active"` with the room title, game master ID, and all `room_members` rows (both pending and active)
- **AND** each member SHALL include their email, role, status, seated character (if any), and display name (if the user has joined)

#### Scenario: Pending invitee views a room
- **WHEN** a user with a pending invite (`status=pending`, `email` matches, `deletedAt IS NULL`) requests a room by ID
- **THEN** the system SHALL return `viewerStatus: "pending"` with the room id and title
- **AND** the system SHALL NOT include the member list or any other member data

#### Scenario: Non-member attempts to view a room
- **WHEN** a user with no `room_members` row matching their `userId` or `email` (with `deletedAt IS NULL`) requests a room by ID
- **THEN** the system SHALL return a `FORBIDDEN` error

### Requirement: Joining a room

An authenticated user SHALL be able to join a room by visiting `/rooms/:id` if their email matches a pending invite. On join, the user SHALL optionally pick a character. The `room_members` row SHALL be updated: `userId=<user's ID>`, `status=active`, `joinedAt=now`, `characterId=<selected character or null>`. The room detail route SHALL render the join screen immediately (on the first `room.get` response) when `viewerStatus` is `"pending"`, without retrying the query.

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

#### Scenario: Pending invitee sees the join screen immediately
- **WHEN** an authenticated user with a pending invite opens `/rooms/:id`
- **THEN** the join screen SHALL render on the first `room.get` response
- **AND** the client SHALL NOT retry the `room.get` query before rendering the join screen

### Requirement: Room access control

All room procedures SHALL verify that the authenticated user is an active member of the room (or the GM) before returning room data or allowing actions, except that `room.get` SHALL additionally return a successful `viewerStatus: "pending"` response for pending invitees and SHALL throw `FORBIDDEN` only for non-members. The room detail route SHALL disable query retries for `room.get` so that a `FORBIDDEN` for a non-member renders the forbidden screen on the first response. The forbidden screen SHALL be a full-page view, not a toast notification.

#### Scenario: Active member accesses room data
- **WHEN** an active member requests room data or performs a room action
- **THEN** the system SHALL verify the user has an active `room_members` row for that room

#### Scenario: Pending member views the room
- **WHEN** a user with a pending invite requests `room.get`
- **THEN** the system SHALL return `viewerStatus: "pending"` (not a `FORBIDDEN` error)

#### Scenario: Non-member views the room
- **WHEN** a user with no `room_members` row requests `room.get`
- **THEN** the system SHALL return a `FORBIDDEN` error
- **AND** the room detail route SHALL render a full-page forbidden screen without retrying the query

## ADDED Requirements

### Requirement: Forbidden room screen

The room detail route SHALL render a dedicated full-page forbidden screen when `room.get` returns `FORBIDDEN`, instead of showing a toast or the join screen. The forbidden screen SHALL provide a link back to the rooms list.

#### Scenario: Non-member opens a room link
- **WHEN** a non-member opens `/rooms/:id` and `room.get` returns `FORBIDDEN`
- **THEN** the route SHALL render a full-page forbidden screen
- **AND** the route SHALL NOT show a toast notification
- **AND** the route SHALL NOT retry the `room.get` query
- **AND** the forbidden screen SHALL include a link to `/rooms`
