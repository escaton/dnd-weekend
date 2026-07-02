## Context

The room route (`apps/web/src/routes/rooms.$id.tsx`) is currently a single-column, vertically-stacked settings page rendered inside AppShell's `<main class="max-w-2xl mx-auto p-4 md:p-8">`. There is no gameplay surface. The room's tRPC procedures (`room.get`, `room.invite`, `room.join`, `room.setCharacter`, `room.transfer`, `room.remove`, `room.leave`, `room.delete`) all exist and work; the schema has a `rooms.title` column with no mutator procedure. `room.get` returns a `viewerStatus` discriminant (`active` | `pending`) plus a `FORBIDDEN` error for non-members.

We are replacing the room page's UI with a map-first layout built on tldraw, and refactoring AppShell so it no longer imposes centered/padded content on every route. The map is in-memory only for this iteration — no persistence, no realtime, no schema work.

Stakeholders: solo developer; the change is reversible (UI-only) and touches two other routes (`characters`, `rooms.index`) for the AppShell migration.

## Goals / Non-Goals

**Goals:**
- Full-bleed room page with the tldraw map as the primary content.
- Paused-by-default state where the canvas is not mounted; Play mounts it once (one-way trip per session).
- Dark-themed map background matching the existing `globals.css` tokens (background `hsl(20 14% 4%)`).
- Settings panel preserved (all existing room actions still reachable): right side on desktop, segmented control Map/Room on mobile.
- Pending invitees see a join screen that replaces the page — the room page does not load for them.
- AppShell renders routes full-bleed by default; routes that need centered content self-center.
- Touch interactions work (pan, zoom, select, move, resize, rotate).

**Non-Goals:**
- Room rename (no backend procedure; dropped from this change).
- Map state persistence or realtime sharing.
- Proper object-creation tool UI — tap-to-create red box is debug-only and will be replaced later.
- Pause affordance after Play (one-way trip).
- Any backend / schema / migration changes.

## Decisions

### D1. AppShell: drop default centering, routes self-center
**Choice:** Remove `max-w-2xl mx-auto p-4 md:p-8` from AppShell's `<main>`. Each route decides its own container.
**Why:** The room page needs full-bleed; imposing centered layout at the shell level forces every full-bleed route to undo it. Self-centering routes is a one-line wrapper and keeps the shell neutral.
**Alternatives considered:**
- *Prop-based "fullscreen" variant on AppShell* — adds coupling between the shell and route knowledge. Rejected: the shell shouldn't know which routes want full-bleed.
- *Room route opts out of AppShell entirely* — loses the shared header/nav for free. Rejected: header consistency matters.
**Migration:** `characters.tsx` and `rooms.index.tsx` wrap their existing content in `<div className="mx-auto max-w-2xl p-4 md:p-8">`. `index.tsx` and `sign-in.tsx` are unaffected (sign-in already bypasses `<main>`; index only redirects).

### D2. tldraw integration surface: `hideUi` + nulled components
**Choice:** `<Tldraw hideUi components={{ ...all null }}>`. No default toolbar, menus, panels, or context menu.
**Why:** We are building a focused map experience, not a generic drawing app. Hiding the UI lets us add affordances one by one later (debug red box now, real tools later).
**Alternatives considered:**
- *TldrawEditor + TldrawUi subcomponents* — more granular but more setup; only worth it if we keep some default UI. Rejected for now; we keep zero default UI.
- *Build a custom canvas from scratch* — would re-implement pan/zoom/select/rotate/resize. Rejected: that work is the entire reason we're using tldraw.
**Implementation note:** `hideUi` does not hide the context menu; we additionally pass `components.ContextMenu: null`. The license watermark ("Made with tldraw") is not a UI component and remains visible under the free/trial license — this is acceptable for now and required by the tldraw license.

### D3. Paused state: canvas unmounted, themed overlay
**Choice:** Paused = `<Tldraw>` is not in the React tree at all. Render a themed background (using `bg-background` token) with a centered Play button. Pressing Play flips a `useState` boolean that mounts the canvas; the boolean never resets during the session.
**Why:** Mounting a hidden canvas still costs WebGL/memory and would render the watermark invisibly. Keeping it unmounted is the cleanest "this page does nothing until you press play" semantics.
**Alternatives considered:**
- *Mount canvas hidden, toggle visibility via CSS* — wastes resources; rejected.
- *Pause button to toggle back* — explicitly out of scope (one-way trip).
**State scope:** per-device local React state in the route component. Not persisted, not synced. Refreshing the page returns to paused.

### D4. Mobile: segmented control, not bottom sheet
**Choice:** Below the header, render a two-segment control (Map | Room). Each segment fills the area below the control; only one is visible at a time. Map is the default landing segment. Room is a scrollable column with all settings stacked.
**Why:** A bottom sheet would overlap the map when expanded and forces a "peek vs expanded" model. Segmented swap is simpler and gives each view the full available height. The user confirmed this pattern.
**Alternatives considered:**
- *Bottom sheet (draggable peek → expand)* — covers the map; rejected.
- *Tabs at the bottom (native-app style)* — conflicts with the existing header; rejected.
**Desktop:** No segmented control. Right-side settings panel (~320px, fixed) is always visible alongside the map.

### D5. Join gate: replace the page, not overlay it
**Choice:** When `room.get` returns `viewerStatus === "pending"`, the route renders only the join screen (centered, full-bleed). The map and settings panel are not rendered at all.
**Why:** The user said the room page should not load for a pending viewer — overlaying would mount the map underneath. Replacing is consistent with the existing behavior (which today replaces the whole page).
**Implementation:** `if (room.viewerStatus === "pending") return <RoomJoinScreen ... />` before the main layout. The join mutation invalidates `room.get`; on success the query refetches and the route re-renders into the active layout.

### D6. tldraw assets & license key
**Choice:** Use tldraw's default CDN asset URLs (no self-hosting) for v1. Pass the license key via `VITE_TLDRAW_LICENSE_KEY` env var, which tldraw auto-detects.
**Why:** Self-hosting assets is an optimization (offline / controlled CDN); not needed yet. The env var is the documented Vite convention and keeps the prop out of the component.
**License tier:** User has applied for a hobby license and received a 14-day trial key. After 14 days, fall back to either the hobby key (if approved, watermark remains) or dev mode (localhost only). The watermark is acceptable under all free tiers.
**Open dependency:** Add `tldraw` to `apps/web/package.json`. Pin to the latest stable v3.x. The package is source-available under the tldraw SDK license (not MIT); the license file must be honored (watermark kept, validation not tampered with).

### D7. Dark theme matching
**Choice:** Apply the design-system `--background` token (`hsl(20 14% 4%)`) as the tldraw canvas background via the `components.Background` slot override. No grid for now.
**Why:** The default tldraw background is white; that clashes with the warm-charcoal app theme. Override via the documented `Background` component slot rather than CSS hacks.
**Alternatives considered:**
- *CSS override on `.tldraw__background`* — fragile, breaks on tldraw upgrades. Rejected.

## Risks / Trade-offs

- **[tldraw bundle size]** tldraw is a large dependency (~1MB+ gzipped). Mitigation: it's the entire point of the change (we get pan/zoom/select/rotate/resize for free); lazy-load the `RoomMap` component with `React.lazy` + `Suspense` so the room route's initial bundle stays lean.
- **[Watermark persists]** The "Made with tldraw" badge shows under all free/trial tiers. Mitigation: acceptable per the license; remove only with a paid business license. Document this in the design so it's not a surprise.
- **[Trial license expiry]** The 14-day trial key will stop validating after 14 days, causing console errors in production (the SDK still runs in dev). Mitigation: track the expiry; convert to hobby or commercial license before it lapses. Dev mode (localhost) is unaffected.
- **[Touch gesture ambiguity]** tldraw defaults to two-finger pan + pinch zoom, single-finger to draw/select — not the one-finger-pan mental model mobile map users expect. Mitigation: for this iteration, tap-to-create is debug-only, so the gesture model is unambiguous. Revisit when real tools land.
- **[AppShell migration affects 2 other routes]** `characters` and `rooms.index` must self-center after the shell drops its default container. Mitigation: one-line wrapper per route; verified by visual diff.
- **[No persistence = lost work]** Refreshing the page or navigating away discards all shapes. Mitigation: acceptable for this iteration (explicitly out of scope); a follow-up change will add persistence.
