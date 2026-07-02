## 1. AppShell full-bleed refactor

- [x] 1.1 Remove `max-w-2xl mx-auto p-4 md:p-8` from `<main>` in `apps/web/src/components/app-shell.tsx`; keep `flex-1 min-h-0`
- [x] 1.2 Wrap `characters.tsx` content in `<div className="mx-auto max-w-2xl p-4 md:p-8">`
- [x] 1.3 Wrap `rooms.index.tsx` content in `<div className="mx-auto max-w-2xl p-4 md:p-8">`
- [ ] 1.4 Visually verify characters and rooms-list pages look unchanged (manual diff)

## 2. tldraw dependency & assets

- [x] 2.1 Add `tldraw` to `apps/web/package.json` (latest stable v3.x); run `pnpm install`
- [x] 2.2 Add `VITE_TLDRAW_LICENSE_KEY` to `.env.example` (placeholder, user pastes the 14-day trial key)
- [ ] 2.3 Prompt user for the 14-day trial license key and write it to `.env` as `VITE_TLDRAW_LICENSE_KEY`
- [ ] 2.4 Verify tldraw loads without license errors in dev (`pnpm dev`, open any test page)

## 3. Room settings extraction

- [x] 3.1 Create `apps/web/src/components/room/RoomSettingsPanel.tsx` and move all settings UI (invite form, members list, per-member character select, transfer GM, delete/leave, delete dialog) out of `rooms.$id.tsx` into it
- [x] 3.2 Keep all existing mutations and queries wired (no behavior change)
- [ ] 3.3 Verify the existing room page still works unchanged when `RoomSettingsPanel` is rendered in place of the old inline markup

## 4. Join gate component

- [x] 4.1 Create `apps/web/src/components/room/RoomJoinScreen.tsx` — centered join screen with optional character select and Join button
- [x] 4.2 Extract the `viewerStatus === "pending"` branch from `rooms.$id.tsx` into this component
- [ ] 4.3 Verify pending invitee flow still works (join → refetch → active layout)

## 5. Room map component

- [x] 5.1 Create `apps/web/src/components/room/RoomMap.tsx` with lazy-loaded `<Tldraw>` (`React.lazy` + `Suspense`)
- [x] 5.2 Pass `hideUi` and null out all default UI component slots (Toolbar, MainMenu, StylePanel, SharePanel, HelpMenu, DebugMenu, ContextMenu, PagesMenu)
- [x] 5.3 Override `components.Background` to render the design-system `--background` color token (no grid)
- [x] 5.4 Implement paused state: when `playing` is false, render themed bg + centered Play button; do not mount `<Tldraw>`
- [x] 5.5 Implement Play: `useState(false)` → on click set `true`; render `<Tldraw>` only when `playing === true`
- [x] 5.6 Implement debug tap-to-create red box: on canvas pointer-down on empty area, `editor.createShape` a geo shape with red fill at the pointer location
- [x] 5.7 Implement tap-outside-deselect: on canvas pointer-down on empty area, `editor.selectNone`
- [ ] 5.8 Verify pan, zoom, select, move, resize, rotate work on desktop (mouse/trackpad)
- [ ] 5.9 Verify the same interactions work on a touch device / mobile emulator

## 6. Room route rewrite

- [x] 6.1 Rewrite `apps/web/src/routes/rooms.$id.tsx` to render full-bleed (no `max-w` container)
- [x] 6.2 Early-return `<RoomJoinScreen>` when `room.viewerStatus === "pending"` (before the main layout)
- [x] 6.3 Desktop layout (`md:flex`): `<RoomMap>` fills `flex-1`, `<RoomSettingsPanel>` fixed `w-80` on the right with `border-l`
- [x] 6.4 Mobile layout: segmented control (Map | Room) below the header; Map default; `useState` segment swap; render `<RoomMap>` or `<RoomSettingsPanel>` based on segment
- [ ] 6.5 Verify loading state and access-denied error branch still render correctly

## 7. Verification

- [x] 7.1 `pnpm typecheck`
- [x] 7.2 `pnpm lint`
- [x] 7.3 `pnpm format:check`
- [x] 7.4 `pnpm test`
- [ ] 7.5 Manual: open room as active member on desktop — map area + right panel visible, Play → canvas mounts, red box on tap, select/move/resize/rotate, tap-outside deselect
- [ ] 7.6 Manual: open room on mobile emulator — segmented control, Map default, Room segment shows settings
- [ ] 7.7 Manual: open room as pending invitee — join screen replaces the page; join → active layout
- [ ] 7.8 Manual: characters and rooms list pages still render centered as before
