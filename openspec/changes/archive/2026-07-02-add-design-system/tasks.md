## 1. Dependencies & Build Setup

- [x] 1.1 Add Tailwind CSS v4 and `@tailwindcss/vite` to `apps/web` devDependencies, configure the Vite plugin in `vite.config.ts`
- [x] 1.2 Add Radix UI primitive packages to `apps/web` dependencies: `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-avatar`, `@radix-ui/react-separator`, `@radix-ui/react-tooltip`, `@radix-ui/react-scroll-area`, `@radix-ui/react-label`, `@radix-ui/react-slot`
- [x] 1.3 Add `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `sonner` to `apps/web` dependencies
- [x] 1.4 Run `pnpm install` and verify the workspace resolves all new packages

## 2. Theme Tokens & Utilities

- [x] 2.1 Create `apps/web/src/styles/globals.css` with Tailwind v4 `@import "tailwindcss"` and `@theme` block mapping shadcn/ui CSS custom properties (HSL tokens) to the dark DnD palette from the design doc
- [x] 2.2 Add `@layer base` rules in `globals.css` for body background/foreground, border color, focus ring, and smooth scrolling
- [x] 2.3 Import `globals.css` in `apps/web/index.html` (or in `main.tsx`) so it loads before route components
- [x] 2.4 Create `apps/web/src/lib/utils.ts` with the `cn()` helper (`clsx` + `tailwind-merge`)

## 3. Scaffold UI Components

- [x] 3.1 Create `apps/web/src/components/ui/button.tsx` — Button with variants (default, secondary, ghost, destructive, outline) and sizes (default, sm, lg, icon) via `class-variance-authority`
- [x] 3.2 Create `apps/web/src/components/ui/input.tsx` and `apps/web/src/components/ui/textarea.tsx` — styled form inputs
- [x] 3.3 Create `apps/web/src/components/ui/label.tsx` — Radix Label wrapper
- [x] 3.4 Create `apps/web/src/components/ui/select.tsx` — Radix Select wrapper (Select, SelectTrigger, SelectContent, SelectItem)
- [x] 3.5 Create `apps/web/src/components/ui/dropdown-menu.tsx` — Radix DropdownMenu wrapper (DropdownMenu, Trigger, Content, Item, Separator)
- [x] 3.6 Create `apps/web/src/components/ui/dialog.tsx` — Radix Dialog wrapper (Dialog, Trigger, Content, Header, Footer, Title, Description)
- [x] 3.7 Create `apps/web/src/components/ui/card.tsx` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- [x] 3.8 Create `apps/web/src/components/ui/badge.tsx` — Badge with variants (default, secondary, destructive, outline)
- [x] 3.9 Create `apps/web/src/components/ui/avatar.tsx` — Radix Avatar wrapper (Avatar, AvatarImage, AvatarFallback)
- [x] 3.10 Create `apps/web/src/components/ui/separator.tsx` — Radix Separator wrapper
- [x] 3.11 Create `apps/web/src/components/ui/tooltip.tsx` — Radix Tooltip wrapper (Tooltip, Trigger, Content)
- [x] 3.12 Create `apps/web/src/components/ui/sonner.tsx` — Sonner Toaster wrapper with theme tokens
- [x] 3.13 Create `apps/web/src/components/ui/sheet.tsx` — Radix Dialog-based Sheet (slide-in drawer) for mobile navigation
- [x] 3.14 Create `apps/web/src/components/ui/scroll-area.tsx` — Radix ScrollArea wrapper

## 4. AppShell & Navigation

- [x] 4.1 Create `apps/web/src/components/app-shell.tsx` — responsive layout: persistent sidebar (≥768px) with nav links + user menu; top bar + Sheet drawer (<768px) with same nav
- [x] 4.2 Add Lucide icons to navigation items (e.g., `Users` for Characters, `DoorOpen` for Rooms, `LogOut` for Sign out)
- [x] 4.3 Integrate AppShell into `apps/web/src/routes/__root.tsx` wrapping the `<Outlet />`
- [x] 4.4 Move the sign-out action and user avatar/email display into the AppShell user menu (DropdownMenu)

## 5. Restyle Sign-In Page

- [x] 5.1 Refactor `apps/web/src/routes/sign-in.tsx` to use Card, Button, and Lucide icon components; remove `sign-in.module.css` import
- [x] 5.2 Delete `apps/web/src/styles/sign-in.module.css`

## 6. Restyle Characters Page

- [x] 6.1 Refactor `apps/web/src/components/NewCharacterForm.tsx` to use Input, Button, Label, and Toast for success/error feedback; remove `new-character-form.module.css` import
- [x] 6.2 Refactor `apps/web/src/components/CharacterList.tsx` to use Card and Button (with Trash2 icon); replace delete confirmation with a Dialog; remove `character-list.module.css` import
- [x] 6.3 Refactor `apps/web/src/routes/characters.tsx` to use AppShell layout (remove the inline header/nav, rely on AppShell); remove `characters.module.css` import
- [x] 6.4 Delete `apps/web/src/styles/new-character-form.module.css`, `character-list.module.css`, and `characters.module.css`

## 7. Restyle Rooms List Page

- [x] 7.1 Refactor `apps/web/src/routes/rooms.index.tsx` to use Input, Button, Card, and Badge components for the room list; remove `rooms.module.css` import where applicable
- [x] 7.2 Add Lucide icons (e.g., `Plus` for create, `Users` for member count) and use Badge for role display

## 8. Restyle Room Detail Page

- [x] 8.1 Refactor `apps/web/src/routes/rooms.$id.tsx` to use AppShell layout; remove inline header/nav
- [x] 8.2 Replace the invite `<form>` with Input + Button components and Toast for feedback
- [x] 8.3 Replace native `<select>` elements with the Select component for character seating and GM transfer
- [x] 8.4 Replace member list `<ul>` with Card components per member, using Avatar, Badge (role/status), and DropdownMenu for member actions (Remove)
- [x] 8.5 Replace `confirm()` for room deletion with a Dialog component (AlertDialog or Dialog with destructive Button)
- [x] 8.6 Remove `rooms.module.css` import and delete `apps/web/src/styles/rooms.module.css`

## 9. Cleanup

- [x] 9.1 Verify no CSS Module files remain in `apps/web/src/styles/` (all should be deleted)
- [x] 9.2 Verify no `.module.css` imports remain in any source file
- [x] 9.3 Remove any now-unused dependencies if applicable

## 10. Verification

- [x] 10.1 Run `pnpm typecheck` and fix any type errors
- [x] 10.2 Run `pnpm lint` and fix any lint errors
- [x] 10.3 Run `pnpm format:check` and run `pnpm format` if needed
- [x] 10.4 Run `pnpm test` and ensure all tests pass
- [x] 10.5 Manual browser test: verify dark DnD theme renders on all 4 routes (sign-in, characters, rooms list, room detail)
- [x] 10.6 Manual browser test: verify responsive layout on mobile viewport (≤375px) — sidebar collapses, dialogs are full-screen, touch targets are ≥44px
- [x] 10.7 Manual browser test: verify keyboard navigation (Tab through all interactive elements, focus rings visible, dialogs trap focus)
