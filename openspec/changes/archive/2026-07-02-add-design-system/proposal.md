## Why

The app has no design system — it uses CSS Modules with hardcoded light colors, raw HTML elements (`<select>`, `confirm()`), no iconography, and no responsive layout. The UI is inconsistent across pages, inaccessible on mobile, and every component is styled from scratch. We need a cohesive, dark, DnD-themed visual language with a themable component library so future features get consistent UI for free.

## What Changes

- Introduce **shadcn/ui** (Radix UI primitives + Tailwind CSS) as the component library, giving us copy-owned, accessible, themable components with no breaking-release risk from upstream
- Introduce **Lucide React** as the icon library — clean, minimal, tree-shakeable, and the default pairing with shadcn/ui
- Introduce **Tailwind CSS v4** (Vite plugin) as the styling engine, replacing hand-written CSS Modules with utility classes and CSS-variable-based theming
- Define a **dark DnD theme** via CSS custom properties: deep charcoal background, warm parchment/leather surface tones, amber/gold primary accent, deep red for destructive actions — all tuned for WCAG AA contrast
- Establish a **mobile-first responsive layout**: app shell with collapsible navigation, panels/cards that stack on mobile, dialogs that are full-screen on small viewports, and touch-friendly tap targets
- Build a reusable **component inventory**: Button, Input, Select/Dropdown, Dialog, Card/Panel, Badge, Avatar, Separator, Label, Toast/Alert, Tooltip, and a responsive AppShell (sidebar + topbar on desktop, bottom nav or sheet on mobile)
- Restyle all existing pages (sign-in, characters, rooms list, room detail) to use the new components and theme
- Remove all CSS Module files and hardcoded colors

## Capabilities

### New Capabilities
- `design-system`: Visual design system, component library, icon set, dark DnD theme tokens, and mobile-first responsive layout requirements for the web client

### Modified Capabilities

_None._ The functional requirements of existing capabilities (character management, room management, user auth, app infrastructure) do not change — this is a UI/presentation-layer change only.

## Impact

- **Dependencies**: Adds `tailwindcss` v4, `@tailwindcss/vite`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, and Radix UI primitive packages (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-toast`, `@radix-ui/react-tooltip`, etc.) to `apps/web`
- **Build**: Tailwind v4 Vite plugin replaces zero-config CSS — Vite config gains the Tailwind plugin; `index.html` gains a global stylesheet import
- **Code**: All `.module.css` files in `apps/web/src/styles/` are deleted; all route and component files in `apps/web/src/` are refactored to use the new component library and Tailwind classes
- **No API changes**: tRPC routes, Supabase auth, database schema, and Worker infrastructure are untouched
- **No spec changes**: Existing capability specs remain valid; only presentation changes
