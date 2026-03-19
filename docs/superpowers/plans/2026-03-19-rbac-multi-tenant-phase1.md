# RBAC Multi-Tenant Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement multi-tenant RBAC foundations — tenants, users refactor, roles with inheritance, permissions catalog, and the permission resolver.

**Architecture:** Shared-database multi-tenant with `tenant_id` on all tenant-scoped tables. Roles support hierarchical inheritance (max depth 4). Permissions are a global catalog shared across tenants. System roles are auto-seeded on tenant creation.

**Tech Stack:** AdonisJS v7, Lucid ORM, PostgreSQL, VineJS, Edge.js, Japa (tests)

**Spec:** `docs/superpowers/specs/2026-03-19-rbac-multi-tenant-design.md`

**Docs:**
- AdonisJS: https://docs.adonisjs.com/introduction
- Routing: https://docs.adonisjs.com/guides/basics/routing
- Edge.js: https://edgejs.dev/docs/introduction
- VineJS: https://vinejs.dev/docs/introduction

---

## File Structure

```
config/
  database.ts                          ← MODIFY: switch to PostgreSQL
  rbac.ts                              ← CREATE: system roles + permissions catalog definition
start/
  env.ts                               ← MODIFY: add PG env vars
  kernel.ts                            ← MODIFY: register tenant middleware
  routes.ts                            ← MODIFY: refactor signup flow, add RBAC routes
database/
  migrations/
    <ts>_create_tenants_table.ts       ← CREATE
    <ts>_recreate_users_table.ts       ← CREATE (drop + recreate)
    <ts>_create_roles_table.ts         ← CREATE
    <ts>_create_permissions_table.ts   ← CREATE
    <ts>_create_user_role_assignments_table.ts  ← CREATE
    <ts>_create_role_permissions_table.ts       ← CREATE
  seeders/
    permissions_seeder.ts              ← CREATE
app/
  models/
    tenant.ts                          ← CREATE
    user.ts                            ← MODIFY: UUID, tenant_id, first/last_name
    role.ts                            ← CREATE
    permission.ts                      ← CREATE
    user_role_assignment.ts            ← CREATE
    role_permission.ts                 ← CREATE
  services/
    tenant_service.ts                  ← CREATE: tenant creation + system role seeding
    permission_resolver.ts             ← CREATE: RBAC engine with inheritance
  middleware/
    tenant_middleware.ts               ← CREATE: resolve tenant from auth user
  validators/
    user.ts                            ← MODIFY: signup now creates tenant + user
    tenant.ts                          ← CREATE
    role.ts                            ← CREATE
  controllers/
    new_account_controller.ts          ← MODIFY: create tenant on signup
resources/
  views/
    pages/auth/signup.edge             ← MODIFY: company name + first/last name fields
tests/
  unit/
    permission_resolver.spec.ts        ← CREATE
  functional/
    tenant_creation.spec.ts            ← CREATE
    rbac.spec.ts                       ← CREATE
```

---

## Task 0: Switch to PostgreSQL

**Files:**
- Modify: `start/env.ts`
- Modify: `config/database.ts`
- Modify: `package.json` (install `pg`)

- [ ] **Step 0.1: Install pg driver**

```bash
npm install pg
npm uninstall better-sqlite3
```

- [ ] **Step 0.2: Add PG env vars to `start/env.ts`**

Add these variables inside `Env.create`:

```typescript
// Database (PostgreSQL)
DB_HOST: Env.schema.string({ format: 'host' }),
DB_PORT: Env.schema.number(),
DB_USER: Env.schema.string(),
DB_PASSWORD: Env.schema.string.optional(),
DB_DATABASE: Env.schema.string(),
```

- [ ] **Step 0.3: Update `.env` and `.env.example`**

Add to both files:

```
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_DATABASE=voyager_dev
```

Create `.env.test` with:

```
DB_DATABASE=voyager_test
SESSION_DRIVER=memory
```

- [ ] **Step 0.4: Update `config/database.ts`**

Replace the sqlite config with PostgreSQL:

```typescript
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'pg',
  prettyPrintDebugQueries: true,
  connections: {
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      seeders: {
        paths: ['database/seeders'],
      },
      debug: app.inDev,
    },
  },
})

export default dbConfig
```

- [ ] **Step 0.5: Create the PostgreSQL databases**

```bash
createdb voyager_dev
createdb voyager_test
```

- [ ] **Step 0.6: Enable pgcrypto extension**

Create a migration for the extension:

```bash
node ace make:migration enable_pgcrypto
```

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
  }

  async down() {
    this.schema.raw('DROP EXTENSION IF EXISTS "pgcrypto"')
  }
}
```

- [ ] **Step 0.7: Verify connection**

```bash
node ace migration:run
node ace migration:status
```

Expected: pgcrypto migration marked as "migrated", no connection error.

- [ ] **Step 0.8: Commit**

```bash
git add package.json package-lock.json start/env.ts config/database.ts .env.example .env.test database/migrations/*enable_pgcrypto*
git commit -m "chore: switch from SQLite to PostgreSQL with pgcrypto extension"
```

---

## Task 1: Create Tenants Table + Model

**Files:**
- Create: `database/migrations/<ts>_create_tenants_table.ts`
- Create: `app/models/tenant.ts`

- [ ] **Step 1.1: Generate migration**

```bash
node ace make:migration create_tenants_table
```

- [ ] **Step 1.2: Write the migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tenants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('name').notNullable()
      table.string('slug').notNullable().unique()
      table
        .enum('plan', ['free', 'pro', 'enterprise'], {
          useNative: true,
          enumName: 'tenant_plan',
          existsCheck: false,
        })
        .defaultTo('free')
        .notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "tenant_plan"')
  }
}
```

- [ ] **Step 1.3: Run migration**

```bash
node ace migration:run
```

Expected: "migrated" message for tenants table.

- [ ] **Step 1.4: Create the Tenant model**

Create `app/models/tenant.ts`:

```typescript
import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Tenant extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare slug: string

  @column()
  declare plan: 'free' | 'pro' | 'enterprise'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => User)
  declare users: HasMany<typeof User>
}
```

- [ ] **Step 1.5: Commit**

```bash
git add app/models/tenant.ts database/migrations/*create_tenants*
git commit -m "feat: add tenants table and model"
```

---

## Task 2: Recreate Users Table + Refactor Model

**Files:**
- Create: `database/migrations/<ts>_recreate_users_table.ts`
- Modify: `app/models/user.ts`
- Modify: `app/validators/user.ts`
- Modify: `resources/views/pages/auth/signup.edge`

- [ ] **Step 2.1: Generate migration**

```bash
node ace make:migration recreate_users_table
```

- [ ] **Step 2.2: Write the migration (drop old + create new)**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.dropTableIfExists(this.tableName)

    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table.string('first_name').notNullable()
      table.string('last_name').notNullable()
      table.string('email', 254).notNullable()
      table.string('password').notNullable()
      table.string('external_id').nullable()
      table
        .enum('status', ['active', 'inactive', 'suspended'], {
          useNative: true,
          enumName: 'user_status',
          existsCheck: false,
        })
        .defaultTo('active')
        .notNullable()
      table.boolean('mfa_enabled').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['tenant_id', 'email'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "user_status"')
  }
}
```

- [ ] **Step 2.3: Run migration**

```bash
node ace migration:run
```

- [ ] **Step 2.4: Delete the old users migration**

Delete `database/migrations/1758943358073_create_users_table.ts` — it's superseded by the recreate migration.

- [ ] **Step 2.5: Refactor the User model**

Replace `app/models/user.ts`:

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Tenant from '#models/tenant'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare externalId: string | null

  @column()
  declare status: 'active' | 'inactive' | 'suspended'

  @column()
  declare mfaEnabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  get initials() {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase()
  }
}
```

- [ ] **Step 2.6: Update the signup validator**

Replace `app/validators/user.ts`:

```typescript
import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator for tenant + user signup
 */
export const signupValidator = vine.compile(
  vine.object({
    companyName: vine.string().trim().minLength(2).maxLength(255),
    firstName: vine.string().trim().minLength(1).maxLength(255),
    lastName: vine.string().trim().minLength(1).maxLength(255),
    email: email(),
    password: password().confirmed({
      confirmationField: 'passwordConfirmation',
    }),
  })
)

/**
 * Validator for login
 */
export const loginValidator = vine.compile(
  vine.object({
    email: email(),
    password: vine.string(),
  })
)
```

- [ ] **Step 2.7: Update the signup view**

Replace `resources/views/pages/auth/signup.edge`:

```edge
@layout()
  <div class="form-container">
    <div>
      <h1> Signup </h1>
      <p>
        Create your company account
      </p>
    </div>

    <div>
      @form({ route: 'new_account.store', method: 'POST' })
        <div>
          @field.root({ name: 'companyName' })
            @!field.label({ text: 'Company name' })
            @!input.control({ placeholder: 'Your transport company' })
            @!field.error()
          @end
        </div>

        <div>
          @field.root({ name: 'firstName' })
            @!field.label({ text: 'First name' })
            @!input.control()
            @!field.error()
          @end
        </div>

        <div>
          @field.root({ name: 'lastName' })
            @!field.label({ text: 'Last name' })
            @!input.control()
            @!field.error()
          @end
        </div>

        <div>
          @field.root({ name: 'email' })
            @!field.label({ text: 'Email' })
            @!input.control({ type: 'email', autocomplete: 'email' })
            @!field.error()
          @end
        </div>

        <div>
          @field.root({ name: 'password' })
            @!field.label({ text: 'Password' })
            @!input.control({ type: 'password', autocomplete: 'new-password' })
            @!field.error()
          @end
        </div>

        <div>
          @field.root({ name: 'passwordConfirmation' })
            @!field.label({ text: 'Confirm password' })
            @!input.control({ type: 'password', autocomplete: 'new-password' })
            @!field.error()
          @end
        </div>

        <div>
          @!button({ text: 'Sign up', type: 'submit' })
        </div>
      @end
    </div>
  </div>
@end
```

- [ ] **Step 2.8: Clean up old schema files**

Delete `database/migrations/1758943358073_create_users_table.ts` (already done in step 2.4).

Also delete the auto-generated `database/schema.ts` which exports the old `UserSchema` with `fullName` and integer `id` — it is no longer used since the User model now extends `BaseModel` directly:

```bash
rm -f database/schema.ts
```

Note: `database/schema_rules.ts` can be kept (it exports an empty object).

- [ ] **Step 2.9: Commit**

```bash
git add app/models/user.ts app/validators/user.ts resources/views/pages/auth/signup.edge database/migrations/
git commit -m "feat: recreate users table with UUID, tenant_id, first/last name"
```

---

## Task 3: Create Roles Table + Model

**Files:**
- Create: `database/migrations/<ts>_create_roles_table.ts`
- Create: `app/models/role.ts`

- [ ] **Step 3.1: Generate migration**

```bash
node ace make:migration create_roles_table
```

- [ ] **Step 3.2: Write the migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table
        .uuid('parent_role_id')
        .nullable()
        .references('id')
        .inTable('roles')
        .onDelete('SET NULL')
      table.string('name').notNullable()
      table
        .enum('scope', ['global', 'resource'], {
          useNative: true,
          enumName: 'role_scope',
          existsCheck: false,
        })
        .defaultTo('global')
        .notNullable()
      table.boolean('is_system').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['tenant_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "role_scope"')
  }
}
```

- [ ] **Step 3.3: Run migration**

```bash
node ace migration:run
```

- [ ] **Step 3.4: Create the Role model**

Create `app/models/role.ts`:

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenant'

export default class Role extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare parentRoleId: string | null

  @column()
  declare name: string

  @column()
  declare scope: 'global' | 'resource'

  @column()
  declare isSystem: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Role, { foreignKey: 'parentRoleId' })
  declare parent: BelongsTo<typeof Role>

  @hasMany(() => Role, { foreignKey: 'parentRoleId' })
  declare children: HasMany<typeof Role>
}
```

- [ ] **Step 3.5: Add roles relation to Tenant model**

In `app/models/tenant.ts`, add after the `users` relation:

```typescript
import Role from '#models/role'
// ...
@hasMany(() => Role)
declare roles: HasMany<typeof Role>
```

- [ ] **Step 3.6: Commit**

```bash
git add app/models/role.ts app/models/tenant.ts database/migrations/*create_roles*
git commit -m "feat: add roles table with hierarchical inheritance"
```

---

## Task 4: Create Permissions Table + Model

**Files:**
- Create: `database/migrations/<ts>_create_permissions_table.ts`
- Create: `app/models/permission.ts`

- [ ] **Step 4.1: Generate migration**

```bash
node ace make:migration create_permissions_table
```

- [ ] **Step 4.2: Write the migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'permissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('resource').notNullable()
      table.string('action').notNullable()
      table.text('description').nullable()
      table.boolean('is_sensitive').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['resource', 'action'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

- [ ] **Step 4.3: Run migration**

```bash
node ace migration:run
```

- [ ] **Step 4.4: Create the Permission model**

Create `app/models/permission.ts`:

```typescript
import { DateTime } from 'luxon'
import { BaseModel, column, computed } from '@adonisjs/lucid/orm'

export default class Permission extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare resource: string

  @column()
  declare action: string

  @column()
  declare description: string | null

  @column()
  declare isSensitive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @computed()
  get key() {
    return `${this.resource}:${this.action}`
  }
}
```

- [ ] **Step 4.5: Commit**

```bash
git add app/models/permission.ts database/migrations/*create_permissions*
git commit -m "feat: add permissions table (global catalog)"
```

---

## Task 5: Create Junction Tables (user_role_assignments + role_permissions)

**Files:**
- Create: `database/migrations/<ts>_create_user_role_assignments_table.ts`
- Create: `database/migrations/<ts>_create_role_permissions_table.ts`
- Create: `app/models/user_role_assignment.ts`
- Create: `app/models/role_permission.ts`

- [ ] **Step 5.1: Generate both migrations**

```bash
node ace make:migration create_user_role_assignments_table
node ace make:migration create_role_permissions_table
```

- [ ] **Step 5.2: Write user_role_assignments migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_role_assignments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .uuid('role_id')
        .notNullable()
        .references('id')
        .inTable('roles')
        .onDelete('CASCADE')
      table
        .uuid('resource_id')
        .nullable()
      table
        .uuid('granted_by')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.timestamp('expires_at').nullable()
      table.boolean('is_temporary').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()
    })

    // Partial unique indexes for uniqueness with nullable resource_id
    this.schema.raw(`
      CREATE UNIQUE INDEX user_role_global_unique
      ON user_role_assignments (user_id, role_id)
      WHERE resource_id IS NULL
    `)
    this.schema.raw(`
      CREATE UNIQUE INDEX user_role_resource_unique
      ON user_role_assignments (user_id, role_id, resource_id)
      WHERE resource_id IS NOT NULL
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

- [ ] **Step 5.3: Write role_permissions migration**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'role_permissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('role_id')
        .notNullable()
        .references('id')
        .inTable('roles')
        .onDelete('CASCADE')
      table
        .uuid('permission_id')
        .notNullable()
        .references('id')
        .inTable('permissions')
        .onDelete('CASCADE')
      table
        .uuid('policy_id')
        .nullable()
      table.timestamp('granted_at').notNullable()

      table.unique(['role_id', 'permission_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

Note: `policy_id` FK will be added in Phase 2 when the `policies` table is created. For now it's just a nullable UUID column.

- [ ] **Step 5.4: Run both migrations**

```bash
node ace migration:run
```

- [ ] **Step 5.5: Create UserRoleAssignment model**

Create `app/models/user_role_assignment.ts`:

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Role from '#models/role'

export default class UserRoleAssignment extends BaseModel {
  static table = 'user_role_assignments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare roleId: string

  @column()
  declare resourceId: string | null

  @column()
  declare grantedBy: string

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column()
  declare isTemporary: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>

  @belongsTo(() => User, { foreignKey: 'grantedBy' })
  declare granter: BelongsTo<typeof User>
}
```

- [ ] **Step 5.6: Create RolePermission model**

Create `app/models/role_permission.ts`:

```typescript
import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Role from '#models/role'
import Permission from '#models/permission'

export default class RolePermission extends BaseModel {
  static table = 'role_permissions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare roleId: string

  @column()
  declare permissionId: string

  @column()
  declare policyId: string | null

  @column.dateTime({ autoCreate: true, columnName: 'granted_at' })
  declare grantedAt: DateTime

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>

  @belongsTo(() => Permission)
  declare permission: BelongsTo<typeof Permission>
}
```

- [ ] **Step 5.7: Add relations to Role and User models**

In `app/models/role.ts`, add:

```typescript
import RolePermission from '#models/role_permission'
import UserRoleAssignment from '#models/user_role_assignment'
// ...
@hasMany(() => RolePermission)
declare rolePermissions: HasMany<typeof RolePermission>

@hasMany(() => UserRoleAssignment)
declare userRoleAssignments: HasMany<typeof UserRoleAssignment>
```

In `app/models/user.ts`, add:

```typescript
import UserRoleAssignment from '#models/user_role_assignment'
import type { HasMany } from '@adonisjs/lucid/types/relations'
// ...
@hasMany(() => UserRoleAssignment)
declare roleAssignments: HasMany<typeof UserRoleAssignment>
```

- [ ] **Step 5.8: Commit**

```bash
git add app/models/ database/migrations/*user_role_assignments* database/migrations/*role_permissions*
git commit -m "feat: add user_role_assignments and role_permissions junction tables"
```

---

## Task 6: RBAC Config + Permissions Seeder

**Files:**
- Create: `config/rbac.ts`
- Create: `database/seeders/permissions_seeder.ts`

- [ ] **Step 6.1: Create `config/rbac.ts`**

```typescript
/**
 * RBAC configuration.
 * Defines the global permissions catalog and system roles
 * that are auto-created for each new tenant.
 */

export const permissions = [
  // Vehicles
  { resource: 'vehicle', action: 'create', description: 'Create a vehicle' },
  { resource: 'vehicle', action: 'read', description: 'View vehicles' },
  { resource: 'vehicle', action: 'update', description: 'Update a vehicle' },
  { resource: 'vehicle', action: 'delete', description: 'Delete a vehicle', isSensitive: true },
  { resource: 'vehicle', action: 'assign', description: 'Assign a vehicle to a route' },

  // Routes
  { resource: 'route', action: 'create', description: 'Create a route' },
  { resource: 'route', action: 'read', description: 'View routes' },
  { resource: 'route', action: 'update', description: 'Update a route' },
  { resource: 'route', action: 'delete', description: 'Delete a route', isSensitive: true },

  // Stops
  { resource: 'stop', action: 'create', description: 'Create a stop' },
  { resource: 'stop', action: 'read', description: 'View stops' },
  { resource: 'stop', action: 'update', description: 'Update a stop' },
  { resource: 'stop', action: 'delete', description: 'Delete a stop', isSensitive: true },

  // Drivers
  { resource: 'driver', action: 'create', description: 'Register a driver' },
  { resource: 'driver', action: 'read', description: 'View drivers' },
  { resource: 'driver', action: 'update', description: 'Update driver info' },
  { resource: 'driver', action: 'delete', description: 'Remove a driver', isSensitive: true },
  { resource: 'driver', action: 'assign', description: 'Assign driver to a route' },

  // Users & Roles (tenant admin)
  { resource: 'user', action: 'create', description: 'Invite a user' },
  { resource: 'user', action: 'read', description: 'View users' },
  { resource: 'user', action: 'update', description: 'Update user info' },
  { resource: 'user', action: 'delete', description: 'Remove a user', isSensitive: true },
  { resource: 'role', action: 'create', description: 'Create a custom role' },
  { resource: 'role', action: 'read', description: 'View roles' },
  { resource: 'role', action: 'update', description: 'Update a role' },
  { resource: 'role', action: 'delete', description: 'Delete a role', isSensitive: true },
  { resource: 'role', action: 'assign', description: 'Assign a role to a user' },
] as const

/**
 * System roles created for each new tenant.
 * `permissions` is a list of `resource:action` keys from the catalog above.
 * `'*'` means all permissions.
 */
export const systemRoles = [
  {
    name: 'Admin',
    permissions: '*' as const,
  },
  {
    name: 'Dispatcher',
    permissions: [
      'route:create', 'route:read', 'route:update', 'route:delete',
      'stop:create', 'stop:read', 'stop:update', 'stop:delete',
      'driver:read', 'driver:assign',
      'vehicle:read', 'vehicle:assign',
    ],
  },
  {
    name: 'Chauffeur',
    permissions: [
      'route:read',
      'stop:read',
      'driver:read', 'driver:update',
      'vehicle:read',
    ],
  },
  {
    name: 'Lecteur',
    permissions: [
      'vehicle:read',
      'route:read',
      'stop:read',
      'driver:read',
      'user:read',
      'role:read',
    ],
  },
]
```

- [ ] **Step 6.2: Create permissions seeder**

Create `database/seeders/permissions_seeder.ts`:

```typescript
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Permission from '#models/permission'
import { permissions } from '#config/rbac'

export default class extends BaseSeeder {
  async run() {
    for (const perm of permissions) {
      await Permission.updateOrCreate(
        { resource: perm.resource, action: perm.action },
        {
          description: perm.description,
          isSensitive: 'isSensitive' in perm ? perm.isSensitive : false,
        }
      )
    }
  }
}
```

- [ ] **Step 6.3: Run the seeder**

```bash
node ace db:seed
```

Expected: no errors. Verify with:

```bash
node ace repl
> const Permission = (await import('#models/permission')).default
> await Permission.query().count('* as total')
```

Expected: 27 permissions.

- [ ] **Step 6.4: Commit**

```bash
git add config/rbac.ts database/seeders/permissions_seeder.ts
git commit -m "feat: add RBAC config and permissions catalog seeder"
```

---

## Task 7: Tenant Service (creation + system role seeding)

**Files:**
- Create: `app/services/tenant_service.ts`

- [ ] **Step 7.1: Write the failing test**

Create `tests/unit/tenant_service.spec.ts`:

```typescript
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import TenantService from '#services/tenant_service'
import Tenant from '#models/tenant'
import Role from '#models/role'
import RolePermission from '#models/role_permission'

test.group('TenantService', (group) => {
  group.setup(async () => {
    // Seed permissions catalog (required by TenantService)
    const { default: PermissionsSeeder } = await import('#database/seeders/permissions_seeder')
    await new PermissionsSeeder(db).run()
  })
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('createWithAdmin creates tenant, admin user, and system roles', async ({ assert }) => {
    const result = await TenantService.createWithAdmin({
      companyName: 'TransCo Test',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@transco.test',
      password: 'password123',
    })

    assert.exists(result.tenant)
    assert.exists(result.user)
    assert.equal(result.tenant.name, 'TransCo Test')
    assert.equal(result.tenant.slug, 'transco-test')
    assert.equal(result.user.tenantId, result.tenant.id)

    // Verify system roles were created
    const roles = await Role.query().where('tenant_id', result.tenant.id)
    assert.equal(roles.length, 4)
    const roleNames = roles.map((r) => r.name).sort()
    assert.deepEqual(roleNames, ['Admin', 'Chauffeur', 'Dispatcher', 'Lecteur'])

    // Verify all system roles are flagged
    assert.isTrue(roles.every((r) => r.isSystem))

    // Verify admin role has permissions
    const adminRole = roles.find((r) => r.name === 'Admin')!
    const adminPermissions = await RolePermission.query().where('role_id', adminRole.id)
    assert.isAbove(adminPermissions.length, 0)

    // Verify user has admin role
    const assignments = await result.user.related('roleAssignments').query()
    assert.equal(assignments.length, 1)
    assert.equal(assignments[0].roleId, adminRole.id)
  })

  test('createWithAdmin generates unique slug on conflict', async ({ assert }) => {
    const first = await TenantService.createWithAdmin({
      companyName: 'TransCo',
      firstName: 'A',
      lastName: 'B',
      email: 'a@transco.test',
      password: 'password123',
    })

    const second = await TenantService.createWithAdmin({
      companyName: 'TransCo',
      firstName: 'C',
      lastName: 'D',
      email: 'c@transco2.test',
      password: 'password123',
    })

    assert.notEqual(first.tenant.slug, second.tenant.slug)
    assert.isTrue(second.tenant.slug.startsWith('transco-'))
  })
})
```

- [ ] **Step 7.2: Run test to verify it fails**

```bash
node ace test --files="unit/tenant_service"
```

Expected: FAIL — `#services/tenant_service` not found.

- [ ] **Step 7.3: Implement TenantService**

Create `app/services/tenant_service.ts`:

```typescript
import db from '@adonisjs/lucid/services/db'
import Tenant from '#models/tenant'
import User from '#models/user'
import Role from '#models/role'
import RolePermission from '#models/role_permission'
import Permission from '#models/permission'
import UserRoleAssignment from '#models/user_role_assignment'
import { systemRoles } from '#config/rbac'
import string from '@adonisjs/core/helpers/string'

interface CreateTenantInput {
  companyName: string
  firstName: string
  lastName: string
  email: string
  password: string
}

export default class TenantService {
  /**
   * Create a new tenant with system roles and an admin user.
   */
  static async createWithAdmin(input: CreateTenantInput) {
    return db.transaction(async (trx) => {
      const slug = await this.#generateUniqueSlug(input.companyName, trx)

      const tenant = await Tenant.create(
        { name: input.companyName, slug },
        { client: trx }
      )

      const user = await User.create(
        {
          tenantId: tenant.id,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: input.password,
        },
        { client: trx }
      )

      const adminRole = await this.#seedSystemRoles(tenant.id, trx)

      await UserRoleAssignment.create(
        {
          userId: user.id,
          roleId: adminRole.id,
          grantedBy: user.id,
        },
        { client: trx }
      )

      return { tenant, user }
    })
  }

  /**
   * Seed system roles and their permissions for a tenant.
   * Returns the Admin role.
   */
  static async #seedSystemRoles(tenantId: string, trx: any) {
    const allPermissions = await Permission.query({ client: trx })
    const permissionMap = new Map(allPermissions.map((p) => [`${p.resource}:${p.action}`, p]))

    let adminRole: Role | undefined

    for (const roleDef of systemRoles) {
      const role = await Role.create(
        {
          tenantId,
          name: roleDef.name,
          isSystem: true,
        },
        { client: trx }
      )

      if (roleDef.name === 'Admin') {
        adminRole = role
      }

      const permKeys =
        roleDef.permissions === '*'
          ? [...permissionMap.keys()]
          : roleDef.permissions

      for (const key of permKeys) {
        const permission = permissionMap.get(key)
        if (permission) {
          await RolePermission.create(
            {
              roleId: role.id,
              permissionId: permission.id,
            },
            { client: trx }
          )
        }
      }
    }

    return adminRole!
  }

  /**
   * Generate a unique slug from a company name.
   */
  static async #generateUniqueSlug(name: string, trx: any) {
    const baseSlug = string.slug(name, { lower: true })
    let slug = baseSlug
    let suffix = 1

    while (await Tenant.query({ client: trx }).where('slug', slug).first()) {
      slug = `${baseSlug}-${suffix}`
      suffix++
    }

    return slug
  }
}
```

- [ ] **Step 7.4: Run test to verify it passes**

```bash
node ace test --files="unit/tenant_service"
```

Expected: PASS.

- [ ] **Step 7.5: Commit**

```bash
git add app/services/tenant_service.ts tests/unit/tenant_service.spec.ts
git commit -m "feat: add TenantService with tenant creation and system role seeding"
```

---

## Task 8: Update Signup Flow (Controller + Auth)

**Files:**
- Modify: `app/controllers/new_account_controller.ts`
- Modify: `app/controllers/session_controller.ts`

- [ ] **Step 8.1: Update NewAccountController**

Replace `app/controllers/new_account_controller.ts`:

```typescript
import TenantService from '#services/tenant_service'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class NewAccountController {
  async create({ view }: HttpContext) {
    return view.render('pages/auth/signup')
  }

  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)
    const { user } = await TenantService.createWithAdmin(payload)

    await auth.use('web').login(user)
    response.redirect().toRoute('home')
  }
}
```

- [ ] **Step 8.2: Update SessionController to use loginValidator**

Replace the `store` method in `app/controllers/session_controller.ts`:

```typescript
import User from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  async create({ view }: HttpContext) {
    return view.render('pages/auth/login')
  }

  async store({ request, auth, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(email, password)

    await auth.use('web').login(user)
    response.redirect().toRoute('home')
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
```

- [ ] **Step 8.3: Commit**

```bash
git add app/controllers/new_account_controller.ts app/controllers/session_controller.ts
git commit -m "feat: signup now creates tenant + admin user via TenantService"
```

---

## Task 9: Tenant Middleware

**Files:**
- Create: `app/middleware/tenant_middleware.ts`
- Modify: `start/kernel.ts`

- [ ] **Step 9.1: Generate middleware**

```bash
node ace make:middleware tenant
```

- [ ] **Step 9.2: Implement TenantMiddleware**

Replace `app/middleware/tenant_middleware.ts`:

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'
import Tenant from '#models/tenant'

/**
 * Resolves the current tenant from the authenticated user,
 * makes it available on the HttpContext, and sets the
 * PostgreSQL RLS tenant context via SET LOCAL.
 */
export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user) {
      return next()
    }

    const tenant = await Tenant.findOrFail(user.tenantId)
    ctx.tenant = tenant

    // Set RLS tenant context within a transaction
    // SET LOCAL is scoped to the transaction and auto-clears on commit/rollback
    await db.rawQuery(`SET LOCAL app.current_tenant_id = '${tenant.id}'`)

    return next()
  }
}

/**
 * Extend HttpContext to include the tenant property.
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    tenant?: Tenant
  }
}
```

Note: Full RLS enforcement (CREATE POLICY on each table + transaction-per-request wrapping) will be finalized after all Phase 1 migrations are verified. The `SET LOCAL` here prepares the context; RLS policies will be enabled in a dedicated migration at the end of Phase 1.

- [ ] **Step 9.3: Register in `start/kernel.ts`**

Add to the router middleware stack (after `silent_auth_middleware`):

```typescript
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#middleware/silent_auth_middleware'),
  () => import('#middleware/tenant_middleware'),
])
```

- [ ] **Step 9.4: Commit**

```bash
git add app/middleware/tenant_middleware.ts start/kernel.ts
git commit -m "feat: add TenantMiddleware to resolve tenant from authenticated user"
```

---

## Task 10: Permission Resolver

**Files:**
- Create: `app/services/permission_resolver.ts`
- Create: `tests/unit/permission_resolver.spec.ts`

- [ ] **Step 10.1: Write the failing tests**

Create `tests/unit/permission_resolver.spec.ts`:

```typescript
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import TenantService from '#services/tenant_service'
import PermissionResolver from '#services/permission_resolver'
import Role from '#models/role'
import Permission from '#models/permission'
import RolePermission from '#models/role_permission'
import UserRoleAssignment from '#models/user_role_assignment'

test.group('PermissionResolver', (group) => {
  group.setup(async () => {
    const { default: PermissionsSeeder } = await import('#database/seeders/permissions_seeder')
    await new PermissionsSeeder(db).run()
  })
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('admin user has all permissions', async ({ assert }) => {
    const { user, tenant } = await TenantService.createWithAdmin({
      companyName: 'Test Co',
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      password: 'password123',
    })

    const resolver = new PermissionResolver(user)
    assert.isTrue(await resolver.can('vehicle:delete'))
    assert.isTrue(await resolver.can('route:create'))
    assert.isTrue(await resolver.can('user:delete'))
  })

  test('lecteur can only read', async ({ assert }) => {
    const { user, tenant } = await TenantService.createWithAdmin({
      companyName: 'Test Co',
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      password: 'password123',
    })

    // Create a second user with Lecteur role
    const User = (await import('#models/user')).default
    const lecteur = await User.create({
      tenantId: tenant.id,
      firstName: 'C',
      lastName: 'D',
      email: 'c@test.co',
      password: 'password123',
    })

    const lecteurRole = await Role.query()
      .where('tenant_id', tenant.id)
      .where('name', 'Lecteur')
      .firstOrFail()

    await UserRoleAssignment.create({
      userId: lecteur.id,
      roleId: lecteurRole.id,
      grantedBy: user.id,
    })

    const resolver = new PermissionResolver(lecteur)
    assert.isTrue(await resolver.can('vehicle:read'))
    assert.isTrue(await resolver.can('route:read'))
    assert.isFalse(await resolver.can('vehicle:create'))
    assert.isFalse(await resolver.can('vehicle:delete'))
  })

  test('inherited permissions from parent role', async ({ assert }) => {
    const { user, tenant } = await TenantService.createWithAdmin({
      companyName: 'Test Co',
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      password: 'password123',
    })

    const lecteurRole = await Role.query()
      .where('tenant_id', tenant.id)
      .where('name', 'Lecteur')
      .firstOrFail()

    // Create a child role that inherits from Lecteur and adds vehicle:create
    const seniorLecteur = await Role.create({
      tenantId: tenant.id,
      name: 'Senior Lecteur',
      parentRoleId: lecteurRole.id,
    })

    const vehicleCreate = await Permission.query()
      .where('resource', 'vehicle')
      .where('action', 'create')
      .firstOrFail()

    await RolePermission.create({
      roleId: seniorLecteur.id,
      permissionId: vehicleCreate.id,
    })

    // Create user with Senior Lecteur role
    const User = (await import('#models/user')).default
    const testUser = await User.create({
      tenantId: tenant.id,
      firstName: 'E',
      lastName: 'F',
      email: 'e@test.co',
      password: 'password123',
    })

    await UserRoleAssignment.create({
      userId: testUser.id,
      roleId: seniorLecteur.id,
      grantedBy: user.id,
    })

    const resolver = new PermissionResolver(testUser)
    // Own permission
    assert.isTrue(await resolver.can('vehicle:create'))
    // Inherited from Lecteur
    assert.isTrue(await resolver.can('vehicle:read'))
    assert.isTrue(await resolver.can('route:read'))
    // Not granted
    assert.isFalse(await resolver.can('vehicle:delete'))
  })

  test('user with no roles has no permissions', async ({ assert }) => {
    const { tenant } = await TenantService.createWithAdmin({
      companyName: 'Test Co',
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      password: 'password123',
    })

    const User = (await import('#models/user')).default
    const noRoleUser = await User.create({
      tenantId: tenant.id,
      firstName: 'G',
      lastName: 'H',
      email: 'g@test.co',
      password: 'password123',
    })

    const resolver = new PermissionResolver(noRoleUser)
    assert.isFalse(await resolver.can('vehicle:read'))
  })
})
```

- [ ] **Step 10.2: Run tests to verify they fail**

```bash
node ace test --files="unit/permission_resolver"
```

Expected: FAIL — `#services/permission_resolver` not found.

- [ ] **Step 10.3: Implement PermissionResolver**

Create `app/services/permission_resolver.ts`:

```typescript
import User from '#models/user'
import Role from '#models/role'
import RolePermission from '#models/role_permission'
import UserRoleAssignment from '#models/user_role_assignment'

const MAX_INHERITANCE_DEPTH = 4

/**
 * Resolves the effective permissions for a user,
 * including inherited permissions from parent roles.
 */
export default class PermissionResolver {
  #user: User
  #permissionCache: Set<string> | null = null

  constructor(user: User) {
    this.#user = user
  }

  /**
   * Check if the user has the given permission.
   * @param permissionKey - Format: "resource:action" (e.g., "vehicle:delete")
   */
  async can(permissionKey: string): Promise<boolean> {
    const permissions = await this.#resolve()
    return permissions.has(permissionKey)
  }

  /**
   * Check if the user has ANY of the given permissions.
   */
  async canAny(permissionKeys: string[]): Promise<boolean> {
    const permissions = await this.#resolve()
    return permissionKeys.some((key) => permissions.has(key))
  }

  /**
   * Check if the user has ALL of the given permissions.
   */
  async canAll(permissionKeys: string[]): Promise<boolean> {
    const permissions = await this.#resolve()
    return permissionKeys.every((key) => permissions.has(key))
  }

  /**
   * Get all resolved permission keys for this user.
   */
  async permissions(): Promise<Set<string>> {
    return this.#resolve()
  }

  /**
   * Clear the cached permissions (call after role/permission changes).
   */
  clearCache() {
    this.#permissionCache = null
  }

  /**
   * Resolve all effective permissions for the user.
   * Results are cached for the lifetime of this instance.
   */
  async #resolve(): Promise<Set<string>> {
    if (this.#permissionCache) {
      return this.#permissionCache
    }

    // Get all role assignments for this user
    const assignments = await UserRoleAssignment.query()
      .where('user_id', this.#user.id)
      .where((query) => {
        query.whereNull('expires_at').orWhere('expires_at', '>', new Date())
      })

    // Collect all role IDs including inherited parents
    const allRoleIds = new Set<string>()
    for (const assignment of assignments) {
      await this.#collectRoleChain(assignment.roleId, allRoleIds, 0)
    }

    if (allRoleIds.size === 0) {
      this.#permissionCache = new Set()
      return this.#permissionCache
    }

    // Fetch all permissions for these roles
    const rolePermissions = await RolePermission.query()
      .whereIn('role_id', [...allRoleIds])
      .preload('permission')

    const permissionKeys = new Set<string>()
    for (const rp of rolePermissions) {
      permissionKeys.add(`${rp.permission.resource}:${rp.permission.action}`)
    }

    this.#permissionCache = permissionKeys
    return this.#permissionCache
  }

  /**
   * Recursively collect role IDs up the inheritance chain.
   */
  async #collectRoleChain(roleId: string, collected: Set<string>, depth: number) {
    if (depth >= MAX_INHERITANCE_DEPTH || collected.has(roleId)) {
      return
    }

    collected.add(roleId)

    const role = await Role.find(roleId)
    if (role?.parentRoleId) {
      await this.#collectRoleChain(role.parentRoleId, collected, depth + 1)
    }
  }
}
```

- [ ] **Step 10.4: Run tests to verify they pass**

```bash
node ace test --files="unit/permission_resolver"
```

Expected: all 4 tests PASS.

- [ ] **Step 10.5: Commit**

```bash
git add app/services/permission_resolver.ts tests/unit/permission_resolver.spec.ts
git commit -m "feat: add PermissionResolver with role inheritance (max depth 4)"
```

---

## Task 11: Functional Test — Full Signup Flow

**Files:**
- Create: `tests/functional/tenant_creation.spec.ts`

- [ ] **Step 11.1: Add functional suite to adonisrc.ts**

In `adonisrc.ts`, add to the `tests.suites` array:

```typescript
{
  files: ['tests/functional/**/*.spec.ts'],
  name: 'functional',
  timeout: 30000,
},
```

- [ ] **Step 11.2: Write the functional test**

Create `tests/functional/tenant_creation.spec.ts`:

```typescript
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import Tenant from '#models/tenant'
import Role from '#models/role'
import User from '#models/user'

test.group('Tenant creation via signup', (group) => {
  group.setup(async () => {
    const { default: PermissionsSeeder } = await import('#database/seeders/permissions_seeder')
    await new PermissionsSeeder(db).run()
  })
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('POST /signup creates tenant, admin user, and system roles', async ({ assert, client }) => {
    const response = await client.post('/signup').form({
      companyName: 'Bus Express',
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie@busexpress.com',
      password: 'securepass123',
      passwordConfirmation: 'securepass123',
    })

    response.assertStatus(302)

    const user = await User.findBy('email', 'marie@busexpress.com')
    assert.exists(user)

    const tenant = await Tenant.findOrFail(user!.tenantId)
    assert.equal(tenant.name, 'Bus Express')
    assert.equal(tenant.slug, 'bus-express')

    const roles = await Role.query().where('tenant_id', tenant.id).orderBy('name')
    assert.equal(roles.length, 4)
    assert.deepEqual(
      roles.map((r) => r.name),
      ['Admin', 'Chauffeur', 'Dispatcher', 'Lecteur']
    )
  })
})
```

- [ ] **Step 11.3: Run functional tests**

```bash
node ace test functional
```

Expected: PASS.

- [ ] **Step 11.4: Commit**

```bash
git add tests/functional/tenant_creation.spec.ts adonisrc.ts
git commit -m "test: add functional test for tenant creation via signup"
```

---

## Task 12: Run Full Test Suite + Final Verification

- [ ] **Step 12.1: Run all tests**

```bash
node ace test
```

Expected: all unit and functional tests pass.

- [ ] **Step 12.2: Run typecheck**

```bash
npm run typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 12.3: Run linter**

```bash
npm run lint
```

Fix any issues that come up.

- [ ] **Step 12.4: Final commit (if lint fixes)**

```bash
git add -A
git commit -m "chore: lint fixes"
```

- [ ] **Step 12.5: Verify migration from scratch**

```bash
node ace migration:rollback --batch=0
node ace migration:run
node ace db:seed
```

Expected: all migrations run cleanly, seeder creates 27 permissions.
