# Trip History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated trip history page with server-side filters and pagination for admins to analyze past activity.

**Architecture:** New `GET /trips/history` route served by a `history()` method in the existing `TripsController`. Filters are parsed manually from query params and applied conditionally to a Lucid query. A reusable pagination Edge component is created. The existing `index()` method is scoped to operational trips only.

**Tech Stack:** AdonisJS v7, Lucid ORM (pagination), Edge templates, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-20-trip-history-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `start/routes/trips.ts` | Modify | Add `GET /history` route before `/:id` routes |
| `app/controllers/trips_controller.ts` | Modify | Add `history()` method, scope `index()` to operational statuses |
| `resources/views/pages/trips/history.edge` | Create | History page with filter form + results table + pagination |
| `resources/views/components/pagination.edge` | Create | Reusable pagination component |
| `resources/views/components/layout/dashboard.edge` | Modify | Add "Historique" sidebar entry |

---

### Task 1: Add the history route

**Files:**
- Modify: `start/routes/trips.ts`

- [ ] **Step 1: Add the history route before parameterized routes**

In `start/routes/trips.ts`, add the history route inside the group, after the `POST /` (store) route and before `GET /:id/edit`:

```typescript
router
  .get('/history', [controllers.Trips, 'history'])
  .as('trips.history')
  .use(middleware.permission({ keys: ['trip:read'] }))
```

This must be placed before any `/:id` routes to avoid AdonisJS matching "history" as an `:id` param.

- [ ] **Step 2: Commit**

```bash
git add start/routes/trips.ts
git commit -m "feat: add GET /trips/history route"
```

---

### Task 2: Scope index() to operational trips

**Files:**
- Modify: `app/controllers/trips_controller.ts:11-22`

- [ ] **Step 1: Add status filter to index query**

In the `index()` method, add `.whereIn('status', ['scheduled', 'in_progress'])` to the query chain:

```typescript
async index({ view, tenant }: HttpContext) {
  const trips = await Trip.query()
    .where('tenantId', tenant!.id)
    .whereIn('status', ['scheduled', 'in_progress'])
    .preload('route', (query) => {
      query.preload('departureCity').preload('arrivalCity')
    })
    .preload('bus')
    .preload('driver')
    .orderBy('departureTime', 'desc')

  return view.render('pages/trips/index', { trips })
}
```

- [ ] **Step 2: Remove completed/cancelled badges from index view**

In `resources/views/pages/trips/index.edge`, the status column currently shows badges for all 4 statuses. Since index now only shows `scheduled` and `in_progress`, remove the `completed` and `cancelled` branches from the status badge `@if` block (lines 50-54). Keep only:

```edge
@if(item.status === 'scheduled')
  <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Planifié</span>
@else
  <span class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">En cours</span>
@end
```

- [ ] **Step 3: Commit**

```bash
git add app/controllers/trips_controller.ts resources/views/pages/trips/index.edge
git commit -m "feat: scope trip index to operational statuses only"
```

---

### Task 3: Add the history() controller method

**Files:**
- Modify: `app/controllers/trips_controller.ts`

- [ ] **Step 1: Add a private helper to parse and sanitize filters**

Add this private method to `TripsController`. It reads query params and returns only valid values. Invalid params are silently ignored.

```typescript
private parseHistoryFilters(qs: Record<string, any>) {
  const filters: Record<string, any> = {}
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (['completed', 'cancelled'].includes(qs.status)) {
    filters.status = qs.status
  }
  if (typeof qs.route_id === 'string' && uuidRegex.test(qs.route_id)) {
    filters.route_id = qs.route_id
  }
  if (typeof qs.driver_id === 'string' && uuidRegex.test(qs.driver_id)) {
    filters.driver_id = qs.driver_id
  }
  if (typeof qs.bus_id === 'string' && uuidRegex.test(qs.bus_id)) {
    filters.bus_id = qs.bus_id
  }
  if (['standard', 'vip'].includes(qs.travel_class)) {
    filters.travel_class = qs.travel_class
  }
  if (typeof qs.date_from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(qs.date_from)) {
    const dt = DateTime.fromISO(qs.date_from)
    if (dt.isValid) filters.date_from = qs.date_from
  }
  if (typeof qs.date_to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(qs.date_to)) {
    const dt = DateTime.fromISO(qs.date_to)
    if (dt.isValid) filters.date_to = qs.date_to
  }
  if (qs.price_min !== undefined && qs.price_min !== '') {
    const n = Number(qs.price_min)
    if (!Number.isNaN(n) && n >= 0) filters.price_min = n
  }
  if (qs.price_max !== undefined && qs.price_max !== '') {
    const n = Number(qs.price_max)
    if (!Number.isNaN(n) && n >= 0) filters.price_max = n
  }

  const page = Number(qs.page)
  filters.page = Number.isInteger(page) && page >= 1 ? page : 1

  return filters
}
```

- [ ] **Step 2: Add the history() method**

Add this method to `TripsController`, after `index()`:

```typescript
async history({ view, request, tenant }: HttpContext) {
  const filters = this.parseHistoryFilters(request.qs())

  const query = Trip.query()
    .where('tenantId', tenant!.id)
    .whereIn('status', ['completed', 'cancelled'])

  if (filters.status) {
    query.where('status', filters.status)
  }
  if (filters.route_id) {
    query.where('routeId', filters.route_id)
  }
  if (filters.driver_id) {
    query.where('driverId', filters.driver_id)
  }
  if (filters.bus_id) {
    query.where('busId', filters.bus_id)
  }
  if (filters.travel_class) {
    query.where('travelClass', filters.travel_class)
  }
  if (filters.date_from) {
    query.where('departureTime', '>=', filters.date_from)
  }
  if (filters.date_to) {
    query.where('departureTime', '<=', `${filters.date_to}T23:59:59`)
  }
  if (filters.price_min !== undefined) {
    query.where('price', '>=', filters.price_min)
  }
  if (filters.price_max !== undefined) {
    query.where('price', '<=', filters.price_max)
  }

  query
    .preload('route', (q) => {
      q.preload('departureCity').preload('arrivalCity')
    })
    .preload('bus')
    .preload('driver')
    .orderBy('departureTime', 'desc')

  const trips = await query.paginate(filters.page, 20)
  trips.baseUrl('/trips/history')
  trips.queryString(filters)

  const routes = await Route.query()
    .where('tenantId', tenant!.id)
    .preload('departureCity')
    .preload('arrivalCity')
    .orderBy('code')

  const buses = await Bus.query()
    .where('tenantId', tenant!.id)
    .orderBy('licensePlate')

  const drivers = await this.getDrivers(tenant!.id)

  return view.render('pages/trips/history', { trips, routes, buses, drivers, filters })
}
```

Note: filter select lists load ALL tenant records (not just active) because historical trips may reference now-inactive buses/routes/drivers.

- [ ] **Step 3: Commit**

```bash
git add app/controllers/trips_controller.ts
git commit -m "feat: add history() method with filter parsing to TripsController"
```

---

### Task 4: Create the reusable pagination component

**Files:**
- Create: `resources/views/components/pagination.edge`

- [ ] **Step 1: Create the pagination component**

Create `resources/views/components/pagination.edge`. This component receives a Lucid paginator instance via the `paginator` prop.

```edge
@let(paginator = $props.get('paginator'))

@if(paginator.lastPage > 1)
  <div class="flex items-center justify-between border-t border-outline px-6 py-3">
    <p class="text-sm text-on-surface">
      Page {{ paginator.currentPage }} sur {{ paginator.lastPage }} — {{ paginator.total }} résultats
    </p>
    <nav class="flex items-center gap-1" aria-label="Pagination">
      @if(paginator.currentPage > 1)
        <a href="{{ paginator.getUrl(paginator.currentPage - 1) }}"
          class="inline-flex items-center rounded-radius border border-outline px-3 py-1.5 text-sm text-on-surface hover:bg-surface-alt transition-colors">
          Précédent
        </a>
      @end
      @each(anchor in paginator.getUrlsForRange(1, paginator.lastPage))
        @if(anchor.isActive)
          <span class="inline-flex items-center rounded-radius bg-primary px-3 py-1.5 text-sm font-medium text-on-primary">
            {{ anchor.page }}
          </span>
        @else
          <a href="{{ anchor.url }}"
            class="inline-flex items-center rounded-radius border border-outline px-3 py-1.5 text-sm text-on-surface hover:bg-surface-alt transition-colors">
            {{ anchor.page }}
          </a>
        @end
      @end
      @if(paginator.currentPage < paginator.lastPage)
        <a href="{{ paginator.getUrl(paginator.currentPage + 1) }}"
          class="inline-flex items-center rounded-radius border border-outline px-3 py-1.5 text-sm text-on-surface hover:bg-surface-alt transition-colors">
          Suivant
        </a>
      @end
    </nav>
  </div>
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/components/pagination.edge
git commit -m "feat: add reusable pagination Edge component"
```

---

### Task 5: Create the history view

**Files:**
- Create: `resources/views/pages/trips/history.edge`

- [ ] **Step 1: Create the history page with filter form and results table**

Create `resources/views/pages/trips/history.edge`:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-on-surface-strong">Historique des voyages</h1>
      <a href="{{ route('trips.index') }}"
        class="inline-flex items-center gap-2 rounded-radius border border-outline px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-alt transition-colors">
        @svg('tabler:arrow-left', { class: 'size-4' })
        <span>Retour aux voyages</span>
      </a>
    </div>

    {{-- Filter bar --}}
    <div class="mb-6 rounded-radius border border-outline bg-surface p-4">
      @form({ route: 'trips.history', method: 'GET' })
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {{-- Status --}}
          <div>
            <label for="status" class="mb-1 block text-sm font-medium text-on-surface">Statut</label>
            <select name="status" id="status"
              class="h-10 w-full rounded-radius border border-neutral-300 bg-surface px-4 text-sm text-on-surface-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">Tous</option>
              <option value="completed" {{ filters.status === 'completed' ? 'selected' : '' }}>Terminé</option>
              <option value="cancelled" {{ filters.status === 'cancelled' ? 'selected' : '' }}>Annulé</option>
            </select>
          </div>

          {{-- Route --}}
          <div>
            <label for="route_id" class="mb-1 block text-sm font-medium text-on-surface">Route</label>
            <select name="route_id" id="route_id"
              class="h-10 w-full rounded-radius border border-neutral-300 bg-surface px-4 text-sm text-on-surface-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">Toutes</option>
              @each(r in routes)
                <option value="{{ r.id }}" {{ filters.route_id === r.id ? 'selected' : '' }}>
                  {{ r.code }} — {{ r.departureCity.name }} → {{ r.arrivalCity.name }}
                </option>
              @end
            </select>
          </div>

          {{-- Driver --}}
          <div>
            <label for="driver_id" class="mb-1 block text-sm font-medium text-on-surface">Chauffeur</label>
            <select name="driver_id" id="driver_id"
              class="h-10 w-full rounded-radius border border-neutral-300 bg-surface px-4 text-sm text-on-surface-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">Tous</option>
              @each(d in drivers)
                <option value="{{ d.id }}" {{ filters.driver_id === d.id ? 'selected' : '' }}>
                  {{ d.fullName }}
                </option>
              @end
            </select>
          </div>

          {{-- Bus --}}
          <div>
            <label for="bus_id" class="mb-1 block text-sm font-medium text-on-surface">Bus</label>
            <select name="bus_id" id="bus_id"
              class="h-10 w-full rounded-radius border border-neutral-300 bg-surface px-4 text-sm text-on-surface-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">Tous</option>
              @each(b in buses)
                <option value="{{ b.id }}" {{ filters.bus_id === b.id ? 'selected' : '' }}>
                  {{ b.licensePlate }} — {{ b.brand }} {{ b.model }}
                </option>
              @end
            </select>
          </div>

          {{-- Travel class --}}
          <div>
            <label for="travel_class" class="mb-1 block text-sm font-medium text-on-surface">Classe</label>
            <select name="travel_class" id="travel_class"
              class="h-10 w-full rounded-radius border border-neutral-300 bg-surface px-4 text-sm text-on-surface-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="">Toutes</option>
              <option value="standard" {{ filters.travel_class === 'standard' ? 'selected' : '' }}>Standard</option>
              <option value="vip" {{ filters.travel_class === 'vip' ? 'selected' : '' }}>VIP</option>
            </select>
          </div>

          {{-- Date from --}}
          <div>
            <label for="date_from" class="mb-1 block text-sm font-medium text-on-surface">Date de départ (du)</label>
            <input type="date" name="date_from" id="date_from" value="{{ filters.date_from || '' }}"
              class="h-10 w-full rounded-radius border border-neutral-300 bg-surface px-4 text-sm text-on-surface-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>

          {{-- Date to --}}
          <div>
            <label for="date_to" class="mb-1 block text-sm font-medium text-on-surface">Date de départ (au)</label>
            <input type="date" name="date_to" id="date_to" value="{{ filters.date_to || '' }}"
              class="h-10 w-full rounded-radius border border-neutral-300 bg-surface px-4 text-sm text-on-surface-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>

          {{-- Price min --}}
          <div>
            <label for="price_min" class="mb-1 block text-sm font-medium text-on-surface">Prix min (FCFA)</label>
            <input type="number" name="price_min" id="price_min" min="0" step="1"
              value="{{ filters.price_min !== undefined ? filters.price_min : '' }}"
              class="h-10 w-full rounded-radius border border-neutral-300 bg-surface px-4 text-sm text-on-surface-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>

          {{-- Price max --}}
          <div>
            <label for="price_max" class="mb-1 block text-sm font-medium text-on-surface">Prix max (FCFA)</label>
            <input type="number" name="price_max" id="price_max" min="0" step="1"
              value="{{ filters.price_max !== undefined ? filters.price_max : '' }}"
              class="h-10 w-full rounded-radius border border-neutral-300 bg-surface px-4 text-sm text-on-surface-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <button type="submit"
            class="inline-flex items-center gap-2 rounded-radius bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-secondary transition-colors">
            @svg('tabler:filter', { class: 'size-4' })
            <span>Filtrer</span>
          </button>
          <a href="{{ route('trips.history') }}"
            class="text-sm text-on-surface hover:text-on-surface-strong transition-colors">
            Réinitialiser
          </a>
        </div>
      @end
    </div>

    {{-- Results table --}}
    <div class="overflow-hidden rounded-radius border border-outline bg-surface">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
          <tr>
            <th class="px-6 py-3">Route</th>
            <th class="px-6 py-3">Bus</th>
            <th class="px-6 py-3">Chauffeur</th>
            <th class="px-6 py-3">Départ</th>
            <th class="px-6 py-3">Arrivée</th>
            <th class="px-6 py-3">Classe</th>
            <th class="px-6 py-3">Tarif</th>
            <th class="px-6 py-3">Statut</th>
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
              <td class="px-6 py-4 text-on-surface">{{ item.arrivalTime.toFormat('dd/MM/yyyy HH:mm') }}</td>
              <td class="px-6 py-4">
                @if(item.travelClass === 'vip')
                  <span class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">VIP</span>
                @else
                  <span class="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">Standard</span>
                @end
              </td>
              <td class="px-6 py-4 text-on-surface">{{ item.price }} FCFA</td>
              <td class="px-6 py-4">
                @if(item.status === 'completed')
                  <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Terminé</span>
                @else
                  <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Annulé</span>
                @end
              </td>
            </tr>
          @end
        </tbody>
      </table>

      @if(!trips.length)
        <div class="px-6 py-12 text-center text-on-surface">
          Aucun voyage trouvé pour les filtres sélectionnés.
        </div>
      @end

      @!pagination({ paginator: trips })
    </div>
  </div>
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/trips/history.edge
git commit -m "feat: add trip history view with filters and pagination"
```

---

### Task 6: Add sidebar navigation entry

**Files:**
- Modify: `resources/views/components/layout/dashboard.edge:76-82`

- [ ] **Step 1: Add "Historique" entry after "Voyages"**

In `resources/views/components/layout/dashboard.edge`, after the "Voyages" sidebar item block (line 82, closing `@end`), add:

```edge
@can('permission', 'trip:read')
@!sidebar.item({
href: route('trips.history'),
icon: 'tabler:history',
label: 'Historique',
})
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/components/layout/dashboard.edge
git commit -m "feat: add Historique link to sidebar navigation"
```

---

### Task 7: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
node ace serve --watch
```

- [ ] **Step 2: Verify the following in the browser**

1. Navigate to `/trips` — should only show `scheduled` and `in_progress` trips
2. Click "Historique" in the sidebar — should navigate to `/trips/history`
3. History page shows only `completed` and `cancelled` trips
4. Test each filter individually: status, route, driver, bus, class, date range, price range
5. Verify filters persist after submission (form values stay selected)
6. Verify pagination appears when > 20 results
7. Verify pagination links preserve filters
8. Verify "Réinitialiser" clears all filters
9. Verify invalid filter values are silently ignored (e.g., `?status=invalid`)
10. Verify empty state message shows when no results match filters

- [ ] **Step 3: Final commit if any fixes needed**
