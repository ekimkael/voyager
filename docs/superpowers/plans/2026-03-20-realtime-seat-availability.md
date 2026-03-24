# Real-Time Seat Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a real-time seat availability counter on critical booking pages (passengers, payment, dashboard create) using Server-Sent Events, blocking user actions when seats reach zero.

**Architecture:** SSE via `@adonisjs/transmit` (native AdonisJS module). Server broadcasts seat count changes on a `trips/:tripId/seats` channel after each booking event. Client subscribes via `@adonisjs/transmit-client`, integrated through the existing Vite + Alpine.js setup.

**Tech Stack:** `@adonisjs/transmit` (server SSE), `@adonisjs/transmit-client` (client SSE), Alpine.js (reactive UI), Vite (bundling)

**Spec:** `docs/superpowers/specs/2026-03-20-realtime-seat-availability-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `config/transmit.ts` | Create (auto) | Transmit SSE config |
| `adonisrc.ts` | Modify (auto) | Register Transmit provider |
| `start/routes.ts` | Modify | Register Transmit SSE routes |
| `app/services/seat_allocator.ts` | Modify | Add `broadcastAvailability()` method |
| `app/controllers/bookings_controller.ts` | Modify | Broadcast after `storePassengers()` and `processPayment()`, pass `availableSeats` to views |
| `app/controllers/dashboard/bookings_controller.ts` | Modify | Broadcast after `store()` and `destroy()`, pass seat counts to `create` view |
| `resources/js/app.js` | Modify | Initialize Transmit client, expose to Alpine |
| `resources/views/pages/bookings/passengers.edge` | Modify | Add seat counter + SSE subscription + button blocking |
| `resources/views/pages/bookings/payment.edge` | Modify | Add seat counter + SSE subscription + button blocking |
| `resources/views/pages/dashboard/bookings/create.edge` | Modify | Add dynamic seat counter + SSE subscription + button blocking + fix `trip.bookedSeats` bug |

---

### Task 1: Install and configure @adonisjs/transmit

**Files:**
- Modify: `package.json`
- Create: `config/transmit.ts` (auto-generated)
- Modify: `adonisrc.ts` (auto-modified)

- [ ] **Step 1: Install server package**

Run:
```bash
node ace add @adonisjs/transmit
```

This installs `@adonisjs/transmit`, creates `config/transmit.ts`, and registers the provider in `adonisrc.ts`.

- [ ] **Step 2: Install client package**

Run:
```bash
npm install @adonisjs/transmit-client
```

- [ ] **Step 3: Verify config was created**

Read `config/transmit.ts` and confirm it contains `defineConfig` with `pingInterval`. No customization needed — defaults are fine.

- [ ] **Step 4: Verify provider was registered**

Read `adonisrc.ts` and confirm `@adonisjs/transmit/transmit_provider` is in the `providers` array.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json config/transmit.ts adonisrc.ts
git commit -m "feat: install and configure @adonisjs/transmit for SSE"
```

---

### Task 2: Register Transmit routes

**Files:**
- Modify: `start/routes.ts`

- [ ] **Step 1: Add Transmit route registration**

In `start/routes.ts`, add the import and route registration at the top, after the router import:

```typescript
import transmit from '@adonisjs/transmit/services/main'

transmit.registerRoutes()
```

This registers three routes:
- `GET /__transmit/events` — SSE connection
- `POST /__transmit/subscribe` — subscribe to channel
- `POST /__transmit/unsubscribe` — unsubscribe from channel

- [ ] **Step 2: Verify the app starts**

Run:
```bash
node ace serve --hmr
```

Check that no errors appear. The transmit routes should be available. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add start/routes.ts
git commit -m "feat: register transmit SSE routes"
```

---

### Task 3: Add broadcastAvailability to SeatAllocator

**Files:**
- Modify: `app/services/seat_allocator.ts`

- [ ] **Step 1: Add the broadcast method**

Add the import for transmit at the top of `app/services/seat_allocator.ts`:

```typescript
import transmit from '@adonisjs/transmit/services/main'
```

Add the new method to the `SeatAllocator` class (after `getAvailableSeatCount`):

```typescript
async broadcastAvailability(tripId: string): Promise<void> {
  const availableSeats = await this.getAvailableSeatCount(tripId)
  transmit.broadcast(`trips/${tripId}/seats`, { availableSeats })
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run:
```bash
node ace typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/services/seat_allocator.ts
git commit -m "feat: add broadcastAvailability method to SeatAllocator"
```

---

### Task 4: Broadcast from public BookingsController

**Files:**
- Modify: `app/controllers/bookings_controller.ts`

- [ ] **Step 1: Add broadcast after storePassengers()**

In `app/controllers/bookings_controller.ts`, in the `storePassengers()` method, add the broadcast call **after** the transaction has committed successfully (after the `try/catch` block's success path, before the redirect):

```typescript
async storePassengers(ctx: HttpContext) {
  const result = await this.getBookingFromSession(ctx)
  if (!(result instanceof Booking)) return result

  const booking = result
  const payload = await ctx.request.validateUsing(storePassengersValidator)

  try {
    await db.transaction(async (trx) => {
      await this.seatAllocator.allocate(booking.tripId, payload.passengers, booking.id, trx)
    })
  } catch (error) {
    if (error instanceof InsufficientSeatsError) {
      ctx.session.flash('error', 'Nombre de places insuffisant pour ce voyage.')
      return ctx.response.redirect().back()
    }
    throw error
  }

  // Broadcast updated seat count AFTER transaction committed
  await this.seatAllocator.broadcastAvailability(booking.tripId)

  return ctx.response.redirect().toRoute('public.bookings.customer', {
    tenantSlug: ctx.tenant!.slug,
    id: booking.id,
  })
}
```

- [ ] **Step 2: Add broadcast after processPayment()**

In the `processPayment()` method, add broadcast after the booking status change:

```typescript
async processPayment(ctx: HttpContext) {
  const result = await this.getBookingFromSession(ctx)
  if (!(result instanceof Booking)) return result

  const booking = result
  const payload = await ctx.request.validateUsing(processPaymentValidator)

  await Payment.create({
    bookingId: booking.id,
    amount: booking.totalAmount,
    paymentMethod: payload.paymentMethod,
    operator: payload.operator || null,
    status: 'success',
    paidAt: DateTime.now(),
  })

  booking.status = 'confirmed'
  await booking.save()

  // Broadcast updated seat count after confirmation
  await this.seatAllocator.broadcastAvailability(booking.tripId)

  return ctx.response.redirect().toRoute('public.bookings.completed', {
    tenantSlug: ctx.tenant!.slug,
    id: booking.id,
  })
}
```

- [ ] **Step 3: Pass availableSeats to passengers view**

In the `passengers()` method, add the seat count to the view data:

```typescript
async passengers(ctx: HttpContext) {
  const result = await this.getBookingFromSession(ctx)
  if (!(result instanceof Booking)) return result

  const booking = result
  await booking.load('trip', (q) => {
    q.preload('route', (rq) => {
      rq.preload('departureCity').preload('arrivalCity')
    })
  })

  const availableSeats = await this.seatAllocator.getAvailableSeatCount(booking.tripId)

  return ctx.view.render('pages/bookings/passengers', {
    booking,
    trip: booking.trip,
    tenantSlug: ctx.tenant!.slug,
    availableSeats,
  })
}
```

- [ ] **Step 4: Pass availableSeats to payment view**

In the `payment()` method, add the seat count:

```typescript
async payment(ctx: HttpContext) {
  const result = await this.getBookingFromSession(ctx)
  if (!(result instanceof Booking)) return result

  const booking = result
  await booking.load('trip')
  await booking.load('customer')

  const availableSeats = await this.seatAllocator.getAvailableSeatCount(booking.tripId)

  return ctx.view.render('pages/bookings/payment', {
    booking,
    tenantSlug: ctx.tenant!.slug,
    availableSeats,
  })
}
```

- [ ] **Step 5: Verify no TypeScript errors**

Run:
```bash
node ace typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/controllers/bookings_controller.ts
git commit -m "feat: broadcast seat availability from public booking flow"
```

---

### Task 5: Broadcast from dashboard BookingsController

**Files:**
- Modify: `app/controllers/dashboard/bookings_controller.ts`

- [ ] **Step 1: Add broadcast after store()**

In `app/controllers/dashboard/bookings_controller.ts`, in the `store()` method, add broadcast after the transaction succeeds. The `tripId` needs to be captured from inside the transaction. Modify:

```typescript
async store({ request, response, session, tenant, auth }: HttpContext) {
  const payload = await request.validateUsing(agentBookingValidator)

  try {
    const booking = await db.transaction(async (trx) => {
      const trip = await Trip.query({ client: trx })
        .where('id', payload.tripId)
        .where('tenantId', tenant!.id)
        .where('status', 'scheduled')
        .where('departureTime', '>', DateTime.now().toSQL()!)
        .firstOrFail()

      const customer = await Customer.firstOrCreate(
        { tenantId: tenant!.id, phone: payload.customer.phone },
        {
          tenantId: tenant!.id,
          firstName: payload.customer.firstName,
          lastName: payload.customer.lastName,
          phone: payload.customer.phone,
          email: payload.customer.email || null,
        },
        { client: trx }
      )

      const newBooking = await Booking.create(
        {
          tenantId: tenant!.id,
          tripId: trip.id,
          customerId: customer.id,
          agentId: auth.user!.id,
          franchiseId: auth.user!.franchiseId,
          status: 'confirmed',
          totalAmount: payload.passengers.length * trip.price,
        },
        { client: trx }
      )

      await this.seatAllocator.allocate(trip.id, payload.passengers, newBooking.id, trx)

      await Payment.create(
        {
          bookingId: newBooking.id,
          amount: newBooking.totalAmount,
          paymentMethod: 'cash',
          status: 'success',
          paidAt: DateTime.now(),
        },
        { client: trx }
      )

      return newBooking
    })

    // Broadcast AFTER transaction committed
    await this.seatAllocator.broadcastAvailability(booking.tripId)

    session.flash('success', 'Réservation créée avec succès')
    return response.redirect().toRoute('dashboard.bookings.show', { id: booking.id })
  } catch (error) {
    if (error instanceof InsufficientSeatsError) {
      session.flash('error', 'Nombre de places insuffisant pour ce voyage.')
      return response.redirect().back()
    }
    throw error
  }
}
```

- [ ] **Step 2: Add broadcast after destroy()**

In the `destroy()` method, add broadcast after the status change:

```typescript
async destroy({ params, response, session, tenant }: HttpContext) {
  const booking = await Booking.query()
    .where('id', params.id)
    .where('tenantId', tenant!.id)
    .preload('trip')
    .firstOrFail()

  if (booking.trip.departureTime <= DateTime.now()) {
    session.flash('error', 'Impossible d\'annuler une réservation pour un voyage passé.')
    return response.redirect().toRoute('dashboard.bookings.index')
  }

  booking.status = 'cancelled'
  await booking.save()

  // Broadcast updated seat count after cancellation
  await this.seatAllocator.broadcastAvailability(booking.tripId)

  session.flash('success', 'Réservation annulée avec succès')
  return response.redirect().toRoute('dashboard.bookings.index')
}
```

- [ ] **Step 3: Pass seat counts to create view**

In the `create()` method, build a map of available seats per trip and pass it to the view:

```typescript
async create({ view, tenant }: HttpContext) {
  const trips = await Trip.query()
    .where('tenantId', tenant!.id)
    .where('status', 'scheduled')
    .where('departureTime', '>', DateTime.now().toSQL()!)
    .preload('route', (q) => {
      q.preload('departureCity').preload('arrivalCity')
    })
    .preload('bus')
    .orderBy('departureTime', 'asc')

  // Note: O(N) queries — acceptable for MVP, optimize with batch query if trip count grows
  const seatCounts: Record<string, number> = {}
  for (const trip of trips) {
    seatCounts[trip.id] = await this.seatAllocator.getAvailableSeatCount(trip.id)
  }

  return view.render('pages/dashboard/bookings/create', { trips, seatCounts })
}
```

- [ ] **Step 4: Verify no TypeScript errors**

Run:
```bash
node ace typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/controllers/dashboard/bookings_controller.ts
git commit -m "feat: broadcast seat availability from dashboard booking flow"
```

---

### Task 6: Initialize Transmit client in frontend

**Files:**
- Modify: `resources/js/app.js`

- [ ] **Step 1: Add Transmit client initialization**

Modify `resources/js/app.js` to import and initialize Transmit, then expose it globally for Alpine components:

```javascript
import Alpine from 'alpinejs'
import { Transmit } from '@adonisjs/transmit-client'

const transmit = new Transmit({
  baseUrl: window.location.origin,
})

window.__transmit = transmit

Alpine.data('alert', function () {
  return {
    isVisible: false,
    dismiss() {
      this.isVisible = false
    },
    init() {
      setTimeout(() => {
        this.isVisible = true
      }, 80)
      setTimeout(() => {
        this.dismiss()
      }, 5000)
    },
  }
})

Alpine.start()
```

- [ ] **Step 2: Verify the app compiles**

Run:
```bash
node ace serve --hmr
```

Open the browser, check the console for any errors. The Transmit client should connect silently. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add resources/js/app.js
git commit -m "feat: initialize Transmit SSE client in frontend"
```

---

### Task 7: Add real-time seat counter to passengers.edge

**Files:**
- Modify: `resources/views/pages/bookings/passengers.edge`

- [ ] **Step 1: Add seat counter and SSE subscription to the Alpine component**

Replace the existing `x-data` on the `<form>` with an expanded version that includes seat tracking. Also add the seat counter display in the trip summary block, and modify the buttons to respect seat availability.

In `resources/views/pages/bookings/passengers.edge`:

**Add seat counter in the trip summary block** (after the price line, before the closing `</div>` of the trip summary):

```edge
<p class="mt-1 text-sm font-semibold"
  :class="availableSeats <= 0 ? 'text-red-600' : 'text-on-surface'"
  x-text="availableSeats <= 0 ? 'Plus de places disponibles' : 'Places restantes : ' + availableSeats"
>
  Places restantes : {{ availableSeats }}
</p>
```

**Wrap the form's `x-data`** to include seat tracking. The `x-data` on the `<form>` becomes:

```edge
x-data="{
  passengers: [{ firstName: '', lastName: '', phone: '' }],
  availableSeats: {{ availableSeats }},
  subscription: null,
  get seatsExhausted() {
    return this.availableSeats <= 0
  },
  get canAddPassenger() {
    return this.passengers.length < this.availableSeats
  },
  addPassenger() {
    if (this.canAddPassenger) {
      this.passengers.push({ firstName: '', lastName: '', phone: '' })
    }
  },
  removePassenger(index) {
    if (this.passengers.length > 1) this.passengers.splice(index, 1)
  },
  async init() {
    const transmit = window.__transmit
    if (transmit) {
      this.subscription = transmit.subscription('trips/{{ booking.tripId }}/seats')
      await this.subscription.create()
      this.subscription.onMessage((data) => {
        this.availableSeats = data.availableSeats
      })
    }
  },
  destroy() {
    if (this.subscription) {
      this.subscription.delete()
    }
  }
}"
```

**Disable the "Ajouter un passager" button** when `canAddPassenger` is false:

```edge
<button
  type="button"
  @click="addPassenger()"
  :disabled="!canAddPassenger"
  :class="canAddPassenger ? 'text-primary hover:text-primary/80' : 'text-gray-400 cursor-not-allowed'"
  class="inline-flex items-center gap-1 text-sm font-medium transition-colors"
>
  + Ajouter un passager
</button>
```

**Disable the "Suivant" submit button** when seats are exhausted:

```edge
<button
  type="submit"
  :disabled="seatsExhausted"
  :class="seatsExhausted ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-secondary'"
  class="rounded-radius px-6 py-2.5 text-sm font-medium text-on-primary transition-colors"
>
  Suivant
</button>
```

- [ ] **Step 2: Verify in browser**

Run:
```bash
node ace serve --hmr
```

Navigate to a booking's passenger page. Verify:
- The seat counter is displayed
- The "Ajouter un passager" button respects the seat limit
- The counter updates if another booking is made (test with two browser windows)

- [ ] **Step 3: Commit**

```bash
git add resources/views/pages/bookings/passengers.edge
git commit -m "feat: add real-time seat counter to passengers page"
```

---

### Task 8: Add real-time seat counter to payment.edge

**Files:**
- Modify: `resources/views/pages/bookings/payment.edge`

- [ ] **Step 1: Add seat counter and SSE subscription**

In `resources/views/pages/bookings/payment.edge`:

**Add `x-data` to the existing wrapper div** (the `<div class="mx-auto max-w-lg">` on line 2 of `payment.edge`). This creates a parent Alpine scope above the form's existing `x-data` — Alpine.js nested scopes work correctly, the inner form scope inherits `seatsExhausted` from the parent:

```edge
@layout.public()
  <div class="mx-auto max-w-lg"
    x-data="{
      availableSeats: {{ availableSeats }},
      subscription: null,
      get seatsExhausted() {
        return this.availableSeats <= 0
      },
      async init() {
        const transmit = window.__transmit
        if (transmit) {
          this.subscription = transmit.subscription('trips/{{ booking.tripId }}/seats')
          await this.subscription.create()
          this.subscription.onMessage((data) => {
            this.availableSeats = data.availableSeats
          })
        }
      },
      destroy() {
        if (this.subscription) {
          this.subscription.delete()
        }
      }
    }"
  >
```

**Add seat counter** after the progress bar, before the payment form card:

```edge
<p class="mb-6 text-sm font-semibold"
  :class="availableSeats <= 0 ? 'text-red-600' : 'text-on-surface'"
  x-text="availableSeats <= 0 ? 'Plus de places disponibles' : 'Places restantes : ' + availableSeats"
>
  Places restantes : {{ availableSeats }}
</p>
```

**Disable the "Payer" button** when seats are exhausted:

```edge
<button
  type="submit"
  :disabled="seatsExhausted"
  :class="seatsExhausted ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-secondary'"
  class="rounded-radius px-6 py-2.5 text-sm font-medium text-on-primary transition-colors"
>
  Payer
</button>
```

No extra closing `</div>` needed — the existing one serves as the closing tag.

- [ ] **Step 2: Verify in browser**

Navigate to a booking's payment page. Verify the counter displays and the button disables when seats reach 0.

- [ ] **Step 3: Commit**

```bash
git add resources/views/pages/bookings/payment.edge
git commit -m "feat: add real-time seat counter to payment page"
```

---

### Task 9: Add real-time seat counter to dashboard create.edge

**Files:**
- Modify: `resources/views/pages/dashboard/bookings/create.edge`

- [ ] **Step 1: Add seat tracking to the form**

In `resources/views/pages/dashboard/bookings/create.edge`:

**Add a top-level `x-data`** on the outer `<div class="mx-auto max-w-3xl">` to handle trip selection and SSE subscription:

```edge
<div class="mx-auto max-w-3xl"
  x-data="{
    selectedTripId: '{{ old('tripId') || '' }}',
    seatCounts: {{ js.stringify(seatCounts) }},
    availableSeats: null,
    subscription: null,
    get seatsExhausted() {
      return this.availableSeats !== null && this.availableSeats <= 0
    },
    async selectTrip(tripId) {
      if (this.subscription) {
        await this.subscription.delete()
        this.subscription = null
      }
      this.selectedTripId = tripId
      if (!tripId) {
        this.availableSeats = null
        return
      }
      this.availableSeats = this.seatCounts[tripId] ?? null
      const transmit = window.__transmit
      if (transmit) {
        this.subscription = transmit.subscription('trips/' + tripId + '/seats')
        await this.subscription.create()
        this.subscription.onMessage((data) => {
          this.availableSeats = data.availableSeats
        })
      }
    },
    destroy() {
      if (this.subscription) {
        this.subscription.delete()
      }
    }
  }"
  x-init="if (selectedTripId) { selectTrip(selectedTripId) }"
>
```

**Modify the trip `<select>`** to trigger `selectTrip()` on change, and fix the `trip.bookedSeats` bug:

```edge
<select name="tripId" id="tripId"
  x-model="selectedTripId"
  x-on:change="selectTrip($event.target.value)"
  class="h-10 w-full rounded-radius border border-neutral-300 bg-surface px-4 text-sm text-on-surface-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary">
  <option value="">-- Choisir un voyage --</option>
  @each(trip in trips)
    <option value="{{ trip.id }}">
      {{ trip.route.departureCity.name }} → {{ trip.route.arrivalCity.name }} —
      {{ trip.departureTime.toFormat('dd/MM/yyyy HH:mm') }} —
      {{ seatCounts[trip.id] }} places disponibles
    </option>
  @end
</select>
```

**Add seat counter below the select** (inside the trip section, after the select's parent div):

```edge
<p x-show="availableSeats !== null" x-transition
  class="mt-2 text-sm font-semibold"
  :class="availableSeats <= 0 ? 'text-red-600' : 'text-on-surface'"
  x-text="availableSeats <= 0 ? 'Plus de places disponibles' : 'Places restantes : ' + availableSeats"
></p>
```

**Disable the submit button** when seats are exhausted:

```edge
<button type="submit"
  :disabled="seatsExhausted"
  :class="seatsExhausted ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-secondary'"
  class="inline-flex items-center gap-2 rounded-radius px-6 py-2.5 text-sm font-medium text-on-primary transition-colors">
  @svg('tabler:check', { class: 'size-4' })
  <span>Créer la réservation</span>
</button>
```

- [ ] **Step 2: Verify in browser**

Navigate to Dashboard > Nouvelle réservation. Verify:
- Selecting a trip shows the seat counter
- Changing trip switches the counter
- Counter updates in real-time when another booking is made
- Submit button disables when seats reach 0

- [ ] **Step 3: Commit**

```bash
git add resources/views/pages/dashboard/bookings/create.edge
git commit -m "feat: add real-time seat counter to dashboard booking creation"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Full flow test**

Run:
```bash
node ace serve --hmr
```

Open two browser windows side by side. In both, navigate to the same trip's booking flow.

Test scenarios:
1. **Window A**: Start a booking, go to passengers page. **Window B**: Complete a booking on the same trip. Verify Window A's counter decreases.
2. **Dashboard**: Create a booking via dashboard. Verify the public booking counter updates.
3. **Cancellation**: Cancel a booking from the dashboard. Verify the counter increases on any open public booking page.
4. **Zero seats**: Book all remaining seats. Verify the counter shows "Plus de places disponibles" and buttons are disabled on other windows.
5. **Passenger limit**: On passengers page, verify the "Ajouter un passager" button disables when passenger count equals available seats.

- [ ] **Step 2: Verify no console errors**

Check the browser developer console for any JavaScript errors during the above tests.

- [ ] **Step 3: Final commit if any fixes were needed**

If any fixes were made during testing, commit them:

```bash
git add -A
git commit -m "fix: address issues found during e2e seat availability testing"
```
