

### Requirement: Create character

An authenticated user SHALL be able to create a character. A character SHALL have a `content` field of type jsonb, defaulting to an empty object `{}`. The content shape is not enforced beyond being a valid JSON object.

#### Scenario: User creates a character with content
- **WHEN** an authenticated user submits a new character with a JSON object as content
- **THEN** the system SHALL create a character record with the provided content
- **AND** the character SHALL be associated with the authenticated user's id
- **AND** the system SHALL return the created character with id, content, created_at, and updated_at

#### Scenario: User creates a character without content
- **WHEN** an authenticated user submits a new character without specifying content
- **THEN** the system SHALL create a character record with content set to `{}` (empty object)

#### Scenario: Unauthenticated user attempts to create a character
- **WHEN** an unauthenticated user submits a character creation request
- **THEN** the system SHALL reject the request with a 401 Unauthorized response

### Requirement: List characters

An authenticated user SHALL be able to list all their non-deleted characters. The list SHALL only include characters belonging to the authenticated user. Soft-deleted characters (where `deleted_at` is not null) SHALL NOT appear in the list. No pagination is provided.

#### Scenario: User lists their characters
- **WHEN** an authenticated user requests their character list
- **THEN** the system SHALL return all characters where `user_id` matches the authenticated user and `deleted_at` is null
- **AND** each character SHALL include id, content, created_at, and updated_at

#### Scenario: User with no characters lists
- **WHEN** an authenticated user with no characters requests their character list
- **THEN** the system SHALL return an empty array

#### Scenario: List excludes other users' characters
- **WHEN** an authenticated user requests their character list
- **THEN** the system SHALL NOT return characters belonging to other users

### Requirement: Soft-delete character

An authenticated user SHALL be able to soft-delete a character they own. Soft-delete SHALL set `deleted_at` to the current timestamp without removing the record. A user SHALL NOT be able to soft-delete another user's characters.

#### Scenario: User soft-deletes their character
- **WHEN** an authenticated user soft-deletes a character they own
- **THEN** the system SHALL set `deleted_at` to the current timestamp
- **AND** the character SHALL no longer appear in the character list

#### Scenario: User attempts to soft-delete another user's character
- **WHEN** an authenticated user attempts to soft-delete a character they do not own
- **THEN** the system SHALL reject the request with a 404 Not Found response

#### Scenario: User attempts to soft-delete an already-deleted character
- **WHEN** an authenticated user attempts to soft-delete a character that is already soft-deleted
- **THEN** the system SHALL return a 404 Not Found response
