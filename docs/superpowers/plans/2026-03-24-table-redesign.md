# Table Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refonte visuelle des pages bookings, trips et trips/history avec des composants Edge.js réutilisables inspirés du style shadcn/ui tasks.

**Architecture:** Créer un kit de composants (badge, dropdown-menu, table, filter, pagination refonte) puis refactorer les 3 pages pour les utiliser. Aucun changement backend.

**Tech Stack:** Edge.js, Alpine.js, Tailwind CSS v4, Tabler icons

**Spec:** `docs/superpowers/specs/2026-03-24-table-redesign-design.md`

---

## File Structure

### New files (components)
- `resources/views/components/badge/index.edge` — Badge sémantique icône+texte
- `resources/views/components/dropdown_menu/root.edge` — Container Alpine.js
- `resources/views/components/dropdown_menu/trigger.edge` — Bouton "⋯"
- `resources/views/components/dropdown_menu/content.edge` — Panneau flottant
- `resources/views/components/dropdown_menu/item.edge` — Élément cliquable (lien ou form)
- `resources/views/components/dropdown_menu/separator.edge` — Séparateur
- `resources/views/components/table/root.edge` — Wrapper table
- `resources/views/components/table/header.edge` — thead
- `resources/views/components/table/row.edge` — tr
- `resources/views/components/table/cell.edge` — th/td
- `resources/views/components/table/empty.edge` — État vide
- `resources/views/components/filter/bar.edge` — Barre de filtres GET
- `resources/views/components/filter/field.edge` — Champ de filtre avec label

### Modified files
- `resources/views/components/pagination.edge` — Refonte complète
- `resources/views/pages/dashboard/bookings/index.edge` — Refactoring avec composants
- `resources/views/pages/dashboard/trips/index.edge` — Refactoring avec composants
- `resources/views/pages/dashboard/trips/history.edge` — Refactoring avec composants

---

### Task 1: Badge Component

**Files:**
- Create: `resources/views/components/badge/index.edge`

- [ ] **Step 1: Create badge component**

```edge
@let(badgeTextFromSlot = await $slots.main())
@let(badgeText = badgeTextFromSlot.trim() ? badgeTextFromSlot : $props.get('text') ?? '')
@let(variant = $props.get('variant') || 'neutral')

@let(variantConfig = {
  success: { icon: 'tabler:circle-check', class: 'text-success' },
  warning: { icon: 'tabler:clock', class: 'text-warning' },
  danger: { icon: 'tabler:circle-x', class: 'text-danger' },
  info: { icon: 'tabler:circle-dot', class: 'text-info' },
  neutral: { icon: 'tabler:circle', class: 'text-on-surface' },
})

@let(config = variantConfig[variant] || variantConfig['neutral'])

<span {{ $props.except(['variant', 'text']).merge({
  class: ['inline-flex', 'items-center', 'gap-1.5', 'text-sm', config.class],
  'data-slot': 'badge',
  'data-variant': variant,
}).toAttrs() }}>
  @svg(config.icon, { class: 'size-4' })
  {{{ badgeText }}}
</span>
```

- [ ] **Step 2: Verify component renders**

Run: `npm run dev`
Open browser, temporarily add `@badge({ variant: 'success', text: 'Test' })` to any page to verify rendering.
Expected: green check icon + "Test" text displayed.

- [ ] **Step 3: Commit**

```bash
git add resources/views/components/badge/index.edge
git commit -m "feat: add badge component with semantic variants"
```

---

### Task 2: Dropdown Menu Components

**Files:**
- Create: `resources/views/components/dropdown_menu/root.edge`
- Create: `resources/views/components/dropdown_menu/trigger.edge`
- Create: `resources/views/components/dropdown_menu/content.edge`
- Create: `resources/views/components/dropdown_menu/item.edge`
- Create: `resources/views/components/dropdown_menu/separator.edge`

- [ ] **Step 1: Create root.edge**

```edge
<div {{ $props.merge({
  'x-data': '{ open: false }',
  class: 'relative',
  'data-slot': 'dropdown-menu',
}).toAttrs() }}>
  {{{ await $slots.main() }}}
</div>
```

- [ ] **Step 2: Create trigger.edge**

```edge
@button({ variant: 'ghost', size: 'icon-xs', '@click': 'open = !open', type: 'button', 'aria-haspopup': 'true', ':aria-expanded': 'open' })
  @svg('tabler:dots', { class: 'size-4' })
@end
```

- [ ] **Step 3: Create content.edge**

```edge
@let(align = $props.get('align') || 'right')
@let(alignClass = align === 'left' ? 'left-0' : 'right-0')

<div {{ $props.except(['align']).merge({
  'x-show': 'open',
  'x-transition.origin.top.right': true,
  '@click.outside': 'open = false',
  'x-cloak': true,
  class: ['absolute', alignClass, 'z-50', 'mt-1', 'min-w-[160px]', 'rounded-lg', 'border', 'border-outline', 'bg-surface', 'p-1', 'shadow-md'],
  role: 'menu',
  'data-slot': 'dropdown-menu-content',
}).toAttrs() }}>
  {{{ await $slots.main() }}}
</div>
```

- [ ] **Step 4: Create item.edge**

```edge
@let(variant = $props.get('variant') || 'default')
@let(href = $props.get('href'))
@let(method = $props.get('method'))

@let(variantClasses = {
  default: 'text-on-surface-strong',
  destructive: 'text-danger',
})

@let(baseClasses = ['flex', 'w-full', 'items-center', 'gap-2', 'rounded-md', 'px-3', 'py-1.5', 'text-sm', 'cursor-pointer', 'hover:bg-surface-alt', 'transition-colors', variantClasses[variant] || variantClasses['default']])

@if(method)
  <form action="{{ href }}" method="POST" class="w-full">
    {{ csrfField() }}
    @if(method.toUpperCase() !== 'POST')
      <input type="hidden" name="_method" value="{{ method.toUpperCase() }}" />
    @end
    {{{ await $slots.hiddenFields?.() ?? '' }}}
    <button {{ $props.except(['variant', 'href', 'method']).merge({
      type: 'submit',
      class: baseClasses,
      role: 'menuitem',
      '@click': 'open = false',
    }).toAttrs() }}>
      {{{ await $slots.main() }}}
    </button>
  </form>
@elseif(href)
  <a {{ $props.except(['variant', 'method']).merge({
    href: href,
    class: baseClasses,
    role: 'menuitem',
    '@click': 'open = false',
  }).toAttrs() }}>
    {{{ await $slots.main() }}}
  </a>
@else
  <button {{ $props.except(['variant', 'href', 'method']).merge({
    type: 'button',
    class: baseClasses,
    role: 'menuitem',
    '@click': 'open = false',
  }).toAttrs() }}>
    {{{ await $slots.main() }}}
  </button>
@end
```

- [ ] **Step 5: Create separator.edge**

```edge
<div class="my-1 border-t border-outline" role="separator"></div>
```

- [ ] **Step 6: Verify dropdown renders**

Run: `npm run dev`
Temporarily add the full dropdown to any page:
```edge
@dropdown_menu.root()
  @dropdown_menu.trigger()
  @end
  @dropdown_menu.content()
    @dropdown_menu.item({ href: '#' })
      @svg('tabler:eye', { class: 'size-4' }) Voir
    @end
    @dropdown_menu.separator()
    @end
    @dropdown_menu.item({ variant: 'destructive', href: '#', method: 'DELETE' })
      @svg('tabler:trash', { class: 'size-4' }) Supprimer
    @end
  @end
@end
```
Expected: "⋯" button that opens a floating menu with items, closes on outside click.

- [ ] **Step 7: Commit**

```bash
git add resources/views/components/dropdown_menu/
git commit -m "feat: add dropdown menu component with Alpine.js"
```

---

### Task 3: Table Components

**Files:**
- Create: `resources/views/components/table/root.edge`
- Create: `resources/views/components/table/header.edge`
- Create: `resources/views/components/table/row.edge`
- Create: `resources/views/components/table/cell.edge`
- Create: `resources/views/components/table/empty.edge`

- [ ] **Step 1: Create root.edge**

```edge
<div {{ $props.merge({
  class: ['overflow-x-auto', 'rounded-lg', 'border', 'border-outline'],
  'data-slot': 'table',
}).toAttrs() }}>
  <table class="w-full text-left text-sm">
    {{{ await $slots.main() }}}
  </table>
</div>
```

- [ ] **Step 2: Create header.edge**

```edge
<thead class="border-b border-outline bg-surface-alt">
  <tr>
    {{{ await $slots.main() }}}
  </tr>
</thead>
```

- [ ] **Step 3: Create row.edge**

```edge
<tr {{ $props.merge({
  class: ['border-b', 'border-outline', 'last:border-0', 'hover:bg-surface-alt/50', 'transition-colors'],
}).toAttrs() }}>
  {{{ await $slots.main() }}}
</tr>
```

- [ ] **Step 4: Create cell.edge**

```edge
@let(isHead = $props.get('head') === true || $props.get('head') === 'true')

@if(isHead)
  <th {{ $props.except(['head']).merge({
    class: ['px-4', 'py-3', 'text-xs', 'font-medium', 'text-on-surface', 'whitespace-nowrap'],
  }).toAttrs() }}>
    {{{ await $slots.main() }}}
  </th>
@else
  <td {{ $props.except(['head']).merge({
    class: ['px-4', 'py-3', 'text-on-surface-strong', 'whitespace-nowrap'],
  }).toAttrs() }}>
    {{{ await $slots.main() }}}
  </td>
@end
```

- [ ] **Step 5: Create empty.edge**

```edge
@let(message = $props.get('message') || 'Aucun résultat trouvé')
@let(colspan = $props.get('colspan') || 1)

<tr>
  <td colspan="{{ colspan }}" class="px-4 py-12 text-center text-on-surface">
    @svg('tabler:inbox', { class: 'mx-auto size-10 text-on-surface/40 mb-2' })
    <p>{{ message }}</p>
  </td>
</tr>
```

- [ ] **Step 6: Commit**

```bash
git add resources/views/components/table/
git commit -m "feat: add reusable table components"
```

---

### Task 4: Filter Components

**Files:**
- Create: `resources/views/components/filter/bar.edge`
- Create: `resources/views/components/filter/field.edge`

- [ ] **Step 1: Create bar.edge**

```edge
@let(action = $props.get('action') || '')
@let(cols = String($props.get('cols') || '4'))
@let(colsMap = { '3': 'lg:grid-cols-3', '4': 'lg:grid-cols-4', '6': 'lg:grid-cols-6' })
@let(colsClass = colsMap[cols] || colsMap['4'])

<form method="GET" {{ action ? `action="${action}"` : '' }} class="mb-6">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 {{ colsClass }}">
    {{{ await $slots.main() }}}
  </div>
  <div class="mt-4 flex items-center gap-3">
    @button({ type: 'submit', variant: 'default', size: 'sm' })
      @svg('tabler:filter', { class: 'size-4' })
      Filtrer
    @end
    <a href="{{ action || request.url() }}" class="text-sm text-on-surface hover:text-on-surface-strong transition-colors">
      Réinitialiser
    </a>
  </div>
</form>
```

- [ ] **Step 2: Create field.edge**

```edge
@let(label = $props.get('label'))
@let(fieldName = $props.get('name'))

<div>
  @if(label)
    <label for="{{ fieldName }}" class="mb-1 block text-sm font-medium text-on-surface-strong">{{ label }}</label>
  @end
  {{{ await $slots.main() }}}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add resources/views/components/filter/
git commit -m "feat: add filter bar and field components"
```

---

### Task 5: Pagination Refonte

**Files:**
- Modify: `resources/views/components/pagination.edge`

- [ ] **Step 1: Read the current pagination component**

Read `resources/views/components/pagination.edge` to understand the existing API.

- [ ] **Step 2: Replace with new implementation**

Replace the entire content of `resources/views/components/pagination.edge` with:

```edge
@let(paginator = $props.get('paginator'))
@let(navClasses = 'inline-flex size-6 items-center justify-center rounded-md border border-outline bg-surface text-on-surface shadow-xs hover:bg-surface-alt hover:text-on-surface-strong transition-all [&_svg]:size-3')
@let(disabledClasses = 'inline-flex size-6 items-center justify-center rounded-md border border-outline bg-surface text-on-surface shadow-xs pointer-events-none opacity-50 [&_svg]:size-3')

@if(paginator.lastPage > 1)
  <div class="flex items-center justify-between border-t border-outline px-4 py-3">
    {{-- Left: total count --}}
    <p class="text-sm text-on-surface">
      {{ paginator.total }} résultats
    </p>

    {{-- Right: page indicator + navigation --}}
    <div class="flex items-center gap-4">
      <span class="text-sm text-on-surface">
        Page <span class="font-medium text-on-surface-strong">{{ paginator.currentPage }}</span>
        sur <span class="font-medium text-on-surface-strong">{{ paginator.lastPage }}</span>
      </span>

      <div class="flex gap-1">
        {{-- First page --}}
        @if(paginator.currentPage > 1)
          <a href="{{ paginator.getUrl(1) }}" class="{{ navClasses }}" aria-label="Première page">
            @svg('tabler:chevrons-left')
          </a>
        @else
          <span class="{{ disabledClasses }}" aria-disabled="true">
            @svg('tabler:chevrons-left')
          </span>
        @end

        {{-- Previous page --}}
        @if(paginator.currentPage > 1)
          <a href="{{ paginator.getUrl(paginator.currentPage - 1) }}" class="{{ navClasses }}" aria-label="Page précédente">
            @svg('tabler:chevron-left')
          </a>
        @else
          <span class="{{ disabledClasses }}" aria-disabled="true">
            @svg('tabler:chevron-left')
          </span>
        @end

        {{-- Next page --}}
        @if(paginator.currentPage < paginator.lastPage)
          <a href="{{ paginator.getUrl(paginator.currentPage + 1) }}" class="{{ navClasses }}" aria-label="Page suivante">
            @svg('tabler:chevron-right')
          </a>
        @else
          <span class="{{ disabledClasses }}" aria-disabled="true">
            @svg('tabler:chevron-right')
          </span>
        @end

        {{-- Last page --}}
        @if(paginator.currentPage < paginator.lastPage)
          <a href="{{ paginator.getUrl(paginator.lastPage) }}" class="{{ navClasses }}" aria-label="Dernière page">
            @svg('tabler:chevrons-right')
          </a>
        @else
          <span class="{{ disabledClasses }}" aria-disabled="true">
            @svg('tabler:chevrons-right')
          </span>
        @end
      </div>
    </div>
  </div>
@end
```

- [ ] **Step 3: Verify pagination renders on an existing page**

Run: `npm run dev`
Navigate to `/dashboard/bookings` (which already uses `@!pagination`).
Expected: New pagination style with 4 nav buttons, "X résultats", "Page X sur Y".

- [ ] **Step 4: Commit**

```bash
git add resources/views/components/pagination.edge
git commit -m "feat: redesign pagination component with shadcn-style navigation"
```

---

### Task 6: Refactor Bookings Index Page

**Files:**
- Modify: `resources/views/pages/dashboard/bookings/index.edge`

- [ ] **Step 1: Read current bookings index**

Read `resources/views/pages/dashboard/bookings/index.edge` to confirm current state.

- [ ] **Step 2: Replace the entire page content**

Replace the full content of `resources/views/pages/dashboard/bookings/index.edge` with:

```edge
@layout.dashboard()
<div class="mx-auto max-w-7xl">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold text-on-surface-strong">Réservations</h1>
    @can('permission', 'booking:create')
    <a href="{{ route('dashboard.bookings.create') }}"
      class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-xs hover:bg-primary/90">
      @svg('tabler:plus', { class: 'size-4' })
      Nouvelle réservation
    </a>
    @end
  </div>

  {{-- Filter bar --}}
  @filter.bar({ action: route('dashboard.bookings.index'), cols: '4' })
    @filter.field({ label: 'Date', name: 'date' })
      <input type="date" name="date" id="date" value="{{ filters.date || '' }}"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm" />
    @end

    @filter.field({ label: 'Statut', name: 'status' })
      <select name="status" id="status"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm">
        <option value="">Tous</option>
        <option value="pending" {{ filters.status === 'pending' ? 'selected' : '' }}>En attente</option>
        <option value="confirmed" {{ filters.status === 'confirmed' ? 'selected' : '' }}>Confirmée</option>
        <option value="cancelled" {{ filters.status === 'cancelled' ? 'selected' : '' }}>Annulée</option>
      </select>
    @end

    @filter.field({ label: 'Code passager', name: 'code' })
      <input type="text" name="code" id="code" value="{{ filters.code || '' }}" placeholder="Ex: ABC-1234"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm" />
    @end
  @end

  {{-- Table --}}
  @table.root()
    @table.header()
      @table.cell({ head: true })Date@end
      @table.cell({ head: true })Voyage@end
      @table.cell({ head: true })Client@end
      @table.cell({ head: true })Passagers@end
      @table.cell({ head: true })Montant@end
      @table.cell({ head: true })Statut@end
      @table.cell({ head: true })@end
    @end

    <tbody>
      @each(item in bookings)
        @table.row()
          @table.cell()
            {{ item.createdAt.toFormat('dd/MM/yyyy HH:mm') }}
          @end
          @table.cell()
            <span class="font-medium">{{ item.trip.route.departureCity.name }} → {{ item.trip.route.arrivalCity.name }}</span>
            <span class="block text-xs text-on-surface">
              {{ item.trip.departureTime.toFormat('dd/MM/yyyy HH:mm') }}
            </span>
          @end
          @table.cell()
            @if(item.customer)
              {{ item.customer.firstName }} {{ item.customer.lastName }}
              <span class="block text-xs text-on-surface">{{ item.customer.phone }}</span>
            @else
              <span class="text-on-surface/50">—</span>
            @end
          @end
          @table.cell(){{ item.passengers.length }}@end
          @table.cell()
            {{ Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF' }).format(item.totalAmount) }}
          @end
          @table.cell()
            @if(item.status === 'pending')
              @badge({ variant: 'warning', text: 'En attente' })
              @end
            @elseif(item.status === 'confirmed')
              @badge({ variant: 'success', text: 'Confirmée' })
              @end
            @else
              @badge({ variant: 'danger', text: 'Annulée' })
              @end
            @end
          @end
          @table.cell()
            @dropdown_menu.root()
              @dropdown_menu.trigger()
              @end
              @dropdown_menu.content()
                @dropdown_menu.item({ href: route('dashboard.bookings.show', { id: item.id }) })
                  @svg('tabler:eye', { class: 'size-4' }) Voir
                @end

                @can('permission', 'booking:update')
                  @if(item.status === 'confirmed')
                    @dropdown_menu.item({ href: route('dashboard.bookings.edit', { id: item.id }) })
                      @svg('tabler:pencil', { class: 'size-4' }) Modifier
                    @end
                  @end
                @end

                @can('permission', 'booking:update')
                  @if(item.status !== 'cancelled')
                    @dropdown_menu.separator()
                    @end
                    @dropdown_menu.item({ href: route('dashboard.bookings.destroy', { id: item.id }), method: 'DELETE', variant: 'destructive', onclick: "return confirm('Annuler cette réservation ?')" })
                      @svg('tabler:ban', { class: 'size-4' }) Annuler
                    @end
                  @end
                @end
              @end
            @end
          @end
        @end
      @end

      @if(!bookings.length)
        @table.empty({ colspan: 7, message: 'Aucune réservation trouvée' })
        @end
      @end
    </tbody>
  @end

  @!pagination({ paginator: bookings })
</div>
@end
```

- [ ] **Step 3: Verify bookings page**

Run: `npm run dev`
Navigate to `/dashboard/bookings`.
Expected:
- Filter bar with 3 fields + Filtrer button + Réinitialiser link
- Table with badge statuses (icon+text), dropdown "⋯" for actions
- Pagination with 4-button nav
- All filters and actions work as before

- [ ] **Step 4: Commit**

```bash
git add resources/views/pages/dashboard/bookings/index.edge
git commit -m "refactor: bookings index page with reusable table components"
```

---

### Task 7: Refactor Trips Index Page

**Files:**
- Modify: `resources/views/pages/dashboard/trips/index.edge`

- [ ] **Step 1: Read current trips index**

Read `resources/views/pages/dashboard/trips/index.edge` to confirm current state.

- [ ] **Step 2: Replace the entire page content**

Replace the full content of `resources/views/pages/dashboard/trips/index.edge` with:

```edge
@layout.dashboard()
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-on-surface-strong">Voyages</h1>
      <div class="flex items-center gap-3">
        <a href="{{ route('trips.history') }}"
          class="inline-flex items-center gap-2 rounded-md border border-outline bg-surface px-4 py-2 text-sm font-medium text-on-surface shadow-xs hover:bg-surface-alt hover:text-on-surface-strong">
          @svg('tabler:history', { class: 'size-4' })
          Historique
        </a>
        @can('permission', 'trip:create')
          <a href="{{ route('trips.create') }}"
            class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary shadow-xs hover:bg-primary/90">
            @svg('tabler:plus', { class: 'size-4' })
            Nouveau voyage
          </a>
        @end
      </div>
    </div>

    @table.root()
      @table.header()
        @table.cell({ head: true })Route@end
        @table.cell({ head: true })Bus@end
        @table.cell({ head: true })Chauffeur@end
        @table.cell({ head: true })Départ@end
        @table.cell({ head: true })Classe@end
        @table.cell({ head: true })Tarif@end
        @table.cell({ head: true })Statut@end
        @table.cell({ head: true })@end
      @end

      <tbody>
        @each(item in trips)
          @table.row()
            @table.cell()
              <span class="font-medium">{{ item.route.departureCity.name }} → {{ item.route.arrivalCity.name }}</span>
            @end
            @table.cell(){{ item.bus.licensePlate }}@end
            @table.cell(){{ item.driver.fullName }}@end
            @table.cell(){{ item.departureTime.toFormat('dd/MM/yyyy HH:mm') }}@end
            @table.cell()
              @if(item.travelClass === 'vip')
                @badge({ variant: 'info', text: 'VIP' })
                @end
              @else
                @badge({ variant: 'neutral', text: 'Standard' })
                @end
              @end
            @end
            @table.cell(){{ item.price }} FCFA@end
            @table.cell()
              @if(item.status === 'scheduled')
                @badge({ variant: 'info', text: 'Planifié' })
                @end
              @else
                @badge({ variant: 'warning', text: 'En cours' })
                @end
              @end
            @end
            @table.cell()
              @dropdown_menu.root()
                @dropdown_menu.trigger()
                @end
                @dropdown_menu.content()
                  @can('permission', 'trip:update')
                    @if(item.status === 'scheduled')
                      @dropdown_menu.item({ href: route('trips.transition', { id: item.id }), method: 'PUT', onclick: "return confirm('Démarrer ce voyage ?')" })
                        @slot('hiddenFields')
                          <input type="hidden" name="status" value="in_progress" />
                        @end
                        @svg('tabler:player-play', { class: 'size-4' }) Démarrer
                      @end
                    @end

                    @if(item.status === 'in_progress')
                      @dropdown_menu.item({ href: route('trips.transition', { id: item.id }), method: 'PUT', onclick: "return confirm('Marquer ce voyage comme terminé ?')" })
                        @slot('hiddenFields')
                          <input type="hidden" name="status" value="completed" />
                        @end
                        @svg('tabler:circle-check', { class: 'size-4' }) Compléter
                      @end
                    @end

                    @if(item.status === 'scheduled' || item.status === 'in_progress')
                      @dropdown_menu.item({ href: route('trips.edit', { id: item.id }) })
                        @svg('tabler:pencil', { class: 'size-4' }) Modifier
                      @end
                    @end
                  @end

                  @if(item.status === 'scheduled' || item.status === 'in_progress')
                    @dropdown_menu.separator()
                    @end
                  @end

                  @can('permission', 'trip:update')
                    @if(item.status === 'scheduled' || item.status === 'in_progress')
                      @dropdown_menu.item({ href: route('trips.transition', { id: item.id }), method: 'PUT', variant: 'destructive', onclick: "return confirm('Annuler ce voyage ?')" })
                        @slot('hiddenFields')
                          <input type="hidden" name="status" value="cancelled" />
                        @end
                        @svg('tabler:x', { class: 'size-4' }) Annuler
                      @end
                    @end
                  @end

                  @can('permission', 'trip:delete')
                    @if(item.status === 'scheduled')
                      @dropdown_menu.item({ href: route('trips.destroy', { id: item.id }), method: 'DELETE', variant: 'destructive', onclick: "return confirm('Supprimer ce voyage ?')" })
                        @svg('tabler:trash', { class: 'size-4' }) Supprimer
                      @end
                    @end
                  @end
                @end
              @end
            @end
          @end
        @end

        @if(!trips.length)
          @table.empty({ colspan: 8, message: 'Aucun voyage actif' })
          @end
        @end
      </tbody>
    @end
  </div>
@end
```

- [ ] **Step 3: Verify trips page**

Run: `npm run dev`
Navigate to `/dashboard/trips`.
Expected:
- Table with badge statuses and travel class
- Dropdown "⋯" with context-aware actions (start, complete, edit, cancel, delete)
- All transitions work as before
- Header buttons (Historique + Nouveau voyage) still work

- [ ] **Step 4: Commit**

```bash
git add resources/views/pages/dashboard/trips/index.edge
git commit -m "refactor: trips index page with reusable table components"
```

---

### Task 8: Refactor Trips History Page

**Files:**
- Modify: `resources/views/pages/dashboard/trips/history.edge`

- [ ] **Step 1: Read current trips history**

Read `resources/views/pages/dashboard/trips/history.edge` to confirm current state.

- [ ] **Step 2: Replace the entire page content**

Replace the full content of `resources/views/pages/dashboard/trips/history.edge` with:

```edge
@layout.dashboard()
<div class="mx-auto max-w-7xl">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-bold text-on-surface-strong">Historique des voyages</h1>
    <a href="{{ route('trips.index') }}"
      class="inline-flex items-center gap-2 rounded-md border border-outline bg-surface px-4 py-2 text-sm font-medium text-on-surface shadow-xs hover:bg-surface-alt hover:text-on-surface-strong">
      @svg('tabler:arrow-left', { class: 'size-4' })
      Retour aux voyages
    </a>
  </div>

  {{-- Filter bar --}}
  @filter.bar({ action: route('trips.history'), cols: '6' })
    @filter.field({ label: 'Statut', name: 'status' })
      <select name="status" id="status"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm">
        <option value="">Tous</option>
        <option value="completed" {{ filters.status === 'completed' ? 'selected' : '' }}>Terminé</option>
        <option value="cancelled" {{ filters.status === 'cancelled' ? 'selected' : '' }}>Annulé</option>
      </select>
    @end

    @filter.field({ label: 'Route', name: 'route_id' })
      <select name="route_id" id="route_id"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm">
        <option value="">Toutes</option>
        @each(r in routes)
          <option value="{{ r.id }}" {{ filters.route_id === r.id ? 'selected' : '' }}>
            {{ r.code }} — {{ r.departureCity.name }} → {{ r.arrivalCity.name }}
          </option>
        @end
      </select>
    @end

    @filter.field({ label: 'Chauffeur', name: 'driver_id' })
      <select name="driver_id" id="driver_id"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm">
        <option value="">Tous</option>
        @each(d in drivers)
          <option value="{{ d.id }}" {{ filters.driver_id === d.id ? 'selected' : '' }}>
            {{ d.fullName }}
          </option>
        @end
      </select>
    @end

    @filter.field({ label: 'Bus', name: 'bus_id' })
      <select name="bus_id" id="bus_id"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm">
        <option value="">Tous</option>
        @each(b in buses)
          <option value="{{ b.id }}" {{ filters.bus_id === b.id ? 'selected' : '' }}>
            {{ b.licensePlate }} — {{ b.brand }} {{ b.model }}
          </option>
        @end
      </select>
    @end

    @filter.field({ label: 'Classe', name: 'travel_class' })
      <select name="travel_class" id="travel_class"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm">
        <option value="">Toutes</option>
        <option value="standard" {{ filters.travel_class === 'standard' ? 'selected' : '' }}>Standard</option>
        <option value="vip" {{ filters.travel_class === 'vip' ? 'selected' : '' }}>VIP</option>
      </select>
    @end

    @filter.field({ label: 'Date de départ (du)', name: 'date_from' })
      <input type="date" name="date_from" id="date_from" value="{{ filters.date_from || '' }}"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm" />
    @end

    @filter.field({ label: 'Date de départ (au)', name: 'date_to' })
      <input type="date" name="date_to" id="date_to" value="{{ filters.date_to || '' }}"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm" />
    @end

    @filter.field({ label: 'Prix min (FCFA)', name: 'price_min' })
      <input type="number" name="price_min" id="price_min" min="0" step="1"
        value="{{ filters.price_min !== undefined ? filters.price_min : '' }}"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm" />
    @end

    @filter.field({ label: 'Prix max (FCFA)', name: 'price_max' })
      <input type="number" name="price_max" id="price_max" min="0" step="1"
        value="{{ filters.price_max !== undefined ? filters.price_max : '' }}"
        class="h-9 w-full min-w-0 rounded-md border border-outline bg-transparent px-3 py-1 text-sm text-on-surface-strong shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm" />
    @end
  @end

  {{-- Results table --}}
  @table.root()
    @table.header()
      @table.cell({ head: true })Route@end
      @table.cell({ head: true })Bus@end
      @table.cell({ head: true })Chauffeur@end
      @table.cell({ head: true })Départ@end
      @table.cell({ head: true })Classe@end
      @table.cell({ head: true })Tarif@end
      @table.cell({ head: true })Statut@end
    @end

    <tbody>
      @each(item in trips)
        @table.row()
          @table.cell()
            <span class="font-medium">{{ item.route.departureCity.name }} → {{ item.route.arrivalCity.name }}</span>
          @end
          @table.cell(){{ item.bus.licensePlate }}@end
          @table.cell(){{ item.driver.fullName }}@end
          @table.cell(){{ item.departureTime.toFormat('dd LLL yyyy - HH:mm', { locale: 'fr' }) }}@end
          @table.cell()
            @if(item.travelClass === 'vip')
              @badge({ variant: 'info', text: 'VIP' })
              @end
            @else
              @badge({ variant: 'neutral', text: 'Standard' })
              @end
            @end
          @end
          @table.cell(){{ item.price }} FCFA@end
          @table.cell()
            @if(item.status === 'completed')
              @badge({ variant: 'success', text: 'Terminé' })
              @end
            @else
              @badge({ variant: 'danger', text: 'Annulé' })
              @end
            @end
          @end
        @end
      @end

      @if(!trips.length)
        @table.empty({ colspan: 7, message: 'Aucun voyage dans l\'historique' })
        @end
      @end
    </tbody>
  @end

  @!pagination({ paginator: trips })
</div>
@end
```

- [ ] **Step 3: Verify trips history page**

Run: `npm run dev`
Navigate to `/dashboard/trips/history`.
Expected:
- Filter bar with 9 fields in 6-column grid + Filtrer/Réinitialiser
- Table with badge statuses (no actions column)
- Pagination with 4-button nav
- All filters work and preserve query params

- [ ] **Step 4: Commit**

```bash
git add resources/views/pages/dashboard/trips/history.edge
git commit -m "refactor: trips history page with reusable table components"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: No new errors (views are not typechecked, but ensure no TS regressions).

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Expected: No new errors.

- [ ] **Step 3: Manual test all 3 pages end-to-end**

Navigate through all 3 pages and verify:
1. `/dashboard/bookings` — filters, table, actions (voir, modifier, annuler), pagination
2. `/dashboard/trips` — table, all dropdown actions (démarrer, compléter, modifier, annuler, supprimer)
3. `/dashboard/trips/history` — 9 filters, table, pagination

- [ ] **Step 4: Test empty states**

Apply filters that return no results on each page. Verify the empty state renders with icon and message.

- [ ] **Step 5: Test responsive layout**

Resize browser to mobile width. Verify:
- Filter grids collapse to 1 column
- Tables scroll horizontally
- Dropdowns don't overflow the viewport
