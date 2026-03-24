# Table Redesign — Bookings, Trips, Trips/History

## Context

Refonte visuelle des pages de listing `/dashboard/bookings`, `/dashboard/trips`, et `/dashboard/trips/history` en s'inspirant du style shadcn/ui tasks (https://ui.shadcn.com/examples/tasks). Aucune modification fonctionnelle : mêmes colonnes, filtres, actions et controllers.

## Decisions

| Aspect | Choix |
|--------|-------|
| Scope | Refonte visuelle uniquement |
| Architecture | Composants Edge.js réutilisables |
| Toolbar/Filtres | Inline raffinés (inputs/selects visibles avec labels, grid responsive) |
| Actions par ligne | Menu dropdown "⋯" (Alpine.js) |
| Indicateurs de statut | Icône + texte coloré sans fond (style shadcn) |
| Pagination | Complète : total, page X/Y, 4 boutons nav |

## Nouveaux composants

Tous les composants suivent les conventions existantes : `$props`, `@let()`, tokens CSS du projet (`surface`, `outline`, `on-surface`, etc.), Tabler icons via `@svg()`.

### `badge/index.edge`

Badge sémantique avec icône + texte.

**Props :**
- `variant` : `success` | `warning` | `danger` | `info` | `neutral` (défaut: `neutral`)
- `text` : Texte du badge (ou via slot)

**Variants et mapping :**
- `success` → icône `tabler:circle-check`, texte `text-success`
- `warning` → icône `tabler:clock`, texte `text-warning`
- `danger` → icône `tabler:circle-x`, texte `text-danger`
- `info` → icône `tabler:circle-dot`, texte `text-info`
- `neutral` → icône `tabler:circle`, texte `text-on-surface`

**Markup de sortie :**
```html
<span class="inline-flex items-center gap-1.5 text-sm {variantTextColor}">
  <svg class="size-4">...</svg>
  {text}
</span>
```

### `dropdown-menu/root.edge`

Container du menu déroulant avec Alpine.js.

**Props :**
- `align` : `left` | `right` (défaut: `right`)

**Markup de sortie :**
```html
<div x-data="{ open: false }" class="relative">
  {slot}
</div>
```

### `dropdown-menu/trigger.edge`

Bouton déclencheur du menu. Utilise le composant `@button` existant avec variant `ghost` et size `icon-xs`.

**Markup de sortie :**
```edge
@button({ variant: 'ghost', size: 'icon-xs', '@click': 'open = !open', type: 'button' })
  @svg('tabler:dots')
@end
```

### `dropdown-menu/content.edge`

Panneau flottant du menu. Contient les items et séparateurs.

**Props :**
- `align` : `left` | `right` (défaut: `right`) — passé explicitement, ou lu depuis Alpine `x-data` du root

**Markup de sortie :**
```html
<div x-show="open"
     x-transition
     @click.outside="open = false"
     class="absolute {alignRight ? 'right-0' : 'left-0'} z-50 mt-1 min-w-[160px] rounded-lg border border-outline bg-surface p-1 shadow-md">
  {slot}
</div>
```

### `dropdown-menu/item.edge`

Élément cliquable du menu.

**Props :**
- `href` : URL (optionnel, rend un `<a>`)
- `variant` : `default` | `destructive` (défaut: `default`)
- `method` : Pour les actions non-GET, wrappé dans un micro-formulaire avec CSRF + method spoofing

Le slot principal contient l'icône + texte. Pour les formulaires nécessitant des champs hidden supplémentaires (ex: `<input type="hidden" name="status" value="in_progress">`), un slot nommé `@slot('hiddenFields')` est disponible à l'intérieur du `<form>`.

**Markup de sortie (lien) :**
```html
<a href="{href}" class="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-on-surface-strong hover:bg-surface-alt">
  {slot}
</a>
```

**Markup de sortie (form avec method) :**
```html
<form action="{href}" method="POST">
  {{ csrfField() }}
  {methodSpoofField}
  {{{ await $slots.hiddenFields?.() }}}
  <button type="submit" class="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm {variantClasses} hover:bg-surface-alt">
    {slot}
  </button>
</form>
```

Variant classes : `default` → `text-on-surface-strong`, `destructive` → `text-danger`.

### `dropdown-menu/separator.edge`

**Markup de sortie :**
```html
<div class="my-1 border-t border-outline"></div>
```

### `table/root.edge`

Wrapper de table avec overflow horizontal.

**Markup de sortie :**
```html
<div class="overflow-x-auto rounded-lg border border-outline">
  <table class="w-full text-left text-sm">
    {slot}
  </table>
</div>
```

### `table/header.edge`

En-tête de la table.

**Markup de sortie :**
```html
<thead class="border-b border-outline bg-surface-alt">
  <tr>
    {slot}
  </tr>
</thead>
```

### `table/row.edge`

Ligne de données.

**Markup de sortie :**
```html
<tr class="border-b border-outline last:border-0 hover:bg-surface-alt/50 transition-colors">
  {slot}
</tr>
```

### `table/cell.edge`

Cellule. Rend un `<th>` ou `<td>`.

**Props :**
- `head` : boolean (défaut: `false`)

**Markup de sortie (th) :**
```html
<th class="px-4 py-3 text-xs font-medium text-on-surface whitespace-nowrap">{slot}</th>
```

**Markup de sortie (td) :**
```html
<td class="px-4 py-3 text-on-surface-strong whitespace-nowrap">{slot}</td>
```

### `table/empty.edge`

État vide quand il n'y a aucune donnée.

**Props :**
- `message` : texte à afficher (défaut: "Aucun résultat trouvé")
- `colspan` : nombre de colonnes pour le colspan

**Markup de sortie :**
```html
<tr>
  <td colspan="{colspan}" class="px-4 py-12 text-center text-on-surface">
    <svg class="mx-auto size-10 text-on-surface/40 mb-2">tabler:inbox</svg>
    <p>{message}</p>
  </td>
</tr>
```

### `pagination.edge` (refonte)

Remplace le composant existant. Style complet inspiré shadcn.

**Props :**
- `paginator` : instance du paginator Lucid

**Markup de sortie :**
```html
<div class="flex items-center justify-between border-t border-outline px-4 py-3">
  <!-- Gauche : compteur -->
  <p class="text-sm text-on-surface">
    {total} résultats
  </p>
  <!-- Droite : navigation -->
  <div class="flex items-center gap-4">
    <span class="text-sm text-on-surface">Page {current} sur {last}</span>
    <div class="flex gap-1">
      <a href="page=1">«</a>        <!-- premier -->
      <a href="page=prev">‹</a>     <!-- précédent -->
      <a href="page=next">›</a>     <!-- suivant -->
      <a href="page=last">»</a>     <!-- dernier -->
    </div>
  </div>
</div>
```

Chaque bouton nav : `@button` composant existant, variant `outline` size `icon-xs`, icônes `tabler:chevrons-left`, `tabler:chevron-left`, `tabler:chevron-right`, `tabler:chevrons-right`. Boutons désactivés quand sur la première/dernière page.

**Invocation :** `@!pagination({ paginator })` (syntaxe self-closing, identique à l'existant).

### `filter/bar.edge`

Barre de filtres en formulaire GET.

**Props :**
- `action` : URL du formulaire (défaut: URL courante)
- `cols` : nombre de colonnes de la grille sur desktop (défaut: `4`). Valeurs supportées : `3`, `4`, `6`. Mappé vers des classes Tailwind statiques pour compatibilité JIT : `3` → `lg:grid-cols-3`, `4` → `lg:grid-cols-4`, `6` → `lg:grid-cols-6`.

**Markup de sortie :**
```edge
@let(colsMap = { '3': 'lg:grid-cols-3', '4': 'lg:grid-cols-4', '6': 'lg:grid-cols-6' })
<form method="GET" action="{action}" class="mb-6">
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 {{ colsMap[cols] || colsMap['4'] }}">
    {{{ await $slots.main() }}}
  </div>
  <div class="mt-4 flex items-center gap-3">
    @button({ type: 'submit', variant: 'default', size: 'sm' })
      @svg('tabler:filter') Filtrer
    @end
    <a href="{action}" class="text-sm text-on-surface hover:text-on-surface-strong">Réinitialiser</a>
  </div>
</form>
```

### `filter/field.edge`

Champ de filtre individuel avec label. Slot libre pour le contenu (input, select, etc.).

**Props :**
- `label` : texte du label
- `name` : nom du champ

**Markup de sortie :**
```html
<div>
  <label class="mb-1 block text-sm font-medium text-on-surface-strong">{label}</label>
  {slot}
</div>
```

Note : Le slot utilise directement les composants `input/control` ou `select/control` existants, avec les query params comme valeurs pour conserver les filtres actifs.

## Refactoring des pages

### `/dashboard/bookings` (index)

**Toolbar :** `@filter.bar` avec `cols="4"`
- Date : `@input.control` type="date", value depuis query string
- Statut : `@select.control` options=[Tous, En attente, Confirmé, Annulé]
- Code : `@input.control` type="text" placeholder="Code passager..."

**Table :** 7 colonnes

| # | Header | Contenu | Notes |
|---|--------|---------|-------|
| 1 | Date | `{{ formatDate(booking.createdAt, 'dd/MM/yyyy HH:mm') }}` | |
| 2 | Voyage | `Départ → Arrivée` + heure départ en sous-texte | Preload trip.route + cities |
| 3 | Client | Nom complet + téléphone en sous-texte `text-on-surface text-xs` | |
| 4 | Passagers | Count | |
| 5 | Montant | `{amount} FCFA` | |
| 6 | Statut | `@badge` : confirmed→success, pending→warning, cancelled→danger | |
| 7 | | `@dropdown-menu` | Pas de header |

**Actions dropdown :** (toutes wrappées dans les `@can` existants)
- Voir (`@svg('tabler:eye')`) → lien vers `route('dashboard.bookings.show', { id: booking.id })`
- Modifier (`@svg('tabler:pencil')`) → lien vers `route('dashboard.bookings.edit', { id: booking.id })` — conditionnel : `booking.status === 'confirmed'`, wrappé dans `@can('permission', 'booking:update')`
- `@dropdown-menu.separator`
- Annuler (`@svg('tabler:ban')`, variant destructive) → form DELETE vers `route('dashboard.bookings.destroy', { id: booking.id })` — conditionnel : `booking.status !== 'cancelled'`, wrappé dans `@can('permission', 'booking:update')`

**État vide :** `@table.empty` colspan=7, message="Aucune réservation trouvée"

**Pagination :** `@pagination({ paginator: bookings })`

### `/dashboard/trips` (index)

**Pas de toolbar de filtres.**

**Table :** 8 colonnes

| # | Header | Contenu |
|---|--------|---------|
| 1 | Route | Départ → Arrivée |
| 2 | Bus | Plaque d'immatriculation |
| 3 | Chauffeur | Nom complet |
| 4 | Départ | Date + heure |
| 5 | Classe | `@badge` : vip→info, standard→neutral |
| 6 | Tarif | `{price} FCFA` |
| 7 | Statut | `@badge` : scheduled→info, in_progress→warning |
| 8 | | `@dropdown-menu` |

**Actions dropdown (conditionnelles selon statut, wrappées dans `@can`) :**
- Démarrer (`@svg('tabler:player-play')`) → form PUT vers `route('trips.transition', { id: trip.id })` avec hidden `name="status" value="in_progress"`, condition: `scheduled`, wrappé dans `@can('permission', 'trip:update')`
- Compléter (`@svg('tabler:check')`) → form PUT vers `route('trips.transition', { id: trip.id })` avec hidden `name="status" value="completed"`, condition: `in_progress`, wrappé dans `@can('permission', 'trip:update')`
- Modifier (`@svg('tabler:pencil')`) → lien vers `route('trips.edit', { id: trip.id })`, condition: `scheduled` ou `in_progress`, wrappé dans `@can('permission', 'trip:update')`
- `@dropdown-menu.separator`
- Annuler (`@svg('tabler:x')`, destructive) → form PUT vers `route('trips.transition', { id: trip.id })` avec hidden `name="status" value="cancelled"`, condition: `scheduled` ou `in_progress`, wrappé dans `@can('permission', 'trip:update')`
- Supprimer (`@svg('tabler:trash')`, destructive) → form DELETE vers `route('trips.destroy', { id: trip.id })`, condition: `scheduled`, wrappé dans `@can('permission', 'trip:delete')`

**État vide :** `@table.empty` colspan=8, message="Aucun voyage actif"

**Pas de pagination.**

### `/dashboard/trips/history`

**Toolbar :** `@filter.bar` avec `cols="6"` (9 champs, 6 colonnes sur desktop comme l'existant)
- Statut : select (Tous, Terminé, Annulé)
- Route : select (routes avec code + villes)
- Chauffeur : select (noms complets)
- Bus : select (plaque + marque/modèle)
- Classe : select (Tous, Standard, VIP)
- Date début : input date
- Date fin : input date
- Prix min : input number
- Prix max : input number

**Table :** 7 colonnes (mêmes que trips index, sans la colonne actions)

| # | Header | Contenu |
|---|--------|---------|
| 1 | Route | Départ → Arrivée |
| 2 | Bus | Plaque d'immatriculation |
| 3 | Chauffeur | Nom complet |
| 4 | Départ | Date + heure |
| 5 | Classe | `@badge` : vip→info, standard→neutral |
| 6 | Tarif | `{price} FCFA` |
| 7 | Statut | `@badge` : completed→success, cancelled→danger |

**État vide :** `@table.empty` colspan=7, message="Aucun voyage dans l'historique"

**Pagination :** `@pagination({ paginator: trips })`

## Ce qui ne change PAS

- **Controllers** : aucune modification (mêmes queries, mêmes données passées aux vues)
- **Routes** : aucune modification
- **Validators** : aucune modification
- **Models** : aucune modification
- **Layout dashboard** : inchangé
- **Permissions** : mêmes vérifications `@can()` dans les vues

## Tokens CSS utilisés

Tous issus du thème existant dans `resources/css/app.css` :
- Surfaces : `surface`, `surface-alt`
- Textes : `on-surface`, `on-surface-strong`
- Bordures : `outline`
- Sémantiques : `success`, `warning`, `danger`, `info`
- Composants : `primary`, `on-primary`

## Dépendances

- Alpine.js (déjà installé) pour le dropdown menu
- Tabler icons via `@svg()` (déjà configuré)
- Aucune nouvelle dépendance npm
