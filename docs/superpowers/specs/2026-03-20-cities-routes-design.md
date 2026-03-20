# Cities & Routes Design — Voyager

## Context

Voyager is a SaaS platform for bus transport companies. An admin needs to manage transport routes (liaisons) with departure city, arrival city, distance, and estimated duration. Cities are shared globally across all tenants. Routes are scoped per tenant so each transport company defines its own liaisons.

**Stack:** AdonisJS v7, Lucid ORM, PostgreSQL, Edge.js, VineJS, Bouncer RBAC.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| City scope | Global (no tenant_id) | Cities are universal — Douala is Douala for every tenant. No need to duplicate. |
| Route scope | Per-tenant (tenant_id) | Each transport company defines its own liaisons, codes, and durations. |
| Duration storage | Total minutes (integer) | Single column, trivial arithmetic. Conversion from `<input type="time">` in controller. |
| Duration input | `<input type="time">` | Native browser control, single field, returns `HH:MM` format. |
| Route status | Enum (active/inactive) | Allows soft-disabling a route without deletion; prevents FK issues with future entities. |
| Route code | varchar(50), unique per tenant | Supports local naming conventions like "N3", "National 3". |
| City uniqueness | Unique on (name, country) | Prevents duplicates globally. |
| Route uniqueness | Unique on (tenant_id, code) | Prevents duplicate codes within a tenant. |
| City deletion | Protected | Cannot delete a city referenced by any route. |
| Form templates | Single `form.edge` per entity | Same template for create and edit; detects mode by presence of model data. |
| City permissions | city:create/read/update/delete | New permissions to add in rbac.ts. Any user with the permission can manage. |
| Route permissions | route:create/read/update/delete | Already defined in rbac.ts. Scoped by tenant. |
| RLS for cities | `USING (true)` policy on cities table | Cities are global — RLS must allow unrestricted access since there is no tenant_id. |
| Route status enum | PostgreSQL native enum `route_status` | Follows existing convention (`tenant_plan`, `user_status`) with `useNative: true`. |
| City FK on delete | ON DELETE RESTRICT | Database-level safety net complementing application-level protected deletion. |

## Database Schema

### cities (global — no tenant_id)

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| name | varchar(255) | NOT NULL |
| country | varchar(255) | NOT NULL |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

**Indexes:**
- Unique: `(name, country)`

**RLS:**
- Policy `USING (true)` — cities are global, all tenants can read/write (access controlled by application-level RBAC, not RLS).

### routes (tenant-scoped)

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| tenant_id | uuid | FK → tenants, NOT NULL, ON DELETE CASCADE |
| code | varchar(50) | NOT NULL |
| departure_city_id | uuid | FK → cities, NOT NULL, ON DELETE RESTRICT |
| arrival_city_id | uuid | FK → cities, NOT NULL, ON DELETE RESTRICT |
| distance_km | decimal(10,2) | NOT NULL |
| estimated_duration_minutes | integer | NOT NULL |
| status | enum(`active`, `inactive`) | NOT NULL, default `active` |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

**Indexes:**
- Unique: `(tenant_id, code)`

**Check constraints:**
- `departure_city_id != arrival_city_id`

## Models

### City

- Fields: id, name, country, timestamps
- Relations: hasMany Route (as departure), hasMany Route (as arrival)
- No tenant scoping — queries City directly without tenant scoping

### Route

- Fields: id, tenantId, code, departureCityId, arrivalCityId, distanceKm, estimatedDurationMinutes, status, timestamps
- Relations: belongsTo City (departure), belongsTo City (arrival), belongsTo Tenant
- Computed: `formattedDuration` — converts `estimatedDurationMinutes` to `"5h30"` format (display)
- Computed: `durationTimeValue` — converts `estimatedDurationMinutes` to `"05:30"` format (for `<input type="time">` in edit form)

## Validators

### City validators (`app/validators/city.ts`)

```
createCityValidator / updateCityValidator:
  name: string, trim, 2–255 chars, unique(name + country) excluding current record on update
  country: string, trim, 2–255 chars
```

### Route validators (`app/validators/route.ts`)

```
createRouteValidator / updateRouteValidator:
  code: string, trim, 1–50 chars, unique within tenant excluding current record on update
  departureCityId: uuid, exists in cities
  arrivalCityId: uuid, exists in cities, != departureCityId
  distanceKm: number, decimal, > 0
  estimatedDuration: string (HH:MM from input type=time, parsed in controller)
  status: enum(active, inactive)
```

## Controllers

### CitiesController (`app/controllers/cities_controller.ts`)

| Method | Action | Permission |
|--------|--------|------------|
| `index()` | List all cities (no tenant scoping) | city:read |
| `create()` | Render form (create mode) | city:create |
| `store()` | Validate + persist | city:create |
| `edit(id)` | Render form (edit mode) | city:update |
| `update(id)` | Validate + update | city:update |
| `destroy(id)` | Delete if not referenced | city:delete |

### RoutesController (`app/controllers/routes_controller.ts`)

| Method | Action | Permission |
|--------|--------|------------|
| `index()` | List tenant routes with cities loaded | route:read |
| `create()` | Render form (create mode) with city select | route:create |
| `store()` | Validate + convert duration + persist | route:create |
| `edit(id)` | Render form (edit mode) | route:update |
| `update(id)` | Validate + update | route:update |
| `destroy(id)` | Delete route | route:delete |

**Duration conversion in store/update:**
```
Forward:  "05:30" → split(":") → 5 * 60 + 30 = 330 minutes
Reverse:  330 → Math.floor(330/60) = 5, 330 % 60 = 30 → "05:30" (via durationTimeValue computed)
```

## HTTP Routes

```
// Cities (global)
GET    /cities              cities.index      permission(city:read)
GET    /cities/create       cities.create     permission(city:create)
POST   /cities              cities.store      permission(city:create)
GET    /cities/:id/edit     cities.edit       permission(city:update)
PUT    /cities/:id          cities.update     permission(city:update)
DELETE /cities/:id          cities.destroy    permission(city:delete)

// Routes (tenant-scoped)
GET    /routes              routes.index      permission(route:read)
GET    /routes/create       routes.create     permission(route:create)
POST   /routes              routes.store      permission(route:create)
GET    /routes/:id/edit     routes.edit       permission(route:update)
PUT    /routes/:id          routes.update     permission(route:update)
DELETE /routes/:id          routes.destroy    permission(route:delete)
```

## Views

### Cities
- `pages/cities/index.edge` — Table listing all cities (name, country, actions)
- `pages/cities/form.edge` — Create/edit form (detects mode by presence of `city` variable)

### Routes
- `pages/routes/index.edge` — Table listing tenant routes (code, departure, arrival, distance, duration, status, actions)
- `pages/routes/form.edge` — Create/edit form with city selects and time input

### Sidebar
- Add "Villes" entry conditioned by `@can('permission', 'city:read')`
- Add "Routes" entry conditioned by `@can('permission', 'route:read')`

### Components
Uses existing form components: `@form`, `@field.root`, `@input.control`, `@select.control`, `@button`.

## RBAC Changes

### New permissions in `config/rbac.ts`

```
city: ['create', 'read', 'update', 'delete']
```

`routes` permissions already exist.

### System roles updates

| Role | City permissions | Route permissions |
|------|-----------------|-------------------|
| Admin | all (`*`) | all (already) |
| Dispatcher | read | create, read, update, delete (already) |
| Chauffeur | read | read |
| Lecteur | read | read (already) |

## Deletion rules

- **City**: protected — cannot delete if referenced as departure or arrival in any route. Flash error message: "Impossible de supprimer cette ville car elle est utilisée par une ou plusieurs routes."
- **Route**: direct deletion allowed (no downstream references yet).

## Flash messages

- City created: "Ville créée avec succès"
- City updated: "Ville mise à jour avec succès"
- City deleted: "Ville supprimée avec succès"
- Route created: "Route créée avec succès"
- Route updated: "Route mise à jour avec succès"
- Route deleted: "Route supprimée avec succès"
