# AGENTS.md — Voyager

Guide for AI coding agents (Claude, Codex, Copilot…). `CLAUDE.md` imports this file; keep shared rules here, not there.
Workflow rules (Git Flow, commits, PRs, changelog, release) live in [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/release.md](docs/release.md).
Feature specs and implementation plans live in [docs/superpowers/specs/](docs/superpowers/specs/) and [docs/superpowers/plans/](docs/superpowers/plans/); ADRs go in [docs/adr/](docs/adr/).

## Project

Multi-tenant SaaS platform for bus transport companies: bookings, ticketing and fleet management. Each tenant is a `Company`; every entity is scoped to it. Server-rendered AdonisJS app (Edge.js views, Alpine.js for interactivity), PostgreSQL database.

## Stack

Read the docs at these exact versions before changing code that uses them.

| Tool         | Version | Role                   | Docs                       |
| ------------ | ------- | ---------------------- | -------------------------- |
| AdonisJS     | 7       | Backend framework      | https://docs.adonisjs.com  |
| Lucid ORM    | 22      | PostgreSQL ORM         | https://lucid.adonisjs.com |
| Edge.js      | 6       | Template engine        | https://edgejs.dev         |
| VineJS       | 4       | Validation             | https://vinejs.dev         |
| Japa         | 5       | Tests                  | https://japa.dev           |
| Alpine.js    | 3       | Frontend interactivity | https://alpinejs.dev       |
| Tailwind CSS | 4       | Styles                 | https://tailwindcss.com    |
| Vite         | 7       | Build & HMR            | https://vite.dev           |

## Commands

```bash
npm run dev         # Dev server with HMR
npm run build       # Production build
npm test            # Japa tests
npm run lint        # ESLint
npm run format      # Prettier
npm run typecheck   # TypeScript check
npm run validate:changelog
```

## Structure

```
app/
  controllers/     # One file per resource, standard CRUD methods
  models/          # Lucid models, UUID primary keys
  validators/      # VineJS validators (vine.compile)
  middleware/      # Auth, company (tenant), permission, throttle
  services/        # Business logic (SeatAllocator, PermissionResolver, etc.)
  abilities/       # Bouncer abilities
  policies/        # Bouncer policies
  mails/           # Mail classes (extend BaseMail)
  events/          # Event definitions
start/
  routes/          # One file per feature (auth, bookings, cities, trips...)
  kernel.ts        # Middleware stack
  env.ts           # Environment variable schema
database/
  migrations/      # UUID PKs, gen_random_uuid(), native PostgreSQL enums
  seeders/
resources/
  views/
    components/    # Reusable Edge.js components
    partials/      # Global partials
    pages/         # Pages organized by feature
docs/
  superpowers/     # Specs and plans per feature
  adr/             # Architecture decision records
```

## Conventions

### File naming

- Controllers: `snake_case_controller.ts` (e.g. `bookings_controller.ts`)
- Models: `snake_case.ts` (e.g. `user.ts`), class in PascalCase
- Validators: `snake_case.ts`
- Middleware: `snake_case_middleware.ts`
- Routes: `snake_case.ts` in `start/routes/`

### Code

- **Always validate** inputs with `request.validateUsing(validator)` — https://vinejs.dev/docs/introduction
- **Flash messages** for user feedback: `session.flash('success', '...')`
- **POST-Redirect-GET**: always redirect after a form submit.
- **Explicit preload** of relations: `.preload('relation')`, never lazy loading — https://lucid.adonisjs.com/docs/relationships/introduction
- **Transactions** for multi-step operations: `db.transaction(async (trx) => {...})`
- **Permissions** are checked through the `permission({ keys: ['resource:action'] })` middleware.
- Every entity is scoped by `companyId` (the tenant).

### Routes

- Naming: `feature.action` (e.g. `cities.index`, `bookings.store`).
- Public routes: `public.` prefix (e.g. `public.bookings.initiate`).
- Group by feature with `.prefix()` and `.as()`.
- Routing docs: https://docs.adonisjs.com/guides/basics/routing
- URL builder docs: https://docs.adonisjs.com/guides/basics/url-builder

### Auth & RBAC

- Session-based auth (`@adonisjs/auth`).
- 4 system roles, named in French in `config/rbac.ts`: `Admin`, `Dispatcher`, `Chauffeur` (driver), `Lecteur` (read-only).
- 70+ granular permissions per resource.
- Configuration in `config/rbac.ts`.
- Bouncer docs (roles & abilities): https://docs.adonisjs.com/guides/security/authorization

### Email

- Mail classes in `app/mails/` (extend `BaseMail`).
- Templates in `resources/views/emails/`.
- SMTP configuration in `config/mail.ts`.
- Docs: https://docs.adonisjs.com/guides/digging-deeper/mail

### Events

- Definitions in `app/events/`.
- Emitter docs: https://docs.adonisjs.com/guides/digging-deeper/emitter

### Exception handling

- Custom handler in `app/exceptions/`.
- Error pages in `resources/views/pages/errors/`.
- Docs: https://docs.adonisjs.com/guides/basics/exception-handling

### Drive (file storage)

- Docs: https://docs.adonisjs.com/guides/digging-deeper/drive

### Cache

- Docs: https://docs.adonisjs.com/guides/digging-deeper/cache

### Database

- UUID primary keys with `gen_random_uuid()`.
- Native PostgreSQL enums.
- snake_case columns.
- Foreign keys with explicit `CASCADE` / `RESTRICT`.
- Indexes on frequently queried columns.
- Lucid docs: https://lucid.adonisjs.com

## Edge.js templates

### Syntax & references

- Syntax specification: https://edgejs.dev/docs/syntax_specification
- Template state: https://edgejs.dev/docs/templates_state
- Stacks: https://edgejs.dev/docs/stacks

### Components

- Introduction: https://edgejs.dev/docs/components/introduction
- Props: https://edgejs.dev/docs/components/props
- Slots: https://edgejs.dev/docs/components/slots
- Layouts: https://edgejs.dev/docs/components/layouts

### Edge.js rules

- Use `@let()` to declare variables (NOT `@set()`).
- CSRF is mandatory on every POST form: `{{ csrfField() }}`.
- Icons via `@svg('tabler:icon-name')`.
- Permissions in views: `@can('permission', 'key')`.
- URLs: `route('route.name', { params })`.
- **Number formatting**: always use `Intl.NumberFormat('fr-FR')` for numbers and `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' })` for amounts. Never display a raw number.

### View organization

**Global components** (`resources/views/components/`):

- `layout/` — base.edge, dashboard.edge, public.edge
- `form/` — Form wrapper with CSRF
- `field/` — root.edge, label.edge, error.edge
- `input/` — control.edge, group.edge, addon.edge, group_control.edge
- `select/` — control.edge
- `textarea/` — control.edge
- `checkbox/` — control.edge, group.edge
- `radio/` — control.edge, group.edge
- `alert/` — root.edge, title.edge, description.edge
- `button/` — index.edge (variants: default, destructive, outline, secondary, ghost, link; sizes: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg), group.edge
- `sidebar/` — header.edge, content.edge, footer.edge, group.edge, group_label.edge, menu.edge, menu_item.edge, menu_button.edge, separator.edge, trigger.edge
- `badge/` — index.edge (variants: success, warning, danger, info, neutral; icon + text)
- `dropdown_menu/` — root.edge, trigger.edge, content.edge, item.edge (props: href, method, variant, hiddenInputs), separator.edge
- `table/` — root.edge, header.edge, row.edge, cell.edge (prop: head), empty.edge (props: colspan, message)
- `filter/` — bar.edge (props: action), field.edge (props: basis)
- `avatar.edge`, `link.edge`, `pagination.edge`

**Global partials** (`resources/views/partials/`):

- `flash_alerts.edge` — Flash messages
- `header.edge` — Main header

**Module partials** (`resources/views/pages/{module}/_*.edge`):
Partials specific to a module live directly in that module's pages folder, prefixed with `_`.
Examples:

- `pages/dashboard/buses/_form.edge`
- `pages/dashboard/cities/_form.edge`
- `pages/dashboard/employees/_form.edge`
- etc.

### Dashboard filters

- **Inline layout**: every field and button on a single line (`flex flex-wrap`), no grid.
- **No labels**: use descriptive `placeholder`s, or the first `<option>` of a `<select>` as the hint (e.g. "Tous les statuts", "Toutes les franchises").
- **Search button**: magnifier icon (`tabler:search`), no text.
- **Reset button**: X icon (`tabler:x`), shown only when filters are active.
- **Dedicated partial**: extract filters into a `_filters.edge` partial in the module folder (e.g. `pages/dashboard/bookings/_filters.edge`), included with `@include('pages/dashboard/bookings/_filters')`.
- **Components**: use `@filter.bar({ action })` + `@filter.field()` (optional `basis` prop for min width: '32'–'56', default '44').

## Design & UI

### Inspiration

- Take shadcn/ui as the reference for style and component patterns: https://ui.shadcn.com
- shadcn component reference: https://ui.shadcn.com/docs/components
- Adapt the shadcn style to Tailwind CSS v4 + Edge.js (not React).

### Principles

- Reuse the existing components in `components/` before creating new ones.
- Keep visual consistency with the components already in place.
- Alpine.js for interactivity (no heavy JS framework).

## Known traps

### Edge.js scope and parsing

- **Never put inline text after an Edge.js tag**: `@component()Text@end` throws "Unexpected token". Always put the content on separate lines:

  <!-- prettier-ignore -->
  ```edge
  {{-- BAD --}}
  @table.cell({ head: true })Route@end

  {{-- GOOD --}}
  @table.cell({ head: true })
    Route
  @end
  ```

- **Never put text after `@svg()` on the same line**: `@svg('tabler:eye') Voir` throws an error. Split it over two lines.
- **Components without a slot use the self-closing `@!` syntax**: if a component does not use `$slots.main()` (e.g. badge with a `text` prop, separator, empty), use `@!component()`, not `@component()...@end`. A stray `@end` can break the parent scope.

  <!-- prettier-ignore -->
  ```edge
  {{-- BAD --}}
  @!badge({ variant: 'success', text: 'OK' })
  @dropdown_menu.separator()
  @end

  {{-- GOOD --}}
  @!badge({ variant: 'success', text: 'OK' })
  @!dropdown_menu.separator()
  ```

- **The `button/index.edge` component renders a `<button>`, not an `<a>`**: for links styled as buttons, use an `<a>` tag with the button's Tailwind classes. Do not pass `href` to `@button()`.
- **Scope loss in nested components**: `@each` variables (e.g. `item`) are lost inside the slots of deeply nested components (4+ levels). Inside `@each` loops, prefer inline HTML for complex structures (dropdown menus with conditions) over nested components.

### Don't

- Don't lazy-load Lucid relations.
- Don't forget the company (tenant) scope on queries.
- Don't create routes without a name (`.as()`).
- Don't hardcode permissions; use `config/rbac.ts`.
- Don't use `@set()` in Edge.js; use `@let()`.
- Don't nest Edge.js components inside `@each` loops beyond 3 levels (use inline HTML).
- Don't put text on the same line as an Edge.js tag (`@svg()`, `@component()...@end`).
- Don't use `@component()...@end` for components without a slot (use `@!component()`).

## Definition of done

- `typecheck`, `lint` and tests pass.
- Exports have JSDoc; non-obvious code explains its invariants and why.
- Docs touched by the change are updated.
- Anything user-visible was checked in the running app.
