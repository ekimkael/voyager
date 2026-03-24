# Voyager

Plateforme SaaS multi-tenant de gestion de transport (bus). Réservations, billetterie, gestion de flotte.

## Stack & Documentation

| Technologie | Rôle | Documentation |
|------------|------|---------------|
| AdonisJS v7 | Framework backend | https://docs.adonisjs.com |
| Lucid ORM | ORM PostgreSQL | https://lucid.adonisjs.com |
| Edge.js | Moteur de templates | https://edgejs.dev |
| VineJS | Validation | https://vinejs.dev |
| Japa | Tests | https://japa.dev |
| Alpine.js | Interactivité frontend | https://alpinejs.dev |
| Tailwind CSS v4 | Styles | https://tailwindcss.com |
| Vite | Build & HMR | https://vite.dev |

## Commandes

```bash
npm run dev        # Serveur dev avec HMR
npm run build      # Build production
npm test           # Tests Japa
npm run lint       # ESLint
npm run format     # Prettier
npm run typecheck  # Vérification TypeScript
```

## Structure clé

```
app/
  controllers/     # Un fichier par ressource, méthodes CRUD standard
  models/          # Lucid models, UUID primary keys
  validators/      # VineJS validators (vine.compile)
  middleware/       # Auth, tenant, permission, throttle
  services/        # Business logic (SeatAllocator, PermissionResolver, etc.)
  abilities/       # Bouncer abilities
  policies/        # Bouncer policies
  mails/           # Classes mail (extends BaseMail)
  events/          # Event definitions
start/
  routes/          # Un fichier par feature (auth, bookings, cities, trips...)
  kernel.ts        # Middleware stack
  env.ts           # Schema des variables d'env
database/
  migrations/      # UUID PKs, gen_random_uuid(), enums PostgreSQL natifs
  seeders/
resources/
  views/
    components/    # Composants réutilisables Edge.js
    partials/      # Partials globaux
    pages/         # Pages organisées par feature
```

## Conventions

### Nommage des fichiers
- Controllers : `snake_case_controller.ts` (ex: `bookings_controller.ts`)
- Models : `snake_case.ts` (ex: `user.ts`), classe en PascalCase
- Validators : `snake_case.ts`
- Middleware : `snake_case_middleware.ts`
- Routes : `snake_case.ts` dans `start/routes/`

### Code
- **Toujours valider** les inputs avec `request.validateUsing(validator)` — https://vinejs.dev/docs/introduction
- **Flash messages** pour le feedback utilisateur : `session.flash('success', '...')`
- **POST-Redirect-GET** : toujours rediriger après un form submit
- **Preload explicite** des relations : `.preload('relation')`, jamais de lazy loading — https://lucid.adonisjs.com/docs/relationships/introduction
- **Transactions** pour les opérations multi-étapes : `db.transaction(async (trx) => {...})`
- **Permissions** vérifiées via middleware `permission({ keys: ['resource:action'] })`
- Toutes les entités sont scoped par `tenantId`

### Routes
- Nommage : `feature.action` (ex: `cities.index`, `bookings.store`)
- Routes publiques : préfixe `public.` (ex: `public.bookings.initiate`)
- Grouper par feature avec `.prefix()` et `.as()`
- Doc routing : https://docs.adonisjs.com/guides/basics/routing
- Doc URL builder : https://docs.adonisjs.com/guides/basics/url-builder

### Auth & RBAC
- Session-based auth (@adonisjs/auth)
- 4 rôles système : Admin, Dispatcher, Chauffeur, Lecteur
- 70+ permissions granulaires par ressource
- Config dans `config/rbac.ts`
- Doc Bouncer (rôles & abilities) : https://docs.adonisjs.com/guides/security/authorization

### Email
- Classes mail dans `app/mails/` (extends BaseMail)
- Templates dans `resources/views/emails/`
- Config SMTP dans `config/mail.ts`
- Doc : https://docs.adonisjs.com/guides/digging-deeper/mail

### Events
- Définitions dans `app/events/`
- Doc emitter : https://docs.adonisjs.com/guides/digging-deeper/emitter

### Exception Handling
- Handler custom dans `app/exceptions/`
- Pages d'erreur dans `resources/views/pages/errors/`
- Doc : https://docs.adonisjs.com/guides/basics/exception-handling

### Drive (stockage fichiers)
- Doc : https://docs.adonisjs.com/guides/digging-deeper/drive

### Cache
- Doc : https://docs.adonisjs.com/guides/digging-deeper/cache

### Base de données
- UUIDs comme clés primaires avec `gen_random_uuid()`
- Enums PostgreSQL natifs
- Colonnes en snake_case
- Foreign keys avec CASCADE/RESTRICT explicites
- Index sur les colonnes fréquemment requêtées
- Doc Lucid : https://lucid.adonisjs.com

## Templates Edge.js

### Syntaxe & références
- Spécification syntaxe : https://edgejs.dev/docs/syntax_specification
- State des templates : https://edgejs.dev/docs/templates_state
- Stacks : https://edgejs.dev/docs/stacks

### Composants
- Introduction : https://edgejs.dev/docs/components/introduction
- Props : https://edgejs.dev/docs/components/props
- Slots : https://edgejs.dev/docs/components/slots
- Layouts : https://edgejs.dev/docs/components/layouts

### Règles Edge.js
- Utiliser `@let()` pour déclarer des variables (PAS `@set()`)
- CSRF obligatoire sur tous les formulaires POST : `{{ csrfField() }}`
- Icons via `@svg('tabler:icon-name')`
- Permissions dans les vues : `@can('permission', 'key')`
- URLs : `route('route.name', { params })`

### Organisation des vues

**Composants globaux** (`resources/views/components/`) :
- `layout/` — base.edge, dashboard.edge, public.edge
- `form/` — Wrapper de formulaire avec CSRF
- `field/` — root.edge, label.edge, error.edge
- `input/` — control.edge
- `select/` — control.edge
- `textarea/` — control.edge
- `checkbox/` — control.edge, group.edge
- `radio/` — control.edge, group.edge
- `alert/` — root.edge, title.edge, description.edge
- `sidebar/` — item.edge
- `avatar.edge`, `button.edge`, `link.edge`, `pagination.edge`

**Partials globaux** (`resources/views/partials/`) :
- `flash_alerts.edge` — Messages flash
- `header.edge` — En-tête principal

**Partials par module** (`resources/views/pages/{module}/_*.edge`) :
Les partials spécifiques à un module sont placés directement dans le dossier de pages du module, préfixés par `_`.
Exemples :
- `pages/dashboard/buses/_form_fields.edge`
- `pages/dashboard/cities/_form_fields.edge`
- `pages/dashboard/employees/_form_fields.edge`
- etc.

## Design & UI

### Inspiration
- S'inspirer de shadcn/ui pour le style et les patterns de composants : https://ui.shadcn.com
- Référence composants shadcn : https://ui.shadcn.com/docs/components
- Adapter le style shadcn avec Tailwind CSS v4 + Edge.js (pas React)

### Principes
- Réutiliser les composants existants dans `components/` avant d'en créer de nouveaux
- Garder une cohérence visuelle avec les composants déjà en place
- Alpine.js pour l'interactivité (pas de framework JS lourd)

## À ne pas faire

- Ne pas utiliser de lazy loading sur les relations Lucid
- Ne pas oublier le scope tenant sur les queries
- Ne pas créer de routes sans nommage (.as())
- Ne pas hardcoder les permissions, utiliser `config/rbac.ts`
- Ne pas utiliser `@set()` dans Edge.js, utiliser `@let()`
