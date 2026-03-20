# EPIC 3 — Franchises & Employés Design Spec

> **Scope:** US-13 (CRUD franchises), US-14 (ajout employé + rôle + franchise), US-15 (activer/désactiver employé), US-16 (placeholder performances), US-17 (scoping agent)

## Context

Le projet Voyager utilise un modèle multi-tenant où le **Tenant** représente la compagnie de transport. L'EPIC 3 introduit la notion de **Franchise** (succursale/agence) sous le tenant. Chaque tenant doit avoir au minimum 2 franchises (une par ville de départ/arrivée). Les franchises sont créées manuellement dans le processus d'onboarding.

Pour cette implémentation, seuls les **employés** sont rattachés aux franchises. Les bus, routes et voyages restent scopés au tenant uniquement — le rattachement aux franchises sera ajouté plus tard si nécessaire.

**Employee management is Admin-only.** Only users with the Admin role can create, edit, or deactivate employees. The agent scoping (US-17) restricts what data non-Admin users see when they have `user:read` permission, not what they can modify.

## Decisions

| Question | Décision |
|----------|----------|
| Relation Tenant ↔ Franchise | Tenant = compagnie, Franchise = succursale. Min 2 par tenant |
| Rattachement des entités | Employés seulement — bus/voyages restent au tenant |
| Création franchise principale | Manuelle, dans le processus d'onboarding |
| Rattachement employé ↔ franchise | `franchiseId` directement sur `users`, nullable |
| Scoping agent (US-17) | Limité aux employés et franchises. Bus/routes/voyages visibles au niveau tenant |
| Gestion employés | Page admin dédiée avec liste filtrable par franchise + activer/désactiver (Admin-only) |
| Performances par agence (US-16) | Placeholder "Disponible prochainement" dans le détail d'une franchise |
| Ville de la franchise | Référence `cities(id)` via FK `cityId`, pas un VARCHAR |
| Routes | Resource routes (`router.resource()`) avec permissions par action |

---

## 1. Database

### 1.1 New table: `franchises`

```
Table: franchises
├── id           UUID         PK, DEFAULT gen_random_uuid()
├── tenant_id    UUID         FK → tenants(id), NOT NULL, ON DELETE RESTRICT
├── name         VARCHAR(100) NOT NULL
├── city_id      UUID         FK → cities(id), NOT NULL, ON DELETE RESTRICT
├── address      TEXT         NOT NULL
├── phone        VARCHAR(20)  NULL
├── active       BOOLEAN      NOT NULL, DEFAULT TRUE
├── created_at   TIMESTAMP    NOT NULL, DEFAULT NOW()
└── updated_at   TIMESTAMP    NOT NULL, DEFAULT NOW()

Constraints:
  UNIQUE (tenant_id, name)

Indexes:
  INDEX ON franchises(tenant_id)
  INDEX ON franchises(city_id)
  INDEX ON franchises(active)
```

### 1.2 ALTER table: `users`

```
ADD COLUMN franchise_id  UUID        NULL, FK → franchises(id), ON DELETE SET NULL
ADD COLUMN phone         VARCHAR(20) NULL

Indexes:
  INDEX ON users(franchise_id)
```

`franchiseId` is nullable because the admin user created at signup has no franchise yet (created during onboarding).

### 1.3 RBAC permissions

Add to `config/rbac.ts`:

```typescript
// Franchises
{ resource: 'franchise', action: 'create', description: 'Create a franchise' },
{ resource: 'franchise', action: 'read', description: 'View franchises' },
{ resource: 'franchise', action: 'update', description: 'Update a franchise' },
{ resource: 'franchise', action: 'delete', description: 'Delete a franchise', isSensitive: true },
```

Add to system roles:
- **Admin**: all franchise permissions (already covered by `'*'`)
- **Dispatcher**: add `franchise:read`
- **Chauffeur**: add `franchise:read` (needs to see their own franchise info)
- **Lecteur**: add `franchise:read`

---

## 2. Models

### 2.1 New model: `Franchise`

```typescript
// app/models/franchise.ts
export default class Franchise extends BaseModel {
  id: string                    // PK
  tenantId: string
  name: string
  cityId: string
  address: string
  phone: string | null
  active: boolean
  createdAt: DateTime
  updatedAt: DateTime

  // Relations
  belongsTo: Tenant
  belongsTo: City
  hasMany: User
}
```

### 2.2 Modified model: `User`

Add:
```typescript
franchiseId: string | null
phone: string | null
belongsTo: Franchise           // nullable relation
```

### 2.3 Modified model: `Tenant`

Add:
```typescript
hasMany: Franchise
```

### 2.4 Modified model: `City`

Add:
```typescript
hasMany: Franchise
```

---

## 3. Franchises CRUD (US-13)

### 3.1 Routes

File: `start/routes/franchises.ts`

```typescript
router.resource('franchises', '#controllers/franchises_controller')
  .except(['show'])
  .use('*', middleware.auth())
  .use(['index'], middleware.permission({ keys: ['franchise:read'] }))
  .use(['create', 'store'], middleware.permission({ keys: ['franchise:create'] }))
  .use(['edit', 'update'], middleware.permission({ keys: ['franchise:update'] }))
  .use(['destroy'], middleware.permission({ keys: ['franchise:delete'] }))
```

Additional route for performance placeholder — defined inside a `router.group()` with auth middleware, before the resource import:

```typescript
router
  .get('/franchises/:id/performance', [controllers.Franchises, 'performance'])
  .as('franchises.performance')
  .use([middleware.auth(), middleware.permission({ keys: ['franchise:read'] })])
```

**Important:** Register the new route file in `start/routes.ts` with `import '#start/routes/franchises'`.

### 3.2 Controller: `FranchisesController`

All entity lookups (edit, update, destroy, performance) MUST be tenant-scoped using the pattern:
```typescript
Franchise.query().where('id', params.id).where('tenantId', tenant!.id).firstOrFail()
```

- `index` — list **active** tenant franchises, preload city, ordered by name. Paginated (20 per page) using the existing pagination component
- `create` — render form with cities select (all cities, ordered by name)
- `store` — validate, create with `tenantId`. Handle duplicate `(tenant_id, name)` via error code 23505 with flash message "Une franchise avec ce nom existe déjà."
- `edit` — load franchise scoped to tenant + cities for select
- `update` — same validation, same duplicate handling, scoped to tenant
- `destroy` — scoped to tenant. Check no active users are assigned to this franchise. If any, refuse with flash message. Otherwise soft delete (`active = false`)
- `performance` — load franchise scoped to tenant, render placeholder page

### 3.3 Validator: `franchise.ts`

```typescript
// createFranchiseValidator & updateFranchiseValidator
name:    string, trim, minLength(2), maxLength(100)
cityId:  string, uuid
address: string, trim, minLength(5)
phone:   string, trim, maxLength(20), optional
```

### 3.4 Views

- `pages/franchises/index.edge` — table (name, city, address, phone, active status, actions including "Performances" link). Paginated
- `pages/franchises/form.edge` — create/edit form with city select
- `partials/franchises/form_fields.edge` — shared form fields
- `pages/franchises/performance.edge` — title "Performances — [franchise name]", centered "Disponible prochainement" message with icon

### 3.5 Sidebar

New item "Franchises" with icon `tabler:building-store`, visible with `franchise:read`.

---

## 4. Employees Admin (US-14, US-15)

### 4.1 Routes

File: `start/routes/employees.ts`

```typescript
router.resource('employees', '#controllers/employees_controller')
  .except(['show'])
  .use('*', middleware.auth())
  .use(['index'], middleware.permission({ keys: ['user:read'] }))
  .use(['create', 'store'], middleware.permission({ keys: ['user:create'] }))
  .use(['edit', 'update'], middleware.permission({ keys: ['user:update'] }))
  .use(['destroy'], middleware.permission({ keys: ['user:delete'] }))
```

**Important:** Register the new route file in `start/routes.ts` with `import '#start/routes/employees'`.

### 4.2 Controller: `EmployeesController`

All entity lookups MUST be tenant-scoped:
```typescript
User.query().where('id', params.id).where('tenantId', tenant!.id).firstOrFail()
```

- `index` — list all tenant users with preload franchise + roleAssignments (→ role). Optional filter by `franchise_id` query param. Ordered by firstName, lastName. Paginated (20 per page). Scoping logic for agents (see section 5)
- `create` — form with select franchise (active franchises of tenant) + select role (system roles of tenant)
- `store` — validate, create user with `tenantId` + `franchiseId`, create `UserRoleAssignment` with `grantedBy: auth.user!.id`. Password auto-hashed via AuthFinder mixin. Handle duplicate email via error code 23505 with flash message "Un employé avec cet email existe déjà."
- `edit` — load user scoped to tenant with roles and franchise
- `update` — update info (firstName, lastName, email, phone, franchiseId, status). Allow role and franchise change. Only touch password if a new one is provided. Handle duplicate email via 23505
- `destroy` — soft delete via `status = 'inactive'`. Refuse if user is the last active admin of the tenant

### 4.3 Validator: `employee.ts`

```typescript
// createEmployeeValidator
firstName:    string, trim, minLength(2), maxLength(80)
lastName:     string, trim, minLength(2), maxLength(80)
email:        string, trim, email
password:     string, minLength(8)
phone:        string, trim, maxLength(20), optional
franchiseId:  string, uuid
roleId:       string, uuid

// updateEmployeeValidator
firstName:    string, trim, minLength(2), maxLength(80)
lastName:     string, trim, minLength(2), maxLength(80)
email:        string, trim, email
phone:        string, trim, maxLength(20), optional
franchiseId:  string, uuid
roleId:       string, uuid
status:       enum('active', 'inactive', 'suspended')
password:     string, minLength(8), optional  // empty = no change
```

Note: When a scoped agent has the franchise select disabled in the form, a hidden `<input type="hidden" name="franchiseId" value="...">` is included alongside the disabled select so the value is always submitted.

### 4.4 Views

- `pages/employees/index.edge` — table (name, email, phone, franchise, role, status, actions). Franchise filter select at top. Status badges: active=green, inactive=gray, suspended=red. Paginated
- `pages/employees/form.edge` — create/edit form
- `partials/employees/form_fields.edge` — shared form fields

### 4.5 Sidebar

Item "Employés" with icon `tabler:users`, visible with `user:read`. Replaces the current `href: #` placeholder "Utilisateurs" in the Administration section.

The existing drivers page remains — it serves a different purpose (listing available drivers for trip assignment).

---

## 5. Agent Scoping (US-17)

No dedicated middleware. Conditional filtering in `EmployeesController`:

**Logic:**
- If the connected user has role Admin or Dispatcher → sees all tenant employees (optional franchise filter via query param)
- If the connected user has role Agent or Chauffeur (and has a `franchiseId`) → sees only employees of THEIR franchise. The franchise filter select is hidden

**Implementation in controller:**
- `index` — if `auth.user.franchiseId` is set and user is not Admin/Dispatcher, force `where('franchiseId', auth.user.franchiseId)` on the query. Otherwise, apply optional query param filter
- `create/store/edit/update` — a scoped agent can only create/modify employees in their own franchise. The franchise select is pre-filled and disabled (with hidden input for form submission)

**In views** — a boolean `isScopedToFranchise` is passed to the template to conditionally show/hide the franchise filter and restrict actions.

---

## 6. File Structure Summary

| File | Action | Responsibility |
|------|--------|---------------|
| `database/migrations/xxx_create_franchises_table.ts` | Create | Franchises table |
| `database/migrations/xxx_add_franchise_and_phone_to_users.ts` | Create | ALTER users: add franchise_id + phone |
| `app/models/franchise.ts` | Create | Franchise model |
| `app/models/user.ts` | Modify | Add franchiseId, phone, franchise relation |
| `app/models/tenant.ts` | Modify | Add franchises relation |
| `app/models/city.ts` | Modify | Add franchises relation |
| `config/rbac.ts` | Modify | Add franchise permissions + update Dispatcher/Chauffeur/Lecteur roles |
| `database/seeders/permissions_seeder.ts` | No change | Already handles dynamic permission sync |
| `app/validators/franchise.ts` | Create | Franchise validators |
| `app/validators/employee.ts` | Create | Employee validators |
| `app/controllers/franchises_controller.ts` | Create | Franchise CRUD + performance placeholder |
| `app/controllers/employees_controller.ts` | Create | Employee CRUD with scoping |
| `start/routes/franchises.ts` | Create | Franchise routes (resource + performance) |
| `start/routes/employees.ts` | Create | Employee routes (resource) |
| `start/routes.ts` | Modify | Add imports for franchises + employees route files |
| `resources/views/pages/franchises/index.edge` | Create | Franchise list with pagination |
| `resources/views/pages/franchises/form.edge` | Create | Franchise create/edit form |
| `resources/views/pages/franchises/performance.edge` | Create | Performance placeholder |
| `resources/views/partials/franchises/form_fields.edge` | Create | Shared franchise form fields |
| `resources/views/pages/employees/index.edge` | Create | Employee list with franchise filter + pagination |
| `resources/views/pages/employees/form.edge` | Create | Employee create/edit form |
| `resources/views/partials/employees/form_fields.edge` | Create | Shared employee form fields |
| `resources/views/components/layout/dashboard.edge` | Modify | Add Franchises + Employés sidebar items |
