## MODIFIED Requirements

### Requirement: Mobile-first responsive layout

The web client SHALL be usable on viewports as narrow as 320px. The app SHALL provide a responsive AppShell that adapts between desktop and mobile layouts. The AppShell SHALL render a shared top header bar containing the brand/logo on the left. AppShell's `<main>` SHALL render routes full-bleed by default — no maximum width and no padding SHALL be imposed by the shell. Individual routes SHALL be responsible for centering or padding their own content when needed. On desktop (≥768px), the header SHALL show a user dropdown trigger on the right; the dropdown SHALL expose navigation links (e.g. Characters, Rooms) and a Sign out action. On mobile (<768px), the header SHALL show a navigation toggle on the right that opens a collapsible drawer containing the navigation links, the current user, and a Sign out action. All interactive elements SHALL have a minimum touch target of 44px. Dialogs SHALL be full-screen on mobile and centered modals on desktop. Content SHALL stack to a single column on mobile and may expand to multi-column on larger viewports.

#### Scenario: User opens the app on a mobile device
- **WHEN** a user opens the app on a viewport narrower than 768px
- **THEN** the layout SHALL display a top bar with a navigation toggle
- **AND** the navigation toggle SHALL open a drawer or bottom bar with navigation links
- **AND** all content SHALL be readable without horizontal scrolling
- **AND** all interactive elements SHALL have a minimum touch target of 44px

#### Scenario: User opens the app on a desktop
- **WHEN** a user opens the app on a viewport 768px or wider
- **THEN** the layout SHALL display a persistent header bar with the brand/logo on the left
- **AND** the header SHALL display a user dropdown trigger on the right
- **AND** the user dropdown SHALL contain navigation links and a Sign out action
- **AND** the main content area SHALL render full-bleed without a maximum width or padding imposed by the shell
- **AND** a route that wants centered content SHALL apply its own maximum width and padding

#### Scenario: Route opts into centered content
- **WHEN** a route (e.g. Characters, Rooms list) wants its content centered with a maximum width
- **THEN** the route SHALL wrap its content in a container with a maximum width and padding
- **AND** AppShell SHALL NOT impose any width or padding on that content

#### Scenario: Route uses full-bleed content
- **WHEN** a route (e.g. the room map page) wants its content to fill the available area
- **THEN** the route SHALL NOT apply a maximum width or padding to its root
- **AND** the content SHALL fill the area between the header and the viewport edges

#### Scenario: Dialog opens on mobile vs desktop
- **WHEN** a dialog opens on a viewport narrower than 768px
- **THEN** the dialog SHALL occupy the full screen
- **WHEN** a dialog opens on a viewport 768px or wider
- **THEN** the dialog SHALL be a centered modal with a backdrop
