# EPIC 3 — Franchises & Employees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add franchise (branch office) management and employee administration to the multi-tenant transport app, covering US-13 through US-17.

**Architecture:** A new `franchises` table sits under `tenants`. Users gain a nullable `franchiseId` FK. Two new resource-routed controllers (`FranchisesController`, `EmployeesController`) provide CRUD with tenant-scoped queries. Agent scoping filters employee visibility by franchise at the controller level.

**Tech Stack:** AdonisJS v7, Lucid ORM (pagination), VineJS validators, Edge templates, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-20-epic3-franchises-employees-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `database/migrations/xxx_create_franchises_table.ts` | Create | Franchises table with tenant_id, city_id FKs |
| `database/migrations/xxx_add_franchise_and_phone_to_users.ts` | Create | ALTER users: add franchise_id FK + phone |
| `app/models/franchise.ts` | Create | Franchise model with Tenant, City, User relations |
| `app/models/user.ts` | Modify | Add franchiseId, phone columns + Franchise relation |
| `app/models/tenant.ts` | Modify | Add Franchise hasMany relation |
| `app/models/city.ts` | Modify | Add Franchise hasMany relation |
| `config/rbac.ts` | Modify | Add franchise permissions, update Dispatcher/Chauffeur/Lecteur roles |
| `app/validators/franchise.ts` | Create | createFranchiseValidator, updateFranchiseValidator |
| `app/validators/employee.ts` | Create | createEmployeeValidator, updateEmployeeValidator |
| `app/controllers/franchises_controller.ts` | Create | CRUD + performance placeholder, tenant-scoped |
| `app/controllers/employees_controller.ts` | Create | CRUD with agent scoping, tenant-scoped |
| `start/routes/franchises.ts` | Create | Resource routes + performance route |
| `start/routes/employees.ts` | Create | Resource routes |
| `start/routes.ts` | Modify | Add imports for new route files |
| `resources/views/pages/franchises/index.edge` | Create | Franchise list with pagination |
| `resources/views/pages/franchises/form.edge` | Create | Create/edit form |
| `resources/views/partials/franchises/form_fields.edge` | Create | Shared form fields |
| `resources/views/pages/franchises/performance.edge` | Create | Placeholder page |
| `resources/views/pages/employees/index.edge` | Create | Employee list with franchise filter + pagination |
| `resources/views/pages/employees/form.edge` | Create | Create/edit form |
| `resources/views/partials/employees/form_fields.edge` | Create | Shared form fields |
| `resources/views/components/layout/dashboard.edge` | Modify | Add Franchises + Employés sidebar items |

---

### Task 1: Create the franchises migration

**Files:**
- Create: `database/migrations/xxx_create_franchises_table.ts`

- [ ] **Step 1: Generate the migration**

```bash
node ace make:migration create_franchises_table
```

- [ ] **Step 2: Write the migration**

Open the generated file and replace the content with:

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'franchises'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT')
      table.string('name', 100).notNullable()
      table.uuid('city_id').notNullable().references('id').inTable('cities').onDelete('RESTRICT')
      table.text('address').notNullable()
      table.string('phone', 20).nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['tenant_id', 'name'])
      table.index(['tenant_id'])
      table.index(['city_id'])
      table.index(['active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add database/migrations/*_create_franchises_table.ts
git commit -m "feat: add franchises table migration"
```

---

### Task 2: Add franchise_id and phone to users

**Files:**
- Create: `database/migrations/xxx_add_franchise_and_phone_to_users.ts`

- [ ] **Step 1: Generate the migration**

```bash
node ace make:migration add_franchise_and_phone_to_users
```

- [ ] **Step 2: Write the migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.uuid('franchise_id').nullable().references('id').inTable('franchises').onDelete('SET NULL')
      table.string('phone', 20).nullable()
      table.index(['franchise_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('franchise_id')
      table.dropColumn('phone')
    })
  }
}
```

- [ ] **Step 3: Run both migrations**

```bash
node ace migration:run
```

Expected: two migrations applied successfully.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/*_add_franchise_and_phone_to_users.ts
git commit -m "feat: add franchise_id and phone columns to users table"
```

---

### Task 3: Create the Franchise model and update related models

**Files:**
- Create: `app/models/franchise.ts`
- Modify: `app/models/user.ts`
- Modify: `app/models/tenant.ts`
- Modify: `app/models/city.ts`

- [ ] **Step 1: Create the Franchise model**

Create `app/models/franchise.ts`:

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenant'
import City from '#models/city'
import User from '#models/user'

export default class Franchise extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare name: string

  @column()
  declare cityId: string

  @column()
  declare address: string

  @column()
  declare phone: string | null

  @column()
  declare active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => City)
  declare city: BelongsTo<typeof City>

  @hasMany(() => User)
  declare users: HasMany<typeof User>
}
```

- [ ] **Step 2: Update the User model**

In `app/models/user.ts`, add the `franchiseId` and `phone` columns and the `Franchise` relation.

Add import at the top:
```typescript
import Franchise from '#models/franchise'
```

Add columns after `mfaEnabled`:
```typescript
  @column()
  declare franchiseId: string | null

  @column()
  declare phone: string | null
```

Add relation after the `driverTrips` relation:
```typescript
  @belongsTo(() => Franchise)
  declare franchise: BelongsTo<typeof Franchise>
```

Note: The `BelongsTo` type is already imported.

- [ ] **Step 3: Update the Tenant model**

In `app/models/tenant.ts`, add the `Franchise` relation.

Add import:
```typescript
import Franchise from '#models/franchise'
```

Add relation after `roles`:
```typescript
  @hasMany(() => Franchise)
  declare franchises: HasMany<typeof Franchise>
```

- [ ] **Step 4: Update the City model**

In `app/models/city.ts`, add the `Franchise` relation.

Add import:
```typescript
import Franchise from '#models/franchise'
```

Add relation after `arrivalRoutes`:
```typescript
  @hasMany(() => Franchise)
  declare franchises: HasMany<typeof Franchise>
```

Note: `HasMany` type is already imported.

- [ ] **Step 5: Commit**

```bash
git add app/models/franchise.ts app/models/user.ts app/models/tenant.ts app/models/city.ts
git commit -m "feat: add Franchise model and update User/Tenant/City relations"
```

---

### Task 4: Update RBAC config and run seeder

**Files:**
- Modify: `config/rbac.ts`

- [ ] **Step 1: Add franchise permissions**

In `config/rbac.ts`, after the Cities block (line 25) and before the Stops block, add:

```typescript
  // Franchises
  { resource: 'franchise', action: 'create', description: 'Create a franchise' },
  { resource: 'franchise', action: 'read', description: 'View franchises' },
  { resource: 'franchise', action: 'update', description: 'Update a franchise' },
  { resource: 'franchise', action: 'delete', description: 'Delete a franchise', isSensitive: true },
```

- [ ] **Step 2: Add franchise:read and user:read to roles**

In the `systemRoles` array:

Add `'franchise:read'` to Dispatcher's permissions array (after `'city:read'`).

Add `'franchise:read'` and `'user:read'` to Chauffeur's permissions array (after `'city:read'`). Chauffeur needs `user:read` to access the employees page with agent scoping (US-17).

Add `'franchise:read'` to Lecteur's permissions array (after `'city:read'`).

- [ ] **Step 3: Run the permissions seeder**

```bash
node ace db:seed --files database/seeders/permissions_seeder.ts
```

Expected: seeder completes without errors. New franchise permissions are created and assigned to roles.

- [ ] **Step 4: Commit**

```bash
git add config/rbac.ts
git commit -m "feat: add franchise RBAC permissions and update system roles"
```

---

### Task 5: Create franchise validator

**Files:**
- Create: `app/validators/franchise.ts`

- [ ] **Step 1: Create the validator file**

Create `app/validators/franchise.ts`:

```typescript
import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(2).maxLength(100)
const cityId = () => vine.string().uuid()
const address = () => vine.string().trim().minLength(5)
const phone = () => vine.string().trim().maxLength(20).optional()

export const createFranchiseValidator = vine.compile(
  vine.object({
    name: name(),
    cityId: cityId(),
    address: address(),
    phone: phone(),
  })
)

export const updateFranchiseValidator = vine.compile(
  vine.object({
    name: name(),
    cityId: cityId(),
    address: address(),
    phone: phone(),
  })
)
```

- [ ] **Step 2: Commit**

```bash
git add app/validators/franchise.ts
git commit -m "feat: add franchise validators"
```

---

### Task 6: Create FranchisesController

**Files:**
- Create: `app/controllers/franchises_controller.ts`

- [ ] **Step 1: Create the controller**

Create `app/controllers/franchises_controller.ts`:

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import Franchise from '#models/franchise'
import City from '#models/city'
import User from '#models/user'
import { createFranchiseValidator, updateFranchiseValidator } from '#validators/franchise'

export default class FranchisesController {
  async index({ view, tenant, request }: HttpContext) {
    const page = request.input('page', 1)

    const franchises = await Franchise.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .preload('city')
      .orderBy('name')
      .paginate(page, 20)

    franchises.baseUrl('/franchises')

    return view.render('pages/franchises/index', { franchises })
  }

  async create({ view }: HttpContext) {
    const cities = await City.query().orderBy('name')
    return view.render('pages/franchises/form', { cities })
  }

  async store({ request, response, session, tenant }: HttpContext) {
    const payload = await request.validateUsing(createFranchiseValidator)

    try {
      await Franchise.create({
        tenantId: tenant!.id,
        name: payload.name,
        cityId: payload.cityId,
        address: payload.address,
        phone: payload.phone || null,
      })
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Une franchise avec ce nom existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Franchise créée avec succès')
    return response.redirect().toRoute('franchises.index')
  }

  async edit({ params, view, tenant }: HttpContext) {
    const franchise = await Franchise.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const cities = await City.query().orderBy('name')

    return view.render('pages/franchises/form', { franchise, cities })
  }

  async update({ params, request, response, session, tenant }: HttpContext) {
    const franchise = await Franchise.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const payload = await request.validateUsing(updateFranchiseValidator)

    try {
      franchise.merge({
        name: payload.name,
        cityId: payload.cityId,
        address: payload.address,
        phone: payload.phone || null,
      })
      await franchise.save()
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Une franchise avec ce nom existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Franchise mise à jour avec succès')
    return response.redirect().toRoute('franchises.index')
  }

  async destroy({ params, response, session, tenant }: HttpContext) {
    const franchise = await Franchise.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const activeUsers = await User.query()
      .where('franchiseId', franchise.id)
      .where('status', 'active')
      .count('* as total')

    if (Number(activeUsers[0].$extras.total) > 0) {
      session.flash('error', 'Impossible de désactiver cette franchise car elle a des employés actifs.')
      return response.redirect().toRoute('franchises.index')
    }

    franchise.active = false
    await franchise.save()

    session.flash('success', 'Franchise désactivée avec succès')
    return response.redirect().toRoute('franchises.index')
  }

  async performance({ params, view, tenant }: HttpContext) {
    const franchise = await Franchise.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .preload('city')
      .firstOrFail()

    return view.render('pages/franchises/performance', { franchise })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/controllers/franchises_controller.ts
git commit -m "feat: add FranchisesController with CRUD and performance placeholder"
```

---

### Task 7: Add franchise routes

**Files:**
- Create: `start/routes/franchises.ts`
- Modify: `start/routes.ts`

- [ ] **Step 1: Create the franchise routes file**

Create `start/routes/franchises.ts`:

```typescript
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const FranchisesController = () => import('#controllers/franchises_controller')

router
  .get('/franchises/:id/performance', [FranchisesController, 'performance'])
  .as('franchises.performance')
  .use([middleware.auth(), middleware.permission({ keys: ['franchise:read'] })])

router
  .resource('franchises', FranchisesController)
  .except(['show'])
  .use('*', middleware.auth())
  .use(['index'], middleware.permission({ keys: ['franchise:read'] }))
  .use(['create', 'store'], middleware.permission({ keys: ['franchise:create'] }))
  .use(['edit', 'update'], middleware.permission({ keys: ['franchise:update'] }))
  .use(['destroy'], middleware.permission({ keys: ['franchise:delete'] }))
```

Note: The performance route is defined BEFORE the resource routes so `/franchises/:id/performance` doesn't get caught by `franchises/:id/edit`.

- [ ] **Step 2: Register the route file**

In `start/routes.ts`, add after `import '#start/routes/drivers'`:

```typescript
import '#start/routes/franchises'
```

- [ ] **Step 3: Verify routes are registered**

```bash
node ace list:routes | grep franchise
```

Expected: All franchise routes appear (index, create, store, edit, update, destroy, performance).

- [ ] **Step 4: Commit**

```bash
git add start/routes/franchises.ts start/routes.ts
git commit -m "feat: add franchise routes with resource routing"
```

---

### Task 8: Create franchise views

**Files:**
- Create: `resources/views/partials/franchises/form_fields.edge`
- Create: `resources/views/pages/franchises/form.edge`
- Create: `resources/views/pages/franchises/index.edge`
- Create: `resources/views/pages/franchises/performance.edge`

- [ ] **Step 1: Create the form fields partial**

Create `resources/views/partials/franchises/form_fields.edge`:

```edge
<div class="flex flex-col gap-6">
  <div>
    @field.root({ name: 'name' })
      @!field.label({ text: 'Nom de la franchise' })
      @!input.control({ placeholder: 'Ex: Agence Douala Centre', value: franchise?.name ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'cityId' })
      @!field.label({ text: 'Ville' })
      @!select.control({
        options: cities.map((c) => ({
          value: c.id,
          name: `${c.name} (${c.country})`,
          isSelected: franchise ? franchise.cityId === c.id : false,
        }))
      })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'address' })
      @!field.label({ text: 'Adresse' })
      @!textarea.control({ placeholder: 'Adresse complète de la franchise', value: franchise?.address ?? '', rows: '3' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'phone' })
      @!field.label({ text: 'Téléphone' })
      @!input.control({ placeholder: 'Ex: +237 6XX XXX XXX', value: franchise?.phone ?? '' })
      @!field.error()
    @end
  </div>

  <div class="flex items-center gap-3">
    @!button({ text: franchise ? 'Mettre à jour' : 'Créer', type: 'submit' })
    <a href="{{ route('franchises.index') }}" class="text-sm text-on-surface hover:text-on-surface-strong transition-colors">Annuler</a>
  </div>
</div>
```

- [ ] **Step 2: Create the form page**

Create `resources/views/pages/franchises/form.edge`:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-lg">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-on-surface-strong">
        {{ franchise ? 'Modifier la franchise' : 'Nouvelle franchise' }}
      </h1>
    </div>

    <div class="rounded-radius border border-outline bg-surface p-6">
      @if(franchise)
        @form({ route: 'franchises.update', routeParams: { id: franchise.id }, method: 'PUT' })
          @include('partials/franchises/form_fields')
        @end
      @else
        @form({ route: 'franchises.store', method: 'POST' })
          @include('partials/franchises/form_fields')
        @end
      @end
    </div>
  </div>
@end
```

- [ ] **Step 3: Create the index page**

Create `resources/views/pages/franchises/index.edge`:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-6xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-on-surface-strong">Franchises</h1>
      @can('permission', 'franchise:create')
        <a href="{{ route('franchises.create') }}"
          class="inline-flex items-center gap-2 rounded-radius bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-secondary transition-colors">
          @svg('tabler:plus', { class: 'size-4' })
          <span>Nouvelle franchise</span>
        </a>
      @end
    </div>

    <div class="overflow-hidden rounded-radius border border-outline bg-surface">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
          <tr>
            <th class="px-6 py-3">Nom</th>
            <th class="px-6 py-3">Ville</th>
            <th class="px-6 py-3">Adresse</th>
            <th class="px-6 py-3">Téléphone</th>
            <th class="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          @each(item in franchises)
            <tr class="hover:bg-surface-alt/50">
              <td class="px-6 py-4 font-medium text-on-surface-strong">{{ item.name }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.city.name }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.address }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.phone || '—' }}</td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  @can('permission', 'franchise:read')
                    <a href="{{ route('franchises.performance', { id: item.id }) }}"
                      class="text-on-surface hover:text-primary transition-colors"
                      title="Performances">
                      @svg('tabler:chart-bar', { class: 'size-4' })
                    </a>
                  @end
                  @can('permission', 'franchise:update')
                    <a href="{{ route('franchises.edit', { id: item.id }) }}"
                      class="text-on-surface hover:text-primary transition-colors">
                      @svg('tabler:edit', { class: 'size-4' })
                    </a>
                  @end
                  @can('permission', 'franchise:delete')
                    @form({ route: 'franchises.destroy', routeParams: { id: item.id }, method: 'DELETE' })
                      <button type="submit"
                        class="cursor-pointer text-on-surface hover:text-danger transition-colors"
                        onclick="return confirm('Désactiver cette franchise ?')">
                        @svg('tabler:trash', { class: 'size-4' })
                      </button>
                    @end
                  @end
                </div>
              </td>
            </tr>
          @end
        </tbody>
      </table>

      @if(!franchises.length)
        <div class="px-6 py-12 text-center text-on-surface">
          Aucune franchise enregistrée.
        </div>
      @end

      @!pagination({ paginator: franchises })
    </div>
  </div>
@end
```

- [ ] **Step 4: Create the performance placeholder page**

Create `resources/views/pages/franchises/performance.edge`:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-6xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-on-surface-strong">
        Performances — {{ franchise.name }}
      </h1>
      <a href="{{ route('franchises.index') }}"
        class="inline-flex items-center gap-2 rounded-radius border border-outline px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-alt transition-colors">
        @svg('tabler:arrow-left', { class: 'size-4' })
        <span>Retour aux franchises</span>
      </a>
    </div>

    <div class="rounded-radius border border-outline bg-surface px-6 py-16 text-center">
      @svg('tabler:chart-bar', { class: 'mx-auto size-12 text-on-surface/30' })
      <h2 class="mt-4 text-lg font-medium text-on-surface-strong">Disponible prochainement</h2>
      <p class="mt-2 text-sm text-on-surface">
        Les statistiques de vente par franchise seront disponibles une fois le module de réservations implémenté.
      </p>
    </div>
  </div>
@end
```

- [ ] **Step 5: Commit**

```bash
git add resources/views/partials/franchises/ resources/views/pages/franchises/
git commit -m "feat: add franchise views (index, form, performance placeholder)"
```

---

### Task 9: Add Franchises to sidebar

**Files:**
- Modify: `resources/views/components/layout/dashboard.edge`

- [ ] **Step 1: Add Franchises sidebar item**

In `resources/views/components/layout/dashboard.edge`, after the Conducteurs `@end` block (line 74) and before the Voyages `@can` block (line 76), add:

```edge
        @can('permission', 'franchise:read')
        @!sidebar.item({
        href: route('franchises.index'),
        icon: 'tabler:building-store',
        label: 'Franchises',
        })
        @end
```

- [ ] **Step 2: Replace the Utilisateurs placeholder**

In the Administration section (line 96-100), replace the `href: '#'` Utilisateurs item:

```edge
          @!sidebar.item({
          href: '#',
          icon: 'tabler:users',
          label: 'Utilisateurs',
          })
```

with:

```edge
          @!sidebar.item({
          href: route('employees.index'),
          icon: 'tabler:users',
          label: 'Employés',
          })
```

- [ ] **Step 3: Verify the dev server starts without errors**

```bash
node ace serve --watch
```

Navigate to the dashboard. Verify "Franchises" appears in the sidebar. Verify "Employés" appears in the Administration section (it will 404 for now, that's expected).

- [ ] **Step 4: Commit**

```bash
git add resources/views/components/layout/dashboard.edge
git commit -m "feat: add Franchises and Employés to sidebar navigation"
```

---

### Task 10: Create employee validator

**Files:**
- Create: `app/validators/employee.ts`

- [ ] **Step 1: Create the validator file**

Create `app/validators/employee.ts`:

```typescript
import vine from '@vinejs/vine'

const firstName = () => vine.string().trim().minLength(2).maxLength(80)
const lastName = () => vine.string().trim().minLength(2).maxLength(80)
const email = () => vine.string().trim().email()
const phone = () => vine.string().trim().maxLength(20).optional()
const franchiseId = () => vine.string().uuid()
const roleId = () => vine.string().uuid()

export const createEmployeeValidator = vine.compile(
  vine.object({
    firstName: firstName(),
    lastName: lastName(),
    email: email(),
    password: vine.string().minLength(8),
    phone: phone(),
    franchiseId: franchiseId(),
    roleId: roleId(),
  })
)

export const updateEmployeeValidator = vine.compile(
  vine.object({
    firstName: firstName(),
    lastName: lastName(),
    email: email(),
    phone: phone(),
    franchiseId: franchiseId(),
    roleId: roleId(),
    status: vine.enum(['active', 'inactive', 'suspended'] as const),
    password: vine.string().minLength(8).optional(),
  })
)
```

- [ ] **Step 2: Commit**

```bash
git add app/validators/employee.ts
git commit -m "feat: add employee validators"
```

---

### Task 11: Create EmployeesController

**Files:**
- Create: `app/controllers/employees_controller.ts`

- [ ] **Step 1: Create the controller**

Create `app/controllers/employees_controller.ts`:

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Role from '#models/role'
import Franchise from '#models/franchise'
import UserRoleAssignment from '#models/user_role_assignment'
import { createEmployeeValidator, updateEmployeeValidator } from '#validators/employee'

export default class EmployeesController {
  async index({ view, tenant, request, auth }: HttpContext) {
    const page = request.input('page', 1)
    const filterFranchiseId = request.input('franchise_id') || null

    const query = User.query()
      .where('tenantId', tenant!.id)
      .preload('franchise')
      .preload('roleAssignments', (q) => {
        q.preload('role')
      })
      .orderBy('firstName')
      .orderBy('lastName')

    // Agent scoping: non-admin users with a franchiseId only see their franchise
    const isScopedToFranchise = !!(auth.user!.franchiseId && !(await this.isAdminOrDispatcher(auth.user!.id, tenant!.id)))

    if (isScopedToFranchise) {
      query.where('franchiseId', auth.user!.franchiseId!)
    } else if (filterFranchiseId) {
      query.where('franchiseId', filterFranchiseId)
    }

    const employees = await query.paginate(page, 20)
    employees.baseUrl('/employees')
    if (filterFranchiseId) {
      employees.queryString({ franchise_id: filterFranchiseId })
    }

    const franchises = await Franchise.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .preload('city')
      .orderBy('name')

    return view.render('pages/employees/index', {
      employees,
      franchises,
      filterFranchiseId,
      isScopedToFranchise,
    })
  }

  async create({ view, tenant, auth }: HttpContext) {
    const isScopedToFranchise = !!(auth.user!.franchiseId && !(await this.isAdminOrDispatcher(auth.user!.id, tenant!.id)))

    const franchises = await Franchise.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .preload('city')
      .orderBy('name')

    const roles = await Role.query()
      .where('tenantId', tenant!.id)
      .where('isSystem', true)
      .orderBy('name')

    return view.render('pages/employees/form', {
      franchises,
      roles,
      isScopedToFranchise,
      scopedFranchiseId: auth.user!.franchiseId,
    })
  }

  async store({ request, response, session, tenant, auth }: HttpContext) {
    const payload = await request.validateUsing(createEmployeeValidator)

    try {
      await db.transaction(async (trx) => {
        const user = await User.create(
          {
            tenantId: tenant!.id,
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            password: payload.password,
            phone: payload.phone || null,
            franchiseId: payload.franchiseId,
          },
          { client: trx }
        )

        await UserRoleAssignment.create(
          {
            userId: user.id,
            roleId: payload.roleId,
            grantedBy: auth.user!.id,
          },
          { client: trx }
        )
      })
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Un employé avec cet email existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Employé créé avec succès')
    return response.redirect().toRoute('employees.index')
  }

  async edit({ params, view, tenant, auth }: HttpContext) {
    const employee = await User.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .preload('roleAssignments', (q) => {
        q.preload('role')
      })
      .firstOrFail()

    const isScopedToFranchise = !!(auth.user!.franchiseId && !(await this.isAdminOrDispatcher(auth.user!.id, tenant!.id)))

    const franchises = await Franchise.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .preload('city')
      .orderBy('name')

    const roles = await Role.query()
      .where('tenantId', tenant!.id)
      .where('isSystem', true)
      .orderBy('name')

    return view.render('pages/employees/form', {
      employee,
      franchises,
      roles,
      isScopedToFranchise,
      scopedFranchiseId: auth.user!.franchiseId,
    })
  }

  async update({ params, request, response, session, tenant }: HttpContext) {
    const employee = await User.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const payload = await request.validateUsing(updateEmployeeValidator)

    try {
      employee.merge({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone || null,
        franchiseId: payload.franchiseId,
        status: payload.status,
      })

      if (payload.password) {
        employee.password = payload.password
      }

      await employee.save()

      // Update or create role assignment
      await UserRoleAssignment.updateOrCreate(
        { userId: employee.id },
        { roleId: payload.roleId }
      )
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Un employé avec cet email existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Employé mis à jour avec succès')
    return response.redirect().toRoute('employees.index')
  }

  async destroy({ params, response, session, tenant }: HttpContext) {
    const employee = await User.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    // Check if this is the last active admin
    const adminRole = await Role.query()
      .where('tenantId', tenant!.id)
      .where('name', 'Admin')
      .first()

    if (adminRole) {
      const isAdmin = await UserRoleAssignment.query()
        .where('userId', employee.id)
        .where('roleId', adminRole.id)
        .first()

      if (isAdmin) {
        const activeAdminCount = await UserRoleAssignment.query()
          .where('roleId', adminRole.id)
          .whereHas('user', (q) => {
            q.where('tenantId', tenant!.id).where('status', 'active')
          })
          .count('* as total')

        if (Number(activeAdminCount[0].$extras.total) <= 1) {
          session.flash('error', 'Impossible de désactiver le dernier administrateur actif.')
          return response.redirect().toRoute('employees.index')
        }
      }
    }

    employee.status = 'inactive'
    await employee.save()

    session.flash('success', 'Employé désactivé avec succès')
    return response.redirect().toRoute('employees.index')
  }

  private async isAdminOrDispatcher(userId: string, tenantId: string): Promise<boolean> {
    const assignment = await UserRoleAssignment.query()
      .where('userId', userId)
      .whereHas('role', (q) => {
        q.where('tenantId', tenantId).whereIn('name', ['Admin', 'Dispatcher'])
      })
      .first()

    return !!assignment
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/controllers/employees_controller.ts
git commit -m "feat: add EmployeesController with CRUD and agent scoping"
```

---

### Task 12: Add employee routes

**Files:**
- Create: `start/routes/employees.ts`
- Modify: `start/routes.ts`

- [ ] **Step 1: Create the employee routes file**

Create `start/routes/employees.ts`:

```typescript
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const EmployeesController = () => import('#controllers/employees_controller')

router
  .resource('employees', EmployeesController)
  .except(['show'])
  .use('*', middleware.auth())
  .use(['index'], middleware.permission({ keys: ['user:read'] }))
  .use(['create', 'store'], middleware.permission({ keys: ['user:create'] }))
  .use(['edit', 'update'], middleware.permission({ keys: ['user:update'] }))
  .use(['destroy'], middleware.permission({ keys: ['user:delete'] }))
```

- [ ] **Step 2: Register the route file**

In `start/routes.ts`, add after `import '#start/routes/franchises'`:

```typescript
import '#start/routes/employees'
```

- [ ] **Step 3: Verify routes are registered**

```bash
node ace list:routes | grep employee
```

Expected: All employee routes appear (index, create, store, edit, update, destroy).

- [ ] **Step 4: Commit**

```bash
git add start/routes/employees.ts start/routes.ts
git commit -m "feat: add employee routes with resource routing"
```

---

### Task 13: Create employee views

**Files:**
- Create: `resources/views/partials/employees/form_fields.edge`
- Create: `resources/views/pages/employees/form.edge`
- Create: `resources/views/pages/employees/index.edge`

- [ ] **Step 1: Create the form fields partial**

Create `resources/views/partials/employees/form_fields.edge`:

```edge
<div class="flex flex-col gap-6">
  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
    <div>
      @field.root({ name: 'firstName' })
        @!field.label({ text: 'Prénom' })
        @!input.control({ placeholder: 'Ex: Jean', value: employee?.firstName ?? '' })
        @!field.error()
      @end
    </div>

    <div>
      @field.root({ name: 'lastName' })
        @!field.label({ text: 'Nom' })
        @!input.control({ placeholder: 'Ex: Dupont', value: employee?.lastName ?? '' })
        @!field.error()
      @end
    </div>
  </div>

  <div>
    @field.root({ name: 'email' })
      @!field.label({ text: 'Email' })
      @!input.control({ type: 'email', placeholder: 'Ex: jean.dupont@example.com', value: employee?.email ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'phone' })
      @!field.label({ text: 'Téléphone' })
      @!input.control({ placeholder: 'Ex: +237 6XX XXX XXX', value: employee?.phone ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'password' })
      @!field.label({ text: employee ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe' })
      @!input.control({ type: 'password', placeholder: 'Minimum 8 caractères' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'franchiseId' })
      @!field.label({ text: 'Franchise' })
      @if(isScopedToFranchise)
        <input type="hidden" name="franchiseId" value="{{ scopedFranchiseId }}" />
        @!select.control({
          disabled: true,
          options: franchises.map((f) => ({
            value: f.id,
            name: `${f.name} — ${f.city.name}`,
            isSelected: f.id === scopedFranchiseId,
          }))
        })
      @else
        @!select.control({
          options: franchises.map((f) => ({
            value: f.id,
            name: `${f.name} — ${f.city.name}`,
            isSelected: employee ? employee.franchiseId === f.id : false,
          }))
        })
      @end
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'roleId' })
      @!field.label({ text: 'Rôle' })
      @!select.control({
        options: roles.map((r) => ({
          value: r.id,
          name: r.name,
          isSelected: employee?.roleAssignments?.[0]?.roleId === r.id,
        }))
      })
      @!field.error()
    @end
  </div>

  @if(employee)
    <div>
      @field.root({ name: 'status' })
        @!field.label({ text: 'Statut' })
        @!select.control({
          options: [
            { value: 'active', name: 'Actif', isSelected: employee.status === 'active' },
            { value: 'inactive', name: 'Inactif', isSelected: employee.status === 'inactive' },
            { value: 'suspended', name: 'Suspendu', isSelected: employee.status === 'suspended' },
          ]
        })
        @!field.error()
      @end
    </div>
  @end

  <div class="flex items-center gap-3">
    @!button({ text: employee ? 'Mettre à jour' : 'Créer', type: 'submit' })
    <a href="{{ route('employees.index') }}" class="text-sm text-on-surface hover:text-on-surface-strong transition-colors">Annuler</a>
  </div>
</div>
```

- [ ] **Step 2: Create the form page**

Create `resources/views/pages/employees/form.edge`:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-lg">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-on-surface-strong">
        {{ employee ? 'Modifier l\'employé' : 'Nouvel employé' }}
      </h1>
    </div>

    <div class="rounded-radius border border-outline bg-surface p-6">
      @if(employee)
        @form({ route: 'employees.update', routeParams: { id: employee.id }, method: 'PUT' })
          @include('partials/employees/form_fields')
        @end
      @else
        @form({ route: 'employees.store', method: 'POST' })
          @include('partials/employees/form_fields')
        @end
      @end
    </div>
  </div>
@end
```

- [ ] **Step 3: Create the index page**

Create `resources/views/pages/employees/index.edge`:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-on-surface-strong">Employés</h1>
      @can('permission', 'user:create')
        <a href="{{ route('employees.create') }}"
          class="inline-flex items-center gap-2 rounded-radius bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-secondary transition-colors">
          @svg('tabler:plus', { class: 'size-4' })
          <span>Nouvel employé</span>
        </a>
      @end
    </div>

    {{-- Franchise filter --}}
    @if(!isScopedToFranchise)
      <div class="mb-6 rounded-radius border border-outline bg-surface p-4">
        @form({ route: 'employees.index', method: 'GET' })
          <div class="flex items-center gap-4">
            <label for="franchise_id" class="text-sm font-medium text-on-surface">Filtrer par franchise</label>
            <select name="franchise_id" id="franchise_id"
              class="h-10 w-64 rounded-radius border border-neutral-300 bg-surface px-4 text-sm text-on-surface-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">Toutes les franchises</option>
              @each(f in franchises)
                <option value="{{ f.id }}" {{ filterFranchiseId === f.id ? 'selected' : '' }}>
                  {{ f.name }} — {{ f.city.name }}
                </option>
              @end
            </select>
            <button type="submit"
              class="inline-flex items-center gap-2 rounded-radius bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-secondary transition-colors">
              @svg('tabler:filter', { class: 'size-4' })
              <span>Filtrer</span>
            </button>
            @if(filterFranchiseId)
              <a href="{{ route('employees.index') }}"
                class="text-sm text-on-surface hover:text-on-surface-strong transition-colors">
                Réinitialiser
              </a>
            @end
          </div>
        @end
      </div>
    @end

    <div class="overflow-hidden rounded-radius border border-outline bg-surface">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
          <tr>
            <th class="px-6 py-3">Nom</th>
            <th class="px-6 py-3">Email</th>
            <th class="px-6 py-3">Téléphone</th>
            <th class="px-6 py-3">Franchise</th>
            <th class="px-6 py-3">Rôle</th>
            <th class="px-6 py-3">Statut</th>
            <th class="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          @each(item in employees)
            <tr class="hover:bg-surface-alt/50">
              <td class="px-6 py-4 font-medium text-on-surface-strong">{{ item.fullName }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.email }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.phone || '—' }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.franchise?.name || '—' }}</td>
              <td class="px-6 py-4 text-on-surface">
                {{ item.roleAssignments?.[0]?.role?.name || '—' }}
              </td>
              <td class="px-6 py-4">
                @if(item.status === 'active')
                  <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Actif</span>
                @elseif(item.status === 'suspended')
                  <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Suspendu</span>
                @else
                  <span class="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">Inactif</span>
                @end
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  @can('permission', 'user:update')
                    <a href="{{ route('employees.edit', { id: item.id }) }}"
                      class="text-on-surface hover:text-primary transition-colors">
                      @svg('tabler:edit', { class: 'size-4' })
                    </a>
                  @end
                  @can('permission', 'user:delete')
                    @form({ route: 'employees.destroy', routeParams: { id: item.id }, method: 'DELETE' })
                      <button type="submit"
                        class="cursor-pointer text-on-surface hover:text-danger transition-colors"
                        onclick="return confirm('Désactiver cet employé ?')">
                        @svg('tabler:trash', { class: 'size-4' })
                      </button>
                    @end
                  @end
                </div>
              </td>
            </tr>
          @end
        </tbody>
      </table>

      @if(!employees.length)
        <div class="px-6 py-12 text-center text-on-surface">
          Aucun employé trouvé.
        </div>
      @end

      @!pagination({ paginator: employees })
    </div>
  </div>
@end
```

- [ ] **Step 4: Commit**

```bash
git add resources/views/partials/employees/ resources/views/pages/employees/
git commit -m "feat: add employee views (index with franchise filter, form)"
```

---

### Task 14: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
node ace serve --watch
```

- [ ] **Step 2: Test franchise CRUD**

1. Navigate to `/franchises` — should show empty list
2. Click "Nouvelle franchise" — form should show with city select
3. Create a franchise — should redirect to index with success message
4. Create a second franchise (different city) — should appear in list
5. Try creating a franchise with a duplicate name — should show error
6. Click edit on a franchise — form should be pre-filled
7. Update a franchise — should redirect with success
8. Click the performance icon — should show placeholder page
9. Click delete on a franchise — should soft-delete (disappear from list)

- [ ] **Step 3: Test employee CRUD**

1. Navigate to `/employees` — should list existing users (including admin)
2. Click "Nouvel employé" — form should show franchise + role selects
3. Create an employee — should redirect to index with success
4. Try creating with duplicate email — should show error
5. Edit an employee — form should be pre-filled with current role/franchise
6. Change employee status — should update
7. Test franchise filter — select a franchise, click filter
8. Reset filter — click "Réinitialiser"

- [ ] **Step 4: Test sidebar**

1. Verify "Franchises" appears in the main nav section
2. Verify "Employés" appears in the Administration section
3. Verify both links work

- [ ] **Step 5: Final commit if any fixes needed**
