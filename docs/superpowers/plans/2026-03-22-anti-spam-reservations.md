# Anti-spam réservations — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protéger le système de réservation publique contre le spam (bots et abandons) via 4 mécanismes complémentaires.

**Architecture:** Middleware de throttle par IP sur l'initiation, logique session dans le contrôleur pour limiter à 1 booking pending, honeypot dans les formulaires Edge, et commande ace CRON pour le nettoyage automatique.

**Tech Stack:** AdonisJS v7, Edge.js, Lucid ORM, Ace CLI

**Spec:** `docs/superpowers/specs/2026-03-22-anti-spam-reservations-design.md`

---

## Fichiers impactés

| Fichier | Action | Responsabilité |
|---------|--------|---------------|
| `app/middleware/throttle_middleware.ts` | Créer | Rate limiting par IP (in-memory Map) |
| `start/kernel.ts` | Modifier | Enregistrer le middleware throttle comme named middleware |
| `start/routes/bookings.ts` | Modifier | Changer la route d'initiation + appliquer throttle |
| `app/controllers/bookings_controller.ts` | Modifier | Honeypot, session reuse/cancel, tripId depuis query string |
| `resources/views/pages/trips/search.edge` | Modifier | Ajouter honeypot, mettre à jour l'action du formulaire |
| `resources/views/pages/trips/show.edge` | Modifier | Ajouter honeypot, mettre à jour l'action du formulaire |
| `commands/booking_cancel_abandoned.ts` | Créer | Commande ace pour annuler les bookings abandonnés |

---

## Task 1 : Middleware throttle par IP

**Files:**
- Create: `app/middleware/throttle_middleware.ts`
- Modify: `start/kernel.ts`

- [ ] **Step 1: Créer le middleware throttle**

Créer `app/middleware/throttle_middleware.ts` :

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

interface ThrottleEntry {
  count: number
  expiresAt: number
}

const store = new Map<string, ThrottleEntry>()

export default class ThrottleMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { maxAttempts?: number; decayMinutes?: number } = {}
  ) {
    const maxAttempts = options.maxAttempts ?? 5
    const decayMinutes = options.decayMinutes ?? 60
    const key = `throttle:booking:initiate:${ctx.request.ip()}`
    const now = Date.now()

    const entry = store.get(key)

    if (entry && entry.expiresAt > now) {
      if (entry.count >= maxAttempts) {
        const retryAfterSeconds = Math.ceil((entry.expiresAt - now) / 1000)
        ctx.session.flash('error', `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfterSeconds / 60)} minute(s).`)
        ctx.response.status(429)
        return ctx.response.redirect().back()
      }
      entry.count++
    } else {
      store.set(key, {
        count: 1,
        expiresAt: now + decayMinutes * 60 * 1000,
      })
    }

    // Cleanup expired entries periodically (every 100 requests)
    if (Math.random() < 0.01) {
      for (const [k, v] of store) {
        if (v.expiresAt <= now) store.delete(k)
      }
    }

    return next()
  }
}
```

- [ ] **Step 2: Enregistrer le middleware dans kernel.ts**

Dans `start/kernel.ts`, ajouter `throttle` aux named middleware :

```typescript
export const middleware = router.named({
  guest: () => import('#middleware/guest_middleware'),
  auth: () => import('#middleware/auth_middleware'),
  permission: () => import('#middleware/permission_middleware'),
  throttle: () => import('#middleware/throttle_middleware'),
})
```

- [ ] **Step 3: Vérifier que le serveur démarre**

Run: `node ace serve --no-assets`
Expected: Le serveur démarre sans erreur.

- [ ] **Step 4: Commit**

```bash
git add app/middleware/throttle_middleware.ts start/kernel.ts
git commit -m "feat: add throttle middleware for IP-based rate limiting"
```

---

## Task 2 : Changer la route d'initiation et appliquer le throttle

**Files:**
- Modify: `start/routes/bookings.ts`

- [ ] **Step 1: Modifier la route d'initiation**

Dans `start/routes/bookings.ts`, remplacer la ligne 8 :

```typescript
// Avant
router.post('/trips/:tripId', [BookingsController, 'initiate']).as('public.bookings.initiate')

// Après
router
  .post('/', [BookingsController, 'initiate'])
  .as('public.bookings.initiate')
  .use(middleware.throttle({ maxAttempts: 5, decayMinutes: 60 }))
```

Ajouter l'import du middleware en haut du fichier :

```typescript
import { middleware } from '#start/kernel'
```

- [ ] **Step 2: Vérifier que le serveur démarre**

Run: `node ace serve --no-assets`
Expected: Le serveur démarre sans erreur.

- [ ] **Step 3: Commit**

```bash
git add start/routes/bookings.ts
git commit -m "feat: change booking initiation route to POST /booking and apply throttle"
```

---

## Task 3 : Honeypot + logique session dans le contrôleur

**Files:**
- Modify: `app/controllers/bookings_controller.ts`

- [ ] **Step 1: Réécrire la méthode `initiate`**

Remplacer la méthode `initiate` (lignes 39-63) dans `app/controllers/bookings_controller.ts` par :

```typescript
async initiate({ request, response, session }: HttpContext) {
  // Honeypot check
  if (request.input('website')) {
    return response.forbidden('Invalid request')
  }

  const tripId = request.input('trip')
  if (!tripId) {
    session.flash('error', 'Voyage non spécifié.')
    return response.redirect().back()
  }

  const trip = await Trip.query()
    .where('id', tripId)
    .where('status', 'scheduled')
    .preload('tenant')
    .firstOrFail()

  if (trip.departureTime <= DateTime.now()) {
    session.flash('error', 'Ce voyage a déjà commencé ou est passé.')
    return response.redirect().back()
  }

  // Check for existing pending booking in session
  const currentBookingId = session.get('currentBookingId')

  if (currentBookingId) {
    const existingBooking = await Booking.query()
      .where('id', currentBookingId)
      .where('status', 'pending')
      .withCount('passengers', (q) => q.as('passengersCount'))
      .first()

    if (existingBooking) {
      // Same trip → redirect to current step
      if (existingBooking.tripId === trip.id) {
        return this.redirectToCurrentStep(existingBooking, response)
      }

      // Different trip, no passengers → reuse booking
      if (Number(existingBooking.$extras.passengersCount) === 0) {
        existingBooking.tripId = trip.id
        existingBooking.tenantId = trip.tenantId
        await existingBooking.save()
        return response.redirect().toRoute('public.bookings.passengers', { id: existingBooking.id })
      }

      // Different trip, has passengers → cancel old, create new
      existingBooking.status = 'cancelled'
      await existingBooking.save()
      await this.seatAllocator.broadcastAvailability(existingBooking.tripId)
    }
  }

  // Create new booking
  const booking = await Booking.create({
    tenantId: trip.tenantId,
    tripId: trip.id,
    status: 'pending',
  })

  const bookingIds: string[] = session.get('bookingIds', [])
  bookingIds.push(booking.id)
  session.put('bookingIds', bookingIds)
  session.put('currentBookingId', booking.id)

  return response.redirect().toRoute('public.bookings.passengers', { id: booking.id })
}
```

- [ ] **Step 2: Ajouter la méthode helper `redirectToCurrentStep`**

Ajouter cette méthode privée dans la classe `BookingsController`, après `getBookingFromSession` :

```typescript
private async redirectToCurrentStep(booking: Booking, response: HttpContext['response']) {
  await booking.load('passengers')

  // No passengers yet → step 1
  if (booking.passengers.length === 0) {
    return response.redirect().toRoute('public.bookings.passengers', { id: booking.id })
  }

  // Has passengers but no customer → step 2
  if (!booking.customerId) {
    return response.redirect().toRoute('public.bookings.customer', { id: booking.id })
  }

  // Has customer → step 3 (summary)
  return response.redirect().toRoute('public.bookings.summary', { id: booking.id })
}
```

- [ ] **Step 3: Vérifier que le serveur démarre**

Run: `node ace serve --no-assets`
Expected: Le serveur démarre sans erreur.

- [ ] **Step 4: Commit**

```bash
git add app/controllers/bookings_controller.ts
git commit -m "feat: add honeypot check and session-based booking reuse/cancel logic"
```

---

## Task 4 : Mettre à jour les templates Edge

**Files:**
- Modify: `resources/views/pages/trips/search.edge`
- Modify: `resources/views/pages/trips/show.edge`

- [ ] **Step 1: Mettre à jour le formulaire dans search.edge**

Remplacer le bloc formulaire (lignes 116-122) dans `resources/views/pages/trips/search.edge` :

```edge
{{-- Avant --}}
<form method="POST" action="{{ route('public.bookings.initiate', { tripId: item.trip.id }) }}">
  {{ csrfField() }}
  <button type="submit" ...>Réserver</button>
</form>

{{-- Après --}}
<form method="POST" action="{{ route('public.bookings.initiate') }}?trip={{ item.trip.id }}">
  {{ csrfField() }}
  <input type="text" name="website" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true">
  <button type="submit"
    class="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-on-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:shadow-md sm:w-auto">
    Réserver
  </button>
</form>
```

- [ ] **Step 2: Mettre à jour le formulaire dans show.edge**

Remplacer le bloc formulaire (lignes 84-90) dans `resources/views/pages/trips/show.edge` :

```edge
{{-- Avant --}}
<form method="POST" action="{{ route('public.bookings.initiate', { tripId: trip.id }) }}">
  {{ csrfField() }}
  <button type="submit" ...>Réserver ce voyage</button>
</form>

{{-- Après --}}
<form method="POST" action="{{ route('public.bookings.initiate') }}?trip={{ trip.id }}">
  {{ csrfField() }}
  <input type="text" name="website" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true">
  <button type="submit"
    class="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:shadow-md sm:w-auto sm:px-8">
    Réserver ce voyage
  </button>
</form>
```

- [ ] **Step 3: Vérifier le rendu du honeypot**

Vérifier dans le navigateur que le champ `website` est invisible (la classe `sr-only` est incluse nativement dans Tailwind CSS v4). Inspecter via DevTools que le champ existe bien dans le DOM mais n'est pas visible à l'écran.

- [ ] **Step 4: Commit**

```bash
git add resources/views/pages/trips/search.edge resources/views/pages/trips/show.edge
git commit -m "feat: add honeypot field and update booking initiation URL in templates"
```

---

## Task 5 : Commande ace d'annulation automatique

**Files:**
- Create: `commands/booking_cancel_abandoned.ts`

- [ ] **Step 1: Créer la commande**

Créer `commands/booking_cancel_abandoned.ts` :

```typescript
import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

export default class BookingCancelAbandoned extends BaseCommand {
  static commandName = 'booking:cancel-abandoned'
  static description = 'Annuler les réservations pending dont le voyage est déjà parti'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { default: Booking } = await import('#models/booking')

    const bookings = await Booking.query()
      .where('status', 'pending')
      .whereHas('trip', (q) => {
        q.where('departureTime', '<', DateTime.now().toSQL()!)
      })

    let count = 0
    for (const booking of bookings) {
      booking.status = 'cancelled'
      await booking.save()
      count++
    }

    this.logger.info(`${count} réservation(s) abandonnée(s) annulée(s).`)
  }
}
```

Notes d'implémentation :
- `startApp: true` est requis car la commande utilise les modèles Lucid (connexion BDD nécessaire)
- Les imports de modèles sont dynamiques pour respecter le cycle de vie AdonisJS
- La commande est dans `commands/` (convention AdonisJS v7, auto-découverte)

- [ ] **Step 2: Vérifier que la commande est détectée**

Run: `node ace list | grep booking`
Expected: `booking:cancel-abandoned` apparaît dans la liste.

- [ ] **Step 3: Tester la commande (dry run)**

Run: `node ace booking:cancel-abandoned`
Expected: `0 réservation(s) abandonnée(s) annulée(s).` (ou le nombre de bookings abandonnés trouvés)

- [ ] **Step 4: Commit**

```bash
git add commands/booking_cancel_abandoned.ts
git commit -m "feat: add ace command to cancel abandoned pending bookings"
```

---

## Task 6 : Test d'intégration manuel

- [ ] **Step 1: Tester le flow normal**

1. Aller sur la page de recherche de voyages
2. Cliquer sur "Réserver" pour un voyage
3. Vérifier la redirection vers `/booking/:id/passengers`

- [ ] **Step 2: Tester la réutilisation de booking (même voyage)**

1. Initier une réservation pour un voyage A
2. Revenir à la recherche et cliquer à nouveau sur "Réserver" pour le même voyage A
3. Vérifier qu'on est redirigé vers l'étape en cours (pas de nouveau booking créé)

- [ ] **Step 3: Tester la réutilisation de booking (autre voyage, sans passagers)**

1. Initier une réservation pour un voyage A (ne pas ajouter de passagers)
2. Revenir à la recherche et cliquer sur "Réserver" pour un voyage B
3. Vérifier que le même booking est réutilisé avec le nouveau tripId

- [ ] **Step 4: Tester l'annulation de booking (autre voyage, avec passagers)**

1. Initier une réservation pour un voyage A et ajouter des passagers
2. Revenir à la recherche et cliquer sur "Réserver" pour un voyage B
3. Vérifier que l'ancien booking est annulé et un nouveau est créé

- [ ] **Step 5: Tester le honeypot**

1. Ouvrir DevTools, remplir le champ `website` caché avec une valeur
2. Soumettre le formulaire
3. Vérifier la réponse 403

- [ ] **Step 6: Tester le rate limiting**

1. Cliquer sur "Réserver" 6 fois rapidement (ouvrir plusieurs onglets si nécessaire)
2. Vérifier que la 6e tentative retourne une erreur 429 avec le message

- [ ] **Step 7: Tester la commande CRON**

1. Créer manuellement un booking pending pour un voyage dont l'heure de départ est passée
2. Exécuter `node ace booking:cancel-abandoned`
3. Vérifier que le booking est passé en status `cancelled`

- [ ] **Step 8: Commit final**

```bash
git commit --allow-empty -m "test: manual integration testing for anti-spam reservations"
```
