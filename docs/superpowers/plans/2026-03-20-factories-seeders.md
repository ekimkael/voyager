# Factories & Seeders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create AdonisJS Lucid factories and numbered seeders for all Voyager models with realistic West African / Cameroon test data.

**Architecture:** 13 factory files define reusable data blueprints using `factory.define()`. 11 numbered seeders (00-10) create interdependent data in FK order. Seeders use `updateOrCreate`/`firstOrCreate` for idempotency where possible.

**Tech Stack:** AdonisJS Lucid v22 factories, `@faker-js/faker` (bundled with Lucid), PostgreSQL UUIDs, Luxon DateTime.

**Spec:** `docs/superpowers/specs/2026-03-20-factories-seeders-design.md`

---

## File Structure

### Factories (Create)
- `database/factories/tenant_factory.ts`
- `database/factories/user_factory.ts`
- `database/factories/role_factory.ts`
- `database/factories/user_role_assignment_factory.ts`
- `database/factories/city_factory.ts`
- `database/factories/franchise_factory.ts`
- `database/factories/route_factory.ts`
- `database/factories/bus_factory.ts`
- `database/factories/trip_factory.ts`
- `database/factories/customer_factory.ts`
- `database/factories/booking_factory.ts`
- `database/factories/passenger_factory.ts`
- `database/factories/payment_factory.ts`

### Seeders (Create)
- `database/seeders/01_city_seeder.ts`
- `database/seeders/02_tenant_seeder.ts`
- `database/seeders/03_role_seeder.ts`
- `database/seeders/04_user_seeder.ts`
- `database/seeders/05_franchise_seeder.ts`
- `database/seeders/06_bus_seeder.ts`
- `database/seeders/07_route_seeder.ts`
- `database/seeders/08_trip_seeder.ts`
- `database/seeders/09_customer_seeder.ts`
- `database/seeders/10_booking_seeder.ts`

### Seeders (Rename)
- `database/seeders/permissions_seeder.ts` → `database/seeders/00_permissions_seeder.ts`

---

## Task 1: Foundation Factories (Tenant, City)

**Files:**
- Create: `database/factories/tenant_factory.ts`
- Create: `database/factories/city_factory.ts`

- [ ] **Step 1: Create tenant_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import Tenant from '#models/tenant'

export const TenantFactory = factory
  .define(Tenant, async ({ faker }) => {
    const name = faker.helpers.arrayElement([
      'General Express Voyages',
      'Touristique Express',
      'Cam Voyages',
      'Buca Voyages',
      'Finexs Voyages',
      'Central Voyages',
      'Sahel Express',
      'Littoral Transport',
    ])
    return {
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      plan: faker.helpers.arrayElement(['free', 'pro', 'enterprise'] as const),
    }
  })
  .build()
```

- [ ] **Step 2: Create city_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import City from '#models/city'

const cities = [
  { name: 'Douala', country: 'Cameroun' },
  { name: 'Yaoundé', country: 'Cameroun' },
  { name: 'Bafoussam', country: 'Cameroun' },
  { name: 'Bamenda', country: 'Cameroun' },
  { name: 'Kribi', country: 'Cameroun' },
  { name: 'Limbé', country: 'Cameroun' },
  { name: 'Bertoua', country: 'Cameroun' },
  { name: 'Abidjan', country: "Côte d'Ivoire" },
  { name: 'Lomé', country: 'Togo' },
  { name: 'Cotonou', country: 'Bénin' },
]

export const CityFactory = factory
  .define(City, async ({ faker }) => {
    const city = faker.helpers.arrayElement(cities)
    return {
      name: city.name,
      country: city.country,
    }
  })
  .build()
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `node ace generate:manifest`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add database/factories/tenant_factory.ts database/factories/city_factory.ts
git commit -m "feat: add Tenant and City factories"
```

---

## Task 2: User & RBAC Factories

**Files:**
- Create: `database/factories/user_factory.ts`
- Create: `database/factories/role_factory.ts`
- Create: `database/factories/user_role_assignment_factory.ts`

- [ ] **Step 1: Create user_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import User from '#models/user'

const firstNames = [
  'Kouamé', 'Aminata', 'Moussa', 'Fatou', 'Ibrahim',
  'Aïssatou', 'Oumar', 'Bintou', 'Mamadou', 'Awa',
  'Seydou', 'Mariam', 'Abdoulaye', 'Ramatoulaye', 'Boubacar',
  'Djénéba', 'Cheick', 'Kadiatou', 'Souleymane', 'Nafissatou',
]

const lastNames = [
  'Diallo', 'Traoré', 'Bamba', 'Konaté', 'Touré',
  'Ouédraogo', 'Sow', 'Camara', 'Keïta', 'Coulibaly',
  'Ndiaye', 'Fofana', 'Sanogo', 'Cissé', 'Dembélé',
  'Sylla', 'Koné', 'Diabaté', 'Bah', 'Barry',
]

export const UserFactory = factory
  .define(User, async ({ faker }) => {
    const firstName = faker.helpers.arrayElement(firstNames)
    const lastName = faker.helpers.arrayElement(lastNames)
    return {
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${faker.internet.domainName()}`,
      password: 'password123',
      status: 'active' as const,
      mfaEnabled: false,
      phone: `+237 6${faker.string.numeric(2)} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`,
    }
  })
  .build()
```

- [ ] **Step 2: Create role_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import Role from '#models/role'

export const RoleFactory = factory
  .define(Role, async ({ faker }) => {
    return {
      name: faker.person.jobTitle(),
      scope: 'global' as const,
      isSystem: false,
    }
  })
  .build()
```

- [ ] **Step 3: Create user_role_assignment_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import UserRoleAssignment from '#models/user_role_assignment'

export const UserRoleAssignmentFactory = factory
  .define(UserRoleAssignment, async () => {
    return {
      isTemporary: false,
      resourceId: null,
      expiresAt: null,
    }
  })
  .build()
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `node ace generate:manifest`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add database/factories/user_factory.ts database/factories/role_factory.ts database/factories/user_role_assignment_factory.ts
git commit -m "feat: add User, Role, and UserRoleAssignment factories"
```

---

## Task 3: Infrastructure Factories (Franchise, Bus, Route)

**Files:**
- Create: `database/factories/franchise_factory.ts`
- Create: `database/factories/bus_factory.ts`
- Create: `database/factories/route_factory.ts`

- [ ] **Step 1: Create franchise_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import Franchise from '#models/franchise'

const agencies = [
  { name: 'Agence Akwa', address: 'Rue de l\'Hôpital, Akwa, Douala' },
  { name: 'Agence Bastos', address: 'Carrefour Bastos, Yaoundé' },
  { name: 'Agence Tamdja', address: 'Rue du Marché, Tamdja, Bafoussam' },
  { name: 'Agence Plateau', address: 'Boulevard de la République, Plateau, Abidjan' },
  { name: 'Agence Mokolo', address: 'Carrefour Mokolo, Yaoundé' },
  { name: 'Agence Bonabéri', address: 'Route de Bonabéri, Douala' },
  { name: 'Agence Nkondengui', address: 'Avenue Kennedy, Nkondengui, Yaoundé' },
  { name: 'Agence Déido', address: 'Rue Déido, Douala' },
]

export const FranchiseFactory = factory
  .define(Franchise, async ({ faker }) => {
    const agency = faker.helpers.arrayElement(agencies)
    return {
      name: agency.name,
      address: agency.address,
      phone: `+237 6${faker.string.numeric(2)} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`,
      active: true,
    }
  })
  .build()
```

- [ ] **Step 2: Create bus_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import Bus from '#models/bus'

const busModels = [
  { brand: 'Toyota', model: 'Coaster', capacity: 30 },
  { brand: 'Mercedes-Benz', model: 'Sprinter', capacity: 22 },
  { brand: 'Yutong', model: 'ZK6122H9', capacity: 55 },
  { brand: 'Yutong', model: 'ZK6107HA', capacity: 45 },
  { brand: 'Golden Dragon', model: 'XML6102', capacity: 49 },
  { brand: 'Zhongtong', model: 'LCK6125H', capacity: 53 },
  { brand: 'Toyota', model: 'HiAce', capacity: 15 },
  { brand: 'Higer', model: 'KLQ6109Q', capacity: 45 },
]

export const BusFactory = factory
  .define(Bus, async ({ faker }) => {
    const busModel = faker.helpers.arrayElement(busModels)
    const regionCode = faker.helpers.arrayElement(['LT', 'CE', 'OU', 'NW', 'SW'])
    return {
      licensePlate: `${regionCode}-${faker.string.numeric(4)}-${faker.string.alpha({ length: 2, casing: 'upper' })}`,
      brand: busModel.brand,
      model: busModel.model,
      capacity: busModel.capacity,
      year: faker.number.int({ min: 2015, max: 2025 }),
      status: 'available' as const,
      active: true,
      nextMaintenanceDate: null,
    }
  })
  .build()
```

- [ ] **Step 3: Create route_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import Route from '#models/route'

export const RouteFactory = factory
  .define(Route, async ({ faker }) => {
    const distance = faker.number.int({ min: 50, max: 1500 })
    return {
      code: `${faker.string.alpha({ length: 3, casing: 'upper' })}-${faker.string.alpha({ length: 3, casing: 'upper' })}`,
      distanceKm: distance,
      estimatedDurationMinutes: Math.round(distance * 1.2),
      status: 'active' as const,
    }
  })
  .build()
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `node ace generate:manifest`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add database/factories/franchise_factory.ts database/factories/bus_factory.ts database/factories/route_factory.ts
git commit -m "feat: add Franchise, Bus, and Route factories"
```

---

## Task 4: Business Factories (Trip, Customer, Booking, Passenger, Payment)

**Files:**
- Create: `database/factories/trip_factory.ts`
- Create: `database/factories/customer_factory.ts`
- Create: `database/factories/booking_factory.ts`
- Create: `database/factories/passenger_factory.ts`
- Create: `database/factories/payment_factory.ts`

- [ ] **Step 1: Create trip_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'
import Trip from '#models/trip'

export const TripFactory = factory
  .define(Trip, async ({ faker }) => {
    const departure = DateTime.now().plus({ days: faker.number.int({ min: 1, max: 30 }) })
    const durationMinutes = faker.number.int({ min: 60, max: 960 })
    return {
      departureTime: departure,
      arrivalTime: departure.plus({ minutes: durationMinutes }),
      travelClass: faker.helpers.arrayElement(['standard', 'vip'] as const),
      price: faker.number.int({ min: 3000, max: 15000 }),
      status: 'scheduled' as const,
    }
  })
  .build()
```

- [ ] **Step 2: Create customer_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import Customer from '#models/customer'

const firstNames = [
  'Paul', 'Marie', 'Jean', 'Cécile', 'Pierre',
  'Angèle', 'François', 'Hortense', 'Emmanuel', 'Nadège',
  'Thierry', 'Solange', 'Rodrigue', 'Clarisse', 'Hervé',
]

const lastNames = [
  'Kamga', 'Tchinda', 'Nganou', 'Fotso', 'Tagne',
  'Njoya', 'Mbouda', 'Kenfack', 'Nguemo', 'Tchoumi',
  'Djomo', 'Pokam', 'Feudjio', 'Noumsi', 'Tsague',
]

export const CustomerFactory = factory
  .define(Customer, async ({ faker }) => {
    const firstName = faker.helpers.arrayElement(firstNames)
    const lastName = faker.helpers.arrayElement(lastNames)
    return {
      firstName,
      lastName,
      phone: `+237 6${faker.string.numeric(2)} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`,
      email: faker.helpers.maybe(
        () => `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${faker.internet.domainName()}`,
        { probability: 0.6 }
      ) ?? null,
    }
  })
  .build()
```

- [ ] **Step 3: Create booking_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import Booking from '#models/booking'

// NOTE: totalAmount must be > 0 when creating an associated Payment (DB CHECK constraint).
// Always .merge({ totalAmount }) with the real value in seeders/tests.
export const BookingFactory = factory
  .define(Booking, async () => {
    return {
      totalAmount: 5000,
      status: 'pending' as const,
    }
  })
  .build()
```

- [ ] **Step 4: Create passenger_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import { randomUUID } from 'node:crypto'
import Passenger from '#models/passenger'

const firstNames = [
  'Alain', 'Berthe', 'Charles', 'Denise', 'Étienne',
  'Félicité', 'Gaston', 'Hélène', 'Isidore', 'Joséphine',
  'Lambert', 'Monique', 'Norbert', 'Odette', 'Pascal',
]

const lastNames = [
  'Mbarga', 'Essomba', 'Atangana', 'Owona', 'Mvondo',
  'Messi', 'Belinga', 'Nkoulou', 'Abena', 'Ekotto',
  'Biya', 'Onana', 'Nkodo', 'Elong', 'Manga',
]

let passengerCounter = 0

export const PassengerFactory = factory
  .define(Passenger, async ({ faker }) => {
    passengerCounter = (passengerCounter + 1) % 1000
    return {
      firstName: faker.helpers.arrayElement(firstNames),
      lastName: faker.helpers.arrayElement(lastNames),
      phone: faker.helpers.maybe(
        () => `+237 6${faker.string.numeric(2)} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`,
        { probability: 0.5 }
      ) ?? null,
      seatNumber: 1,
      code: `P${faker.string.alphanumeric({ length: 5, casing: 'upper' })}`,
      qrCode: randomUUID(),
      status: 'pending' as const,
      boardedAt: null,
    }
  })
  .build()
```

- [ ] **Step 5: Create payment_factory.ts**

```typescript
import factory from '@adonisjs/lucid/factories'
import Payment from '#models/payment'

// NOTE: Always .merge({ amount }) to match the booking's totalAmount.
// DB CHECK constraint requires amount > 0.
export const PaymentFactory = factory
  .define(Payment, async ({ faker }) => {
    const method = faker.helpers.arrayElement(['cash', 'mobile_money', 'card'] as const)
    return {
      amount: 5000,
      paymentMethod: method,
      operator: method === 'mobile_money'
        ? faker.helpers.arrayElement(['Orange Money', 'MTN MoMo'])
        : null,
      status: 'pending' as const,
      paidAt: null,
      externalReference: null,
    }
  })
  .build()
```

- [ ] **Step 6: Verify TypeScript compilation**

Run: `node ace generate:manifest`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add database/factories/trip_factory.ts database/factories/customer_factory.ts database/factories/booking_factory.ts database/factories/passenger_factory.ts database/factories/payment_factory.ts
git commit -m "feat: add Trip, Customer, Booking, Passenger, and Payment factories"
```

---

## Task 5: Rename permissions_seeder + Create seeders 01-02

**Files:**
- Rename: `database/seeders/permissions_seeder.ts` → `database/seeders/00_permissions_seeder.ts`
- Create: `database/seeders/01_city_seeder.ts`
- Create: `database/seeders/02_tenant_seeder.ts`

- [ ] **Step 1: Rename permissions_seeder.ts**

```bash
git mv database/seeders/permissions_seeder.ts database/seeders/00_permissions_seeder.ts
```

- [ ] **Step 2: Create 01_city_seeder.ts**

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import City from '#models/city'

export default class extends BaseSeeder {
  async run() {
    const cities = [
      { name: 'Douala', country: 'Cameroun' },
      { name: 'Yaoundé', country: 'Cameroun' },
      { name: 'Bafoussam', country: 'Cameroun' },
      { name: 'Bamenda', country: 'Cameroun' },
      { name: 'Kribi', country: 'Cameroun' },
      { name: 'Limbé', country: 'Cameroun' },
      { name: 'Bertoua', country: 'Cameroun' },
      { name: 'Abidjan', country: "Côte d'Ivoire" },
      { name: 'Lomé', country: 'Togo' },
      { name: 'Cotonou', country: 'Bénin' },
    ]

    for (const city of cities) {
      await City.updateOrCreate(
        { name: city.name, country: city.country },
        {}
      )
    }
  }
}
```

- [ ] **Step 3: Create 02_tenant_seeder.ts**

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'

export default class extends BaseSeeder {
  async run() {
    const tenants = [
      { name: 'General Express Voyages', slug: 'general-express-voyages', plan: 'pro' as const },
      { name: 'Touristique Express', slug: 'touristique-express', plan: 'free' as const },
    ]

    for (const tenant of tenants) {
      await Tenant.updateOrCreate({ slug: tenant.slug }, tenant)
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add database/seeders/00_permissions_seeder.ts database/seeders/01_city_seeder.ts database/seeders/02_tenant_seeder.ts
git commit -m "feat: rename permissions seeder to 00_, add city and tenant seeders"
```

---

## Task 6: Create 03_role_seeder

**Files:**
- Create: `database/seeders/03_role_seeder.ts`

- [ ] **Step 1: Create 03_role_seeder.ts**

This seeder creates the 4 system roles per tenant and attaches permissions (assumes `00_permissions_seeder` has already run).

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'
import Role from '#models/role'
import Permission from '#models/permission'
import RolePermission from '#models/role_permission'
import { systemRoles } from '#config/rbac'

export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()
    const allPermissions = await Permission.all()
    const permissionMap = new Map(allPermissions.map((p) => [`${p.resource}:${p.action}`, p]))

    for (const tenant of tenants) {
      for (const roleDef of systemRoles) {
        const role = await Role.updateOrCreate(
          { tenantId: tenant.id, name: roleDef.name },
          { scope: 'global', isSystem: true }
        )

        const permKeys =
          roleDef.permissions === '*' ? [...permissionMap.keys()] : roleDef.permissions

        for (const key of permKeys) {
          const permission = permissionMap.get(key)
          if (permission) {
            await RolePermission.firstOrCreate(
              { roleId: role.id, permissionId: permission.id },
              { roleId: role.id, permissionId: permission.id }
            )
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add database/seeders/03_role_seeder.ts
git commit -m "feat: add role seeder with system roles and permissions per tenant"
```

---

## Task 7: Create 04_user_seeder + 05_franchise_seeder

**Files:**
- Create: `database/seeders/04_user_seeder.ts`
- Create: `database/seeders/05_franchise_seeder.ts`

- [ ] **Step 1: Create 04_user_seeder.ts**

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'
import User from '#models/user'
import Role from '#models/role'
import UserRoleAssignment from '#models/user_role_assignment'

interface UserDef {
  firstName: string
  lastName: string
  email: string
  role: string
}

const usersPerTenant: Record<string, UserDef[]> = {
  'general-express-voyages': [
    { firstName: 'Kouamé', lastName: 'Diallo', email: 'admin@general-express-voyages.com', role: 'Admin' },
    { firstName: 'Aminata', lastName: 'Traoré', email: 'aminata.traore@general-express-voyages.com', role: 'Dispatcher' },
    { firstName: 'Moussa', lastName: 'Bamba', email: 'moussa.bamba@general-express-voyages.com', role: 'Dispatcher' },
    { firstName: 'Ibrahim', lastName: 'Konaté', email: 'ibrahim.konate@general-express-voyages.com', role: 'Chauffeur' },
    { firstName: 'Seydou', lastName: 'Touré', email: 'seydou.toure@general-express-voyages.com', role: 'Chauffeur' },
    { firstName: 'Oumar', lastName: 'Camara', email: 'oumar.camara@general-express-voyages.com', role: 'Chauffeur' },
    { firstName: 'Fatou', lastName: 'Sow', email: 'fatou.sow@general-express-voyages.com', role: 'Dispatcher' },
    { firstName: 'Aïssatou', lastName: 'Keïta', email: 'aissatou.keita@general-express-voyages.com', role: 'Dispatcher' },
    { firstName: 'Awa', lastName: 'Coulibaly', email: 'awa.coulibaly@general-express-voyages.com', role: 'Lecteur' },
  ],
  'touristique-express': [
    { firstName: 'Mamadou', lastName: 'Coulibaly', email: 'admin@touristique-express.com', role: 'Admin' },
    { firstName: 'Bintou', lastName: 'Ndiaye', email: 'bintou.ndiaye@touristique-express.com', role: 'Dispatcher' },
    { firstName: 'Abdoulaye', lastName: 'Fofana', email: 'abdoulaye.fofana@touristique-express.com', role: 'Dispatcher' },
    { firstName: 'Boubacar', lastName: 'Sanogo', email: 'boubacar.sanogo@touristique-express.com', role: 'Chauffeur' },
    { firstName: 'Cheick', lastName: 'Cissé', email: 'cheick.cisse@touristique-express.com', role: 'Chauffeur' },
    { firstName: 'Souleymane', lastName: 'Dembélé', email: 'souleymane.dembele@touristique-express.com', role: 'Chauffeur' },
    { firstName: 'Mariam', lastName: 'Sylla', email: 'mariam.sylla@touristique-express.com', role: 'Dispatcher' },
    { firstName: 'Djénéba', lastName: 'Koné', email: 'djeneba.kone@touristique-express.com', role: 'Dispatcher' },
    { firstName: 'Nafissatou', lastName: 'Barry', email: 'nafissatou.barry@touristique-express.com', role: 'Lecteur' },
  ],
}

export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()

    for (const tenant of tenants) {
      const userDefs = usersPerTenant[tenant.slug]
      if (!userDefs) continue

      const admin = await User.updateOrCreate(
        { tenantId: tenant.id, email: userDefs[0].email },
        {
          firstName: userDefs[0].firstName,
          lastName: userDefs[0].lastName,
          password: 'password123',
          status: 'active',
          mfaEnabled: false,
        }
      )

      // Assign admin role
      const adminRole = await Role.query()
        .where('tenantId', tenant.id)
        .where('name', 'Admin')
        .firstOrFail()

      await UserRoleAssignment.firstOrCreate(
        { userId: admin.id, roleId: adminRole.id },
        { grantedBy: admin.id, isTemporary: false }
      )

      // Create remaining users
      for (const userDef of userDefs.slice(1)) {
        const user = await User.updateOrCreate(
          { tenantId: tenant.id, email: userDef.email },
          {
            firstName: userDef.firstName,
            lastName: userDef.lastName,
            password: 'password123',
            status: 'active',
            mfaEnabled: false,
            phone: `+237 6${String(Math.floor(Math.random() * 100)).padStart(2, '0')} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          }
        )

        const role = await Role.query()
          .where('tenantId', tenant.id)
          .where('name', userDef.role)
          .firstOrFail()

        await UserRoleAssignment.firstOrCreate(
          { userId: user.id, roleId: role.id },
          { grantedBy: admin.id, isTemporary: false }
        )
      }
    }
  }
}
```

- [ ] **Step 2: Create 05_franchise_seeder.ts**

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'
import City from '#models/city'
import Franchise from '#models/franchise'
import User from '#models/user'
import Role from '#models/role'

interface FranchiseDef {
  name: string
  cityName: string
  address: string
  phone: string
}

const franchisesPerTenant: Record<string, FranchiseDef[]> = {
  'general-express-voyages': [
    { name: 'Agence Akwa', cityName: 'Douala', address: "Rue de l'Hôpital, Akwa, Douala", phone: '+237 699 100 200' },
    { name: 'Agence Bastos', cityName: 'Yaoundé', address: 'Carrefour Bastos, Yaoundé', phone: '+237 699 100 201' },
    { name: 'Agence Tamdja', cityName: 'Bafoussam', address: 'Rue du Marché, Tamdja, Bafoussam', phone: '+237 699 100 202' },
    { name: 'Agence Plateau', cityName: 'Abidjan', address: 'Boulevard de la République, Plateau, Abidjan', phone: '+237 699 100 203' },
  ],
  'touristique-express': [
    { name: 'Agence Mokolo', cityName: 'Yaoundé', address: 'Carrefour Mokolo, Yaoundé', phone: '+237 698 200 300' },
    { name: 'Agence Bonabéri', cityName: 'Douala', address: 'Route de Bonabéri, Douala', phone: '+237 698 200 301' },
    { name: 'Agence Plateau', cityName: 'Abidjan', address: 'Avenue Houphouët-Boigny, Plateau, Abidjan', phone: '+237 698 200 302' },
  ],
}

export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()

    for (const tenant of tenants) {
      const defs = franchisesPerTenant[tenant.slug]
      if (!defs) continue

      const franchises: Franchise[] = []
      for (const def of defs) {
        const city = await City.query().where('name', def.cityName).firstOrFail()
        const franchise = await Franchise.updateOrCreate(
          { tenantId: tenant.id, name: def.name },
          { cityId: city.id, address: def.address, phone: def.phone, active: true }
        )
        franchises.push(franchise)
      }

      // Assign last 2 dispatcher-role users (agents) to franchises
      const dispatcherRole = await Role.query()
        .where('tenantId', tenant.id)
        .where('name', 'Dispatcher')
        .firstOrFail()

      const agents = await User.query()
        .whereHas('roleAssignments', (q) => q.where('roleId', dispatcherRole.id))
        .where('tenantId', tenant.id)
        .orderBy('createdAt', 'desc')
        .limit(2)

      for (let i = 0; i < agents.length; i++) {
        const franchise = franchises[i % franchises.length]
        agents[i].franchiseId = franchise.id
        await agents[i].save()
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add database/seeders/04_user_seeder.ts database/seeders/05_franchise_seeder.ts
git commit -m "feat: add user and franchise seeders with role assignments"
```

---

## Task 8: Create 06_bus_seeder + 07_route_seeder

**Files:**
- Create: `database/seeders/06_bus_seeder.ts`
- Create: `database/seeders/07_route_seeder.ts`

- [ ] **Step 1: Create 06_bus_seeder.ts**

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'
import Bus from '#models/bus'

interface BusDef {
  licensePlate: string
  brand: string
  model: string
  capacity: number
  year: number
  status: 'available' | 'on_trip' | 'maintenance' | 'out_of_service'
  active: boolean
  nextMaintenanceDate: string | null
}

const busesPerTenant: Record<string, BusDef[]> = {
  'general-express-voyages': [
    { licensePlate: 'LT-4521-AB', brand: 'Toyota', model: 'Coaster', capacity: 30, year: 2022, status: 'available', active: true, nextMaintenanceDate: '2026-05-15' },
    { licensePlate: 'LT-7834-CD', brand: 'Yutong', model: 'ZK6122H9', capacity: 55, year: 2021, status: 'available', active: true, nextMaintenanceDate: '2026-06-01' },
    { licensePlate: 'LT-2198-EF', brand: 'Mercedes-Benz', model: 'Sprinter', capacity: 22, year: 2023, status: 'available', active: true, nextMaintenanceDate: '2026-07-10' },
    { licensePlate: 'CE-3345-GH', brand: 'Yutong', model: 'ZK6107HA', capacity: 45, year: 2020, status: 'on_trip', active: true, nextMaintenanceDate: '2026-04-20' },
    { licensePlate: 'CE-5567-IJ', brand: 'Golden Dragon', model: 'XML6102', capacity: 49, year: 2019, status: 'maintenance', active: true, nextMaintenanceDate: '2026-03-10' },
    { licensePlate: 'LT-8890-KL', brand: 'Zhongtong', model: 'LCK6125H', capacity: 53, year: 2017, status: 'out_of_service', active: false, nextMaintenanceDate: null },
  ],
  'touristique-express': [
    { licensePlate: 'CE-1122-MN', brand: 'Toyota', model: 'Coaster', capacity: 30, year: 2023, status: 'available', active: true, nextMaintenanceDate: '2026-06-15' },
    { licensePlate: 'CE-3344-OP', brand: 'Higer', model: 'KLQ6109Q', capacity: 45, year: 2022, status: 'available', active: true, nextMaintenanceDate: '2026-05-20' },
    { licensePlate: 'LT-5566-QR', brand: 'Yutong', model: 'ZK6122H9', capacity: 55, year: 2021, status: 'available', active: true, nextMaintenanceDate: '2026-08-01' },
    { licensePlate: 'CE-7788-ST', brand: 'Mercedes-Benz', model: 'Sprinter', capacity: 22, year: 2020, status: 'on_trip', active: true, nextMaintenanceDate: '2026-04-10' },
    { licensePlate: 'LT-9900-UV', brand: 'Golden Dragon', model: 'XML6102', capacity: 49, year: 2018, status: 'maintenance', active: true, nextMaintenanceDate: '2026-03-05' },
    { licensePlate: 'CE-2211-WX', brand: 'Toyota', model: 'HiAce', capacity: 15, year: 2016, status: 'out_of_service', active: false, nextMaintenanceDate: null },
  ],
}

export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()

    for (const tenant of tenants) {
      const busDefs = busesPerTenant[tenant.slug]
      if (!busDefs) continue

      for (const busDef of busDefs) {
        await Bus.updateOrCreate(
          { licensePlate: busDef.licensePlate },
          { tenantId: tenant.id, ...busDef }
        )
      }
    }
  }
}
```

- [ ] **Step 2: Create 07_route_seeder.ts**

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'
import City from '#models/city'
import Route from '#models/route'

interface RouteDef {
  code: string
  from: string
  to: string
  distanceKm: number
  estimatedDurationMinutes: number
}

const routes: RouteDef[] = [
  { code: 'DLA-YDE', from: 'Douala', to: 'Yaoundé', distanceKm: 250, estimatedDurationMinutes: 240 },
  { code: 'YDE-BFM', from: 'Yaoundé', to: 'Bafoussam', distanceKm: 300, estimatedDurationMinutes: 300 },
  { code: 'DLA-KBI', from: 'Douala', to: 'Kribi', distanceKm: 150, estimatedDurationMinutes: 180 },
  { code: 'DLA-LBE', from: 'Douala', to: 'Limbé', distanceKm: 80, estimatedDurationMinutes: 90 },
  { code: 'YDE-ABJ', from: 'Yaoundé', to: 'Abidjan', distanceKm: 1450, estimatedDurationMinutes: 960 },
]

export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()
    const cities = await City.all()
    const cityMap = new Map(cities.map((c) => [c.name, c]))

    for (const tenant of tenants) {
      for (const routeDef of routes) {
        const departureCity = cityMap.get(routeDef.from)
        const arrivalCity = cityMap.get(routeDef.to)
        if (!departureCity || !arrivalCity) continue

        await Route.updateOrCreate(
          { tenantId: tenant.id, code: routeDef.code },
          {
            departureCityId: departureCity.id,
            arrivalCityId: arrivalCity.id,
            distanceKm: routeDef.distanceKm,
            estimatedDurationMinutes: routeDef.estimatedDurationMinutes,
            status: 'active',
          }
        )
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add database/seeders/06_bus_seeder.ts database/seeders/07_route_seeder.ts
git commit -m "feat: add bus and route seeders with realistic Cameroon data"
```

---

## Task 9: Create 08_trip_seeder

**Files:**
- Create: `database/seeders/08_trip_seeder.ts`

- [ ] **Step 1: Create 08_trip_seeder.ts**

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Tenant from '#models/tenant'
import Route from '#models/route'
import Bus from '#models/bus'
import User from '#models/user'
import Role from '#models/role'
import Trip from '#models/trip'

interface TripDef {
  routeCode: string
  busIndex: number
  driverIndex: number
  departureOffset: { days: number; hours: number }
  travelClass: 'standard' | 'vip'
  price: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
}

const tripsTemplate: TripDef[] = [
  // Scheduled (future)
  { routeCode: 'DLA-YDE', busIndex: 0, driverIndex: 0, departureOffset: { days: 1, hours: 6 }, travelClass: 'standard', price: 5000, status: 'scheduled' },
  { routeCode: 'YDE-BFM', busIndex: 1, driverIndex: 1, departureOffset: { days: 2, hours: 7 }, travelClass: 'standard', price: 6000, status: 'scheduled' },
  { routeCode: 'DLA-KBI', busIndex: 2, driverIndex: 2, departureOffset: { days: 3, hours: 8 }, travelClass: 'vip', price: 10000, status: 'scheduled' },
  { routeCode: 'DLA-LBE', busIndex: 0, driverIndex: 0, departureOffset: { days: 5, hours: 14 }, travelClass: 'standard', price: 3000, status: 'scheduled' },
  // In progress (departed today)
  { routeCode: 'DLA-YDE', busIndex: 1, driverIndex: 1, departureOffset: { days: 0, hours: -2 }, travelClass: 'standard', price: 5000, status: 'in_progress' },
  { routeCode: 'YDE-ABJ', busIndex: 2, driverIndex: 2, departureOffset: { days: 0, hours: -5 }, travelClass: 'vip', price: 15000, status: 'in_progress' },
  { routeCode: 'DLA-LBE', busIndex: 0, driverIndex: 0, departureOffset: { days: 0, hours: -1 }, travelClass: 'standard', price: 3000, status: 'in_progress' },
  // Completed (past)
  { routeCode: 'DLA-YDE', busIndex: 0, driverIndex: 0, departureOffset: { days: -3, hours: 6 }, travelClass: 'standard', price: 5000, status: 'completed' },
  { routeCode: 'YDE-BFM', busIndex: 1, driverIndex: 1, departureOffset: { days: -5, hours: 7 }, travelClass: 'vip', price: 12000, status: 'completed' },
  { routeCode: 'DLA-KBI', busIndex: 2, driverIndex: 2, departureOffset: { days: -7, hours: 9 }, travelClass: 'standard', price: 4000, status: 'completed' },
  // Cancelled
  { routeCode: 'DLA-LBE', busIndex: 0, driverIndex: 0, departureOffset: { days: -1, hours: 15 }, travelClass: 'standard', price: 3000, status: 'cancelled' },
  { routeCode: 'YDE-ABJ', busIndex: 1, driverIndex: 1, departureOffset: { days: 4, hours: 6 }, travelClass: 'vip', price: 15000, status: 'cancelled' },
]

// Non-idempotent: uses Trip.create. Run after `node ace migration:fresh` for clean state.
export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()

    for (const tenant of tenants) {
      const routes = await Route.query().where('tenantId', tenant.id)
      const routeMap = new Map(routes.map((r) => [r.code, r]))

      const buses = await Bus.query().where('tenantId', tenant.id).where('active', true).orderBy('createdAt')

      const chauffeurRole = await Role.query()
        .where('tenantId', tenant.id)
        .where('name', 'Chauffeur')
        .firstOrFail()

      const drivers = await User.query()
        .where('tenantId', tenant.id)
        .whereHas('roleAssignments', (q) => q.where('roleId', chauffeurRole.id))
        .orderBy('createdAt')

      if (buses.length === 0 || drivers.length === 0) continue

      for (const tripDef of tripsTemplate) {
        const route = routeMap.get(tripDef.routeCode)
        if (!route) continue

        const bus = buses[tripDef.busIndex % buses.length]
        const driver = drivers[tripDef.driverIndex % drivers.length]

        const now = DateTime.now()
        const departure = now.plus({
          days: tripDef.departureOffset.days,
          hours: tripDef.departureOffset.hours,
        })
        const arrival = departure.plus({ minutes: route.estimatedDurationMinutes })

        await Trip.create({
          tenantId: tenant.id,
          routeId: route.id,
          busId: bus.id,
          driverId: driver.id,
          departureTime: departure,
          arrivalTime: arrival,
          travelClass: tripDef.travelClass,
          price: tripDef.price,
          status: tripDef.status,
        })
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add database/seeders/08_trip_seeder.ts
git commit -m "feat: add trip seeder with varied statuses and schedules"
```

---

## Task 10: Create 09_customer_seeder + 10_booking_seeder

**Files:**
- Create: `database/seeders/09_customer_seeder.ts`
- Create: `database/seeders/10_booking_seeder.ts`

- [ ] **Step 1: Create 09_customer_seeder.ts**

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'
import Customer from '#models/customer'

const customerData = [
  { firstName: 'Paul', lastName: 'Kamga', email: 'paul.kamga@gmail.com' },
  { firstName: 'Marie', lastName: 'Tchinda', email: null },
  { firstName: 'Jean', lastName: 'Nganou', email: 'jean.nganou@yahoo.fr' },
  { firstName: 'Cécile', lastName: 'Fotso', email: null },
  { firstName: 'Pierre', lastName: 'Tagne', email: 'pierre.tagne@outlook.com' },
  { firstName: 'Angèle', lastName: 'Njoya', email: null },
  { firstName: 'François', lastName: 'Mbouda', email: 'francois.mbouda@gmail.com' },
  { firstName: 'Hortense', lastName: 'Kenfack', email: null },
  { firstName: 'Emmanuel', lastName: 'Nguemo', email: 'emmanuel.nguemo@gmail.com' },
  { firstName: 'Nadège', lastName: 'Tchoumi', email: 'nadege.tchoumi@yahoo.fr' },
  { firstName: 'Thierry', lastName: 'Djomo', email: null },
  { firstName: 'Solange', lastName: 'Pokam', email: null },
  { firstName: 'Rodrigue', lastName: 'Feudjio', email: 'rodrigue.feudjio@gmail.com' },
  { firstName: 'Clarisse', lastName: 'Noumsi', email: null },
  { firstName: 'Hervé', lastName: 'Tsague', email: 'herve.tsague@outlook.com' },
]

export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()
    let phoneCounter = 0

    for (const tenant of tenants) {
      for (const data of customerData) {
        phoneCounter++
        const phone = `+237 6${String(Math.floor(phoneCounter / 100) % 100).padStart(2, '0')} ${String(phoneCounter % 1000).padStart(3, '0')} ${String(phoneCounter * 7 % 1000).padStart(3, '0')}`
        await Customer.updateOrCreate(
          { tenantId: tenant.id, phone },
          {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
          }
        )
      }
    }
  }
}
```

- [ ] **Step 2: Create 10_booking_seeder.ts**

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import Tenant from '#models/tenant'
import Trip from '#models/trip'
import Customer from '#models/customer'
import User from '#models/user'
import Franchise from '#models/franchise'
import Booking from '#models/booking'
import Passenger from '#models/passenger'
import Payment from '#models/payment'
import Role from '#models/role'

const passengerNames = [
  { firstName: 'Alain', lastName: 'Mbarga' },
  { firstName: 'Berthe', lastName: 'Essomba' },
  { firstName: 'Charles', lastName: 'Atangana' },
  { firstName: 'Denise', lastName: 'Owona' },
  { firstName: 'Étienne', lastName: 'Mvondo' },
  { firstName: 'Félicité', lastName: 'Messi' },
  { firstName: 'Gaston', lastName: 'Belinga' },
  { firstName: 'Hélène', lastName: 'Nkoulou' },
  { firstName: 'Isidore', lastName: 'Abena' },
  { firstName: 'Joséphine', lastName: 'Ekotto' },
  { firstName: 'Lambert', lastName: 'Onana' },
  { firstName: 'Monique', lastName: 'Nkodo' },
  { firstName: 'Norbert', lastName: 'Elong' },
  { firstName: 'Odette', lastName: 'Manga' },
  { firstName: 'Pascal', lastName: 'Biya' },
]

interface BookingTemplate {
  bookingStatus: 'pending' | 'confirmed' | 'cancelled'
  paymentStatus: 'pending' | 'success' | 'failed' | 'refunded'
  paymentMethod: 'cash' | 'mobile_money' | 'card'
  passengerCount: number
  hasBoarded: boolean
}

const bookingTemplates: BookingTemplate[] = [
  // 10 confirmed + success
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'cash', passengerCount: 2, hasBoarded: true },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'mobile_money', passengerCount: 1, hasBoarded: true },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'mobile_money', passengerCount: 3, hasBoarded: false },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'cash', passengerCount: 1, hasBoarded: false },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'card', passengerCount: 2, hasBoarded: true },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'cash', passengerCount: 4, hasBoarded: false },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'mobile_money', passengerCount: 1, hasBoarded: true },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'cash', passengerCount: 2, hasBoarded: false },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'mobile_money', passengerCount: 1, hasBoarded: true },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'card', passengerCount: 3, hasBoarded: false },
  // 5 pending
  { bookingStatus: 'pending', paymentStatus: 'pending', paymentMethod: 'cash', passengerCount: 1, hasBoarded: false },
  { bookingStatus: 'pending', paymentStatus: 'pending', paymentMethod: 'mobile_money', passengerCount: 2, hasBoarded: false },
  { bookingStatus: 'pending', paymentStatus: 'pending', paymentMethod: 'cash', passengerCount: 1, hasBoarded: false },
  { bookingStatus: 'pending', paymentStatus: 'pending', paymentMethod: 'mobile_money', passengerCount: 3, hasBoarded: false },
  { bookingStatus: 'pending', paymentStatus: 'pending', paymentMethod: 'card', passengerCount: 1, hasBoarded: false },
  // 3 cancelled + refunded
  { bookingStatus: 'cancelled', paymentStatus: 'refunded', paymentMethod: 'mobile_money', passengerCount: 2, hasBoarded: false },
  { bookingStatus: 'cancelled', paymentStatus: 'refunded', paymentMethod: 'cash', passengerCount: 1, hasBoarded: false },
  { bookingStatus: 'cancelled', paymentStatus: 'refunded', paymentMethod: 'card', passengerCount: 1, hasBoarded: false },
  // 2 confirmed + failed
  { bookingStatus: 'confirmed', paymentStatus: 'failed', paymentMethod: 'mobile_money', passengerCount: 1, hasBoarded: false },
  { bookingStatus: 'confirmed', paymentStatus: 'failed', paymentMethod: 'card', passengerCount: 2, hasBoarded: false },
]

export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()
    let globalPaxCounter = 0

    for (const tenant of tenants) {
      const trips = await Trip.query()
        .where('tenantId', tenant.id)
        .whereNot('status', 'cancelled')

      const customers = await Customer.query().where('tenantId', tenant.id)
      const franchises = await Franchise.query().where('tenantId', tenant.id)

      const dispatcherRole = await Role.query()
        .where('tenantId', tenant.id)
        .where('name', 'Dispatcher')
        .firstOrFail()

      const agents = await User.query()
        .where('tenantId', tenant.id)
        .whereHas('roleAssignments', (q) => q.where('roleId', dispatcherRole.id))

      if (trips.length === 0 || customers.length === 0 || agents.length === 0) continue

      let seatCounters: Record<string, number> = {}

      for (let i = 0; i < bookingTemplates.length; i++) {
        const template = bookingTemplates[i]
        const trip = trips[i % trips.length]
        const customer = customers[i % customers.length]
        const agent = agents[i % agents.length]
        const franchise = franchises[i % franchises.length]

        if (!seatCounters[trip.id]) seatCounters[trip.id] = 0

        const totalAmount = trip.price * template.passengerCount

        const booking = await Booking.create({
          tenantId: tenant.id,
          tripId: trip.id,
          customerId: customer.id,
          agentId: agent.id,
          franchiseId: franchise.id,
          totalAmount,
          status: template.bookingStatus,
        })

        // Create passengers
        for (let p = 0; p < template.passengerCount; p++) {
          globalPaxCounter++
          seatCounters[trip.id]++

          const nameData = passengerNames[globalPaxCounter % passengerNames.length]
          const isBoarded = template.hasBoarded && p === 0

          await Passenger.create({
            bookingId: booking.id,
            firstName: nameData.firstName,
            lastName: nameData.lastName,
            phone: p === 0 ? `+237 6${String(Math.floor(globalPaxCounter / 100) % 100).padStart(2, '0')} ${String(globalPaxCounter % 1000).padStart(3, '0')} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}` : null,
            seatNumber: seatCounters[trip.id],
            code: `PAX${String(globalPaxCounter).padStart(3, '0')}`,
            qrCode: randomUUID(),
            status: isBoarded ? 'boarded' : 'pending',
            boardedAt: isBoarded ? DateTime.now().minus({ hours: 1 }) : null,
          })
        }

        // Create payment
        const operator = template.paymentMethod === 'mobile_money'
          ? (['Orange Money', 'MTN MoMo'] as const)[i % 2]
          : null

        const isPaid = template.paymentStatus === 'success'
        const isMobileMoney = template.paymentMethod === 'mobile_money'

        await Payment.create({
          bookingId: booking.id,
          amount: totalAmount,
          paymentMethod: template.paymentMethod,
          operator,
          status: template.paymentStatus,
          paidAt: isPaid ? DateTime.now().minus({ minutes: 30 }) : null,
          externalReference: isMobileMoney ? `TXN-${randomUUID().slice(0, 12).toUpperCase()}` : null,
        })
      }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add database/seeders/09_customer_seeder.ts database/seeders/10_booking_seeder.ts
git commit -m "feat: add customer and booking seeders with passengers and payments"
```

---

## Task 11: Integration Verification

- [ ] **Step 1: Run fresh migration + all seeders**

```bash
node ace migration:fresh --seed
```

Expected: All migrations run, then seeders 00 through 10 execute in order without errors.

- [ ] **Step 2: Verify data counts**

Open a `node ace repl` session or run a quick verification script:

```bash
node ace repl
```

Then in the REPL:
```javascript
const { default: City } = await import('#models/city')
const { default: Tenant } = await import('#models/tenant')
const { default: User } = await import('#models/user')
const { default: Role } = await import('#models/role')
const { default: Franchise } = await import('#models/franchise')
const { default: Bus } = await import('#models/bus')
const { default: Route } = await import('#models/route')
const { default: Trip } = await import('#models/trip')
const { default: Customer } = await import('#models/customer')
const { default: Booking } = await import('#models/booking')
const { default: Passenger } = await import('#models/passenger')
const { default: Payment } = await import('#models/payment')

console.table({
  cities: await City.query().count('*', 'total'),       // 10
  tenants: await Tenant.query().count('*', 'total'),     // 2
  roles: await Role.query().count('*', 'total'),         // 8 (4 per tenant)
  users: await User.query().count('*', 'total'),         // 18 (9 per tenant)
  franchises: await Franchise.query().count('*', 'total'), // 7
  buses: await Bus.query().count('*', 'total'),          // 12 (6 per tenant)
  routes: await Route.query().count('*', 'total'),       // 10 (5 per tenant)
  trips: await Trip.query().count('*', 'total'),         // 24 (12 per tenant)
  customers: await Customer.query().count('*', 'total'), // 30 (15 per tenant)
  bookings: await Booking.query().count('*', 'total'),   // 40 (20 per tenant)
  passengers: await Passenger.query().count('*', 'total'), // ~70-80
  payments: await Payment.query().count('*', 'total'),   // 40 (1 per booking)
})
```

Expected: Counts match the spec design.

- [ ] **Step 3: Verify status distribution**

```javascript
// Booking statuses
await Booking.query().select('status').groupBy('status').count('*', 'total')
// Expected: confirmed ~24, pending ~10, cancelled ~6

// Payment statuses
await Payment.query().select('status').groupBy('status').count('*', 'total')
// Expected: success ~20, pending ~10, refunded ~6, failed ~4

// Trip statuses
await Trip.query().select('status').groupBy('status').count('*', 'total')
// Expected: scheduled ~8, in_progress ~6, completed ~6, cancelled ~4
```

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address seeder issues found during integration verification"
```
