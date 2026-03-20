# EPIC 4 — Reservations & Billetterie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add booking and ticketing to the transport app — public multi-step client portal (search, book, pay, download PDF ticket) and back-office agent/boarding interfaces.

**Architecture:** Four new tables (`customers`, `bookings`, `passengers`, `payments`). Public routes prefixed with `/:tenantSlug` for tenant resolution. Multi-step booking flow (passengers → customer → summary → payment → completed). SeatAllocator service handles atomic seat assignment. TicketGenerator produces PDF tickets with QR codes via pdfkit. Dashboard controllers for agent booking management and boarding validation.

**Tech Stack:** AdonisJS v7, Lucid ORM, VineJS, Edge.js, Tailwind CSS, Alpine.js, pdfkit, qrcode

**Spec:** `docs/superpowers/specs/2026-03-20-epic4-reservations-billetterie-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `database/migrations/xxx_create_customers_table.ts` | Create | Customers table |
| `database/migrations/xxx_create_bookings_table.ts` | Create | Bookings table with status enum |
| `database/migrations/xxx_create_passengers_table.ts` | Create | Passengers table with code, qr_code, seat |
| `database/migrations/xxx_create_payments_table.ts` | Create | Payments stub table |
| `app/models/customer.ts` | Create | Customer model |
| `app/models/booking.ts` | Create | Booking model with relations |
| `app/models/passenger.ts` | Create | Passenger model |
| `app/models/payment.ts` | Create | Payment model |
| `app/models/trip.ts` | Modify | Add bookings hasMany relation |
| `config/rbac.ts` | Modify | Add booking + boarding permissions |
| `database/seeders/permissions_seeder.ts` | Modify | Seed new permissions to roles |
| `app/middleware/tenant_middleware.ts` | Modify | Support slug-based resolution for public routes |
| `app/services/seat_allocator.ts` | Create | Atomic seat assignment + passenger creation |
| `app/services/ticket_generator.ts` | Create | PDF generation with QR code |
| `app/validators/booking.ts` | Create | Validators for all booking steps |
| `app/validators/boarding.ts` | Create | Boarding validation |
| `app/controllers/search_controller.ts` | Create | Public trip search |
| `app/controllers/bookings_controller.ts` | Create | Public multi-step booking flow |
| `app/controllers/tickets_controller.ts` | Create | Public PDF ticket download |
| `app/controllers/dashboard/bookings_controller.ts` | Create | Agent booking CRUD |
| `app/controllers/dashboard/tickets_controller.ts` | Create | Agent ticket download |
| `app/controllers/dashboard/boarding_controller.ts` | Create | Boarding validation |
| `start/routes/search.ts` | Create | Public search routes |
| `start/routes/bookings.ts` | Create | Public booking flow routes |
| `start/routes/dashboard/bookings.ts` | Create | Dashboard booking routes |
| `start/routes/dashboard/boarding.ts` | Create | Dashboard boarding routes |
| `start/routes.ts` | Modify | Import new route files |
| `resources/views/components/layout/public.edge` | Create | Public layout (no sidebar) |
| `resources/views/pages/trips/search.edge` | Create | Trip search form + results |
| `resources/views/pages/trips/show.edge` | Create | Trip detail + book button |
| `resources/views/pages/bookings/passengers.edge` | Create | Step 1: passenger form |
| `resources/views/pages/bookings/customer.edge` | Create | Step 2: customer form |
| `resources/views/pages/bookings/summary.edge` | Create | Step 3: recap |
| `resources/views/pages/bookings/payment.edge` | Create | Step 4: payment simulation |
| `resources/views/pages/bookings/completed.edge` | Create | Success + tickets |
| `resources/views/pages/bookings/failed.edge` | Create | Failure + retry |
| `resources/views/pages/bookings/verify.edge` | Create | Verification form |
| `resources/views/pages/dashboard/bookings/index.edge` | Create | Booking list |
| `resources/views/pages/dashboard/bookings/create.edge` | Create | Agent booking form |
| `resources/views/pages/dashboard/bookings/show.edge` | Create | Booking detail |
| `resources/views/pages/dashboard/bookings/edit.edge` | Create | Edit booking |
| `resources/views/pages/dashboard/boarding/index.edge` | Create | Boarding form |
| `resources/views/components/layout/dashboard.edge` | Modify | Add Réservations + Embarquement sidebar links |

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install pdfkit and qrcode**

```bash
npm install pdfkit qrcode
npm install --save-dev @types/pdfkit @types/qrcode
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('pdfkit'); require('qrcode'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add pdfkit and qrcode dependencies for ticket generation"
```

---

### Task 2: Create database migrations

**Files:**
- Create: `database/migrations/xxx_create_customers_table.ts`
- Create: `database/migrations/xxx_create_bookings_table.ts`
- Create: `database/migrations/xxx_create_passengers_table.ts`
- Create: `database/migrations/xxx_create_payments_table.ts`

- [ ] **Step 1: Generate migrations**

```bash
node ace make:migration create_customers_table
node ace make:migration create_bookings_table
node ace make:migration create_passengers_table
node ace make:migration create_payments_table
```

- [ ] **Step 2: Write the customers migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'customers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT')
      table.string('first_name', 80).notNullable()
      table.string('last_name', 80).notNullable()
      table.string('phone', 20).notNullable()
      table.string('email', 150).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['tenant_id', 'phone'])
      table.index(['tenant_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

- [ ] **Step 3: Write the bookings migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bookings'

  async up() {
    this.schema.raw("CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled')")

    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT')
      table.uuid('trip_id').notNullable().references('id').inTable('trips').onDelete('RESTRICT')
      table.uuid('customer_id').nullable().references('id').inTable('customers').onDelete('RESTRICT')
      table.uuid('agent_id').nullable().references('id').inTable('users').onDelete('RESTRICT')
      table.uuid('franchise_id').nullable().references('id').inTable('franchises').onDelete('RESTRICT')
      table.decimal('total_amount', 10, 2).notNullable().defaultTo(0)
      table
        .enum('status', ['pending', 'confirmed', 'cancelled'], {
          useNative: true,
          existingType: true,
          enumName: 'booking_status',
        })
        .defaultTo('pending')
        .notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['trip_id'])
      table.index(['customer_id'])
      table.index(['tenant_id'])
      table.index(['status'])
      table.check('?? >= 0', ['total_amount'], 'chk_bookings_total_amount')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "booking_status"')
  }
}
```

- [ ] **Step 4: Write the passengers migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'passengers'

  async up() {
    this.schema.raw("CREATE TYPE passenger_status AS ENUM ('pending', 'boarded')")

    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('CASCADE')
      table.string('first_name', 80).notNullable()
      table.string('last_name', 80).notNullable()
      table.string('phone', 20).nullable()
      table.integer('seat_number').notNullable()
      table.string('code', 6).notNullable().unique()
      table.uuid('qr_code').notNullable().unique().defaultTo(this.raw('gen_random_uuid()'))
      table
        .enum('status', ['pending', 'boarded'], {
          useNative: true,
          existingType: true,
          enumName: 'passenger_status',
        })
        .defaultTo('pending')
        .notNullable()
      table.timestamp('boarded_at').nullable()
      table.timestamp('created_at').notNullable()

      table.index(['booking_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "passenger_status"')
  }
}
```

- [ ] **Step 5: Write the payments migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.raw("CREATE TYPE payment_method AS ENUM ('cash', 'mobile_money', 'card')")
    this.schema.raw("CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded')")

    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('booking_id').notNullable().unique().references('id').inTable('bookings').onDelete('CASCADE')
      table.decimal('amount', 10, 2).notNullable()
      table
        .enum('payment_method', ['cash', 'mobile_money', 'card'], {
          useNative: true,
          existingType: true,
          enumName: 'payment_method',
        })
        .notNullable()
      table.string('operator', 50).nullable()
      table
        .enum('status', ['pending', 'success', 'failed', 'refunded'], {
          useNative: true,
          existingType: true,
          enumName: 'payment_status',
        })
        .defaultTo('pending')
        .notNullable()
      table.string('external_reference', 200).nullable().unique()
      table.timestamp('paid_at').nullable()
      table.timestamp('created_at').notNullable()

      table.check('?? > 0', ['amount'], 'chk_payments_amount')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "payment_method"')
    this.schema.raw('DROP TYPE IF EXISTS "payment_status"')
  }
}
```

- [ ] **Step 6: Run migrations**

```bash
node ace migration:run
```

Expected: 4 migrations applied successfully.

- [ ] **Step 7: Commit**

```bash
git add database/migrations/
git commit -m "feat: add customers, bookings, passengers, payments migrations"
```

---

### Task 3: Create models

**Files:**
- Create: `app/models/customer.ts`
- Create: `app/models/booking.ts`
- Create: `app/models/passenger.ts`
- Create: `app/models/payment.ts`
- Modify: `app/models/trip.ts`

- [ ] **Step 1: Create Customer model**

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenant'
import Booking from '#models/booking'

export default class Customer extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare phone: string

  @column()
  declare email: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @hasMany(() => Booking)
  declare bookings: HasMany<typeof Booking>

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}
```

- [ ] **Step 2: Create Booking model**

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenant'
import Trip from '#models/trip'
import Customer from '#models/customer'
import User from '#models/user'
import Franchise from '#models/franchise'
import Passenger from '#models/passenger'
import Payment from '#models/payment'

export default class Booking extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare tripId: string

  @column()
  declare customerId: string | null

  @column()
  declare agentId: string | null

  @column()
  declare franchiseId: string | null

  @column()
  declare totalAmount: number

  @column()
  declare status: 'pending' | 'confirmed' | 'cancelled'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => User, { foreignKey: 'agentId' })
  declare agent: BelongsTo<typeof User>

  @belongsTo(() => Franchise)
  declare franchise: BelongsTo<typeof Franchise>

  @hasMany(() => Passenger)
  declare passengers: HasMany<typeof Passenger>

  @hasOne(() => Payment)
  declare payment: HasOne<typeof Payment>

  get isExpired() {
    if (this.status !== 'pending') return false
    return this.updatedAt.diffNow('minutes').minutes < -15
  }
}
```

- [ ] **Step 3: Create Passenger model**

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'

export default class Passenger extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare bookingId: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare phone: string | null

  @column()
  declare seatNumber: number

  @column()
  declare code: string

  @column()
  declare qrCode: string

  @column()
  declare status: 'pending' | 'boarded'

  @column.dateTime()
  declare boardedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}
```

- [ ] **Step 4: Create Payment model**

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'

export default class Payment extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare bookingId: string

  @column()
  declare amount: number

  @column()
  declare paymentMethod: 'cash' | 'mobile_money' | 'card'

  @column()
  declare operator: string | null

  @column()
  declare status: 'pending' | 'success' | 'failed' | 'refunded'

  @column()
  declare externalReference: string | null

  @column.dateTime()
  declare paidAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>
}
```

- [ ] **Step 5: Add bookings relation to Trip model**

In `app/models/trip.ts`, add the import and relation:

```typescript
import Booking from '#models/booking'
// ... (add to existing imports of HasMany type)

// Add inside the class:
@hasMany(() => Booking)
declare bookings: HasMany<typeof Booking>
```

- [ ] **Step 6: Verify models compile**

```bash
node ace generate:manifest
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add app/models/customer.ts app/models/booking.ts app/models/passenger.ts app/models/payment.ts app/models/trip.ts
git commit -m "feat: add Customer, Booking, Passenger, Payment models"
```

---

### Task 4: Update RBAC config and permissions seeder

**Files:**
- Modify: `config/rbac.ts`
- Modify: `database/seeders/permissions_seeder.ts`

- [ ] **Step 1: Add booking and boarding permissions to rbac.ts**

Add to the `permissions` array in `config/rbac.ts`:

```typescript
// Booking permissions
{ resource: 'booking', action: 'create', description: 'Create bookings' },
{ resource: 'booking', action: 'read', description: 'View bookings' },
{ resource: 'booking', action: 'update', description: 'Modify booking passenger info' },
{ resource: 'booking', action: 'delete', description: 'Cancel bookings', isSensitive: true },

// Boarding permissions
{ resource: 'boarding', action: 'validate', description: 'Validate passenger boarding' },
```

- [ ] **Step 2: Update role permissions in rbac.ts**

Add to the `systemRoles` in `config/rbac.ts`:

- **Admin**: already gets `'*'` (all permissions) — no change needed
- **Dispatcher**: add `'booking:create', 'booking:read', 'booking:update'`
- **Chauffeur**: add `'boarding:validate'`

- [ ] **Step 3: Run the seeder**

```bash
node ace db:seed --files=database/seeders/permissions_seeder.ts
```

Expected: Seeder completes without errors.

- [ ] **Step 4: Commit**

```bash
git add config/rbac.ts database/seeders/permissions_seeder.ts
git commit -m "feat: add booking and boarding RBAC permissions"
```

---

### Task 5: Adapt TenantMiddleware for public routes

**Files:**
- Modify: `app/middleware/tenant_middleware.ts`

- [ ] **Step 1: Update TenantMiddleware to support slug resolution**

The middleware currently only resolves tenant from `ctx.auth.user`. Adapt it to also check for `params.tenantSlug` when no auth user is present:

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'
import Tenant from '#models/tenant'

export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    let tenant: Tenant | null = null

    if (user) {
      tenant = await Tenant.findOrFail(user.tenantId)
    } else if (ctx.params.tenantSlug) {
      tenant = await Tenant.findByOrFail('slug', ctx.params.tenantSlug)
    }

    if (tenant) {
      ctx.tenant = tenant
      await db.rawQuery(`SET LOCAL app.current_tenant_id = '${tenant.id}'`)
    }

    return next()
  }
}
```

- [ ] **Step 2: Verify the middleware still works for authenticated routes**

```bash
node ace serve --hmr
```

Log in and navigate existing dashboard pages. Ensure they still work correctly.

- [ ] **Step 3: Commit**

```bash
git add app/middleware/tenant_middleware.ts
git commit -m "feat: support tenant slug resolution in TenantMiddleware for public routes"
```

---

### Task 6: Create validators

**Files:**
- Create: `app/validators/booking.ts`
- Create: `app/validators/boarding.ts`

- [ ] **Step 1: Create booking validators**

```typescript
import vine from '@vinejs/vine'

const passengerSchema = vine.object({
  firstName: vine.string().trim().minLength(2).maxLength(80),
  lastName: vine.string().trim().minLength(2).maxLength(80),
  phone: vine.string().trim().maxLength(20).optional(),
})

export const storePassengersValidator = vine.compile(
  vine.object({
    passengers: vine.array(passengerSchema).minLength(1),
  })
)

export const storeCustomerValidator = vine.compile(
  vine.object({
    firstName: vine.string().trim().minLength(2).maxLength(80),
    lastName: vine.string().trim().minLength(2).maxLength(80),
    phone: vine.string().trim().maxLength(20),
    email: vine.string().trim().email().maxLength(150).optional(),
  })
)

export const processPaymentValidator = vine.compile(
  vine.object({
    paymentMethod: vine.enum(['cash', 'mobile_money', 'card'] as const),
    operator: vine.string().trim().maxLength(50).optional(),
  })
)

export const agentBookingValidator = vine.compile(
  vine.object({
    tripId: vine.string().uuid(),
    customer: vine.object({
      firstName: vine.string().trim().minLength(2).maxLength(80),
      lastName: vine.string().trim().minLength(2).maxLength(80),
      phone: vine.string().trim().maxLength(20),
      email: vine.string().trim().email().maxLength(150).optional(),
    }),
    passengers: vine.array(passengerSchema).minLength(1),
  })
)

export const updateBookingValidator = vine.compile(
  vine.object({
    passengers: vine.array(
      vine.object({
        id: vine.string().uuid(),
        firstName: vine.string().trim().minLength(2).maxLength(80),
        lastName: vine.string().trim().minLength(2).maxLength(80),
        phone: vine.string().trim().maxLength(20).optional(),
      })
    ).minLength(1),
  })
)

export const verifyBookingValidator = vine.compile(
  vine.object({
    phone: vine.string().trim().maxLength(20),
    code: vine.string().trim().maxLength(6),
  })
)
```

- [ ] **Step 2: Create boarding validator**

```typescript
import vine from '@vinejs/vine'

export const validateBoardingValidator = vine.compile(
  vine.object({
    code: vine.string().trim().maxLength(36),
  })
)
```

The `code` field accepts either a 6-char passenger code or a UUID (qr_code), hence max length 36.

- [ ] **Step 3: Commit**

```bash
git add app/validators/booking.ts app/validators/boarding.ts
git commit -m "feat: add booking and boarding validators"
```

---

### Task 7: Create SeatAllocator service

**Files:**
- Create: `app/services/seat_allocator.ts`

- [ ] **Step 1: Create the SeatAllocator service**

```typescript
import Passenger from '#models/passenger'
import Booking from '#models/booking'
import Trip from '#models/trip'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

interface PassengerData {
  firstName: string
  lastName: string
  phone?: string
}

export class InsufficientSeatsError extends Error {
  constructor(available: number, requested: number) {
    super(`Not enough seats: ${available} available, ${requested} requested`)
    this.name = 'InsufficientSeatsError'
  }
}

export default class SeatAllocator {
  async allocate(
    tripId: string,
    passengerDataList: PassengerData[],
    bookingId: string,
    trx: TransactionClientContract
  ): Promise<Passenger[]> {
    // 1. Get trip with bus to know capacity
    const trip = await Trip.query({ client: trx })
      .where('id', tripId)
      .preload('bus')
      .firstOrFail()

    const capacity = trip.bus.capacity

    // 2. Lock and get taken seats (only from active bookings)
    const takenRows = await db
      .query()
      .useTransaction(trx)
      .from('passengers')
      .join('bookings', 'bookings.id', 'passengers.booking_id')
      .where('bookings.trip_id', tripId)
      .where((query) => {
        query
          .where('bookings.status', 'confirmed')
          .orWhere((sub) => {
            sub
              .where('bookings.status', 'pending')
              .where('bookings.updated_at', '>', db.raw("NOW() - INTERVAL '15 minutes'"))
          })
      })
      .select('passengers.seat_number')
      .forUpdate()

    const takenSeats = new Set(takenRows.map((r: { seat_number: number }) => r.seat_number))

    // 3. Compute available seats
    const availableSeats: number[] = []
    for (let i = 1; i <= capacity; i++) {
      if (!takenSeats.has(i)) {
        availableSeats.push(i)
      }
    }

    if (availableSeats.length < passengerDataList.length) {
      throw new InsufficientSeatsError(availableSeats.length, passengerDataList.length)
    }

    // 4. Create passengers with assigned seats
    const passengers: Passenger[] = []
    for (let i = 0; i < passengerDataList.length; i++) {
      const data = passengerDataList[i]
      const seatNumber = availableSeats[i]
      const code = await this.generateUniqueCode(trx)

      const passenger = await Passenger.create(
        {
          bookingId,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          seatNumber,
          code,
          status: 'pending',
        },
        { client: trx }
      )

      passengers.push(passenger)
    }

    return passengers
  }

  private async generateUniqueCode(trx: TransactionClientContract): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const maxRetries = 10

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      let code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }

      const existing = await Passenger.query({ client: trx }).where('code', code).first()
      if (!existing) {
        return code
      }
    }

    throw new Error('Failed to generate unique passenger code after max retries')
  }

  async getAvailableSeatCount(tripId: string): Promise<number> {
    const trip = await Trip.query().where('id', tripId).preload('bus').firstOrFail()

    const result = await db
      .query()
      .from('passengers')
      .join('bookings', 'bookings.id', 'passengers.booking_id')
      .where('bookings.trip_id', tripId)
      .where((query) => {
        query
          .where('bookings.status', 'confirmed')
          .orWhere((sub) => {
            sub
              .where('bookings.status', 'pending')
              .where('bookings.updated_at', '>', db.raw("NOW() - INTERVAL '15 minutes'"))
          })
      })
      .count('* as total')

    const taken = Number(result[0].total)
    return trip.bus.capacity - taken
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/services/seat_allocator.ts
git commit -m "feat: add SeatAllocator service with atomic seat assignment"
```

---

### Task 8: Create TicketGenerator service

**Files:**
- Create: `app/services/ticket_generator.ts`

- [ ] **Step 1: Create the TicketGenerator service**

```typescript
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import type Passenger from '#models/passenger'
import type Tenant from '#models/tenant'

interface TicketData {
  tenant: Tenant
  passenger: Passenger
  tripInfo: {
    departureCity: string
    arrivalCity: string
    departureTime: string
    arrivalTime: string
    travelClass: string
    price: number
    busLicensePlate: string
  }
}

export default class TicketGenerator {
  async generate(data: TicketData): Promise<Buffer> {
    const { tenant, passenger, tripInfo } = data

    const qrBuffer = await QRCode.toBuffer(passenger.qrCode, {
      width: 120,
      margin: 1,
    })

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: [226, 500],
        margin: 15,
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Header
      doc.fontSize(14).font('Helvetica-Bold').text(tenant.name, { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(8).font('Helvetica').text('Ticket de transport', { align: 'center' })
      doc.moveDown(0.5)

      // Separator
      doc.moveTo(15, doc.y).lineTo(211, doc.y).stroke()
      doc.moveDown(0.5)

      // Trip info
      doc.fontSize(9).font('Helvetica-Bold')
      doc.text(`${tripInfo.departureCity} → ${tripInfo.arrivalCity}`)
      doc.moveDown(0.3)
      doc.fontSize(8).font('Helvetica')
      doc.text(`Départ: ${tripInfo.departureTime}`)
      doc.text(`Arrivée: ${tripInfo.arrivalTime}`)
      doc.text(`Classe: ${tripInfo.travelClass.toUpperCase()}`)
      doc.text(`Bus: ${tripInfo.busLicensePlate}`)
      doc.moveDown(0.5)

      // Separator
      doc.moveTo(15, doc.y).lineTo(211, doc.y).stroke()
      doc.moveDown(0.5)

      // Passenger info
      doc.fontSize(9).font('Helvetica-Bold')
      doc.text(`Passager: ${passenger.fullName}`)
      doc.fontSize(8).font('Helvetica')
      doc.text(`Siège: ${passenger.seatNumber}`)
      doc.text(`Code: ${passenger.code}`)
      doc.moveDown(0.5)

      // Price
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text(`${tripInfo.price.toLocaleString('fr-FR')} FCFA`, { align: 'center' })
      doc.moveDown(0.5)

      // QR Code
      doc.image(qrBuffer, (226 - 120) / 2, doc.y, { width: 120, height: 120 })
      doc.moveDown(8)

      // Footer
      doc.fontSize(6).font('Helvetica')
      doc.text('Présentez ce ticket à l\'embarquement', { align: 'center' })

      doc.end()
    })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/services/ticket_generator.ts
git commit -m "feat: add TicketGenerator service with PDF and QR code"
```

---

### Task 9: Create SearchController and public search routes

**Files:**
- Create: `app/controllers/search_controller.ts`
- Create: `start/routes/search.ts`
- Create: `resources/views/components/layout/public.edge`
- Create: `resources/views/pages/trips/search.edge`
- Create: `resources/views/pages/trips/show.edge`

- [ ] **Step 1: Create public layout**

Create `resources/views/components/layout/public.edge` — a simpler layout without dashboard sidebar. Use `@layout.base()` as the parent and add a simple header/footer.

```edge
@component()
@set('title', $props.title ?? 'Voyager')

@layout.base()
  <header class="border-b border-surface-alt bg-white">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <a href="/" class="text-lg font-bold text-primary">Voyager</a>
    </div>
  </header>

  <main class="mx-auto max-w-5xl px-4 py-8">
    @if(flashMessages.has('error'))
      <div class="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
        {{ flashMessages.get('error') }}
      </div>
    @end
    @if(flashMessages.has('success'))
      <div class="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600">
        {{ flashMessages.get('success') }}
      </div>
    @end

    {{{ await $slots.main() }}}
  </main>

  <footer class="border-t border-surface-alt bg-white py-4 text-center text-xs text-on-surface/50">
    &copy; {{ new Date().getFullYear() }} Voyager
  </footer>
@end
@end
```

- [ ] **Step 2: Create SearchController**

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import Trip from '#models/trip'
import City from '#models/city'
import SeatAllocator from '#services/seat_allocator'
import { DateTime } from 'luxon'

export default class SearchController {
  private seatAllocator = new SeatAllocator()

  async index({ view, tenant, request }: HttpContext) {
    const { from, to, date } = request.qs()
    const cities = await City.query().orderBy('name')

    let trips: Trip[] = []

    if (from && to && date) {
      trips = await Trip.query()
        .where('tenantId', tenant!.id)
        .where('status', 'scheduled')
        .where('departureTime', '>', DateTime.now().toSQL()!)
        .whereHas('route', (query) => {
          query.where('departureCityId', from).where('arrivalCityId', to)
        })
        .whereBetween('departureTime', [
          `${date} 00:00:00`,
          `${date} 23:59:59`,
        ])
        .preload('route', (query) => {
          query.preload('departureCity').preload('arrivalCity')
        })
        .preload('bus')
        .orderBy('departureTime')
    }

    const tripsWithSeats = await Promise.all(
      trips.map(async (trip) => {
        const available = await this.seatAllocator.getAvailableSeatCount(trip.id)
        return { trip, availableSeats: available }
      })
    )

    return view.render('pages/trips/search', {
      cities,
      trips: tripsWithSeats,
      filters: { from, to, date },
      tenantSlug: tenant!.slug,
    })
  }

  async show({ params, view, tenant }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .where('status', 'scheduled')
      .where('departureTime', '>', DateTime.now().toSQL()!)
      .preload('route', (query) => {
        query.preload('departureCity').preload('arrivalCity')
      })
      .preload('bus')
      .firstOrFail()

    const availableSeats = await this.seatAllocator.getAvailableSeatCount(trip.id)

    return view.render('pages/trips/show', {
      trip,
      availableSeats,
      tenantSlug: tenant!.slug,
    })
  }
}
```

- [ ] **Step 3: Create search routes**

Create `start/routes/search.ts`:

```typescript
import router from '@adonisjs/core/services/router'

const SearchController = () => import('#controllers/search_controller')

router
  .group(() => {
    router.get('/trips', [SearchController, 'index']).as('public.trips.index')
    router.get('/trips/:id', [SearchController, 'show']).as('public.trips.show')
  })
  .prefix(':tenantSlug')
```

- [ ] **Step 4: Create search.edge view**

Create `resources/views/pages/trips/search.edge` with the search form (departure city, arrival city, date selects) and results list showing trip info + available seats + "Réserver" button.

- [ ] **Step 5: Create show.edge view**

Create `resources/views/pages/trips/show.edge` with trip details (route, bus, date/time, class, price, available seats) and a "Réserver" form that POSTs to the initiate endpoint.

- [ ] **Step 6: Import routes in start/routes.ts**

Add `import './routes/search.js'` to `start/routes.ts`.

- [ ] **Step 7: Verify search page loads**

```bash
node ace serve --hmr
```

Navigate to `http://localhost:3333/<tenant-slug>/trips`. Verify the search form renders.

- [ ] **Step 8: Commit**

```bash
git add app/controllers/search_controller.ts start/routes/search.ts start/routes.ts resources/views/components/layout/public.edge resources/views/pages/trips/search.edge resources/views/pages/trips/show.edge
git commit -m "feat: add public trip search with SearchController and views"
```

---

### Task 10: Create BookingsController (public multi-step flow)

**Files:**
- Create: `app/controllers/bookings_controller.ts`
- Create: `start/routes/bookings.ts`

- [ ] **Step 1: Create BookingsController**

Create `app/controllers/bookings_controller.ts` with all multi-step methods:

- `initiate`: Verify trip exists, scheduled, departure > NOW(). Create pending booking with `tenantId` from `tenant!.id`. Store booking ID in session as `bookingId`. Redirect to passengers step.
- `passengers`: Load booking from session, verify ownership + not expired. Load trip for display. Render form.
- `storePassengers`: Validate with `storePassengersValidator`. Use `db.transaction()` wrapping `seatAllocator.allocate()`. Redirect to customer step.
- `customer`: Load booking + passengers. Render customer form.
- `storeCustomer`: Validate with `storeCustomerValidator`. Find or create customer by `(tenantId, phone)`. Set `customerId` on booking. Compute `totalAmount = passengers.length * trip.price`. Redirect to summary.
- `summary`: Load booking with all relations. Render recap.
- `confirm`: Redirect to payment.
- `payment`: Render payment form.
- `processPayment`: Validate with `processPaymentValidator`. Create payment record (status: `success`, paidAt: now). Set booking status to `confirmed`. Redirect to completed.
- `completed`: Load booking + passengers. Render success with ticket download links.
- `failed`: Render failure page with retry link.
- `verify` / `verifySubmit`: Validate with `verifyBookingValidator`. Find passenger by code, join to booking + customer, match phone. Store booking ID in session. Render result.

**Each step must**: check `session.get('bookingId') === params.id`, check booking is not expired (for pending), check trip departure > NOW().

- [ ] **Step 2: Create booking routes**

Create `start/routes/bookings.ts`:

```typescript
import router from '@adonisjs/core/services/router'

const BookingsController = () => import('#controllers/bookings_controller')
const TicketsController = () => import('#controllers/tickets_controller')

router
  .group(() => {
    // Initiate booking
    router.post('/trips/:tripId/book', [BookingsController, 'initiate']).as('public.bookings.initiate')

    // Multi-step flow
    router.get('/bookings/:id/passengers', [BookingsController, 'passengers']).as('public.bookings.passengers')
    router.post('/bookings/:id/passengers', [BookingsController, 'storePassengers']).as('public.bookings.storePassengers')
    router.get('/bookings/:id/customer', [BookingsController, 'customer']).as('public.bookings.customer')
    router.post('/bookings/:id/customer', [BookingsController, 'storeCustomer']).as('public.bookings.storeCustomer')
    router.get('/bookings/:id/summary', [BookingsController, 'summary']).as('public.bookings.summary')
    router.post('/bookings/:id/summary', [BookingsController, 'confirm']).as('public.bookings.confirm')
    router.get('/bookings/:id/payment', [BookingsController, 'payment']).as('public.bookings.payment')
    router.post('/bookings/:id/payment', [BookingsController, 'processPayment']).as('public.bookings.processPayment')
    router.get('/bookings/:id/completed', [BookingsController, 'completed']).as('public.bookings.completed')
    router.get('/bookings/:id/failed', [BookingsController, 'failed']).as('public.bookings.failed')

    // Verify
    router.get('/bookings/verify', [BookingsController, 'verify']).as('public.bookings.verify')
    router.post('/bookings/verify', [BookingsController, 'verifySubmit']).as('public.bookings.verifySubmit')

    // Ticket download
    router.get('/bookings/:bookingId/passengers/:passengerId/ticket', [TicketsController, 'download']).as('public.tickets.download')
  })
  .prefix(':tenantSlug')
```

- [ ] **Step 3: Import routes in start/routes.ts**

Add `import './routes/bookings.js'` to `start/routes.ts`.

- [ ] **Step 4: Commit**

```bash
git add app/controllers/bookings_controller.ts start/routes/bookings.ts start/routes.ts
git commit -m "feat: add public BookingsController with multi-step booking flow"
```

---

### Task 11: Create TicketsController (public)

**Files:**
- Create: `app/controllers/tickets_controller.ts`

- [ ] **Step 1: Create TicketsController**

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import Passenger from '#models/passenger'
import TicketGenerator from '#services/ticket_generator'

export default class TicketsController {
  private ticketGenerator = new TicketGenerator()

  async download({ params, response, session, tenant }: HttpContext) {
    const bookingId = params.bookingId
    const passengerId = params.passengerId

    // Verify session owns this booking
    const sessionBookingIds: string[] = session.get('bookingIds', [])
    if (!sessionBookingIds.includes(bookingId)) {
      return response.unauthorized('Access denied')
    }

    const passenger = await Passenger.query()
      .where('id', passengerId)
      .whereHas('booking', (query) => {
        query.where('id', bookingId).where('tenantId', tenant!.id).where('status', 'confirmed')
      })
      .preload('booking', (query) => {
        query
          .preload('trip', (tripQuery) => {
            tripQuery.preload('route', (routeQuery) => {
              routeQuery.preload('departureCity').preload('arrivalCity')
            })
            tripQuery.preload('bus')
          })
      })
      .firstOrFail()

    const trip = passenger.booking.trip
    const route = trip.route

    const pdfBuffer = await this.ticketGenerator.generate({
      tenant: tenant!,
      passenger,
      tripInfo: {
        departureCity: route.departureCity.name,
        arrivalCity: route.arrivalCity.name,
        departureTime: trip.departureTime.toFormat('dd/MM/yyyy HH:mm'),
        arrivalTime: trip.arrivalTime.toFormat('dd/MM/yyyy HH:mm'),
        travelClass: trip.travelClass,
        price: passenger.booking.totalAmount / (await passenger.booking.related('passengers').query()).length,
        busLicensePlate: trip.bus.licensePlate,
      },
    })

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `attachment; filename="ticket-${passenger.code}.pdf"`)
    return response.send(pdfBuffer)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/controllers/tickets_controller.ts
git commit -m "feat: add public TicketsController for PDF ticket download"
```

---

### Task 12: Create public booking views

**Files:**
- Create: `resources/views/pages/bookings/passengers.edge`
- Create: `resources/views/pages/bookings/customer.edge`
- Create: `resources/views/pages/bookings/summary.edge`
- Create: `resources/views/pages/bookings/payment.edge`
- Create: `resources/views/pages/bookings/completed.edge`
- Create: `resources/views/pages/bookings/failed.edge`
- Create: `resources/views/pages/bookings/verify.edge`

- [ ] **Step 1: Create passengers.edge**

Step 1 view with an Alpine.js-powered dynamic form for adding/removing passengers. Each passenger row has firstName, lastName, phone fields. A "+" button adds rows, "x" removes them. Form POSTs to `storePassengers`.

- [ ] **Step 2: Create customer.edge**

Step 2 view with firstName, lastName, phone (required), email (optional) fields for the buyer. Form POSTs to `storeCustomer`.

- [ ] **Step 3: Create summary.edge**

Step 3 recap showing: trip details (route, date/time, class), list of passengers (name, seat), customer info, total amount. Confirm button POSTs to `confirm`.

- [ ] **Step 4: Create payment.edge**

Step 4 simulated payment. Radio buttons for payment method (cash, mobile money, card). Submit POSTs to `processPayment`.

- [ ] **Step 5: Create completed.edge**

Success page: booking confirmed message, list of passengers with individual "Télécharger ticket" links pointing to the ticket download route.

- [ ] **Step 6: Create failed.edge**

Failure page: error message, "Réessayer" link back to payment step.

- [ ] **Step 7: Create verify.edge**

Verification form: phone + code fields. On successful match, displays passenger details + ticket download link below the form.

- [ ] **Step 8: Test the full public booking flow in browser**

```bash
node ace serve --hmr
```

Navigate through: search → trip details → book → passengers → customer → summary → payment → completed. Verify ticket PDF downloads.

- [ ] **Step 9: Commit**

```bash
git add resources/views/pages/bookings/
git commit -m "feat: add public booking flow views (passengers, customer, summary, payment, completed, failed, verify)"
```

---

### Task 13: Create Dashboard/BookingsController

**Files:**
- Create: `app/controllers/dashboard/bookings_controller.ts`
- Create: `app/controllers/dashboard/tickets_controller.ts`
- Create: `start/routes/dashboard/bookings.ts`

- [ ] **Step 1: Create Dashboard/BookingsController**

Create `app/controllers/dashboard/bookings_controller.ts` with:

- `index`: List bookings scoped by tenant + agent's franchise (if agent). Filters: date range, trip, status, passenger code search. Pagination. Preload trip.route, customer, passengers.
- `create`: Load trips (scheduled, departure > NOW()) and render form.
- `store`: Validate with `agentBookingValidator`. In a single `db.transaction()`: find/create customer, create booking (status: `confirmed`, agentId, franchiseId from auth user), allocate seats via SeatAllocator, create payment (status: `success`, method: `cash`). Redirect to show.
- `show`: Load booking with all relations. Render detail page.
- `edit`: Load booking. Only allow if `confirmed` and `trip.departureTime > NOW()`. Render edit form.
- `update`: Validate with `updateBookingValidator`. Update passenger info only.
- `destroy`: Verify `trip.departureTime > NOW()`. Set booking status to `cancelled`. Flash success. Redirect to index.

- [ ] **Step 2: Create Dashboard/TicketsController**

Create `app/controllers/dashboard/tickets_controller.ts` — same logic as public TicketsController but auth-gated (no session check, uses permission check instead).

- [ ] **Step 3: Create dashboard booking routes**

Create `start/routes/dashboard/bookings.ts`:

```typescript
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const BookingsController = () => import('#controllers/dashboard/bookings_controller')
const TicketsController = () => import('#controllers/dashboard/tickets_controller')

router
  .group(() => {
    router.get('/', [BookingsController, 'index']).as('dashboard.bookings.index')
      .use(middleware.permission({ keys: ['booking:read'] }))
    router.get('/create', [BookingsController, 'create']).as('dashboard.bookings.create')
      .use(middleware.permission({ keys: ['booking:create'] }))
    router.post('/', [BookingsController, 'store']).as('dashboard.bookings.store')
      .use(middleware.permission({ keys: ['booking:create'] }))
    router.get('/:id', [BookingsController, 'show']).as('dashboard.bookings.show')
      .use(middleware.permission({ keys: ['booking:read'] }))
    router.get('/:id/edit', [BookingsController, 'edit']).as('dashboard.bookings.edit')
      .use(middleware.permission({ keys: ['booking:update'] }))
    router.put('/:id', [BookingsController, 'update']).as('dashboard.bookings.update')
      .use(middleware.permission({ keys: ['booking:update'] }))
    router.delete('/:id', [BookingsController, 'destroy']).as('dashboard.bookings.destroy')
      .use(middleware.permission({ keys: ['booking:delete'] }))

    router.get('/:id/passengers/:passengerId/ticket', [TicketsController, 'download'])
      .as('dashboard.tickets.download')
      .use(middleware.permission({ keys: ['booking:read'] }))
  })
  .prefix('dashboard/bookings')
  .use(middleware.auth())
```

- [ ] **Step 4: Import routes in start/routes.ts**

Add `import './routes/dashboard/bookings.js'` to `start/routes.ts`.

- [ ] **Step 5: Commit**

```bash
git add app/controllers/dashboard/bookings_controller.ts app/controllers/dashboard/tickets_controller.ts start/routes/dashboard/bookings.ts start/routes.ts
git commit -m "feat: add dashboard BookingsController with agent booking management"
```

---

### Task 14: Create Dashboard/BoardingController

**Files:**
- Create: `app/controllers/dashboard/boarding_controller.ts`
- Create: `start/routes/dashboard/boarding.ts`

- [ ] **Step 1: Create BoardingController**

Create `app/controllers/dashboard/boarding_controller.ts`:

- `index`: Render boarding form (single code input).
- `validate`: Validate with `validateBoardingValidator`. Look up passenger by `code` OR `qrCode`, joining through bookings to enforce tenant scoping. Verify booking is `confirmed`, trip is `scheduled` or `in_progress`. If auth user is Chauffeur, verify trip's `driverId` matches auth user. If passenger already `boarded`, flash error. Otherwise set `status: 'boarded'`, `boardedAt: DateTime.now()`. Flash success with passenger name + seat.

- [ ] **Step 2: Create boarding routes**

Create `start/routes/dashboard/boarding.ts`:

```typescript
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const BoardingController = () => import('#controllers/dashboard/boarding_controller')

router
  .group(() => {
    router.get('/', [BoardingController, 'index']).as('dashboard.boarding.index')
    router.post('/', [BoardingController, 'validate']).as('dashboard.boarding.validate')
  })
  .prefix('dashboard/boarding')
  .use(middleware.auth())
  .use(middleware.permission({ keys: ['boarding:validate'] }))
```

- [ ] **Step 3: Import routes in start/routes.ts**

Add `import './routes/dashboard/boarding.js'` to `start/routes.ts`.

- [ ] **Step 4: Commit**

```bash
git add app/controllers/dashboard/boarding_controller.ts start/routes/dashboard/boarding.ts start/routes.ts
git commit -m "feat: add dashboard BoardingController for passenger validation"
```

---

### Task 15: Create dashboard booking views

**Files:**
- Create: `resources/views/pages/dashboard/bookings/index.edge`
- Create: `resources/views/pages/dashboard/bookings/create.edge`
- Create: `resources/views/pages/dashboard/bookings/show.edge`
- Create: `resources/views/pages/dashboard/bookings/edit.edge`

- [ ] **Step 1: Create index.edge**

Dashboard bookings list using `@layout.dashboard()`. Filters bar (date, trip, status, code search). Table with columns: date, trip (route), customer, passengers count, total, status badge, actions (view, edit, cancel). Pagination.

- [ ] **Step 2: Create create.edge**

Agent booking form using `@layout.dashboard()`. Trip selector (dropdown of scheduled trips). Customer fields (firstName, lastName, phone, email). Dynamic passengers section (Alpine.js add/remove rows). Submit creates the full booking in one step.

- [ ] **Step 3: Create show.edge**

Booking detail using `@layout.dashboard()`. Sections: trip info, customer info, passengers table (name, seat, code, status, ticket download link), payment status. Cancel button if allowed.

- [ ] **Step 4: Create edit.edge**

Edit form using `@layout.dashboard()`. Shows passenger list with editable firstName, lastName, phone fields. Submit updates passenger info only.

- [ ] **Step 5: Commit**

```bash
git add resources/views/pages/dashboard/bookings/
git commit -m "feat: add dashboard booking views (index, create, show, edit)"
```

---

### Task 16: Create boarding view

**Files:**
- Create: `resources/views/pages/dashboard/boarding/index.edge`

- [ ] **Step 1: Create boarding index.edge**

Using `@layout.dashboard()`. A simple form with one input (code) and a "Valider" button. Below the form, if a result exists (from flash data after validation), display: passenger name, trip route, seat number, status badge (green "Embarqué" or already boarded warning).

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/dashboard/boarding/
git commit -m "feat: add boarding validation view"
```

---

### Task 17: Update dashboard sidebar

**Files:**
- Modify: `resources/views/components/layout/dashboard.edge`

- [ ] **Step 1: Add Réservations and Embarquement links to sidebar**

Add navigation items to the sidebar in `dashboard.edge`, gated by permissions:

```edge
@can('permission', 'booking:read')
  <a href="{{ route('dashboard.bookings.index') }}" class="...">
    @svg('tabler:ticket', { class: 'size-5' })
    <span>Réservations</span>
  </a>
@end

@can('permission', 'boarding:validate')
  <a href="{{ route('dashboard.boarding.index') }}" class="...">
    @svg('tabler:qrcode', { class: 'size-5' })
    <span>Embarquement</span>
  </a>
@end
```

Place these after the existing navigation items (Voyages, Bus, etc.).

- [ ] **Step 2: Commit**

```bash
git add resources/views/components/layout/dashboard.edge
git commit -m "feat: add booking and boarding links to dashboard sidebar"
```

---

### Task 18: End-to-end verification

- [ ] **Step 1: Verify public flow**

```bash
node ace serve --hmr
```

1. Navigate to `/<tenant-slug>/trips` — search for a trip
2. Click a trip → view details
3. Click "Réserver" → fill passengers → fill customer → review summary → simulate payment
4. Verify completed page shows with ticket download links
5. Download a ticket PDF — verify it contains QR code and correct info
6. Go to `/<tenant-slug>/bookings/verify` — enter phone + code — verify it finds the passenger

- [ ] **Step 2: Verify agent flow**

1. Log in as Admin/Agent
2. Navigate to `/dashboard/bookings` — verify empty list
3. Click "Nouvelle réservation" → fill form → submit
4. Verify booking appears in list with status "Confirmé"
5. Click view → verify details and ticket download
6. Cancel booking → verify status changes to "Annulé"

- [ ] **Step 3: Verify boarding flow**

1. Create a confirmed booking (agent or public flow)
2. Navigate to `/dashboard/boarding`
3. Enter a passenger code → verify passenger is marked as boarded
4. Try the same code again → verify it shows "already boarded" error

- [ ] **Step 4: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: end-to-end testing fixes for EPIC 4"
```
