## Why

The room page is currently a vertically-stacked settings list with no actual gameplay surface — once you've invited players and set your character, there is nothing to *do* in a room. To make rooms useful, they need a shared map at the center. This change replaces the room page with a map-first layout built on tldraw, and reorganizes the existing room settings (invite, members, transfer GM, delete/leave) into a side panel on desktop and a segmented control on mobile.

## What Changes

- **BREAKING (UI only)**: AppShell `<main>` no longer centers or pads its content by default. It renders routes full-bleed. Routes that want centered content self-center.
- New room page layout: full-bleed, map-first. Active members see a tldraw map canvas as the primary content.
- Right-side settings panel on desktop (~320px), always visible alongside the map.
- Mobile: segmented control under the header with Map/Room segments; Map is the default landing segment; segments swap the visible area (one at a time).
- Pending invitees see a join screen that **replaces** the entire page (no map, no panel) until they join. The room page does not load for a pending viewer.
- Map view: paused by default (canvas not mounted, themed background + Play button overlay). Pressing Play mounts the tldraw canvas; one-way trip for the session (no Pause affordance).
- Map canvas: `<Tldraw hideUi>` with all default UI components nulled. Dark theme matching the design-system background tokens.
- Map interactions: pan, zoom, select, move, resize, rotate. Debug-only: tap on empty canvas creates a red box; tap outside selection deselects. Touch devices supported.
- Map state: in-memory only, per-device. No persistence, no realtime sharing, no schema changes.
- Out of scope: room rename (no backend procedure yet), proper tool UI, persistence, multiplayer.

## Capabilities

### New Capabilities

- `room-map`: The room page UI experience — full-bleed map-first layout, tldraw-based map canvas with paused/playing states, settings panel (desktop) / segmented control (mobile), and the join gate for pending invitees.

### Modified Capabilities

- `design-system`: The "Mobile-first responsive layout" requirement changes — AppShell `<main>` SHALL render routes full-bleed by default (no default max-width or padding); routes that need centered content self-center. The current "main content SHALL be centered with a maximum width" line is replaced.

## Impact

- `apps/web/src/components/app-shell.tsx` — drop default centering/padding from `<main>`; keep header.
- `apps/web/src/routes/characters.tsx`, `apps/web/src/routes/rooms.index.tsx` — wrap their content in `max-w-2xl mx-auto p-4 md:p-8` to preserve current appearance.
- `apps/web/src/routes/rooms.$id.tsx` — full rewrite: join gate → map-first layout with side panel (desktop) / segmented control (mobile).
- New components: `RoomMap` (tldraw wrapper), `RoomSettingsPanel` (extracted from current route), `RoomJoinScreen`.
- New dependency: `tldraw` npm package added to `apps/web/package.json`.
- New env var: `VITE_TLDRAW_LICENSE_KEY` (14-day trial license); documented in `.env.example`. Dev mode (localhost/HTTP) works without a key.
- No backend changes (no new tRPC procedures, no schema migrations, no persistence).
