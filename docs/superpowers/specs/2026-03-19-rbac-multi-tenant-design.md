# RBAC Multi-Tenant Design — Voyager

## Context

Voyager is a SaaS platform for bus transport companies. Each tenant is a transport company managing vehicles, drivers, routes, and stops. The system needs enterprise-grade access control: role-based (RBAC) with hierarchical inheritance, attribute-based conditional policies (ABAC), and full audit logging on sensitive actions.

**Stack:** AdonisJS v7, Lucid ORM, PostgreSQL, session-based auth.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tenant isolation | Shared DB + shared schema + RLS | Standard SaaS pattern, scales to hundreds of tenants without operational overhead |
| Database | PostgreSQL | Native UUID, JSONB for policy conditions, RLS, concurrency |
| Role inheritance | Automatic permission propagation | Natural fit for transport hierarchy (admin > dispatcher > driver); max depth 4 |
| System roles | Pre-created on tenant onboarding | Reduces onboarding friction; Admin, Dispatcher, Chauffeur, Lecteur |
| Permissions catalog | Global (not per-tenant) | All tenants share the same action vocabulary; simplifies upgrades |
| ABAC policies | deny > allow, priority-sorted | Secure by default; explicit deny always wins |
| Audit scope | Sensitive actions + all denies | Balance between observability and storage volume |
| User identity | first_name + last_name (not full_name) | Per user preference |

## Database Schema

### tenants

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| name | varchar | NOT NULL |
| slug | varchar | NOT NULL, UNIQUE |
| plan | enum(`free`, `pro`, `enterprise`) | default `free` |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

### users (refactored from existing)

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| tenant_id | uuid | FK → tenants, NOT NULL |
| first_name | varchar | NOT NULL |
| last_name | varchar | NOT NULL |
| email | varchar(254) | NOT NULL |
| password | varchar | NOT NULL |
| external_id | varchar | NULLABLE (future SSO) |
| status | enum(`active`, `inactive`, `suspended`) | default `active` |
| mfa_enabled | boolean | default `false` |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

**Constraints:** `UNIQUE(tenant_id, email)` — email unique per tenant, not globally.

**Migration strategy:** Since this is pre-production, drop and recreate the `users` table (not ALTER). The existing `UserSchema` in `database/schema.ts` must be regenerated. The `User.initials` getter must be updated to use `this.firstName` and `this.lastName`.

### roles

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| tenant_id | uuid | FK → tenants, NOT NULL |
| parent_role_id | uuid | FK → roles, NULLABLE |
| name | varchar | NOT NULL |
| scope | enum(`global`, `resource`) | default `global` |
| is_system | boolean | default `false` |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

**Constraints:** `UNIQUE(tenant_id, name)`. Max inheritance depth: 4 levels.

### permissions

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| resource | varchar | NOT NULL |
| action | varchar | NOT NULL |
| description | text | NULLABLE |
| is_sensitive | boolean | default `false` |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

**Constraints:** `UNIQUE(resource, action)`. Global table — not tenant-scoped.

### resources

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| tenant_id | uuid | FK → tenants, NOT NULL |
| parent_id | uuid | FK → resources, NULLABLE |
| type | varchar | NOT NULL |
| name | varchar | NOT NULL |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

Resource types: `vehicle`, `route`, `driver`, `stop`.

### policies

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| tenant_id | uuid | FK → tenants, NOT NULL |
| name | varchar | NOT NULL |
| effect | enum(`allow`, `deny`) | NOT NULL |
| conditions | jsonb | NOT NULL, default `{}` |
| priority | integer | NOT NULL, default `0` |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

Condition format example:
```json
{
  "ip_range": "10.0.0.0/8",
  "time_window": { "start": "08:00", "end": "18:00" },
  "day_of_week": ["mon", "tue", "wed", "thu", "fri"]
}
```

### user_role_assignments

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| user_id | uuid | FK → users, NOT NULL |
| role_id | uuid | FK → roles, NOT NULL |
| resource_id | uuid | FK → resources, NULLABLE |
| granted_by | uuid | FK → users, NOT NULL |
| expires_at | timestamp | NULLABLE |
| is_temporary | boolean | default `false` |
| created_at | timestamp | NOT NULL |

**Uniqueness:** Two partial unique indexes (PostgreSQL):
- `UNIQUE(user_id, role_id) WHERE resource_id IS NULL` — one global assignment per role
- `UNIQUE(user_id, role_id, resource_id) WHERE resource_id IS NOT NULL` — one scoped assignment per role+resource

Note: Lucid ORM requires a single-column PK (`id`). Composite PKs are not supported.

### role_permissions

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| role_id | uuid | FK → roles, NOT NULL |
| permission_id | uuid | FK → permissions, NOT NULL |
| policy_id | uuid | FK → policies, NULLABLE |
| granted_at | timestamp | NOT NULL |

**Constraints:** `UNIQUE(role_id, permission_id)` — one permission per role. One policy per role+permission is a deliberate constraint; to apply multiple conditions, combine them in a single policy's `conditions` JSONB.

Note: Lucid ORM requires a single-column PK (`id`).

### audit_logs

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| tenant_id | uuid | FK → tenants, NOT NULL |
| user_id | uuid | FK → users, NULLABLE (null for system-initiated events) |
| action | varchar | NOT NULL |
| resource_type | varchar | NOT NULL |
| resource_id | uuid | NULLABLE |
| decision | enum(`allow`, `deny`) | NOT NULL |
| context | jsonb | default `{}` |
| created_at | timestamp | NOT NULL |

**Append-only:** no UPDATE or DELETE. Index on `(tenant_id, created_at)`.

## Default System Roles

Created automatically on tenant onboarding (`is_system = true`, non-deletable):

| Role | Permissions |
|------|------------|
| Admin | All permissions |
| Dispatcher | CRUD on routes, stops; read/assign drivers and vehicles |
| Chauffeur | Read assigned routes/stops, update own status |
| Lecteur | Read-only on all resources |

## Application Architecture

### File Structure

```
app/
  models/
    tenant.ts
    user.ts                     ← refactored
    role.ts
    permission.ts
    resource.ts
    policy.ts
    user_role_assignment.ts
    role_permission.ts
    audit_log.ts
  services/
    tenant_service.ts           ← tenant creation + system roles seeding
    permission_resolver.ts      ← RBAC engine (inheritance + ABAC evaluation)
    audit_service.ts            ← decision logging
  middleware/
    tenant_middleware.ts         ← resolve tenant from authenticated user
  policies/
    resource_policy.ts          ← AdonisJS Bouncer high-level policies
config/
  rbac.ts                       ← system roles definition, permissions catalog
database/
  migrations/
    ...create_tenants_table.ts
    ...recreate_users_table.ts   ← drop & recreate (pre-production)
    ...create_roles_table.ts
    ...create_permissions_table.ts
    ...create_resources_table.ts
    ...create_policies_table.ts
    ...create_user_role_assignments_table.ts
    ...create_role_permissions_table.ts
    ...create_audit_logs_table.ts
    ...seed_permissions.ts
```

### Permission Resolution Flow

```
1. TenantMiddleware → resolve tenant from authenticated user (user.tenant_id)
         ↓
2. PermissionResolver receives (user, action, resource?)
         ↓
3. Fetch user's roles (+ inherited roles via parent_role_id, max depth 4)
         ↓
4. Collect all permissions from resolved roles
         ↓
5. Check if requested action exists in permissions
         ↓
6. If policy attached (role_permissions.policy_id):
   → Evaluate JSONB conditions (ip_range, time_window, day_of_week, etc.)
   → deny > allow (deny wins on conflict, sorted by priority)
         ↓
7. Final decision → allow or deny
         ↓
8. Check permission.is_sensitive (eagerly loaded with role_permissions in step 4)
         ↓
9. AuditService logs decision (if is_sensitive=true or decision=deny)
```

### Tenant Identification

Resolved from the authenticated user's `tenant_id`. No subdomain or custom header needed — simplest approach for session-based auth.

Middleware injects tenant into `HttpContext`:
```typescript
ctx.tenant = await user.related('tenant').query().firstOrFail()
```

### Row Level Security (PostgreSQL)

Applied as a safety net on top of application-level `tenant_id` filtering:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

The `TenantMiddleware` wraps every request in an explicit database transaction (`Database.transaction()`) and sets the tenant context within that transaction:
```typescript
await db.rawQuery('SET LOCAL app.current_tenant_id = ?', [tenant.id])
```
`SET LOCAL` is scoped to the transaction — when the transaction commits or rolls back, the setting is automatically cleared, preventing tenant context leaking across pooled connections.

### Permission Cache

In-memory Map per user, invalidated when:
- A role is modified
- A user↔role assignment changes
- TTL of 5 minutes as safety net

**Limitation:** In-memory cache is per-process. In multi-instance deployments (PM2 cluster, horizontal scaling), a role change invalidates the cache only in the process that handled the write. Other processes serve stale permissions for up to 5 minutes (TTL). For production with multiple instances, replace with Redis + pub/sub invalidation.

## Implementation Phases

### Phase 1 — Multi-tenant foundations + RBAC

**Migrations:** tenants, users refactor (UUID, tenant_id, first_name/last_name, status), roles, permissions, user_role_assignments, role_permissions.

**Application code:**
- Lucid models with relationships
- TenantMiddleware
- TenantService (tenant creation + system role seeding)
- PermissionResolver (recursive inheritance, max depth 4)
- User model refactor + signup flow (create tenant + admin user)
- Permissions catalog seeder
- `rbac.ts` config

**Deliverable:** User signs up → tenant created → user is Admin → can create custom roles, assign permissions, invite users.

### Phase 2 — ABAC (conditional policies)

**Migrations:** policies table, add policy_id to role_permissions.

**Application code:**
- Policy model
- Condition evaluators (ip_range, time_window, day_of_week)
- Integration into PermissionResolver
- Conflict resolution: deny wins, sorted by priority

**Deliverable:** Admin can create a policy "access only during business hours" and attach it to a role.

### Phase 3 — Resources + Audit

**Migrations:** resources (tree structure), audit_logs.

**Application code:**
- Resource model with recursive parent/children
- AuditService (auto-log sensitive actions + denies)
- Resource-scoped role assignments (user_role_assignments.resource_id)
- Integration into PermissionResolver

**Deliverable:** Model "Ligne 42 → Arrêt A, Arrêt B"; assign a Dispatcher to Ligne 42 only. All sensitive actions are traced.

### Pre-Phase 1 — PostgreSQL Migration

- Install `pg` driver
- Switch `config/database.ts` to PostgreSQL
- Enable extensions: `pgcrypto` for `gen_random_uuid()`
- Configure RLS after Phase 1 migrations
