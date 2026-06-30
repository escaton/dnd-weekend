

### Requirement: Google sign-in via Supabase OAuth

The system SHALL provide Google sign-in using Supabase OAuth. The sign-in flow SHALL be combined: if no account exists for the Google user, one SHALL be created automatically on first sign-in. There SHALL be no separate registration flow.

Additionally, the system SHALL expose an invisible email/password login method via `window.__debugLogin(email, password)` for debugging and automated testing. This method SHALL call `supabase.auth.signInWithPassword()` and navigate to the app on success. The method SHALL be available in all environments. It SHALL NOT be visible in the UI — no buttons, forms, or visible elements. Debug users SHALL be pre-created in Supabase Auth; their credentials SHALL be documented in the spec.

#### Scenario: First-time user signs in with Google
- **WHEN** a user clicks "Sign in with Google" and completes Google OAuth
- **AND** no account exists for that Google identity
- **THEN** the system SHALL create a new account via Supabase Auth
- **AND** the user SHALL be authenticated and redirected to the app

#### Scenario: Returning user signs in with Google
- **WHEN** a user clicks "Sign in with Google" and completes Google OAuth
- **AND** an account already exists for that Google identity
- **THEN** the system SHALL authenticate the existing user
- **AND** the user SHALL be redirected to the app

#### Scenario: Unauthenticated user accesses protected routes
- **WHEN** an unauthenticated user navigates to any route other than the sign-in page
- **THEN** the system SHALL redirect the user to the sign-in page

#### Scenario: Debug login via window method
- **WHEN** `window.__debugLogin(email, password)` is called with valid credentials
- **THEN** the system SHALL call `supabase.auth.signInWithPassword()` with the given email and password
- **AND** on success SHALL navigate to `/characters`
- **AND** on failure SHALL throw the error from Supabase Auth

#### Scenario: Debug login with invalid credentials
- **WHEN** `window.__debugLogin(email, password)` is called with invalid credentials
- **THEN** the system SHALL throw the Supabase Auth error
- **AND** the user SHALL remain on the current page

#### Scenario: Debug login is invisible in UI
- **WHEN** the sign-in page is rendered
- **THEN** no visible UI element for debug login SHALL be present
- **AND** the debug method SHALL only be accessible programmatically via `window.__debugLogin`

### Requirement: Server verifies Supabase JWT

The server SHALL verify the Supabase JWT on every API request using the JWKS (JSON Web Key Set) endpoint at `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`. The server fetches and caches Supabase's public keys, verifies JWT signatures locally, and extracts the user identity. Unauthenticated or invalid-token requests SHALL be rejected with a 401 status.

#### Scenario: Valid JWT in request
- **WHEN** the client sends a request with a valid Supabase JWT
- **THEN** the server SHALL accept the request and provide the user identity to the route handler

#### Scenario: Missing or invalid JWT
- **WHEN** the client sends a request without a JWT or with an invalid/expired JWT
- **THEN** the server SHALL reject the request with a 401 Unauthorized response

### Requirement: Sign-out

The system SHALL provide a sign-out action that clears the user's session on both the client and Supabase.

#### Scenario: User signs out
- **WHEN** a signed-in user clicks "Sign out"
- **THEN** the system SHALL clear the local session
- **AND** the system SHALL invalidate the session with Supabase
- **AND** the user SHALL be redirected to the sign-in page

## Debug User Credentials

The following debug user is pre-created in Supabase Auth (both test and prod projects):

- **Email:** `debug@dnd-weekend.local`
- **Password:** `111111`

These credentials are intentionally stored in the open — this is a personal DnD tool with no sensitive data at risk. The debug user has the same privileges as any Google-authenticated user (can create and manage characters).
