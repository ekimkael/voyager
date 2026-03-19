# Dashboard Layout Design

## Overview

Create a dashboard page with a collapsible sidebar + content layout for authenticated company agents (Admin, Dispatcher, Chauffeur, Lecteur). Migrate the entire app from custom CSS to Tailwind CSS with a custom theme. Integrate edge-iconify with Tabler icons.

## Architecture

### Approach: Nested Layouts (C)

A base layout provides shared HTML infrastructure. The dashboard layout extends it, adding the sidebar. Pages fill the content section.

```
layouts/base.edge (head, vite, tailwind, alpine)
├── layouts/dashboard.edge (sidebar + content section)
│   ├── pages/dashboard/index.edge
│   └── ... future dashboard pages
├── pages/home.edge
├── pages/auth/login.edge
└── pages/auth/signup.edge
```

### Layout Responsibilities

**`resources/views/layouts/base.edge`**
- `<!DOCTYPE html>`, `<head>`, meta tags
- Vite asset loading (Tailwind CSS + Alpine.js)
- Exposes `@!section('body')` for child layouts/pages

**`resources/views/layouts/dashboard.edge`**
- Extends `layouts/base`
- Contains sidebar with Alpine.js state management
- Contains main content area
- Exposes `@!section('content')` for dashboard pages

**Auth/home pages** extend `layouts/base` directly and fill `body`.

## Sidebar Design

### Structure

```
┌─────────────────────┐
│  Logo / App Name    │
├─────────────────────┤
│  Navigation         │
│  ├─ Dashboard       │
│  ├─ Véhicules       │
│  ├─ Routes          │
│  ├─ Arrêts          │
│  └─ Conducteurs     │
├─────────────────────┤
│  Administration     │  ← role-gated
│  ├─ Utilisateurs    │
│  ├─ Rôles           │
│  └─ Paramètres      │
├─────────────────────┤
│  Avatar + Nom       │  ← pinned to bottom
│  Déconnexion        │
└─────────────────────┘
```

### Behavior (Alpine.js)

- **Desktop collapse**: `sidebarCollapsed` toggles between full width (w-60) and icon-only (w-16)
- **Mobile drawer**: `mobileSidebarOpen` shows/hides sidebar as an overlay with backdrop
- **Breakpoint**: `lg` (1024px) — below this, sidebar is hidden by default, hamburger button in a mini header triggers the drawer
- **Collapse button**: chevron icon at top of sidebar toggles `sidebarCollapsed`

### Icons (Tabler via edge-iconify)

| Item | Icon |
|------|------|
| Dashboard | `tabler:layout-dashboard` |
| Véhicules | `tabler:bus` |
| Routes | `tabler:route` |
| Arrêts | `tabler:map-pin` |
| Conducteurs | `tabler:steering-wheel` |
| Utilisateurs | `tabler:users` |
| Rôles | `tabler:shield` |
| Paramètres | `tabler:settings` |
| Collapse | `tabler:chevrons-left` / `tabler:chevrons-right` |

### Role-Based Visibility

The Administration section is only visible to users with `user:read` or `role:read` permissions, verified via the existing `PermissionResolver` service.

**View integration:** The dashboard controller resolves the current user's permissions via `PermissionResolver` and passes them to the view as a `permissions` Set (or similar). The dashboard layout uses Edge conditionals to show/hide the admin section:

```edge
@if(permissions.has('user:read') || permissions.has('role:read'))
  {{-- Administration section --}}
@end
```

## Tailwind CSS Migration

### What Changes

- **Total replacement**: all custom CSS in `app.css` is replaced by Tailwind directives + theme
- **All existing pages** (home, login, signup) are re-styled with Tailwind utility classes
- **All Edge components** are updated to use Tailwind classes:
  - `button.edge`, `link.edge`, `avatar.edge`
  - `form/index.edge`, `field/root.edge`, `field/label.edge`, `field/error.edge`
  - `input/control.edge`, `textarea/control.edge`, `select/control.edge`
  - `checkbox/group.edge`, `checkbox/control.edge`, `radio/group.edge`, `radio/control.edge`
  - `alert/root.edge`, `alert/title.edge`, `alert/description.edge`
- **Partials** (header, flash_alerts) are migrated to Tailwind

### Theme

```css
@import 'tailwindcss';

@theme {
    /* Light Theme */
    --color-surface: var(--color-white);
    --color-surface-alt: var(--color-neutral-50);
    --color-on-surface: var(--color-neutral-600);
    --color-on-surface-strong: var(--color-neutral-900);
    --color-primary: var(--color-black);
    --color-on-primary: var(--color-neutral-100);
    --color-secondary: var(--color-neutral-800);
    --color-on-secondary: var(--color-white);
    --color-outline: transparent;
    --color-outline-strong: var(--color-neutral-800);

    /* Dark Theme */
    --color-surface-dark: var(--color-neutral-950);
    --color-surface-dark-alt: var(--color-neutral-900);
    --color-on-surface-dark: var(--color-neutral-300);
    --color-on-surface-dark-strong: var(--color-white);
    --color-primary-dark: var(--color-white);
    --color-on-primary-dark: var(--color-black);
    --color-secondary-dark: var(--color-neutral-300);
    --color-on-secondary-dark: var(--color-black);
    --color-outline-dark: var(--color-neutral-700);
    --color-outline-dark-strong: var(--color-neutral-300);

    /* Shared Colors */
    --color-info: var(--color-sky-500);
    --color-on-info: var(--color-white);
    --color-success: var(--color-green-500);
    --color-on-success: var(--color-white);
    --color-warning: var(--color-amber-500);
    --color-on-warning: var(--color-white);
    --color-danger: var(--color-red-500);
    --color-on-danger: var(--color-white);

    /* Border Radius */
    --radius-radius: var(--radius-2xl);
}
```

### Vite Configuration

Add `@tailwindcss/vite` plugin to `vite.config.ts`. CSS entry point remains `resources/css/app.css`.

## Edge-Iconify Integration

### Installation

```bash
npm i edge-iconify @iconify-json/tabler
```

### Configuration

Create `start/view.ts` to configure edge-iconify:

```typescript
import edge from 'edge.js'
import { edgeIconify, addCollection } from 'edge-iconify'
import { icons as tablerIcons } from '@iconify-json/tabler'

addCollection(tablerIcons)
edge.use(edgeIconify)
```

### Usage in Templates

```edge
@svg('tabler:bus', { class: 'size-5' })
```

## New Dependencies

- `tailwindcss`
- `@tailwindcss/vite`
- `edge-iconify`
- `@iconify-json/tabler`

## Files

### New Files

| File | Purpose |
|------|---------|
| `resources/views/layouts/base.edge` | Base HTML layout (head, vite, alpine) |
| `resources/views/layouts/dashboard.edge` | Dashboard layout (sidebar + content) |
| `resources/views/pages/dashboard/index.edge` | Empty dashboard page |
| `start/view.ts` | Edge-iconify configuration |
| `app/controllers/dashboard_controller.ts` | Dashboard controller (resolves permissions, renders view) |

### Modified Files

| File | Change |
|------|--------|
| `resources/css/app.css` | Replace custom CSS with Tailwind + theme |
| `resources/views/components/layout.edge` | **Removed.** Replaced by `layouts/base.edge` which serves the same purpose (root HTML shell). Existing pages that use `@layout('components/layout')` will be updated to use `@layout('layouts/base')`. |
| `resources/views/pages/home.edge` | Re-style with Tailwind |
| `resources/views/pages/auth/login.edge` | Re-style with Tailwind |
| `resources/views/pages/auth/signup.edge` | Re-style with Tailwind |
| `resources/views/components/*.edge` | Migrate all components to Tailwind |
| `resources/views/partials/header.edge` | Migrate to Tailwind |
| `vite.config.ts` | Add @tailwindcss/vite plugin |
| `package.json` | Add new dependencies |
| `start/routes.ts` | Add `/dashboard` route |

## Routing

```
GET /dashboard → DashboardController.index [auth + tenant middleware]
```

The dashboard route is protected by both `auth` and `tenant` middleware (existing). `DashboardController` resolves the user's permissions and passes them to the view.

## Out of Scope

- **Dark mode toggle**: The dark theme variables are defined in the Tailwind theme for future use, but dark mode activation (class-based or `prefers-color-scheme`) is not part of this iteration.
