# Factories & Seeders — Test Data for Voyager

## Context

The Voyager platform has 15 models but no factories and only one seeder (permissions). As a tester, realistic seed data is needed across all modules to validate features: multi-tenant isolation, RBAC, booking flows, boarding, payments, and dashboards.

## Decisions

- **Approach:** AdonisJS Lucid factories (`factory.define()`) + separate numbered seeders
- **Data theme:** West Africa / Cameroon — realistic city names, francophone names, FCFA prices, Cameroonian plates, mobile money operators (Orange Money, MTN MoMo)
- **Volume:** 2 tenants, ~8 users each, 3-4 franchises, 5-6 buses, 4-5 routes, ~10 trips, ~15 customers, ~20 bookings with passengers and payments per tenant
- **Test password:** All seeded users share `password123` for manual testing convenience

## Factories

13 factory files in `database/factories/`, one per model (excluding `Permission` and `RolePermission` which are config-driven via the existing `permissions_seeder`).

### TenantFactory

- `name`: Random from curated list of West African transport companies
- `slug`: Slugified name
- `plan`: Random from `free`, `pro`, `enterprise`

### UserFactory

- `firstName` / `lastName`: Curated francophone West African names
- `email`: Derived from name + faker domain
- `password`: Static `password123` (hashed by model hook)
- `status`: Default `active`
- `tenantId`: Must be merged by caller

### RoleFactory

- `name`: Faker role name
- `scope`: Default `global`
- `isSystem`: Default `false`
- `tenantId`: Must be merged by caller

### UserRoleAssignmentFactory

- `isTemporary`: Default `false`
- `userId`, `roleId`, `grantedBy`: Must be merged by caller

### CityFactory

- `name` / `country`: Curated list of real West African cities with their countries

### FranchiseFactory

- `name`: Pattern "Agence {Quartier}" from curated Cameroonian neighborhood names
- `address`: Realistic addresses (Akwa, Mokolo, Bastos, etc.)
- `phone`: Format `+237 6XX XXX XXX`
- `active`: Default `true`
- `tenantId`, `cityId`: Must be merged by caller

### RouteFactory

- `code`: Generated from city codes (e.g., `DLA-YDE`)
- `distanceKm`: Realistic range 50-600 km
- `estimatedDurationMinutes`: Proportional to distance
- `status`: Default `active`
- `tenantId`, `departureCityId`, `arrivalCityId`: Must be merged by caller

### BusFactory

- `licensePlate`: Cameroonian format `LT-XXXX-XX` / `CE-XXXX-XX`
- `brand` / `model`: Realistic bus brands (Toyota Coaster, Mercedes Sprinter, Yutong ZK6)
- `capacity`: 30-70 seats
- `year`: 2015-2025
- `status`: Default `available`
- `tenantId`: Must be merged by caller

### TripFactory

- `departureTime`: Random future date within 30 days
- `arrivalTime`: Departure + route estimated duration
- `travelClass`: Random `standard` or `vip`
- `price`: 3000-15000 FCFA range
- `status`: Default `scheduled`
- `tenantId`, `routeId`, `busId`, `driverId`: Must be merged by caller

### CustomerFactory

- `firstName` / `lastName`: Curated West African names
- `phone`: Format `+237 6XX XXX XXX`, unique per tenant
- `email`: Optional, derived from name
- `tenantId`: Must be merged by caller

### BookingFactory

- `totalAmount`: Default `0` (computed by seeder based on passengers)
- `status`: Default `pending`
- `tenantId`, `tripId`, `customerId`, `agentId`, `franchiseId`: Must be merged by caller

### PassengerFactory

- `firstName` / `lastName`: Curated West African names
- `seatNumber`: Sequential, must be merged by caller
- `code`: Random 6-char alphanumeric uppercase
- `qrCode`: Random UUID
- `status`: Default `pending`
- `bookingId`: Must be merged by caller

### PaymentFactory

- `amount`: Must be merged by caller (matches booking total)
- `paymentMethod`: Random from `cash`, `mobile_money`, `card`
- `operator`: Conditional — `Orange Money` or `MTN MoMo` when mobile_money, `null` otherwise
- `status`: Default `pending`
- `bookingId`: Must be merged by caller

## Seeders

10 numbered seeder files in `database/seeders/`. Prefix ensures correct FK execution order via `node ace db:seed`. Each can also run standalone.

### 01_city_seeder.ts

Creates 10 cities:

| City | Country |
|---|---|
| Douala | Cameroun |
| Yaoundé | Cameroun |
| Bafoussam | Cameroun |
| Bamenda | Cameroun |
| Kribi | Cameroun |
| Limbé | Cameroun |
| Bertoua | Cameroun |
| Abidjan | Côte d'Ivoire |
| Lomé | Togo |
| Cotonou | Bénin |

Uses `City.updateOrCreate` on `(name, country)` for idempotency.

### 02_tenant_seeder.ts

Creates 2 tenants:

| Name | Slug | Plan |
|---|---|---|
| General Express Voyages | general-express-voyages | pro |
| Touristique Express | touristique-express | free |

Uses `Tenant.updateOrCreate` on `slug` for idempotency.

### 03_role_seeder.ts

For each tenant, creates the 4 system roles from `#config/rbac` (Admin, Dispatcher, Chauffeur, Lecteur) with `isSystem: true`. Then runs the permissions sync logic (same as `permissions_seeder`) to attach permissions to each role.

Uses `Role.updateOrCreate` on `(tenantId, name)`.

### 04_user_seeder.ts

Per tenant (~8 users):

| Role | Count | Details |
|---|---|---|
| Admin | 1 | `admin@{slug}.com` |
| Dispatcher | 2 | Named dispatchers |
| Chauffeur | 3 | Named drivers |
| Agent (Dispatcher role) | 2 | Booking agents assigned to franchises |

All with `password: password123`, `status: active`. Creates `UserRoleAssignment` records linking users to their roles. Admin user is the `grantedBy` for all assignments.

### 05_franchise_seeder.ts

Per tenant, 3-4 franchises in different cities:

| Tenant 1 (General Express) | Tenant 2 (Touristique Express) |
|---|---|
| Agence Akwa (Douala) | Agence Mokolo (Yaoundé) |
| Agence Bastos (Yaoundé) | Agence Bonabéri (Douala) |
| Agence Tamdja (Bafoussam) | Agence Plateau (Abidjan) |
| Agence Plateau (Abidjan) | — |

Updates agent users' `franchiseId` to link them to franchises.

### 06_bus_seeder.ts

Per tenant, 6 buses with varied statuses:

| # | Status | Example |
|---|---|---|
| 3 | available | Toyota Coaster, 30 seats |
| 1 | on_trip | Mercedes Sprinter, 45 seats |
| 1 | maintenance | Yutong ZK6, 70 seats |
| 1 | out_of_service | Golden Dragon, 50 seats |

Cameroonian plates: `LT-XXXX-XX` for Littoral, `CE-XXXX-XX` for Centre.

### 07_route_seeder.ts

Per tenant, 5 routes:

| Code | From | To | Distance | Duration |
|---|---|---|---|---|
| DLA-YDE | Douala | Yaoundé | 250 km | 240 min |
| YDE-BFM | Yaoundé | Bafoussam | 300 km | 300 min |
| DLA-KBI | Douala | Kribi | 150 km | 180 min |
| DLA-LBE | Douala | Limbé | 80 km | 90 min |
| YDE-ABJ | Yaoundé | Abidjan | 1200 km | 960 min |

### 08_trip_seeder.ts

Per tenant, ~12 trips across routes:

- 4 `scheduled` — future dates (next 7 days)
- 3 `in_progress` — departed today
- 3 `completed` — past 7 days
- 2 `cancelled`

Mix of `standard` and `vip` travel classes. Prices: standard 3000-8000 FCFA, VIP 8000-15000 FCFA. Assigns available buses and chauffeur users as drivers.

### 09_customer_seeder.ts

Per tenant, 15 customers with West African names and `+237` phone numbers. Mix of with/without email addresses.

### 10_booking_seeder.ts

Per tenant, ~20 bookings across trips. Each booking gets:

- 1-4 passengers with sequential seat numbers and unique codes/QR
- 1 payment record

Status distribution:

| Booking Status | Payment Status | Passenger Status | Count |
|---|---|---|---|
| confirmed | success | mix of pending/boarded | 10 |
| pending | pending | pending | 5 |
| cancelled | refunded | pending | 3 |
| confirmed | failed | pending | 2 |

`totalAmount` = trip price x number of passengers. Agent and franchise are set from the seeded users/franchises.

## Execution

```bash
# Run all seeders in order
node ace db:seed

# Run a specific seeder
node ace db:seed --files ./database/seeders/01_city_seeder.ts

# Reset and reseed (migration:fresh + seed)
node ace migration:fresh --seed
```

## File Structure

```
database/
├── factories/
│   ├── tenant_factory.ts
│   ├── user_factory.ts
│   ├── role_factory.ts
│   ├── user_role_assignment_factory.ts
│   ├── city_factory.ts
│   ├── franchise_factory.ts
│   ├── route_factory.ts
│   ├── bus_factory.ts
│   ├── trip_factory.ts
│   ├── customer_factory.ts
│   ├── booking_factory.ts
│   ├── passenger_factory.ts
│   └── payment_factory.ts
├── seeders/
│   ├── permissions_seeder.ts  (existing, unchanged)
│   ├── 01_city_seeder.ts
│   ├── 02_tenant_seeder.ts
│   ├── 03_role_seeder.ts
│   ├── 04_user_seeder.ts
│   ├── 05_franchise_seeder.ts
│   ├── 06_bus_seeder.ts
│   ├── 07_route_seeder.ts
│   ├── 08_trip_seeder.ts
│   ├── 09_customer_seeder.ts
│   └── 10_booking_seeder.ts
```
