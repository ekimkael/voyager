# EPIC 4 — Reservations & Billetterie (M04)

Design spec for implementing the booking and ticketing system, covering the public client portal and the back-office agent interface.

## Context

The Voyager application is a multi-tenant AdonisJS 7 transport management system (PostgreSQL, Edge.js, Tailwind CSS, Alpine.js). EPICs 1-3 are implemented (trips, buses, routes, franchises, employees). EPIC 4 adds the reservation and ticketing layer on top of existing trip management.

**Production environment**: Shared hosting with Phusion Passenger — no background workers, no WebSockets. All operations must be synchronous.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Client auth | No account — passenger info entered per booking | Simpler UX, security approach TBD for history |
| Booking verification | Customer phone + passenger code | Lightweight, no login required |
| Seat selection | Auto-assigned (next available) | Simplifies UX and avoids seat map complexity |
| Payment | Stub — agent marks as paid, real payment in EPIC 5 | Decouples EPIC 4 from payment integrations |
| PDF generation | pdfkit + qrcode, synchronous, streamed | Compatible with Phusion Passenger (no puppeteer) |
| Email sending | Stubbed — download only for now | Email integration deferred |
| Boarding validation | Manual code entry (no camera scan) | Simpler, works on any device |
| Client history | Deferred | Security approach TBD |

## Data Model

### Table `customers`

The buyer — identified by phone number, reusable across bookings within a tenant.

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `tenant_id` | UUID | FK → tenants, NOT NULL | Multi-tenant scoping |
| `first_name` | VARCHAR(80) | NOT NULL | |
| `last_name` | VARCHAR(80) | NOT NULL | |
| `phone` | VARCHAR(20) | NOT NULL | Primary identifier |
| `email` | VARCHAR(150) | NULL | Optional |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

Indexes: UNIQUE ON `(tenant_id, phone)`

### Table `bookings`

The reservation — links a customer to a trip. Created at the start of the multi-step flow with status `pending`, finalized after payment.

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `tenant_id` | UUID | FK → tenants, NOT NULL | |
| `trip_id` | UUID | FK → trips, NOT NULL | |
| `customer_id` | UUID | FK → customers, NULL | Set at step 2 (customer) |
| `agent_id` | UUID | FK → users, NULL | NULL = online, NOT NULL = counter |
| `franchise_id` | UUID | FK → franchises, NULL | Agency where booking was made |
| `total_amount` | DECIMAL(10,2) | NOT NULL, DEFAULT 0, CHECK >= 0 | Total price |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | `pending` \| `confirmed` \| `cancelled` |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

Indexes: ON `(trip_id)`, ON `(customer_id)`

### Table `passengers`

The travelers — one per seat. Each passenger has their own code and QR code for individual ticketing and boarding validation.

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `booking_id` | UUID | FK → bookings, NOT NULL | |
| `first_name` | VARCHAR(80) | NOT NULL | |
| `last_name` | VARCHAR(80) | NOT NULL | |
| `phone` | VARCHAR(20) | NULL | Optional |
| `seat_number` | INTEGER | NOT NULL | Auto-assigned (1 to bus capacity) |
| `code` | VARCHAR(6) | NOT NULL, UNIQUE | Alphanumeric code (e.g., "A7X3B2") |
| `qr_code` | UUID | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | QR Code content |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | `pending` \| `boarded` |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

Indexes: UNIQUE ON `(qr_code)`, UNIQUE ON `(code)`

Anti-double-booking: Enforced transactionally at the application level — no two passengers (from bookings with status `pending` or `confirmed`) can have the same `seat_number` for the same `trip_id`. Verified via `SELECT ... FOR UPDATE` within the seat allocation transaction.

### Table `payments` (stub for EPIC 5)

One-to-one with bookings. For EPIC 4, created automatically with status `success` and method `cash` when an agent confirms a booking. Will be extended in EPIC 5 for real payment processing.

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | |
| `booking_id` | UUID | FK → bookings, NOT NULL, UNIQUE | 1:1 relation |
| `amount` | DECIMAL(10,2) | NOT NULL, CHECK > 0 | |
| `payment_method` | ENUM | NOT NULL | `cash` \| `mobile_money` \| `card` |
| `operator` | VARCHAR(50) | NULL | MTN, Orange, Visa... |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | `pending` \| `success` \| `failed` \| `refunded` |
| `external_reference` | VARCHAR(200) | NULL, UNIQUE | External transaction ref |
| `paid_at` | TIMESTAMP | NULL | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

Indexes: UNIQUE ON `(booking_id)`, ON `(status)` WHERE status = 'pending'

### Relations

```
customers 1 → N bookings
trips     1 → N bookings
bookings  1 → N passengers
bookings  1 → 1 payments
users     1 → N bookings (as agent)
franchises 1 → N bookings
```

## Routing

### Public — Client Portal

| Method | URL | Controller | Description |
|--------|-----|------------|-------------|
| GET | `/trips` | SearchController.index | Search trips (from, to, date) |
| GET | `/trips/:id` | SearchController.show | Trip details + "Book" button |
| POST | `/trips/:id/book` | BookingsController.initiate | Create pending booking → redirect |
| GET | `/bookings/:id/passengers` | BookingsController.passengers | Step 1: passenger form |
| POST | `/bookings/:id/passengers` | BookingsController.storePassengers | Save passengers → redirect |
| GET | `/bookings/:id/customer` | BookingsController.customer | Step 2: customer form |
| POST | `/bookings/:id/customer` | BookingsController.storeCustomer | Save/find customer → redirect |
| GET | `/bookings/:id/summary` | BookingsController.summary | Step 3: recap |
| POST | `/bookings/:id/summary` | BookingsController.confirm | Confirm → redirect to payment |
| GET | `/bookings/:id/payment` | BookingsController.payment | Step 4: payment simulation |
| POST | `/bookings/:id/payment` | BookingsController.processPayment | Process → redirect |
| GET | `/bookings/:id/completed` | BookingsController.completed | Success + download tickets |
| GET | `/bookings/:id/failed` | BookingsController.failed | Failure + retry link |
| GET | `/bookings/verify` | BookingsController.verify | Verification form |
| POST | `/bookings/verify` | BookingsController.verifySubmit | Phone + code → passenger details |
| GET | `/bookings/:bookingId/passengers/:passengerId/ticket` | TicketsController.download | Download PDF ticket |

### Back-office — Dashboard

| Method | URL | Controller | Description |
|--------|-----|------------|-------------|
| GET | `/dashboard/bookings` | Dashboard/BookingsController.index | List bookings (filters) |
| GET | `/dashboard/bookings/create` | Dashboard/BookingsController.create | Agent booking form |
| POST | `/dashboard/bookings` | Dashboard/BookingsController.store | Create full booking (one-step for agent) |
| GET | `/dashboard/bookings/:id` | Dashboard/BookingsController.show | Booking details |
| GET | `/dashboard/bookings/:id/edit` | Dashboard/BookingsController.edit | Edit booking |
| PUT | `/dashboard/bookings/:id` | Dashboard/BookingsController.update | Update booking |
| DELETE | `/dashboard/bookings/:id` | Dashboard/BookingsController.destroy | Cancel booking |
| GET | `/dashboard/bookings/:id/passengers/:passengerId/ticket` | Dashboard/TicketsController.download | Download ticket (agent) |
| GET | `/dashboard/boarding` | Dashboard/BoardingController.index | Boarding form |
| POST | `/dashboard/boarding` | Dashboard/BoardingController.validate | Validate passenger code |

## Controllers

### SearchController

Public, no auth. Handles trip search and display.

- `index`: Accepts query params `from`, `to`, `date`. Queries trips with status `scheduled`, departure date matching, joined with route + bus. Calculates remaining seats (bus capacity minus confirmed/pending passengers). Returns search form + results.
- `show`: Loads trip with route, bus, departure/arrival cities. Shows remaining seat count. "Book" button.

### BookingsController (public flow)

No auth. Multi-step booking flow. The booking UUID is stored in session to prevent unauthorized access.

- `initiate`: Creates a `pending` booking for the trip (no customer yet, no passengers). Stores booking ID in session. Redirects to passengers step.
- `passengers` / `storePassengers`: Form for N passengers (name, phone optional). On submit, allocates seats transactionally via SeatAllocator service and creates passenger records. Redirects to customer step.
- `customer` / `storeCustomer`: Form for buyer info (name, phone, email optional). On submit, finds existing customer by `(tenant_id, phone)` or creates new. Sets `customer_id` on booking. Computes `total_amount` (passengers count * trip price). Redirects to summary.
- `summary` / `confirm`: Displays full recap (trip, passengers with seats, customer, total). On confirm, redirects to payment.
- `payment` / `processPayment`: Simulated payment page. On submit, creates payment record (status: `success`, method: `cash`), sets booking status to `confirmed`. Redirects to completed or failed.
- `completed`: Shows success message, lists passengers with download links for individual PDF tickets.
- `failed`: Shows failure message with retry link back to payment step.
- `verify` / `verifySubmit`: Public form — customer enters phone + passenger code. On match, shows passenger details + ticket download link.

### Dashboard/BookingsController

Auth required. Permission-gated. Agent creates bookings in a single step.

- `index`: Lists bookings scoped to agent's franchise. Filters: date, trip, status, passenger code. Pagination.
- `create` / `store`: Single-form booking — agent enters trip, customer info, passenger(s) info. Creates booking + customer + passengers + payment in one transaction. Status immediately `confirmed`.
- `show`: Booking details with passengers, customer, payment status, ticket download links.
- `edit` / `update`: Modify passenger info. Cancel booking (status → `cancelled`).
- `destroy`: Soft cancel — sets status to `cancelled`, frees seats.

### Dashboard/BoardingController

Auth required. Permission `boarding:validate`.

- `index`: Form with a single input field for passenger code.
- `validate`: Looks up passenger by code, verifies booking is `confirmed`, trip is `scheduled` or `in_progress`. Sets passenger status to `boarded`. Displays passenger name, trip, seat number as confirmation.

### TicketsController

Generates PDF tickets on-the-fly.

- `download`: Loads passenger with booking → trip → route → cities → tenant. Generates PDF using `ticket_generator` service. Streams response with `Content-Type: application/pdf`.
- Public route: validates booking ID is in session (client flow) or phone + code match (verify flow).
- Dashboard route: validates auth + permission.

## Services

### SeatAllocator

Handles transactional seat assignment.

```
Input: tripId, passengerCount
Output: number[] (assigned seat numbers)

1. BEGIN TRANSACTION
2. SELECT seat_number FROM passengers
   JOIN bookings ON bookings.id = passengers.booking_id
   WHERE bookings.trip_id = :tripId
   AND bookings.status IN ('pending', 'confirmed')
   FOR UPDATE
3. Get bus capacity from trip → bus
4. Compute available seats (1..capacity minus taken)
5. If available < passengerCount → ROLLBACK, throw InsufficientSeatsError
6. Take first N available seats
7. COMMIT
8. Return assigned seats
```

### TicketGenerator

Generates a single-page PDF ticket for a passenger.

```
Input: passenger (with booking → trip → route → cities, tenant)
Output: Buffer (PDF)

1. Create PDFDocument (pdfkit)
2. Add company header (tenant name)
3. Add trip info (route, date, time, class)
4. Add passenger info (name, seat number)
5. Add code: passenger.code
6. Generate QR code image from passenger.qr_code (qrcode lib → PNG buffer)
7. Embed QR code image
8. Add amount
9. Return PDF buffer
```

## RBAC Changes

### New permissions

| Resource | Action | Description |
|----------|--------|-------------|
| `booking` | `create` | Create bookings |
| `booking` | `read` | View bookings list and details |
| `booking` | `update` | Modify/cancel bookings |
| `booking` | `delete` | Cancel bookings |
| `boarding` | `validate` | Validate passenger boarding |

### Role assignments

| Role | Permissions |
|------|------------|
| Admin | booking:create, booking:read, booking:update, booking:delete, boarding:validate |
| Dispatcher | booking:create, booking:read, booking:update |
| Agent (new scope) | booking:create, booking:read, booking:update (franchise-scoped) |
| Chauffeur | boarding:validate (own trips only) |

## Views

### Public (no auth)

| File | Route | Description |
|------|-------|-------------|
| `pages/trips/search.edge` | GET /trips | Search form + results list |
| `pages/trips/show.edge` | GET /trips/:id | Trip detail + book button |
| `pages/bookings/passengers.edge` | GET /bookings/:id/passengers | Step 1: passenger form (dynamic, add/remove) |
| `pages/bookings/customer.edge` | GET /bookings/:id/customer | Step 2: customer form |
| `pages/bookings/summary.edge` | GET /bookings/:id/summary | Step 3: recap before payment |
| `pages/bookings/payment.edge` | GET /bookings/:id/payment | Step 4: payment simulation |
| `pages/bookings/completed.edge` | GET /bookings/:id/completed | Success + ticket downloads |
| `pages/bookings/failed.edge` | GET /bookings/:id/failed | Failure + retry |
| `pages/bookings/verify.edge` | GET /bookings/verify | Verification form + result |

### Back-office (auth)

| File | Route | Description |
|------|-------|-------------|
| `pages/dashboard/bookings/index.edge` | GET /dashboard/bookings | Booking list with filters |
| `pages/dashboard/bookings/create.edge` | GET /dashboard/bookings/create | Agent single-step form |
| `pages/dashboard/bookings/show.edge` | GET /dashboard/bookings/:id | Booking detail |
| `pages/dashboard/bookings/edit.edge` | GET /dashboard/bookings/:id/edit | Edit booking |
| `pages/dashboard/boarding/index.edge` | GET /dashboard/boarding | Boarding validation form |

## File Structure

```
app/
├── controllers/
│   ├── search_controller.ts              # Public trip search
│   ├── bookings_controller.ts            # Public multi-step booking flow
│   ├── tickets_controller.ts             # Public PDF ticket generation
│   └── dashboard/
│       ├── bookings_controller.ts        # Agent booking management
│       ├── tickets_controller.ts         # Agent PDF ticket download
│       └── boarding_controller.ts        # Boarding validation
├── models/
│   ├── customer.ts
│   ├── booking.ts
│   └── passenger.ts
├── validators/
│   ├── booking.ts                        # Validators for all booking steps
│   └── boarding.ts                       # Boarding validation
├── services/
│   ├── seat_allocator.ts                 # Transactional seat assignment
│   └── ticket_generator.ts              # PDF + QR code generation

database/
├── migrations/
│   ├── xxx_create_customers_table.ts
│   ├── xxx_create_bookings_table.ts
│   ├── xxx_create_passengers_table.ts
│   └── xxx_create_payments_table.ts

resources/views/pages/
├── trips/
│   ├── search.edge
│   └── show.edge
├── bookings/
│   ├── passengers.edge
│   ├── customer.edge
│   ├── summary.edge
│   ├── payment.edge
│   ├── completed.edge
│   ├── failed.edge
│   └── verify.edge
└── dashboard/
    ├── bookings/
    │   ├── index.edge
    │   ├── create.edge
    │   ├── show.edge
    │   └── edit.edge
    └── boarding/
        └── index.edge

start/routes/
├── search.ts                             # Public search routes
├── bookings.ts                           # Public booking flow routes
└── dashboard/
    ├── bookings.ts                       # Agent booking routes
    └── boarding.ts                       # Boarding routes

config/
└── rbac.ts                               # Updated with booking + boarding permissions
```

## Security

- **Booking flow protection**: Booking UUID stored in session. Each step verifies the session owns the booking. UUID v4 is non-guessable.
- **Passenger code**: 6-char alphanumeric, generated server-side with collision check.
- **QR code**: UUID v4, non-predictable, used only for boarding validation.
- **Anti-double-booking**: Transactional seat allocation with `SELECT ... FOR UPDATE`.
- **Agent scoping**: Dashboard bookings scoped to agent's franchise.
- **Rate limiting**: Consider adding rate limiting on public booking creation to prevent abuse (can be done at Phusion Passenger / reverse proxy level).

## Dependencies

New npm packages:
- `pdfkit` — PDF generation
- `qrcode` — QR code generation as PNG buffer

No heavy dependencies (no puppeteer, no headless browser). Both are lightweight and synchronous, compatible with Phusion Passenger.
