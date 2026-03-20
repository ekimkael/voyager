# Cities & Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add City (global) and Route (tenant-scoped) CRUD so admins can manage transport liaisons.

**Architecture:** Two new Lucid models with migrations, VineJS validators, resourceful controllers, and Edge.js views following existing patterns. Cities are global (no tenant_id, RLS bypassed with `USING(true)` policy). Routes are tenant-scoped. Permissions enforced via Bouncer middleware.

**Tech Stack:** AdonisJS 7, Lucid ORM, PostgreSQL, VineJS, Edge.js, Bouncer, Tailwind CSS, Alpine.js

**Spec:** `docs/superpowers/specs/2026-03-20-cities-routes-design.md`

---

## File Structure

### New files
- `database/migrations/<timestamp>_create_cities_table.ts` — cities table (global)
- `database/migrations/<timestamp>_create_routes_table.ts` — routes table (tenant-scoped)
- `app/models/city.ts` — City model (no tenant scoping)
- `app/models/route.ts` — Route model (tenant-scoped, computed duration helpers)
- `app/validators/city.ts` — VineJS validators for city create/update
- `app/validators/route.ts` — VineJS validators for route create/update
- `app/controllers/cities_controller.ts` — CRUD controller for cities
- `app/controllers/routes_controller.ts` — CRUD controller for routes
- `resources/views/pages/cities/index.edge` — Cities listing page
- `resources/views/pages/cities/form.edge` — City create/edit form
- `resources/views/pages/routes/index.edge` — Routes listing page
- `resources/views/pages/routes/form.edge` — Route create/edit form
- `resources/views/partials/cities/form_fields.edge` — City form fields partial
- `resources/views/partials/routes/form_fields.edge` — Route form fields partial

### Modified files
- `config/rbac.ts` — Add `city` permissions
- `start/routes.ts` — Add city and route resource routes
- `resources/views/components/layout/dashboard.edge` — Add sidebar entries

---

## Task 1: Database — Cities migration

**Files:**
- Create: `database/migrations/<timestamp>_create_cities_table.ts`

- [ ] **Step 1: Create the migration file**

```bash
node ace make:migration create_cities_table
```

- [ ] **Step 2: Write the migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('name', 255).notNullable()
      table.string('country', 255).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['name', 'country'])
    })

    // Cities are global — bypass RLS so all tenants can access
    this.schema.raw(`
      ALTER TABLE ${this.tableName} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY cities_global_access ON ${this.tableName} USING (true) WITH CHECK (true);
    `)
  }

  async down() {
    this.schema.raw(`DROP POLICY IF EXISTS cities_global_access ON ${this.tableName}`)
    this.schema.dropTable(this.tableName)
  }
}
```

- [ ] **Step 3: Run the migration**

```bash
node ace migration:run
```

Expected: "migrated" message for cities table.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/*_create_cities_table.ts
git commit -m "feat: add cities migration (global table)"
```

---

## Task 2: Database — Routes migration

**Files:**
- Create: `database/migrations/<timestamp>_create_routes_table.ts`

- [ ] **Step 1: Create the migration file**

```bash
node ace make:migration create_routes_table
```

- [ ] **Step 2: Write the migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'routes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('code', 50).notNullable()
      table.uuid('departure_city_id').notNullable().references('id').inTable('cities').onDelete('RESTRICT')
      table.uuid('arrival_city_id').notNullable().references('id').inTable('cities').onDelete('RESTRICT')
      table.decimal('distance_km', 10, 2).notNullable()
      table.integer('estimated_duration_minutes').notNullable()
      table
        .enum('status', ['active', 'inactive'], {
          useNative: true,
          enumName: 'route_status',
        })
        .defaultTo('active')
        .notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['tenant_id', 'code'])
      table.check('departure_city_id != arrival_city_id', [], 'chk_routes_different_cities')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "route_status"')
  }
}
```

- [ ] **Step 3: Run the migration**

```bash
node ace migration:run
```

Expected: "migrated" message for routes table.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/*_create_routes_table.ts
git commit -m "feat: add routes migration (tenant-scoped with city FKs)"
```

---

## Task 3: City model

**Files:**
- Create: `app/models/city.ts`

- [ ] **Step 1: Create the model**

```typescript
import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Route from '#models/route'

export default class City extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare country: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Route, { foreignKey: 'departureCityId' })
  declare departureRoutes: HasMany<typeof Route>

  @hasMany(() => Route, { foreignKey: 'arrivalCityId' })
  declare arrivalRoutes: HasMany<typeof Route>
}
```

- [ ] **Step 2: Commit**

```bash
git add app/models/city.ts
git commit -m "feat: add City model (global, no tenant scoping)"
```

---

## Task 4: Route model

**Files:**
- Create: `app/models/route.ts`

- [ ] **Step 1: Create the model**

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenant'
import City from '#models/city'

export default class Route extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare code: string

  @column()
  declare departureCityId: string

  @column()
  declare arrivalCityId: string

  @column()
  declare distanceKm: number

  @column()
  declare estimatedDurationMinutes: number

  @column()
  declare status: 'active' | 'inactive'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => City, { foreignKey: 'departureCityId' })
  declare departureCity: BelongsTo<typeof City>

  @belongsTo(() => City, { foreignKey: 'arrivalCityId' })
  declare arrivalCity: BelongsTo<typeof City>

  get formattedDuration(): string {
    const hours = Math.floor(this.estimatedDurationMinutes / 60)
    const minutes = this.estimatedDurationMinutes % 60
    return minutes > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`
  }

  get durationTimeValue(): string {
    const hours = Math.floor(this.estimatedDurationMinutes / 60)
    const minutes = this.estimatedDurationMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/models/route.ts
git commit -m "feat: add Route model (tenant-scoped with duration computed properties)"
```

---

## Task 5: RBAC — Add city permissions

**Files:**
- Modify: `config/rbac.ts`

- [ ] **Step 1: Add city permissions to the catalog**

In `config/rbac.ts`, add after the existing "Routes" block (line 19):

```typescript
  // Cities
  { resource: 'city', action: 'create', description: 'Create a city' },
  { resource: 'city', action: 'read', description: 'View cities' },
  { resource: 'city', action: 'update', description: 'Update a city' },
  { resource: 'city', action: 'delete', description: 'Delete a city', isSensitive: true },
```

- [ ] **Step 2: Update system roles**

Add `'city:read'` to Dispatcher, Chauffeur, and Lecteur roles:

**Dispatcher** (add to permissions array):
```typescript
'city:read',
```

**Chauffeur** (add to permissions array):
```typescript
'city:read',
```

**Lecteur** (add to permissions array):
```typescript
'city:read',
```

Admin already gets all permissions via `'*'`.

- [ ] **Step 3: Commit**

```bash
git add config/rbac.ts
git commit -m "feat: add city permissions to RBAC catalog and system roles"
```

---

## Task 6: City validators

**Files:**
- Create: `app/validators/city.ts`

- [ ] **Step 1: Write the validators**

```typescript
import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(2).maxLength(255)
const country = () => vine.string().trim().minLength(2).maxLength(255)

export const createCityValidator = vine.compile(
  vine.object({
    name: name(),
    country: country(),
  })
)

export const updateCityValidator = vine.compile(
  vine.object({
    name: name(),
    country: country(),
  })
)
```

Note: Uniqueness (name + country) is enforced at the database level via the unique index. The controller will catch the unique constraint violation and flash an appropriate error message.

- [ ] **Step 2: Commit**

```bash
git add app/validators/city.ts
git commit -m "feat: add VineJS validators for city create/update"
```

---

## Task 7: Route validators

**Files:**
- Create: `app/validators/route.ts`

- [ ] **Step 1: Write the validators**

```typescript
import vine from '@vinejs/vine'

const code = () => vine.string().trim().minLength(1).maxLength(50)
const cityId = () => vine.string().uuid()
const distanceKm = () => vine.number().positive().decimal([0, 2])
const estimatedDuration = () => vine.string().regex(/^\d{2}:\d{2}$/)
const status = () => vine.enum(['active', 'inactive'] as const)

export const createRouteValidator = vine.compile(
  vine.object({
    code: code(),
    departureCityId: cityId(),
    arrivalCityId: cityId(),
    distanceKm: distanceKm(),
    estimatedDuration: estimatedDuration(),
    status: status(),
  })
)

export const updateRouteValidator = vine.compile(
  vine.object({
    code: code(),
    departureCityId: cityId(),
    arrivalCityId: cityId(),
    distanceKm: distanceKm(),
    estimatedDuration: estimatedDuration(),
    status: status(),
  })
)
```

Note: The `departureCityId != arrivalCityId` check is enforced at the database level via the check constraint. The controller will catch violations and flash an error. Route code uniqueness per tenant is enforced by the unique index.

- [ ] **Step 2: Commit**

```bash
git add app/validators/route.ts
git commit -m "feat: add VineJS validators for route create/update"
```

---

## Task 8: Cities controller

**Files:**
- Create: `app/controllers/cities_controller.ts`

- [ ] **Step 1: Write the controller**

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import City from '#models/city'
import Route from '#models/route'
import { createCityValidator, updateCityValidator } from '#validators/city'

export default class CitiesController {
  async index({ view }: HttpContext) {
    const cities = await City.query().orderBy('country').orderBy('name')
    return view.render('pages/cities/index', { cities })
  }

  async create({ view }: HttpContext) {
    return view.render('pages/cities/form')
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(createCityValidator)

    try {
      await City.create(payload)
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Cette ville existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Ville créée avec succès')
    return response.redirect().toRoute('cities.index')
  }

  async edit({ params, view }: HttpContext) {
    const city = await City.findOrFail(params.id)
    return view.render('pages/cities/form', { city })
  }

  async update({ params, request, response, session }: HttpContext) {
    const city = await City.findOrFail(params.id)
    const payload = await request.validateUsing(updateCityValidator)

    try {
      city.merge(payload)
      await city.save()
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Cette ville existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Ville mise à jour avec succès')
    return response.redirect().toRoute('cities.index')
  }

  async destroy({ params, response, session }: HttpContext) {
    const city = await City.findOrFail(params.id)

    const routeCount = await Route.query()
      .where('departureCityId', city.id)
      .orWhere('arrivalCityId', city.id)
      .count('* as total')

    if (Number(routeCount[0].$extras.total) > 0) {
      session.flash('error', 'Impossible de supprimer cette ville car elle est utilisée par une ou plusieurs routes.')
      return response.redirect().toRoute('cities.index')
    }

    await city.delete()
    session.flash('success', 'Ville supprimée avec succès')
    return response.redirect().toRoute('cities.index')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/controllers/cities_controller.ts
git commit -m "feat: add CitiesController with CRUD operations"
```

---

## Task 9: Routes controller

**Files:**
- Create: `app/controllers/routes_controller.ts`

- [ ] **Step 1: Write the controller**

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import Route from '#models/route'
import City from '#models/city'
import { createRouteValidator, updateRouteValidator } from '#validators/route'

export default class RoutesController {
  async index({ view, tenant }: HttpContext) {
    const routes = await Route.query()
      .where('tenantId', tenant!.id)
      .preload('departureCity')
      .preload('arrivalCity')
      .orderBy('code')

    return view.render('pages/routes/index', { routes })
  }

  async create({ view }: HttpContext) {
    const cities = await City.query().orderBy('country').orderBy('name')
    return view.render('pages/routes/form', { cities })
  }

  async store({ request, response, session, tenant }: HttpContext) {
    const payload = await request.validateUsing(createRouteValidator)
    const [hours, minutes] = payload.estimatedDuration.split(':').map(Number)

    try {
      await Route.create({
        tenantId: tenant!.id,
        code: payload.code,
        departureCityId: payload.departureCityId,
        arrivalCityId: payload.arrivalCityId,
        distanceKm: payload.distanceKm,
        estimatedDurationMinutes: hours * 60 + minutes,
        status: payload.status,
      })
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Une route avec ce code existe déjà.')
        return response.redirect().back()
      }
      if (error.code === '23514') {
        session.flash('error', 'La ville de départ et la ville d\'arrivée doivent être différentes.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Route créée avec succès')
    return response.redirect().toRoute('routes.index')
  }

  async edit({ params, view, tenant }: HttpContext) {
    const transportRoute = await Route.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const cities = await City.query().orderBy('country').orderBy('name')
    return view.render('pages/routes/form', { transportRoute, cities })
  }

  async update({ params, request, response, session, tenant }: HttpContext) {
    const transportRoute = await Route.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const payload = await request.validateUsing(updateRouteValidator)
    const [hours, minutes] = payload.estimatedDuration.split(':').map(Number)

    try {
      transportRoute.merge({
        code: payload.code,
        departureCityId: payload.departureCityId,
        arrivalCityId: payload.arrivalCityId,
        distanceKm: payload.distanceKm,
        estimatedDurationMinutes: hours * 60 + minutes,
        status: payload.status,
      })
      await transportRoute.save()
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Une route avec ce code existe déjà.')
        return response.redirect().back()
      }
      if (error.code === '23514') {
        session.flash('error', 'La ville de départ et la ville d\'arrivée doivent être différentes.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Route mise à jour avec succès')
    return response.redirect().toRoute('routes.index')
  }

  async destroy({ params, response, session, tenant }: HttpContext) {
    const transportRoute = await Route.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    await transportRoute.delete()
    session.flash('success', 'Route supprimée avec succès')
    return response.redirect().toRoute('routes.index')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/controllers/routes_controller.ts
git commit -m "feat: add RoutesController with tenant-scoped CRUD"
```

---

## Task 10: HTTP routes

**Files:**
- Modify: `start/routes.ts`

- [ ] **Step 1: Add city and route resource routes**

Add inside the existing `middleware.auth()` group, after the dashboard route:

```typescript
    // Cities (global)
    router
      .group(() => {
        router.get('/', [controllers.Cities, 'index']).as('cities.index').use(middleware.permission({ keys: ['city:read'] }))
        router.get('/create', [controllers.Cities, 'create']).as('cities.create').use(middleware.permission({ keys: ['city:create'] }))
        router.post('/', [controllers.Cities, 'store']).as('cities.store').use(middleware.permission({ keys: ['city:create'] }))
        router.get('/:id/edit', [controllers.Cities, 'edit']).as('cities.edit').use(middleware.permission({ keys: ['city:update'] }))
        router.put('/:id', [controllers.Cities, 'update']).as('cities.update').use(middleware.permission({ keys: ['city:update'] }))
        router.delete('/:id', [controllers.Cities, 'destroy']).as('cities.destroy').use(middleware.permission({ keys: ['city:delete'] }))
      })
      .prefix('cities')

    // Routes (tenant-scoped)
    router
      .group(() => {
        router.get('/', [controllers.Routes, 'index']).as('routes.index').use(middleware.permission({ keys: ['route:read'] }))
        router.get('/create', [controllers.Routes, 'create']).as('routes.create').use(middleware.permission({ keys: ['route:create'] }))
        router.post('/', [controllers.Routes, 'store']).as('routes.store').use(middleware.permission({ keys: ['route:create'] }))
        router.get('/:id/edit', [controllers.Routes, 'edit']).as('routes.edit').use(middleware.permission({ keys: ['route:update'] }))
        router.put('/:id', [controllers.Routes, 'update']).as('routes.update').use(middleware.permission({ keys: ['route:update'] }))
        router.delete('/:id', [controllers.Routes, 'destroy']).as('routes.destroy').use(middleware.permission({ keys: ['route:delete'] }))
      })
      .prefix('routes')
```

- [ ] **Step 2: Verify routes list**

```bash
node ace list:routes
```

Expected: all city and route routes appear with correct methods, paths, and names.

- [ ] **Step 3: Commit**

```bash
git add start/routes.ts
git commit -m "feat: add city and route HTTP routes"
```

---

## Task 11: Cities views — index page

**Files:**
- Create: `resources/views/pages/cities/index.edge`

- [ ] **Step 1: Write the index template**

```edge
@layout.dashboard()
  <div class="mx-auto max-w-5xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-on-surface-strong">Villes</h1>
      @can('permission', 'city:create')
        <a href="{{ route('cities.create') }}"
          class="inline-flex items-center gap-2 rounded-radius bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-secondary transition-colors">
          @svg('tabler:plus', { class: 'size-4' })
          <span>Nouvelle ville</span>
        </a>
      @end
    </div>

    <div class="overflow-hidden rounded-radius border border-outline bg-surface">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
          <tr>
            <th class="px-6 py-3">Nom</th>
            <th class="px-6 py-3">Pays</th>
            <th class="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          @each(city in cities)
            <tr class="hover:bg-surface-alt/50">
              <td class="px-6 py-4 font-medium text-on-surface-strong">{{ city.name }}</td>
              <td class="px-6 py-4 text-on-surface">{{ city.country }}</td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  @can('permission', 'city:update')
                    <a href="{{ route('cities.edit', { id: city.id }) }}"
                      class="text-on-surface hover:text-primary transition-colors">
                      @svg('tabler:edit', { class: 'size-4' })
                    </a>
                  @end
                  @can('permission', 'city:delete')
                    @form({ route: 'cities.destroy', routeParams: { id: city.id }, method: 'DELETE' })
                      <button type="submit"
                        class="cursor-pointer text-on-surface hover:text-danger transition-colors"
                        onclick="return confirm('Supprimer cette ville ?')">
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

      @if(!cities.length)
        <div class="px-6 py-12 text-center text-on-surface">
          Aucune ville enregistrée.
        </div>
      @end
    </div>
  </div>
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/cities/index.edge
git commit -m "feat: add cities index view"
```

---

## Task 12: Cities views — form page

**Files:**
- Create: `resources/views/pages/cities/form.edge`

- [ ] **Step 1: Write the form template**

```edge
@layout.dashboard()
  <div class="mx-auto max-w-lg">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-on-surface-strong">
        {{ city ? 'Modifier la ville' : 'Nouvelle ville' }}
      </h1>
    </div>

    <div class="rounded-radius border border-outline bg-surface p-6">
      @if(city)
        @form({ route: 'cities.update', routeParams: { id: city.id }, method: 'PUT' })
          @include('partials/cities/form_fields')
        @end
      @else
        @form({ route: 'cities.store', method: 'POST' })
          @include('partials/cities/form_fields')
        @end
      @end
    </div>
  </div>
@end
```

- [ ] **Step 2: Create form fields partial**

Create `resources/views/partials/cities/form_fields.edge`:

```edge
<div class="flex flex-col gap-6">
  <div>
    @field.root({ name: 'name' })
      @!field.label({ text: 'Nom' })
      @!input.control({ placeholder: 'Ex: Douala', value: city?.name ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'country' })
      @!field.label({ text: 'Pays' })
      @!input.control({ placeholder: 'Ex: Cameroun', value: city?.country ?? '' })
      @!field.error()
    @end
  </div>

  <div class="flex items-center gap-3">
    @!button({ text: city ? 'Mettre à jour' : 'Créer', type: 'submit' })
    <a href="{{ route('cities.index') }}" class="text-sm text-on-surface hover:text-on-surface-strong transition-colors">Annuler</a>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add resources/views/pages/cities/form.edge resources/views/partials/cities/form_fields.edge
git commit -m "feat: add cities form view (create/edit)"
```

---

## Task 13: Routes views — index page

**Files:**
- Create: `resources/views/pages/routes/index.edge`

- [ ] **Step 1: Write the index template**

Note: In the routes index and form templates, we use `item` as the loop variable (not `route`) and `transportRoute` as the model variable (not `route`) to avoid shadowing Edge.js's global `route()` URL helper.

```edge
@layout.dashboard()
  <div class="mx-auto max-w-6xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-on-surface-strong">Routes</h1>
      @can('permission', 'route:create')
        <a href="{{ route('routes.create') }}"
          class="inline-flex items-center gap-2 rounded-radius bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-secondary transition-colors">
          @svg('tabler:plus', { class: 'size-4' })
          <span>Nouvelle route</span>
        </a>
      @end
    </div>

    <div class="overflow-hidden rounded-radius border border-outline bg-surface">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
          <tr>
            <th class="px-6 py-3">Code</th>
            <th class="px-6 py-3">Départ</th>
            <th class="px-6 py-3">Arrivée</th>
            <th class="px-6 py-3">Distance</th>
            <th class="px-6 py-3">Durée</th>
            <th class="px-6 py-3">Statut</th>
            <th class="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          @each(item in routes)
            <tr class="hover:bg-surface-alt/50">
              <td class="px-6 py-4 font-medium text-on-surface-strong">{{ item.code }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.departureCity.name }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.arrivalCity.name }}</td>
              <td class="px-6 py-4 text-on-surface">{{ item.distanceKm }} km</td>
              <td class="px-6 py-4 text-on-surface">{{ item.formattedDuration }}</td>
              <td class="px-6 py-4">
                @if(item.status === 'active')
                  <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
                @else
                  <span class="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">Inactive</span>
                @end
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  @can('permission', 'route:update')
                    <a href="{{ route('routes.edit', { id: item.id }) }}"
                      class="text-on-surface hover:text-primary transition-colors">
                      @svg('tabler:edit', { class: 'size-4' })
                    </a>
                  @end
                  @can('permission', 'route:delete')
                    @form({ route: 'routes.destroy', routeParams: { id: item.id }, method: 'DELETE' })
                      <button type="submit"
                        class="cursor-pointer text-on-surface hover:text-danger transition-colors"
                        onclick="return confirm('Supprimer cette route ?')">
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

      @if(!routes.length)
        <div class="px-6 py-12 text-center text-on-surface">
          Aucune route enregistrée.
        </div>
      @end
    </div>
  </div>
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/routes/index.edge
git commit -m "feat: add routes index view"
```

---

## Task 14: Routes views — form page

**Files:**
- Create: `resources/views/pages/routes/form.edge`
- Create: `resources/views/partials/routes/form_fields.edge`

- [ ] **Step 1: Write the form template**

The controller passes `transportRoute` (not `route`) to avoid shadowing Edge.js's `route()` helper.

```edge
@layout.dashboard()
  <div class="mx-auto max-w-lg">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-on-surface-strong">
        {{ transportRoute ? 'Modifier la route' : 'Nouvelle route' }}
      </h1>
    </div>

    <div class="rounded-radius border border-outline bg-surface p-6">
      @if(transportRoute)
        @form({ route: 'routes.update', routeParams: { id: transportRoute.id }, method: 'PUT' })
          @include('partials/routes/form_fields')
        @end
      @else
        @form({ route: 'routes.store', method: 'POST' })
          @include('partials/routes/form_fields')
        @end
      @end
    </div>
  </div>
@end
```

- [ ] **Step 2: Create form fields partial**

Create `resources/views/partials/routes/form_fields.edge`:

```edge
<div class="flex flex-col gap-6">
  <div>
    @field.root({ name: 'code' })
      @!field.label({ text: 'Code' })
      @!input.control({ placeholder: 'Ex: N3', value: transportRoute?.code ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'departureCityId' })
      @!field.label({ text: 'Ville de départ' })
      @!select.control({
        options: [
          { value: '', name: 'Sélectionner une ville' },
          ...cities.map((city) => ({
            value: city.id,
            name: `${city.name}, ${city.country}`,
            isSelected: transportRoute?.departureCityId === city.id,
          }))
        ]
      })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'arrivalCityId' })
      @!field.label({ text: "Ville d'arrivée" })
      @!select.control({
        options: [
          { value: '', name: 'Sélectionner une ville' },
          ...cities.map((city) => ({
            value: city.id,
            name: `${city.name}, ${city.country}`,
            isSelected: transportRoute?.arrivalCityId === city.id,
          }))
        ]
      })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'distanceKm' })
      @!field.label({ text: 'Distance (km)' })
      @!input.control({ type: 'number', step: '0.01', min: '0.01', placeholder: 'Ex: 260.50', value: transportRoute?.distanceKm ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'estimatedDuration' })
      @!field.label({ text: 'Durée estimée' })
      @!input.control({ type: 'time', value: transportRoute?.durationTimeValue ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'status' })
      @!field.label({ text: 'Statut' })
      @!select.control({
        options: [
          { value: 'active', name: 'Active', isSelected: transportRoute?.status === 'active' || !transportRoute },
          { value: 'inactive', name: 'Inactive', isSelected: transportRoute?.status === 'inactive' },
        ]
      })
      @!field.error()
    @end
  </div>

  <div class="flex items-center gap-3">
    @!button({ text: transportRoute ? 'Mettre à jour' : 'Créer', type: 'submit' })
    <a href="{{ route('routes.index') }}" class="text-sm text-on-surface hover:text-on-surface-strong transition-colors">Annuler</a>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add resources/views/pages/routes/form.edge resources/views/partials/routes/form_fields.edge
git commit -m "feat: add routes form view (create/edit)"
```

---

## Task 15: Sidebar navigation

**Files:**
- Modify: `resources/views/components/layout/dashboard.edge`

- [ ] **Step 1: Update sidebar entries**

In the `<nav>` section, replace the existing Routes and Arrêts sidebar items (lines 53-61) with linked versions, and add a Villes entry:

Replace:
```edge
        @!sidebar.item({
        href: '#',
        icon: 'tabler:route',
        label: 'Routes',
        })
        @!sidebar.item({
        href: '#',
        icon: 'tabler:map-pin',
        label: 'Arrêts',
        })
```

With:
```edge
        @can('permission', 'city:read')
        @!sidebar.item({
        href: route('cities.index'),
        icon: 'tabler:building',
        label: 'Villes',
        })
        @end
        @can('permission', 'route:read')
        @!sidebar.item({
        href: route('routes.index'),
        icon: 'tabler:route',
        label: 'Routes',
        })
        @end
        @!sidebar.item({
        href: '#',
        icon: 'tabler:map-pin',
        label: 'Arrêts',
        })
```

- [ ] **Step 2: Verify sidebar renders**

Start the dev server and verify both entries appear in the sidebar:

```bash
node ace serve --watch
```

- [ ] **Step 3: Commit**

```bash
git add resources/views/components/layout/dashboard.edge
git commit -m "feat: add Villes and Routes entries to sidebar"
```

---

## Task 16: Manual integration test

- [ ] **Step 1: Start the dev server**

```bash
node ace serve --watch
```

- [ ] **Step 2: Test Cities CRUD**

1. Navigate to `/cities` — should show empty table
2. Click "Nouvelle ville" — form renders
3. Create "Douala, Cameroun" — redirects to index, flash success
4. Create "Yaoundé, Cameroun" — appears in table
5. Try creating "Douala, Cameroun" again — flash error (duplicate)
6. Edit "Douala" — form pre-fills, update works
7. Delete "Yaoundé" — succeeds (not referenced)

- [ ] **Step 3: Test Routes CRUD**

1. Navigate to `/routes` — should show empty table
2. Click "Nouvelle route" — form renders with city selects populated
3. Create route "N3" from Douala to Yaoundé, 260 km, 04:00, active
4. Try selecting same city for departure and arrival — database error caught, flash message
5. Edit route — form pre-fills correctly including time input
6. Delete route — succeeds

- [ ] **Step 4: Test deletion protection**

1. Create a route referencing "Douala"
2. Try deleting "Douala" from cities — should show error flash
3. Delete the route first, then delete "Douala" — should succeed

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete cities and routes CRUD implementation"
```
