
## Purpose

TBD

## Requirements

### Requirement: Dark DnD-themed visual language

The web client SHALL use a dark color theme with warm undertones, an amber/gold primary accent, and a deep crimson destructive accent. The theme SHALL be defined via CSS custom properties (HSL color values) following the shadcn/ui token convention. All text and interactive elements SHALL meet WCAG AA contrast ratios (≥4.5:1 for normal text, ≥3:1 for large text and UI components). The app SHALL NOT provide a light theme toggle — dark mode is the only theme.

#### Scenario: User opens the app on any page
- **WHEN** a user loads any page in the web client
- **THEN** the page background SHALL be a dark warm charcoal tone
- **AND** the primary text color SHALL be a warm near-white (parchment tone)
- **AND** the primary accent color (buttons, links, focus rings) SHALL be amber/gold
- **AND** destructive actions SHALL use a deep crimson accent

#### Scenario: Contrast meets accessibility standards
- **WHEN** any page renders text on its background
- **THEN** body text SHALL have a contrast ratio of at least 4.5:1 against its background
- **AND** muted/placeholder text SHALL have a contrast ratio of at least 4.5:1 against its background
- **AND** large text and UI component boundaries SHALL have a contrast ratio of at least 3:1

### Requirement: Component library via shadcn/ui

The web client SHALL use shadcn/ui components built on Radix UI primitives for all interactive UI elements. Components SHALL be owned as source files within the project (not imported from a package), styled via Tailwind CSS utility classes and CSS custom property tokens. The underlying Radix UI primitive packages SHALL be npm dependencies.

#### Scenario: Developer adds a new feature requiring UI components
- **WHEN** a developer builds a new UI feature
- **THEN** the feature SHALL use existing shadcn/ui components from `src/components/ui/` rather than raw HTML elements or custom-styled components
- **AND** no new CSS Module files SHALL be created

#### Scenario: Upgrading Radix UI primitives
- **WHEN** a Radix UI primitive package receives a new version
- **THEN** the upgrade SHALL be opt-in (explicit `pnpm update`)
- **AND** the upgrade SHALL NOT automatically change any component behavior in the project
- **AND** no component SHALL break due to an upstream release without an explicit dependency bump

### Requirement: Icon library via Lucide React

The web client SHALL use Lucide React (`lucide-react`) as its icon library. Icons SHALL be imported individually (tree-shakeable) and SHALL NOT be loaded as a full icon set. Icons SHALL use a consistent stroke width and size within each context.

#### Scenario: Icon appears in a button or navigation item
- **WHEN** a button, link, or navigation item includes an icon
- **THEN** the icon SHALL be an individual Lucide React component import
- **AND** the icon SHALL share a consistent stroke style with all other icons in the app
- **AND** only the imported icon SHALL be included in the bundle (tree-shaken)

### Requirement: Mobile-first responsive layout

The web client SHALL be usable on viewports as narrow as 320px. The app SHALL provide a responsive AppShell that adapts between desktop and mobile layouts. Both layouts SHALL render a shared top header bar containing the brand/logo on the left. On desktop (≥768px), the header SHALL show a user dropdown trigger on the right; the dropdown SHALL expose navigation links (e.g. Characters, Rooms) and a Sign out action. On mobile (<768px), the header SHALL show a navigation toggle on the right that opens a collapsible drawer containing the navigation links, the current user, and a Sign out action. All interactive elements SHALL have a minimum touch target of 44px. Dialogs SHALL be full-screen on mobile and centered modals on desktop. Content SHALL stack to a single column on mobile and may expand to multi-column on larger viewports.

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
- **AND** the main content SHALL be centered with a maximum width

#### Scenario: Dialog opens on mobile vs desktop
- **WHEN** a dialog opens on a viewport narrower than 768px
- **THEN** the dialog SHALL occupy the full screen
- **WHEN** a dialog opens on a viewport 768px or wider
- **THEN** the dialog SHALL be a centered modal with a backdrop

### Requirement: Accessible interactive components

All interactive elements SHALL be keyboard-navigable, SHALL have visible focus indicators, and SHALL meet WCAG 2.1 AA accessibility standards. Focus indicators SHALL use the theme's ring token (amber/gold). Components SHALL support ARIA attributes where applicable via their underlying Radix primitives.

#### Scenario: User navigates with keyboard
- **WHEN** a user presses Tab to move focus through the page
- **THEN** each interactive element SHALL receive a visible focus ring
- **AND** the focus ring SHALL use the amber/gold ring token color
- **AND** the user SHALL be able to activate any button, link, or control with Enter or Space

#### Scenario: Screen reader encounters a dialog
- **WHEN** a screen reader encounters a dialog
- **THEN** the dialog SHALL have appropriate ARIA roles (e.g., `dialog`, `aria-modal`)
- **AND** focus SHALL be trapped within the dialog while it is open
- **AND** focus SHALL return to the triggering element when the dialog closes

### Requirement: Reusable UI component inventory

The web client SHALL provide the following reusable UI components in `src/components/ui/`: Button (with variant props for primary, secondary, ghost, destructive, and outline styles), Input, Label, Textarea, Select (dropdown), DropdownMenu, Dialog, Card (panel), Badge, Avatar, Separator, Tooltip, Toast (notification), Sheet (mobile drawer), and ScrollArea. Each component SHALL be styled via Tailwind CSS classes and CSS custom property tokens, and SHALL be composable with the `cn()` utility for conditional class merging.

#### Scenario: Developer builds a character creation form
- **WHEN** a developer builds a form for creating a character
- **THEN** the form SHALL use the Input component for text fields
- **AND** the form SHALL use the Button component for the submit action
- **AND** the form SHALL use the Label component for field labels
- **AND** the form SHALL use the Toast component to show success or error feedback

#### Scenario: Developer builds a room member list
- **WHEN** a developer builds a list of room members
- **THEN** each member SHALL be displayed in a Card component
- **AND** the member's role SHALL be shown in a Badge component
- **AND** the member's avatar SHALL be shown in an Avatar component
- **AND** member actions SHALL be available in a DropdownMenu component
