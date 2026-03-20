# Trip Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Bus CRUD, Drivers listing, and Trip planning modules for the Voyager transport management app.

**Architecture:** Three sequential modules following existing AdonisJS patterns (migration → model → validator → controller → views → sidebar). Buses are tenant-scoped with status management. Drivers are Users with the "Chauffeur" role (read-only view). Trips link a Route, Bus, and Driver with schedule, class, and price.

**Tech Stack:** AdonisJS 7, Lucid ORM, VineJS, Edge.js, Tailwind CSS, Alpine.js, PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-20-trip-planning-design.md`

---

## Task 1: Bus Migration

**Files:**
- Create: `database/migrations/TIMESTAMP_create_buses_table.ts`

- [ ] **Step 1: Generate migration**

Run: `node ace make:migration create_buses_table`
Expected: Migration file created in `database/migrations/`

- [ ] **Step 2: Write migration**

Replace the generated file content with:

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'buses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('license_plate', 20).notNullable().unique()
      table.string('brand', 80).notNullable()
      table.string('model', 80).notNullable()
      table.integer('capacity').notNullable()
      table.integer('year').notNullable()
      table
        .enum('status', ['available', 'on_trip', 'maintenance', 'out_of_service'], {
          useNative: true,
          enumName: 'bus_status',
        })
        .defaultTo('available')
        .notNullable()
      table.date('next_maintenance_date').nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['tenant_id'])
      table.index(['status'])
      table.index(['next_maintenance_date'])
      table.check('capacity > 0', [], 'chk_buses_positive_capacity')
      table.check('"year" BETWEEN 1990 AND 2035', [], 'chk_buses_valid_year')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "bus_status"')
  }
}
```

- [ ] **Step 3: Run migration**

Run: `node ace migration:run`
Expected: `buses` table created successfully

- [ ] **Step 4: Commit**

```bash
git add database/migrations/*_create_buses_table.ts database/schema.ts
git commit -m "feat: add buses table migration"
```

---

## Task 2: Bus Model

**Files:**
- Create: `app/models/bus.ts`

- [ ] **Step 1: Create the Bus model**

Create `app/models/bus.ts`:

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenant'

export default class Bus extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare licensePlate: string

  @column()
  declare brand: string

  @column()
  declare model: string

  @column()
  declare capacity: number

  @column()
  declare year: number

  @column()
  declare status: 'available' | 'on_trip' | 'maintenance' | 'out_of_service'

  @column()
  declare nextMaintenanceDate: string | null

  @column()
  declare active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>
}
```

- [ ] **Step 2: Commit**

```bash
git add app/models/bus.ts
git commit -m "feat: add Bus model"
```

---

## Task 3: Bus Validator

**Files:**
- Create: `app/validators/bus.ts`

- [ ] **Step 1: Create the Bus validator**

Create `app/validators/bus.ts`:

```typescript
import vine from '@vinejs/vine'

const licensePlate = () => vine.string().trim().minLength(1).maxLength(20)
const brand = () => vine.string().trim().minLength(1).maxLength(80)
const busModel = () => vine.string().trim().minLength(1).maxLength(80)
const capacity = () => vine.number().min(1).withoutDecimals()
const year = () => vine.number().min(1990).max(2035).withoutDecimals()
const status = () => vine.enum(['available', 'on_trip', 'maintenance', 'out_of_service'] as const)
const nextMaintenanceDate = () => vine.string().optional()

export const createBusValidator = vine.compile(
  vine.object({
    licensePlate: licensePlate(),
    brand: brand(),
    model: busModel(),
    capacity: capacity(),
    year: year(),
    status: status(),
    nextMaintenanceDate: nextMaintenanceDate(),
  })
)

export const updateBusValidator = vine.compile(
  vine.object({
    licensePlate: licensePlate(),
    brand: brand(),
    model: busModel(),
    capacity: capacity(),
    year: year(),
    status: status(),
    nextMaintenanceDate: nextMaintenanceDate(),
  })
)
```

- [ ] **Step 2: Commit**

```bash
git add app/validators/bus.ts
git commit -m "feat: add VineJS validators for bus create/update"
```

---

## Task 4: Buses Controller

**Files:**
- Create: `app/controllers/buses_controller.ts`

- [ ] **Step 1: Create the BusesController**

Create `app/controllers/buses_controller.ts`:

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import Bus from '#models/bus'
import { createBusValidator, updateBusValidator } from '#validators/bus'

export default class BusesController {
  async index({ view, tenant }: HttpContext) {
    const buses = await Bus.query()
      .where('tenantId', tenant!.id)
      .orderBy('licensePlate')

    return view.render('pages/buses/index', { buses })
  }

  async create({ view }: HttpContext) {
    return view.render('pages/buses/form')
  }

  async store({ request, response, session, tenant }: HttpContext) {
    const payload = await request.validateUsing(createBusValidator)

    try {
      await Bus.create({
        tenantId: tenant!.id,
        licensePlate: payload.licensePlate,
        brand: payload.brand,
        model: payload.model,
        capacity: payload.capacity,
        year: payload.year,
        status: payload.status,
        nextMaintenanceDate: payload.nextMaintenanceDate || null,
      })
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Un véhicule avec cette immatriculation existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Véhicule créé avec succès')
    return response.redirect().toRoute('buses.index')
  }

  async edit({ params, view, tenant }: HttpContext) {
    const bus = await Bus.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    return view.render('pages/buses/form', { bus })
  }

  async update({ params, request, response, session, tenant }: HttpContext) {
    const bus = await Bus.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const payload = await request.validateUsing(updateBusValidator)

    try {
      bus.merge({
        licensePlate: payload.licensePlate,
        brand: payload.brand,
        model: payload.model,
        capacity: payload.capacity,
        year: payload.year,
        status: payload.status,
        nextMaintenanceDate: payload.nextMaintenanceDate || null,
      })
      await bus.save()
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Un véhicule avec cette immatriculation existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Véhicule mis à jour avec succès')
    return response.redirect().toRoute('buses.index')
  }

  async destroy({ params, response, session, tenant }: HttpContext) {
    const bus = await Bus.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    // Note: once the trips table exists (Task 13+), this method should also check
    // for active trips. A follow-up task (Task 14b) adds the proper Trip-aware check.
    if (bus.status === 'on_trip') {
      session.flash('error', 'Impossible de désactiver un véhicule en voyage.')
      return response.redirect().toRoute('buses.index')
    }

    bus.active = false
    await bus.save()

    session.flash('success', 'Véhicule désactivé avec succès')
    return response.redirect().toRoute('buses.index')
  }
}
```

- [ ] **Step 2: Register controller in the auto-generated index**

Run: `node ace generate:manifest`

If this command doesn't exist, manually add to `.adonisjs/server/controllers.ts`:

```typescript
Buses: () => import('#controllers/buses_controller'),
```

- [ ] **Step 3: Commit**

```bash
git add app/controllers/buses_controller.ts .adonisjs/server/controllers.ts
git commit -m "feat: add BusesController with tenant-scoped CRUD"
```

---

## Task 5: Bus HTTP Routes

**Files:**
- Modify: `start/routes.ts`

- [ ] **Step 1: Add bus routes**

In `start/routes.ts`, inside the `.use(middleware.auth())` group, after the Routes group, add:

```typescript
    // Buses (tenant-scoped)
    router
      .group(() => {
        router.get('/', [controllers.Buses, 'index']).as('buses.index').use(middleware.permission({ keys: ['vehicle:read'] }))
        router.get('/create', [controllers.Buses, 'create']).as('buses.create').use(middleware.permission({ keys: ['vehicle:create'] }))
        router.post('/', [controllers.Buses, 'store']).as('buses.store').use(middleware.permission({ keys: ['vehicle:create'] }))
        router.get('/:id/edit', [controllers.Buses, 'edit']).as('buses.edit').use(middleware.permission({ keys: ['vehicle:update'] }))
        router.put('/:id', [controllers.Buses, 'update']).as('buses.update').use(middleware.permission({ keys: ['vehicle:update'] }))
        router.delete('/:id', [controllers.Buses, 'destroy']).as('buses.destroy').use(middleware.permission({ keys: ['vehicle:delete'] }))
      })
      .prefix('buses')
```

- [ ] **Step 2: Commit**

```bash
git add start/routes.ts
git commit -m "feat: add bus HTTP routes"
```

---

## Task 6: Bus Views

**Files:**
- Create: `resources/views/pages/buses/index.edge`
- Create: `resources/views/pages/buses/form.edge`
- Create: `resources/views/partials/buses/form_fields.edge`

- [ ] **Step 1: Create bus index view**

Create `resources/views/pages/buses/index.edge`:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-6xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-on-surface-strong">Véhicules</h1>
      @can('permission', 'vehicle:create')
        <a href="{{ route('buses.create') }}"
          class="inline-flex items-center gap-2 rounded-radius bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-secondary transition-colors">
          @svg('tabler:plus', { class: 'size-4' })
          <span>Nouveau véhicule</span>
        </a>
      @end
    </div>

    <div class="overflow-hidden rounded-radius border border-outline bg-surface">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
          <tr>
            <th class="px-6 py-3">Immatriculation</th>
            <th class="px-6 py-3">Marque</th>
            <th class="px-6 py-3">Modèle</th>
            <th class="px-6 py-3">Capacité</th>
            <th class="px-6 py-3">Année</th>
            <th class="px-6 py-3">Statut</th>
            <th class="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          @each(item in buses)
            <tr class="hover:bg-surface-alt/50">
              <td class="px-6 py-4 font-medium text-on-surface-strong">{{ item.licensePlate }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.brand }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.model }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.capacity }} places</td>
              <td class="px-6 py-4 text-on-surface">{{ item.year }}</td>
              <td class="px-6 py-4">
                @if(item.status === 'available')
                  <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Disponible</span>
                @elseif(item.status === 'on_trip')
                  <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">En voyage</span>
                @elseif(item.status === 'maintenance')
                  <span class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Maintenance</span>
                @else
                  <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Hors service</span>
                @end
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  @can('permission', 'vehicle:update')
                    <a href="{{ route('buses.edit', { id: item.id }) }}"
                      class="text-on-surface hover:text-primary transition-colors">
                      @svg('tabler:edit', { class: 'size-4' })
                    </a>
                  @end
                  @can('permission', 'vehicle:delete')
                    @form({ route: 'buses.destroy', routeParams: { id: item.id }, method: 'DELETE' })
                      <button type="submit"
                        class="cursor-pointer text-on-surface hover:text-danger transition-colors"
                        onclick="return confirm('Désactiver ce véhicule ?')">
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

      @if(!buses.length)
        <div class="px-6 py-12 text-center text-on-surface">
          Aucun véhicule enregistré.
        </div>
      @end
    </div>
  </div>
@end
```

- [ ] **Step 2: Create bus form view**

Create `resources/views/pages/buses/form.edge`:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-lg">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-on-surface-strong">
        {{ bus ? 'Modifier le véhicule' : 'Nouveau véhicule' }}
      </h1>
    </div>

    <div class="rounded-radius border border-outline bg-surface p-6">
      @if(bus)
        @form({ route: 'buses.update', routeParams: { id: bus.id }, method: 'PUT' })
          @include('partials/buses/form_fields')
        @end
      @else
        @form({ route: 'buses.store', method: 'POST' })
          @include('partials/buses/form_fields')
        @end
      @end
    </div>
  </div>
@end
```

- [ ] **Step 3: Create bus form fields partial**

Create `resources/views/partials/buses/form_fields.edge`:

```edge
<div class="flex flex-col gap-6">
  <div>
    @field.root({ name: 'licensePlate' })
      @!field.label({ text: 'Immatriculation' })
      @!input.control({ placeholder: 'Ex: LT-1234-AB', value: bus?.licensePlate ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'brand' })
      @!field.label({ text: 'Marque' })
      @!input.control({ placeholder: 'Ex: Mercedes-Benz', value: bus?.brand ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'model' })
      @!field.label({ text: 'Modèle' })
      @!input.control({ placeholder: 'Ex: Sprinter 516', value: bus?.model ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'capacity' })
      @!field.label({ text: 'Capacité (places)' })
      @!input.control({ type: 'number', min: '1', placeholder: 'Ex: 70', value: bus?.capacity ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'year' })
      @!field.label({ text: 'Année de mise en service' })
      @!input.control({ type: 'number', min: '1990', max: '2035', placeholder: 'Ex: 2022', value: bus?.year ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'status' })
      @!field.label({ text: 'Statut' })
      @!select.control({
        options: [
          { value: 'available', name: 'Disponible', isSelected: bus?.status === 'available' || !bus },
          { value: 'on_trip', name: 'En voyage', isSelected: bus?.status === 'on_trip' },
          { value: 'maintenance', name: 'Maintenance', isSelected: bus?.status === 'maintenance' },
          { value: 'out_of_service', name: 'Hors service', isSelected: bus?.status === 'out_of_service' },
        ]
      })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'nextMaintenanceDate' })
      @!field.label({ text: 'Prochaine maintenance' })
      @!input.control({ type: 'date', value: bus?.nextMaintenanceDate ?? '' })
      @!field.error()
    @end
  </div>

  <div class="flex items-center gap-3">
    @!button({ text: bus ? 'Mettre à jour' : 'Créer', type: 'submit' })
    <a href="{{ route('buses.index') }}" class="text-sm text-on-surface hover:text-on-surface-strong transition-colors">Annuler</a>
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add resources/views/pages/buses/ resources/views/partials/buses/
git commit -m "feat: add bus index and form views"
```

---

## Task 7: Bus Sidebar Entry

**Files:**
- Modify: `resources/views/components/layout/dashboard.edge`

- [ ] **Step 1: Replace the Véhicules placeholder with a real link wrapped in @can**

In `resources/views/components/layout/dashboard.edge`, replace:

```edge
        @!sidebar.item({
        href: '#',
        icon: 'tabler:bus',
        label: 'Véhicules',
        })
```

with:

```edge
        @can('permission', 'vehicle:read')
        @!sidebar.item({
        href: route('buses.index'),
        icon: 'tabler:bus',
        label: 'Véhicules',
        })
        @end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/components/layout/dashboard.edge
git commit -m "feat: add Véhicules entry to sidebar with permission guard"
```

---

## Task 8: Drivers Controller

**Files:**
- Create: `app/controllers/drivers_controller.ts`

- [ ] **Step 1: Create the DriversController**

Create `app/controllers/drivers_controller.ts`:

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Role from '#models/role'

export default class DriversController {
  async index({ view, tenant }: HttpContext) {
    const chauffeurRole = await Role.query()
      .where('tenantId', tenant!.id)
      .where('name', 'Chauffeur')
      .first()

    if (!chauffeurRole) {
      return view.render('pages/drivers/index', { drivers: [] })
    }

    const drivers = await User.query()
      .where('tenantId', tenant!.id)
      .whereHas('roleAssignments', (query) => {
        query.where('roleId', chauffeurRole.id)
      })
      .orderBy('firstName')
      .orderBy('lastName')

    return view.render('pages/drivers/index', { drivers })
  }
}
```

- [ ] **Step 2: Register controller**

Add to `.adonisjs/server/controllers.ts`:

```typescript
Drivers: () => import('#controllers/drivers_controller'),
```

Or run: `node ace generate:manifest`

- [ ] **Step 3: Commit**

```bash
git add app/controllers/drivers_controller.ts .adonisjs/server/controllers.ts
git commit -m "feat: add DriversController listing users with Chauffeur role"
```

---

## Task 9: Drivers HTTP Route

**Files:**
- Modify: `start/routes.ts`

- [ ] **Step 1: Add drivers route**

In `start/routes.ts`, inside the `.use(middleware.auth())` group, after the Buses group, add:

```typescript
    // Drivers (tenant-scoped, read-only)
    router
      .group(() => {
        router.get('/', [controllers.Drivers, 'index']).as('drivers.index').use(middleware.permission({ keys: ['driver:read'] }))
      })
      .prefix('drivers')
```

- [ ] **Step 2: Commit**

```bash
git add start/routes.ts
git commit -m "feat: add drivers HTTP route"
```

---

## Task 10: Drivers Index View

**Files:**
- Create: `resources/views/pages/drivers/index.edge`

- [ ] **Step 1: Create drivers index view**

Create `resources/views/pages/drivers/index.edge`:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-6xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-on-surface-strong">Conducteurs</h1>
    </div>

    <div class="overflow-hidden rounded-radius border border-outline bg-surface">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
          <tr>
            <th class="px-6 py-3">Nom complet</th>
            <th class="px-6 py-3">Email</th>
            <th class="px-6 py-3">Statut</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          @each(driver in drivers)
            <tr class="hover:bg-surface-alt/50">
              <td class="px-6 py-4 font-medium text-on-surface-strong">{{ driver.fullName }}</td>
              <td class="px-6 py-4 text-on-surface">{{ driver.email }}</td>
              <td class="px-6 py-4">
                @if(driver.status === 'active')
                  <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Actif</span>
                @elseif(driver.status === 'inactive')
                  <span class="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">Inactif</span>
                @else
                  <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Suspendu</span>
                @end
              </td>
            </tr>
          @end
        </tbody>
      </table>

      @if(!drivers.length)
        <div class="px-6 py-12 text-center text-on-surface">
          Aucun conducteur enregistré.
        </div>
      @end
    </div>
  </div>
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/drivers/
git commit -m "feat: add drivers index view"
```

---

## Task 11: Drivers Sidebar Entry

**Files:**
- Modify: `resources/views/components/layout/dashboard.edge`

- [ ] **Step 1: Replace the Conducteurs placeholder with a real link wrapped in @can**

In `resources/views/components/layout/dashboard.edge`, replace:

```edge
        @!sidebar.item({
        href: '#',
        icon: 'tabler:steering-wheel',
        label: 'Conducteurs',
        })
```

with:

```edge
        @can('permission', 'driver:read')
        @!sidebar.item({
        href: route('drivers.index'),
        icon: 'tabler:steering-wheel',
        label: 'Conducteurs',
        })
        @end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/components/layout/dashboard.edge
git commit -m "feat: add Conducteurs entry to sidebar with permission guard"
```

---

## Task 12: RBAC — Add Trip Permissions

**Files:**
- Modify: `config/rbac.ts`

- [ ] **Step 1: Add trip resource permissions to the permissions catalog**

In `config/rbac.ts`, after the Drivers block, add:

```typescript
  // Trips
  { resource: 'trip', action: 'create', description: 'Schedule a trip' },
  { resource: 'trip', action: 'read', description: 'View trips' },
  { resource: 'trip', action: 'update', description: 'Update a trip' },
  { resource: 'trip', action: 'delete', description: 'Delete a trip', isSensitive: true },
```

- [ ] **Step 2: Update Dispatcher role permissions**

In the `systemRoles` array, add trip permissions to the Dispatcher role. Add these entries to the Dispatcher's `permissions` array:

```typescript
      'trip:create',
      'trip:read',
      'trip:update',
      'trip:delete',
```

- [ ] **Step 3: Update Chauffeur role permissions**

Add to the Chauffeur's `permissions` array:

```typescript
      'trip:read',
```

- [ ] **Step 4: Update Lecteur role permissions**

Add to the Lecteur's `permissions` array:

```typescript
      'trip:read',
```

- [ ] **Step 5: Commit**

```bash
git add config/rbac.ts
git commit -m "feat: add trip permissions and update system roles"
```

---

## Task 13: Trip Migration

**Files:**
- Create: `database/migrations/TIMESTAMP_create_trips_table.ts`

- [ ] **Step 1: Generate migration**

Run: `node ace make:migration create_trips_table`
Expected: Migration file created in `database/migrations/`

- [ ] **Step 2: Write migration**

Replace the generated file content with:

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trips'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.uuid('route_id').notNullable().references('id').inTable('routes').onDelete('RESTRICT')
      table.uuid('bus_id').notNullable().references('id').inTable('buses').onDelete('RESTRICT')
      table.uuid('driver_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table.timestamp('departure_time').notNullable()
      table.timestamp('arrival_time').notNullable()
      table
        .enum('travel_class', ['standard', 'vip'], {
          useNative: true,
          enumName: 'trip_travel_class',
        })
        .defaultTo('standard')
        .notNullable()
      table.decimal('price', 10, 2).notNullable()
      table
        .enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled'], {
          useNative: true,
          enumName: 'trip_status',
        })
        .defaultTo('scheduled')
        .notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['route_id'])
      table.index(['bus_id'])
      table.index(['driver_id'])
      table.index(['departure_time'])
      table.index(['status'])
      table.index(['bus_id', 'status', 'departure_time', 'arrival_time'])
      table.index(['driver_id', 'status', 'departure_time', 'arrival_time'])
      table.check('"arrival_time" > "departure_time"', [], 'chk_trips_arrival_after_departure')
      table.check('"price" >= 0', [], 'chk_trips_positive_price')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "trip_status"')
    this.schema.raw('DROP TYPE IF EXISTS "trip_travel_class"')
  }
}
```

- [ ] **Step 3: Run migration**

Run: `node ace migration:run`
Expected: `trips` table created successfully

- [ ] **Step 4: Commit**

```bash
git add database/migrations/*_create_trips_table.ts database/schema.ts
git commit -m "feat: add trips table migration"
```

---

## Task 14: Trip Model + Update Existing Models

**Files:**
- Create: `app/models/trip.ts`
- Modify: `app/models/route.ts`
- Modify: `app/models/bus.ts`

- [ ] **Step 1: Create the Trip model**

Create `app/models/trip.ts`:

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenant'
import Route from '#models/route'
import Bus from '#models/bus'
import User from '#models/user'

export default class Trip extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare routeId: string

  @column()
  declare busId: string

  @column()
  declare driverId: string

  @column.dateTime()
  declare departureTime: DateTime

  @column.dateTime()
  declare arrivalTime: DateTime

  @column()
  declare travelClass: 'standard' | 'vip'

  @column()
  declare price: number

  @column()
  declare status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Route)
  declare route: BelongsTo<typeof Route>

  @belongsTo(() => Bus)
  declare bus: BelongsTo<typeof Bus>

  @belongsTo(() => User, { foreignKey: 'driverId' })
  declare driver: BelongsTo<typeof User>
}
```

- [ ] **Step 2: Add hasMany Trip to the Route model**

In `app/models/route.ts`, add the import and relationship:

Add to imports:
```typescript
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Trip from '#models/trip'
```

Add at the end of the class (before the closing `}`):
```typescript
  @hasMany(() => Trip)
  declare trips: HasMany<typeof Trip>
```

- [ ] **Step 3: Add hasMany Trip to the Bus model**

In `app/models/bus.ts`, add the import and relationship:

Add to imports:
```typescript
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Trip from '#models/trip'
```

Add at the end of the class (before the closing `}`):
```typescript
  @hasMany(() => Trip)
  declare trips: HasMany<typeof Trip>
```

- [ ] **Step 4: Add hasMany Trip to the User model**

In `app/models/user.ts`, add the import and relationship:

Add to imports:
```typescript
import Trip from '#models/trip'
```

Update the existing `hasMany` import line to include `HasMany` if not already present:
```typescript
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
```

Add at the end of the class (before the closing `}`):
```typescript
  @hasMany(() => Trip, { foreignKey: 'driverId' })
  declare driverTrips: HasMany<typeof Trip>
```

- [ ] **Step 5: Commit**

```bash
git add app/models/trip.ts app/models/route.ts app/models/bus.ts app/models/user.ts
git commit -m "feat: add Trip model and hasMany relationships on Route, Bus, and User"
```

---

## Task 14b: Update BusesController destroy to check for active trips

**Files:**
- Modify: `app/controllers/buses_controller.ts`

- [ ] **Step 1: Add Trip import and active trips check**

In `app/controllers/buses_controller.ts`, add the import at the top:

```typescript
import Trip from '#models/trip'
```

Replace the `destroy` method with:

```typescript
  async destroy({ params, response, session, tenant }: HttpContext) {
    const bus = await Bus.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const activeTrips = await Trip.query()
      .where('busId', bus.id)
      .whereIn('status', ['scheduled', 'in_progress'])
      .count('* as total')

    if (Number(activeTrips[0].$extras.total) > 0) {
      session.flash('error', 'Impossible de désactiver un véhicule ayant des voyages actifs.')
      return response.redirect().toRoute('buses.index')
    }

    bus.active = false
    await bus.save()

    session.flash('success', 'Véhicule désactivé avec succès')
    return response.redirect().toRoute('buses.index')
  }
```

- [ ] **Step 2: Commit**

```bash
git add app/controllers/buses_controller.ts
git commit -m "feat: check for active trips before deactivating a bus"
```

---

## Task 15: Trip Validator

**Files:**
- Create: `app/validators/trip.ts`

- [ ] **Step 1: Create the Trip validator**

Create `app/validators/trip.ts`:

```typescript
import vine from '@vinejs/vine'

const routeId = () => vine.string().uuid()
const busId = () => vine.string().uuid()
const driverId = () => vine.string().uuid()
const departureTime = () => vine.string().trim()
const arrivalTime = () => vine.string().trim()
const travelClass = () => vine.enum(['standard', 'vip'] as const)
const price = () => vine.number().min(0).decimal([0, 2])

export const createTripValidator = vine.compile(
  vine.object({
    routeId: routeId(),
    busId: busId(),
    driverId: driverId(),
    departureTime: departureTime(),
    arrivalTime: arrivalTime(),
    travelClass: travelClass(),
    price: price(),
  })
)

export const updateTripValidator = vine.compile(
  vine.object({
    routeId: routeId(),
    busId: busId(),
    driverId: driverId(),
    departureTime: departureTime(),
    arrivalTime: arrivalTime(),
    travelClass: travelClass(),
    price: price(),
  })
)
```

- [ ] **Step 2: Commit**

```bash
git add app/validators/trip.ts
git commit -m "feat: add VineJS validators for trip create/update"
```

---

## Task 16: Trips Controller

**Files:**
- Create: `app/controllers/trips_controller.ts`

- [ ] **Step 1: Create the TripsController**

Create `app/controllers/trips_controller.ts`:

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Trip from '#models/trip'
import Route from '#models/route'
import Bus from '#models/bus'
import User from '#models/user'
import Role from '#models/role'
import { createTripValidator, updateTripValidator } from '#validators/trip'

export default class TripsController {
  async index({ view, tenant }: HttpContext) {
    const trips = await Trip.query()
      .where('tenantId', tenant!.id)
      .preload('route', (query) => {
        query.preload('departureCity').preload('arrivalCity')
      })
      .preload('bus')
      .preload('driver')
      .orderBy('departureTime', 'desc')

    return view.render('pages/trips/index', { trips })
  }

  async create({ view, tenant }: HttpContext) {
    const routes = await Route.query()
      .where('tenantId', tenant!.id)
      .where('status', 'active')
      .preload('departureCity')
      .preload('arrivalCity')
      .orderBy('code')

    const buses = await Bus.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .where('status', 'available')
      .orderBy('licensePlate')

    const drivers = await this.getDrivers(tenant!.id)

    return view.render('pages/trips/form', { routes, buses, drivers })
  }

  async store({ request, response, session, tenant }: HttpContext) {
    const payload = await request.validateUsing(createTripValidator)
    const departureTime = DateTime.fromISO(payload.departureTime)
    const arrivalTime = DateTime.fromISO(payload.arrivalTime)

    if (!departureTime.isValid || !arrivalTime.isValid) {
      session.flash('error', 'Les dates saisies sont invalides.')
      return response.redirect().back()
    }

    if (arrivalTime <= departureTime) {
      session.flash('error', "L'heure d'arrivée doit être postérieure à l'heure de départ.")
      return response.redirect().back()
    }

    const busOverlap = await this.checkBusOverlap(payload.busId, departureTime, arrivalTime, tenant!.id)
    if (busOverlap) {
      session.flash('error', 'Ce véhicule est déjà assigné à un autre voyage sur cette période.')
      return response.redirect().back()
    }

    const driverOverlap = await this.checkDriverOverlap(payload.driverId, departureTime, arrivalTime, tenant!.id)
    if (driverOverlap) {
      session.flash('error', 'Ce conducteur est déjà assigné à un autre voyage sur cette période.')
      return response.redirect().back()
    }

    await Trip.create({
      tenantId: tenant!.id,
      routeId: payload.routeId,
      busId: payload.busId,
      driverId: payload.driverId,
      departureTime: departureTime,
      arrivalTime: arrivalTime,
      travelClass: payload.travelClass,
      price: payload.price,
      status: 'scheduled',
    })

    session.flash('success', 'Voyage planifié avec succès')
    return response.redirect().toRoute('trips.index')
  }

  async edit({ params, view, response, tenant }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (trip.status === 'completed' || trip.status === 'cancelled') {
      return response.redirect().toRoute('trips.index')
    }

    const routes = await Route.query()
      .where('tenantId', tenant!.id)
      .where('status', 'active')
      .preload('departureCity')
      .preload('arrivalCity')
      .orderBy('code')

    const buses = await Bus.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .where((query) => {
        query.where('status', 'available').orWhere('id', trip.busId)
      })
      .orderBy('licensePlate')

    const drivers = await this.getDrivers(tenant!.id, trip.driverId)

    return view.render('pages/trips/form', { trip, routes, buses, drivers })
  }

  async update({ params, request, response, session, tenant }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (trip.status === 'completed' || trip.status === 'cancelled') {
      session.flash('error', 'Impossible de modifier un voyage terminé ou annulé.')
      return response.redirect().toRoute('trips.index')
    }

    const payload = await request.validateUsing(updateTripValidator)
    const departureTime = DateTime.fromISO(payload.departureTime)
    const arrivalTime = DateTime.fromISO(payload.arrivalTime)

    if (!departureTime.isValid || !arrivalTime.isValid) {
      session.flash('error', 'Les dates saisies sont invalides.')
      return response.redirect().back()
    }

    if (arrivalTime <= departureTime) {
      session.flash('error', "L'heure d'arrivée doit être postérieure à l'heure de départ.")
      return response.redirect().back()
    }

    const busOverlap = await this.checkBusOverlap(payload.busId, departureTime, arrivalTime, tenant!.id, trip.id)
    if (busOverlap) {
      session.flash('error', 'Ce véhicule est déjà assigné à un autre voyage sur cette période.')
      return response.redirect().back()
    }

    const driverOverlap = await this.checkDriverOverlap(payload.driverId, departureTime, arrivalTime, tenant!.id, trip.id)
    if (driverOverlap) {
      session.flash('error', 'Ce conducteur est déjà assigné à un autre voyage sur cette période.')
      return response.redirect().back()
    }

    trip.merge({
      routeId: payload.routeId,
      busId: payload.busId,
      driverId: payload.driverId,
      departureTime: departureTime,
      arrivalTime: arrivalTime,
      travelClass: payload.travelClass,
      price: payload.price,
    })
    await trip.save()

    session.flash('success', 'Voyage mis à jour avec succès')
    return response.redirect().toRoute('trips.index')
  }

  async destroy({ params, response, session, tenant }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (trip.status === 'in_progress') {
      session.flash('error', 'Impossible de supprimer un voyage en cours.')
      return response.redirect().toRoute('trips.index')
    }

    if (trip.status === 'completed' || trip.status === 'cancelled') {
      session.flash('error', 'Impossible de supprimer un voyage terminé ou annulé.')
      return response.redirect().toRoute('trips.index')
    }

    await trip.delete()
    session.flash('success', 'Voyage supprimé avec succès')
    return response.redirect().toRoute('trips.index')
  }

  /**
   * Check if a bus has an overlapping trip in the given time range.
   * Excludes cancelled/completed trips and optionally a specific trip (for updates).
   */
  private async checkBusOverlap(
    busId: string,
    departureTime: DateTime,
    arrivalTime: DateTime,
    tenantId: string,
    excludeTripId?: string
  ): Promise<boolean> {
    const query = Trip.query()
      .where('tenantId', tenantId)
      .where('busId', busId)
      .whereIn('status', ['scheduled', 'in_progress'])
      .where('departureTime', '<', arrivalTime.toSQL()!)
      .where('arrivalTime', '>', departureTime.toSQL()!)

    if (excludeTripId) {
      query.whereNot('id', excludeTripId)
    }

    const result = await query.count('* as total')
    return Number(result[0].$extras.total) > 0
  }

  /**
   * Check if a driver has an overlapping trip in the given time range.
   */
  private async checkDriverOverlap(
    driverId: string,
    departureTime: DateTime,
    arrivalTime: DateTime,
    tenantId: string,
    excludeTripId?: string
  ): Promise<boolean> {
    const query = Trip.query()
      .where('tenantId', tenantId)
      .where('driverId', driverId)
      .whereIn('status', ['scheduled', 'in_progress'])
      .where('departureTime', '<', arrivalTime.toSQL()!)
      .where('arrivalTime', '>', departureTime.toSQL()!)

    if (excludeTripId) {
      query.whereNot('id', excludeTripId)
    }

    const result = await query.count('* as total')
    return Number(result[0].$extras.total) > 0
  }

  /**
   * Get users with the Chauffeur role for the given tenant.
   * Optionally includes a specific driver (for edit forms where the current driver may be inactive).
   */
  private async getDrivers(tenantId: string, includeDriverId?: string): Promise<User[]> {
    const chauffeurRole = await Role.query()
      .where('tenantId', tenantId)
      .where('name', 'Chauffeur')
      .first()

    if (!chauffeurRole) return []

    return User.query()
      .where('tenantId', tenantId)
      .where((query) => {
        query.where('status', 'active')
        if (includeDriverId) {
          query.orWhere('id', includeDriverId)
        }
      })
      .whereHas('roleAssignments', (q) => {
        q.where('roleId', chauffeurRole.id)
      })
      .orderBy('firstName')
      .orderBy('lastName')
  }
}
```

- [ ] **Step 2: Register controller**

Add to `.adonisjs/server/controllers.ts`:

```typescript
Trips: () => import('#controllers/trips_controller'),
```

Or run: `node ace generate:manifest`

- [ ] **Step 3: Commit**

```bash
git add app/controllers/trips_controller.ts .adonisjs/server/controllers.ts
git commit -m "feat: add TripsController with overlap validation and status management"
```

---

## Task 17: Trip HTTP Routes

**Files:**
- Modify: `start/routes.ts`

- [ ] **Step 1: Add trip routes**

In `start/routes.ts`, inside the `.use(middleware.auth())` group, after the Drivers group, add:

```typescript
    // Trips (tenant-scoped)
    router
      .group(() => {
        router.get('/', [controllers.Trips, 'index']).as('trips.index').use(middleware.permission({ keys: ['trip:read'] }))
        router.get('/create', [controllers.Trips, 'create']).as('trips.create').use(middleware.permission({ keys: ['trip:create'] }))
        router.post('/', [controllers.Trips, 'store']).as('trips.store').use(middleware.permission({ keys: ['trip:create'] }))
        router.get('/:id/edit', [controllers.Trips, 'edit']).as('trips.edit').use(middleware.permission({ keys: ['trip:update'] }))
        router.put('/:id', [controllers.Trips, 'update']).as('trips.update').use(middleware.permission({ keys: ['trip:update'] }))
        router.delete('/:id', [controllers.Trips, 'destroy']).as('trips.destroy').use(middleware.permission({ keys: ['trip:delete'] }))
      })
      .prefix('trips')
```

- [ ] **Step 2: Commit**

```bash
git add start/routes.ts
git commit -m "feat: add trip HTTP routes"
```

---

## Task 18: Trip Views

**Files:**
- Create: `resources/views/pages/trips/index.edge`
- Create: `resources/views/pages/trips/form.edge`
- Create: `resources/views/partials/trips/form_fields.edge`

- [ ] **Step 1: Create trip index view**

Create `resources/views/pages/trips/index.edge`:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-on-surface-strong">Voyages</h1>
      @can('permission', 'trip:create')
        <a href="{{ route('trips.create') }}"
          class="inline-flex items-center gap-2 rounded-radius bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-secondary transition-colors">
          @svg('tabler:plus', { class: 'size-4' })
          <span>Nouveau voyage</span>
        </a>
      @end
    </div>

    <div class="overflow-hidden rounded-radius border border-outline bg-surface">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
          <tr>
            <th class="px-6 py-3">Route</th>
            <th class="px-6 py-3">Bus</th>
            <th class="px-6 py-3">Chauffeur</th>
            <th class="px-6 py-3">Départ</th>
            <th class="px-6 py-3">Classe</th>
            <th class="px-6 py-3">Tarif</th>
            <th class="px-6 py-3">Statut</th>
            <th class="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          @each(item in trips)
            <tr class="hover:bg-surface-alt/50">
              <td class="px-6 py-4 font-medium text-on-surface-strong">
                {{ item.route.departureCity.name }} → {{ item.route.arrivalCity.name }}
              </td>
              <td class="px-6 py-4 text-on-surface">{{ item.bus.licensePlate }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.driver.fullName }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.departureTime.toFormat('dd/MM/yyyy HH:mm') }}</td>
              <td class="px-6 py-4">
                @if(item.travelClass === 'vip')
                  <span class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">VIP</span>
                @else
                  <span class="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">Standard</span>
                @end
              </td>
              <td class="px-6 py-4 text-on-surface">{{ item.price }} FCFA</td>
              <td class="px-6 py-4">
                @if(item.status === 'scheduled')
                  <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Planifié</span>
                @elseif(item.status === 'in_progress')
                  <span class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">En cours</span>
                @elseif(item.status === 'completed')
                  <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Terminé</span>
                @else
                  <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Annulé</span>
                @end
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  @if(item.status === 'scheduled' || item.status === 'in_progress')
                    @can('permission', 'trip:update')
                      <a href="{{ route('trips.edit', { id: item.id }) }}"
                        class="text-on-surface hover:text-primary transition-colors">
                        @svg('tabler:edit', { class: 'size-4' })
                      </a>
                    @end
                  @end
                  @if(item.status === 'scheduled')
                    @can('permission', 'trip:delete')
                      @form({ route: 'trips.destroy', routeParams: { id: item.id }, method: 'DELETE' })
                        <button type="submit"
                          class="cursor-pointer text-on-surface hover:text-danger transition-colors"
                          onclick="return confirm('Supprimer ce voyage ?')">
                          @svg('tabler:trash', { class: 'size-4' })
                        </button>
                      @end
                    @end
                  @end
                </div>
              </td>
            </tr>
          @end
        </tbody>
      </table>

      @if(!trips.length)
        <div class="px-6 py-12 text-center text-on-surface">
          Aucun voyage enregistré.
        </div>
      @end
    </div>
  </div>
@end
```

- [ ] **Step 2: Create trip form view**

Create `resources/views/pages/trips/form.edge`:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-lg">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-on-surface-strong">
        {{ trip ? 'Modifier le voyage' : 'Nouveau voyage' }}
      </h1>
    </div>

    <div class="rounded-radius border border-outline bg-surface p-6">
      @if(trip)
        @form({ route: 'trips.update', routeParams: { id: trip.id }, method: 'PUT' })
          @include('partials/trips/form_fields')
        @end
      @else
        @form({ route: 'trips.store', method: 'POST' })
          @include('partials/trips/form_fields')
        @end
      @end
    </div>
  </div>
@end
```

- [ ] **Step 3: Create trip form fields partial**

Create `resources/views/partials/trips/form_fields.edge`:

```edge
<div class="flex flex-col gap-6">
  <div>
    @field.root({ name: 'routeId' })
      @!field.label({ text: 'Route' })
      @!select.control({
        options: [
          { value: '', name: 'Sélectionner une route' },
          ...routes.map((r) => ({
            value: r.id,
            name: `${r.code} — ${r.departureCity.name} → ${r.arrivalCity.name}`,
            isSelected: trip?.routeId === r.id,
          }))
        ]
      })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'busId' })
      @!field.label({ text: 'Véhicule' })
      @!select.control({
        options: [
          { value: '', name: 'Sélectionner un véhicule' },
          ...buses.map((b) => ({
            value: b.id,
            name: `${b.licensePlate} — ${b.brand} ${b.model} (${b.capacity} places)`,
            isSelected: trip?.busId === b.id,
          }))
        ]
      })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'driverId' })
      @!field.label({ text: 'Chauffeur' })
      @!select.control({
        options: [
          { value: '', name: 'Sélectionner un chauffeur' },
          ...drivers.map((d) => ({
            value: d.id,
            name: d.fullName,
            isSelected: trip?.driverId === d.id,
          }))
        ]
      })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'departureTime' })
      @!field.label({ text: 'Date et heure de départ' })
      @!input.control({ type: 'datetime-local', value: trip?.departureTime ? trip.departureTime.toFormat("yyyy-MM-dd'T'HH:mm") : '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'arrivalTime' })
      @!field.label({ text: "Date et heure d'arrivée prévue" })
      @!input.control({ type: 'datetime-local', value: trip?.arrivalTime ? trip.arrivalTime.toFormat("yyyy-MM-dd'T'HH:mm") : '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'travelClass' })
      @!field.label({ text: 'Classe' })
      @!select.control({
        options: [
          { value: 'standard', name: 'Standard', isSelected: trip?.travelClass === 'standard' || !trip },
          { value: 'vip', name: 'VIP', isSelected: trip?.travelClass === 'vip' },
        ]
      })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'price' })
      @!field.label({ text: 'Tarif (FCFA)' })
      @!input.control({ type: 'number', step: '0.01', min: '0', placeholder: 'Ex: 5000', value: trip?.price ?? '' })
      @!field.error()
    @end
  </div>

  <div class="flex items-center gap-3">
    @!button({ text: trip ? 'Mettre à jour' : 'Planifier', type: 'submit' })
    <a href="{{ route('trips.index') }}" class="text-sm text-on-surface hover:text-on-surface-strong transition-colors">Annuler</a>
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add resources/views/pages/trips/ resources/views/partials/trips/
git commit -m "feat: add trip index and form views"
```

---

## Task 19: Trip Sidebar Entry

**Files:**
- Modify: `resources/views/components/layout/dashboard.edge`

- [ ] **Step 1: Add Voyages entry to sidebar**

In `resources/views/components/layout/dashboard.edge`, after the Conducteurs entry (which was updated in Task 11), add the Voyages entry:

```edge
        @can('permission', 'trip:read')
        @!sidebar.item({
        href: route('trips.index'),
        icon: 'tabler:map-2',
        label: 'Voyages',
        })
        @end
```

Place it after the Conducteurs `@end` and before the `</ul>` closing tag.

- [ ] **Step 2: Commit**

```bash
git add resources/views/components/layout/dashboard.edge
git commit -m "feat: add Voyages entry to sidebar with permission guard"
```

