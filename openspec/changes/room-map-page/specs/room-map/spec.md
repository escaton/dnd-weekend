## ADDED Requirements

### Requirement: Full-bleed room page for active members

When an authenticated user with `viewerStatus: "active"` opens a room route, the page SHALL render full-bleed (filling the area between the AppShell header and the viewport edges). The page SHALL NOT apply a centered maximum-width container. The page SHALL consist of two regions: the map area (primary) and the settings region (secondary).

#### Scenario: Active member opens a room
- **WHEN** an active member navigates to `/rooms/$id`
- **THEN** the page SHALL render full-bleed between the AppShell header and the viewport edges
- **AND** the page SHALL NOT apply a centered maximum-width container
- **AND** the map area SHALL be the primary visible region

### Requirement: Join gate replaces the page for pending invitees

When `room.get` returns `viewerStatus: "pending"`, the route SHALL render only a join screen and SHALL NOT render the map or settings region. The join screen SHALL be centered on the page. The join screen SHALL allow the invitee to join the room (with or without selecting a character). After a successful `room.join` mutation, the route SHALL refetch `room.get` and render the active-member layout.

#### Scenario: Pending invitee opens a room
- **WHEN** a pending invitee navigates to `/rooms/$id`
- **THEN** the route SHALL render only the join screen
- **AND** the route SHALL NOT mount the map canvas or render the settings region
- **AND** the join screen SHALL be centered on the page

#### Scenario: Pending invitee joins the room
- **WHEN** a pending invitee submits the join form and the `room.join` mutation succeeds
- **THEN** the route SHALL invalidate and refetch `room.get`
- **AND** the route SHALL render the active-member layout (map + settings)

### Requirement: Desktop right-side settings panel

On desktop (≥768px), the settings region SHALL be a fixed-width panel (~320px) on the right side of the page, always visible alongside the map. The panel SHALL contain all room settings: invite players (GM only), member list, transfer game master (GM only), and delete/leave room. The panel SHALL NOT cover or overlap the map.

#### Scenario: Active member views the room on desktop
- **WHEN** an active member opens a room on a viewport 768px or wider
- **THEN** the settings region SHALL be a fixed-width panel on the right side
- **AND** the panel SHALL be visible alongside the map without overlapping it
- **AND** the panel SHALL contain invite, members, transfer, and delete/leave controls

### Requirement: Mobile segmented control (Map/Room)

On mobile (<768px), a segmented control with two segments (Map and Room) SHALL render below the AppShell header. The Map segment SHALL be active by default when the page loads. Only one segment's content SHALL be visible at a time; selecting a segment swaps the visible area. The Room segment SHALL contain all settings (invite, members, transfer, delete/leave) in a scrollable column.

#### Scenario: Active member opens the room on mobile
- **WHEN** an active member opens a room on a viewport narrower than 768px
- **THEN** a segmented control with Map and Room segments SHALL render below the header
- **AND** the Map segment SHALL be active by default
- **AND** only the Map segment's content SHALL be visible

#### Scenario: Member switches to the Room segment on mobile
- **WHEN** a member taps the Room segment
- **THEN** the Room segment's content (all settings stacked) SHALL become visible
- **AND** the Map segment's content SHALL be hidden
- **AND** the Room segment's content SHALL be scrollable

### Requirement: Paused state is the default and unmounts the map canvas

The map area SHALL start in a paused state when the page loads. In the paused state, the tldraw canvas SHALL NOT be mounted. The paused state SHALL render the design-system background color (the `--background` token) and a centered Play button. The Play button SHALL be the only interactive element in the map area while paused.

#### Scenario: Page loads in paused state
- **WHEN** an active member opens the room page
- **THEN** the map area SHALL be in the paused state
- **AND** the tldraw canvas SHALL NOT be mounted in the React tree
- **AND** the map area SHALL display the design-system background color
- **AND** a centered Play button SHALL be rendered

### Requirement: Play mounts the canvas as a one-way trip

Pressing the Play button SHALL mount the tldraw canvas in the map area. Once mounted, the canvas SHALL NOT be unmounted by any in-page affordance (no Pause button). Returning to the paused state SHALL only happen by reloading the page or navigating away. The Play state SHALL be local React state, per-device, not persisted and not synced across devices.

#### Scenario: Member presses Play
- **WHEN** a member presses the Play button
- **THEN** the tldraw canvas SHALL mount in the map area
- **AND** the Play button SHALL no longer be rendered
- **AND** no Pause affordance SHALL be available to unmount the canvas

#### Scenario: Member reloads the page after pressing Play
- **WHEN** a member reloads the page after having pressed Play
- **THEN** the map area SHALL return to the paused state
- **AND** any shapes created before the reload SHALL be gone (no persistence)

### Requirement: Map canvas hides all default tldraw UI

The tldraw canvas SHALL be rendered with `hideUi` and all default UI component slots nulled (toolbar, menus, style panel, share panel, help menu, debug menu, context menu, pages menu). No default tldraw UI SHALL be visible to the user. The tldraw license watermark ("Made with tldraw") SHALL remain visible as required by the license. The canvas background SHALL use the design-system `--background` color token via the `components.Background` slot.

#### Scenario: Member views the mounted map canvas
- **WHEN** the tldraw canvas is mounted
- **THEN** no tldraw toolbar, menu, style panel, or context menu SHALL be visible
- **AND** the tldraw watermark SHALL remain visible
- **AND** the canvas background SHALL use the design-system `--background` color token

### Requirement: Map interactions (pan, zoom, select, move, resize, rotate)

Once the canvas is mounted, a member SHALL be able to pan the canvas, zoom in and out, select a shape, move a selected shape, resize a selected shape, and rotate a selected shape. These interactions SHALL work on both desktop (mouse/trackpad) and touch devices. Touch panning SHALL use tldraw's default multi-finger gesture model.

#### Scenario: Member pans and zooms the map
- **WHEN** the canvas is mounted and the member drags (multi-finger on touch) or pans (trackpad)
- **THEN** the canvas viewport SHALL move
- **AND** the member SHALL be able to zoom in and out via the supported gestures

#### Scenario: Member selects and manipulates a shape
- **WHEN** a shape exists on the canvas and the member taps/clicks it
- **THEN** the shape SHALL become selected (selection handles visible)
- **AND** the member SHALL be able to move, resize, and rotate the selected shape via its handles

### Requirement: Debug tap-to-create red box

While the canvas is mounted, tapping/clicking on an empty area of the canvas SHALL create a red box shape. This is a debug-only affordance and SHALL be replaced by proper tool UI in a future change. The red box SHALL be a tldraw geo shape with red fill.

#### Scenario: Member taps empty canvas
- **WHEN** the canvas is mounted and the member taps/clicks an empty area of the canvas
- **THEN** a red box shape SHALL be created at the tapped location

### Requirement: Tap outside selection deselects

When a shape is selected, tapping/clicking on an empty area of the canvas SHALL deselect the shape (remove the selection).

#### Scenario: Member taps empty canvas while a shape is selected
- **WHEN** a shape is selected and the member taps/clicks an empty area of the canvas
- **THEN** the shape SHALL be deselected
- **AND** no selection handles SHALL be visible

### Requirement: Map state is in-memory and per-device

The map's shape state SHALL live only in tldraw's in-memory store. No shape data SHALL be persisted to the database, localStorage, or any remote store. No realtime sharing of shapes SHALL occur between devices. Reloading the page or navigating away SHALL discard all shapes.

#### Scenario: Member creates a shape and reloads
- **WHEN** a member creates a shape on the canvas and reloads the page
- **THEN** the shape SHALL be gone after reload
- **AND** no shape data SHALL have been written to the database or any persistent store

#### Scenario: Two members in the same room
- **WHEN** two members are in the same room on different devices and one creates a shape
- **THEN** the other member SHALL NOT see the shape on their device
- **AND** no realtime sync SHALL occur
