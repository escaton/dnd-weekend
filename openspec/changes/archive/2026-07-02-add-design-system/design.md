## Context

The web client (`apps/web`) is a React 19 + Vite SPA using TanStack Router, tRPC, and Supabase auth. The UI is currently built with CSS Modules (`src/styles/*.module.css`) containing hardcoded light colors (`#ccc`, `#f5f5f5`, `#4285f4`), raw HTML elements (`<select>`, `confirm()`), and zero responsive behavior. There are 4 routes (sign-in, characters, rooms list, room detail) and 2 components (CharacterList, NewCharacterForm). The app has no global stylesheet, no icon set, and no component library.

## Goals / Non-Goals

**Goals:**
- Establish a dark, DnD-themed visual language with good contrast (WCAG AA) and minimal decoration
- Adopt a themable component library with a large community, stable track record, and excellent docs — where upgrades don't break our code
- Provide a complete set of reusable UI primitives (buttons, inputs, dropdowns, dialogs, panels, etc.) so future features get consistent UI for free
- Make the app usable on mobile (320px+) with touch-friendly targets and responsive layouts
- Use a proper icon library instead of text-only buttons and links

**Non-Goals:**
- Light theme toggle (dark-only for now; the token system supports adding light mode later)
- Custom illustrations, animated decorations, or heavy fantasy ornamentation (minimal decoration per user request)
- Server-side rendering or streaming — this is a client-side SPA
- Changing any API, database, auth, or infrastructure behavior
- Designing new features beyond the existing 4 routes — this change restyles existing UI, it does not add pages

## Decisions

### 1. Component library: shadcn/ui (Radix UI + Tailwind CSS)

**Choice:** shadcn/ui — a collection of accessible, copy-owned components built on Radix UI primitives and styled with Tailwind CSS and CSS variables.

**Rationale:**
- **No breaking releases**: Components are copied into the project (we own the source). Upgrading the underlying Radix primitives is opt-in and non-breaking. This directly satisfies the user's "stable track of non-breaking releases" requirement.
- **Massive community**: ~80k+ GitHub stars, active Discord, extensive third-party ecosystem. One of the most popular React UI approaches since 2023.
- **Excellent docs**: shadcn/ui docs are comprehensive, with live examples, copy-paste snippets, and per-component API references.
- **Themable**: All components styled via CSS custom properties (HSL tokens). Re-theming = changing CSS variables, not rewriting component code.
- **Accessible**: Built on Radix UI, which provides WAI-ARIA-compliant, keyboard-navigable primitives out of the box.
- **Minimal by default**: Components are unstyled-leaning — clean borders, no heavy shadows, no gradients. Fits "minimal decorations."
- **React 19 compatible**: Radix UI and shadcn/ui both support React 19.

**Alternatives considered:**

| Library | Community | Docs | Stability | Rejected because |
|---|---|---|---|---|
| MUI (Material-UI) | Massive | Excellent | Mature | Material Design is opinionated; making a custom DnD theme requires fighting the framework's styling. Heavy bundle. |
| Chakra UI v3 | Large | Good | Had v2→v3 breaking changes | Breaking-release track record doesn't match "stable non-breaking" requirement. |
| Ant Design | Massive | Good | Mature | Enterprise Chinese design language; very opinionated. Hard to make minimal. |
| Mantine v7 | Good | Excellent | Had v6→v7 breaking changes | Breaking-release track record concern. |
| Radix UI Themes (styled) | Moderate | Good | Stable | Smaller community than shadcn/ui; less ecosystem. Would also need Tailwind for utility styling. |
| Park UI / Ark UI | Growing | New | New | Too new, smaller community, not enough track record yet. |

**How it works in this project:** We initialize shadcn/ui's CLI to scaffold component files into `apps/web/src/components/ui/`. Each component is a plain `.tsx` file we own. We configure the design tokens (CSS variables) in a global stylesheet. Components import Radix primitives as npm dependencies but the component composition and styling live in our repo.

### 2. Styling engine: Tailwind CSS v4

**Choice:** Tailwind CSS v4 with `@tailwindcss/vite`.

**Rationale:**
- Required by shadcn/ui (all components use Tailwind utility classes).
- v4 introduces a CSS-first config (`@theme` in CSS, no `tailwind.config.js` needed), faster builds, and native CSS variable support.
- The Vite plugin integrates cleanly with the existing Vite + `@cloudflare/vite-plugin` setup.
- Utility-first is efficient for building and adjusting UI without context-switching to separate CSS files.

**Alternatives considered:**
- **Keep CSS Modules**: No migration, but shadcn/ui requires Tailwind. Would mean hand-building every component, defeating the purpose of a component library.
- **Tailwind v3**: v4 is the current stable release with better DX. No reason to use v3 on a new project.

### 3. Icons: Lucide React

**Choice:** `lucide-react` — the default icon set for shadcn/ui.

**Rationale:**
- 1,500+ icons with consistent stroke style (1.5px outline), clean and minimal — matches "minimal decorations."
- Tree-shakeable: only imported icons are bundled.
- Active maintenance, massive community, TypeScript-native.
- Default pairing with shadcn/ui — zero integration friction.

**Alternatives considered:**
- **Heroicons**: Good but fewer icons (~300), less comprehensive for a full app.
- **Phosphor Icons**: More style variants (thin/regular/bold/fill) but heavier; overkill for minimal decoration.
- **react-icons (Font Awesome / Feather)**: Aggregated but inconsistent across icon families, larger bundle, less tree-shakeable.

### 4. Dark DnD theme token system

**Choice:** A dark-first color palette defined as HSL CSS custom properties, following the shadcn/ui token convention. No light theme — dark only.

**Palette (HSL values):**

| Token | HSL | Hex | Purpose |
|---|---|---|---|
| `--background` | `20 14% 4%` | `#0a0907` | App background — deep dark warm charcoal |
| `--foreground` | `40 20% 95%` | `#f7f3ec` | Primary text — warm near-white (parchment) |
| `--card` | `20 12% 7%` | `#11100d` | Cards/panels — slightly elevated surface |
| `--card-foreground` | `40 20% 95%` | `#f7f3ec` | Text on cards |
| `--popover` | `20 12% 7%` | `#11100d` | Dropdowns/dialogs surface |
| `--popover-foreground` | `40 20% 95%` | `#f7f3ec` | Text on popovers |
| `--primary` | `38 80% 55%` | `#e0a518` | Amber/gold — candlelight, treasure |
| `--primary-foreground` | `20 14% 4%` | `#0a0907` | Dark text on gold |
| `--secondary` | `20 8% 14%` | `#242220` | Secondary buttons/surfaces |
| `--secondary-foreground` | `40 15% 85%` | `#ddd6cb` | Text on secondary |
| `--muted` | `20 8% 12%` | `#1f1d1a` | Muted backgrounds |
| `--muted-foreground` | `35 8% 60%` | `#9a9288` | Muted/placeholder text |
| `--accent` | `20 10% 14%` | `#242220` | Hover backgrounds |
| `--accent-foreground` | `40 20% 95%` | `#f7f3ec` | Text on hover |
| `--destructive` | `0 65% 50%` | `#d33d3d` | Danger actions — deep crimson |
| `--destructive-foreground` | `40 20% 95%` | `#f7f3ec` | Text on destructive |
| `--border` | `20 8% 16%` | `#2a2724` | Borders/dividers — subtle warm |
| `--input` | `20 8% 16%` | `#2a2724` | Input borders |
| `--ring` | `38 80% 55%` | `#e0a518` | Focus ring — gold |
| `--radius` | `0.5rem` | — | Corner radius |

**Contrast verification (WCAG AA, ≥4.5:1 for normal text):**
- Background → Foreground: ~15:1 ✓
- Background → Primary (gold on dark): ~8.5:1 ✓
- Background → Muted-foreground: ~6.4:1 ✓
- Primary → Primary-foreground: ~8.5:1 ✓
- Card → Card-foreground: ~14:1 ✓

**Typography:** System font stack (no custom font download — keeps bundle small and avoids FOUT). Headings get slightly tighter letter-spacing and higher weight for a "carved stone" feel. Body text uses default tracking.

### 5. Mobile-first responsive layout: AppShell

**Choice:** A responsive AppShell component that adapts between desktop and mobile.

**Desktop (≥768px):**
- Left sidebar (240px) with logo, navigation links (Characters, Rooms), and a user menu at the bottom (avatar + email, sign-out)
- Main content area centered with `max-width: 700px` and padding
- Sidebar is always visible (persistent)

**Mobile (<768px):**
- Top bar with logo and a hamburger button
- Navigation opens as a Radix Dialog/Sheet sliding from the left, or a bottom navigation bar with icon + label tabs
- Content is full-width with padding
- Dialogs become full-screen (no centered modal that's too small on mobile)

**Touch targets:** All interactive elements use `min-height: 44px` (Apple HIG) / `min-height: 48px` (Material) for tap targets.

### 6. Component inventory

Components to scaffold from shadcn/ui:

| Component | Radix Primitive | Used for |
|---|---|---|
| Button | — | Primary/secondary/ghost/destructive actions |
| Input | — | Text/email inputs |
| Label | — | Form labels |
| Textarea | — | Multi-line text (future: character notes) |
| Select | `@radix-ui/react-select` | Character picker, role picker |
| DropdownMenu | `@radix-ui/react-dropdown-menu` | User menu, row action menus |
| Dialog | `@radix-ui/react-dialog` | Delete confirmation, transfer GM |
| Card | — | Panels (character cards, room cards, sections) |
| Badge | — | Role labels (GM/Player), status (active/pending) |
| Avatar | `@radix-ui/react-avatar` | User avatars in room members |
| Separator | `@radix-ui/react-separator` | Section dividers |
| Tooltip | `@radix-ui/react-tooltip` | Icon button hints |
| Toast (Sonner) | `sonner` | Success/error notifications |
| Sheet | `@radix-ui/react-dialog` | Mobile navigation drawer |
| ScrollArea | `@radix-ui/react-scroll-area` | Long lists (room members) |

### 7. Utility: `cn()` helper

A `cn()` utility combining `clsx` + `tailwind-merge` for conditional class composition. Standard shadcn/ui pattern. Lives at `apps/web/src/lib/utils.ts`.

## Risks / Trade-offs

- **Tailwind v4 is newer than v3** → It's the current stable release with a Vite plugin. The `@tailwindcss/vite` plugin is officially supported. Risk is low; v4 has been stable since Jan 2025.
- **shadcn/ui components are copy-owned** → We maintain them. If Radix releases a breaking change in a primitive, we need to update our copied component. Mitigation: Radix UI has an excellent track record of non-breaking releases, and updates are opt-in. This is also the core benefit — no forced breaking changes.
- **Bundle size** → Radix primitives are tree-shakeable and only the components we use are bundled. Lucide icons are tree-shakeable. Tailwind v4 purges unused utilities. Net impact should be minimal compared to the current CSS Modules.
- **React 19 compatibility** → Radix UI supports React 19 (since Radix 1.1.x). shadcn/ui supports React 19. `sonner` supports React 19. No known incompatibilities.
- **No light theme** → Users who prefer light mode won't have one. Mitigation: The CSS variable token system is designed for easy addition of a light theme later (add `:root` / `.light` overrides). This is a non-goal for now per user request.

## Migration Plan

1. **Add dependencies** (Tailwind v4, Radix primitives, Lucide, utils) — no existing code breaks
2. **Add global stylesheet** with theme tokens and Tailwind import — no existing code breaks
3. **Scaffold UI components** into `src/components/ui/` — new files, no conflict
4. **Add AppShell** to `__root.tsx` — wraps existing routes; existing routes continue to work (just with new outer chrome)
5. **Restyle route by route**: sign-in → characters → rooms list → room detail. Each route is independently restylable and deployable.
6. **Replace `confirm()` calls** with Dialog components
7. **Replace native `<select>`** with Select component
8. **Delete CSS Module files** after all routes are migrated
9. **Verify**: typecheck, lint, format, test, and manual browser testing on mobile + desktop viewports

**Rollback:** If issues arise, revert the branch. No database or API changes means no data migration or rollback complexity. The branch can be discarded entirely with no side effects.
