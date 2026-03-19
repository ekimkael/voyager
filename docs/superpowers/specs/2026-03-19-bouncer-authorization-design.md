# Bouncer Authorization Layer

**Date:** 2026-03-19
**Status:** Approved

## Objective

Add a declarative authorization layer using AdonisJS Bouncer, wired to the existing `PermissionResolver` service. Bouncer provides the developer-facing API (abilities, `@can`/`@cannot` in Edge, `bouncer.authorize()` in controllers) while `PermissionResolver` remains the engine that resolves permissions through the RBAC role hierarchy.

## Design Decisions

### Bouncer as thin layer, not replacement

The project already has a sophisticated RBAC system: role hierarchy (4 levels deep), resource-scoped assignments, temporary assignments with expiration, and a `PermissionResolver` that handles all this logic with caching. Bouncer's native abilities/policies cannot replicate this. Therefore Bouncer acts as a declarative interface that delegates to `PermissionResolver` under the hood.

### One generic ability, not N specific abilities

The permission catalog is dynamic (defined in `config/rbac.ts`, stored in database). Creating one ability per permission (`editVehicle`, `deleteRoute`, etc.) would be rigid duplication. A single `permission` ability that accepts a `key: string` parameter covers all cases.

### Abilities over Policies

Bouncer policies are class-based and designed for model ownership checks (e.g., "does this user own this post?"). The current authorization model is permission-key-based (`resource:action`), not ownership-based. Abilities are the right fit. Resource-level ownership checks can be added later when CRUD controllers exist, using the `resourceId` field already present on `UserRoleAssignment`.

### Denial behavior varies by context

- **Navigation (middleware):** Redirect to `/dashboard` with flash message — user-friendly, non-disruptive.
- **Actions (controller `bouncer.authorize()`):** 403 status page — appropriate for form submissions or direct access attempts.

### Request-scoped PermissionResolver for caching

`PermissionResolver` caches resolved permissions in a private `#permissionCache` field. If a new instance is created for each `@can` check in a template, the cache is useless — each check triggers a fresh database query. To preserve caching across a full request (middleware + controller + multiple `@can` calls in Edge), a single `PermissionResolver` instance is attached to the HTTP context and reused everywhere.

## Architecture

```
HTTP Request
  → AuthMiddleware (ensures authenticated user)
  → TenantMiddleware (sets RLS context)
  → InitializeBouncerMiddleware (injects ctx.bouncer — auto-registered in router.use by Bouncer install)
  → PermissionMiddleware (optional, route-level gate)
  → Controller (fine-grained bouncer.authorize())
  → Edge template (@can/@cannot for UI)
        ↓
  All delegate to: PermissionResolver (single instance per request, via ctx)
```

## Components

### 1. Request-scoped PermissionResolver — `app/middleware/permission_resolver_middleware.ts`

A lightweight middleware that creates one `PermissionResolver` per request and attaches it to `HttpContext`. This ensures all authorization checks (middleware, abilities, controllers) share the same cached instance.

```typescript
import PermissionResolver from '#services/permission_resolver'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class PermissionResolverMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (ctx.auth.user) {
      ctx.permissionResolver = new PermissionResolver(ctx.auth.user)
    }
    return next()
  }
}
```

Registered in `router.use([...])` after `tenant_middleware` (because `PermissionResolver` queries RBAC tables that are scoped by PostgreSQL RLS — the tenant context must be set first). Requires a type augmentation on `HttpContext` to add the `permissionResolver` property.

### 2. Ability definition — `app/abilities/main.ts`

```typescript
import { Bouncer } from '@adonisjs/bouncer'
import User from '#models/user'
import PermissionResolver from '#services/permission_resolver'
import type { HttpContext } from '@adonisjs/core/http'

export const permission = Bouncer.ability(async (user: User, key: string) => {
  const ctx = HttpContext.get()
  const resolver = ctx?.permissionResolver ?? new PermissionResolver(user)
  return resolver.can(key)
})
```

Notes:
- Uses `HttpContext.get()` (not `getOrFail()`) to safely handle non-HTTP contexts (background jobs, tests) where no HTTP context exists. Falls back to a new `PermissionResolver` instance in those cases.
- Returns a boolean. Bouncer v3 accepts `true`/`false` from abilities — `true` maps to allow, `false` to deny. The denial message in the resulting `AuthorizationException` will be the Bouncer default. This is acceptable since the 403 status page provides the user-facing message.

### 3. Permission middleware — `app/middleware/permission_middleware.ts`

```typescript
import PermissionResolver from '#services/permission_resolver'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class PermissionMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { keys: string[] }) {
    const resolver = ctx.permissionResolver ?? new PermissionResolver(ctx.auth.user!)
    const allowed = await resolver.canAny(options.keys)

    if (!allowed) {
      ctx.session.flash('error', "Vous n'avez pas accès à cette section.")
      return ctx.response.redirect().toRoute('dashboard.index')
    }

    return next()
  }
}
```

Behavior:
- Receives one or more permission keys.
- Uses `canAny()` — passes if the user has at least one of the listed permissions. Route-level protection is broad; fine-grained checks happen in controllers.
- Uses the request-scoped `PermissionResolver` so permissions resolved here are cached for subsequent ability/controller checks.
- On denial: redirect to dashboard with flash message (no exception).

### 4. Middleware registration — `start/kernel.ts`

Router middleware stack — add `InitializeBouncerMiddleware` (auto-generated by `node ace add @adonisjs/bouncer`) and `PermissionResolverMiddleware`:

```typescript
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
  () => import('#middleware/silent_auth_middleware'),
  () => import('#middleware/tenant_middleware'),
  () => import('#middleware/permission_resolver_middleware'),  // NEW — after tenant (RLS context needed)
  () => import('@adonisjs/bouncer/initialize_bouncer_middleware'),  // NEW — after auth
])
```

Named middleware — add `permission`:

```typescript
export const middleware = router.named({
  guest: () => import('#middleware/guest_middleware'),
  auth: () => import('#middleware/auth_middleware'),
  permission: () => import('#middleware/permission_middleware'),  // NEW
})
```

Order matters: `TenantMiddleware` sets PostgreSQL RLS context (`SET LOCAL app.current_tenant_id`), which scopes RBAC queries. `PermissionResolverMiddleware` must run after it. `InitializeBouncerMiddleware` must run after `initialize_auth_middleware` (it needs `ctx.auth.user`).

### 5. Status page for 403 — `app/exceptions/handler.ts`

Add `'403'` entry to the existing `statusPages` map:

```typescript
protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
  '403': (error, { view }) => {
    return view.render('pages/errors/unauthorized', { error })
  },
  '404': (error, { view }) => {
    return view.render('pages/errors/not_found', { error })
  },
  '500..599': (error, { view }) => {
    return view.render('pages/errors/server_error', { error })
  },
}
```

Note: `renderStatusPages` is set to `app.inProduction`. In development, Bouncer's `AuthorizationException` will show a verbose Youch error page with stack trace instead of the custom 403 page. This is expected and helpful for debugging.

### 6. Unauthorized error page — `resources/views/pages/errors/unauthorized.edge`

Renders a 403 page with a message and a link back to the dashboard. Follows the same structure as existing error pages (`not_found.edge`, `server_error.edge`).

### 7. DashboardController simplification

Before:
```typescript
async index({ view, auth }: HttpContext) {
  const user = auth.getUserOrFail()
  const resolver = new PermissionResolver(user)
  const permissions = await resolver.permissions()
  return view.render('pages/dashboard/index', { permissions: [...permissions] })
}
```

After:
```typescript
async index({ view }: HttpContext) {
  return view.render('pages/dashboard/index')
}
```

The manual permission array is no longer passed to the view. Edge templates use `@can`/`@cannot` directly via the Bouncer middleware.

### 8. Edge template migration

Replace `permissions.includes()` checks with Bouncer tags in `resources/views/components/layout/dashboard.edge`:

```edge
{{-- Before --}}
@if(permissions.includes('user:read') || permissions.includes('role:read'))
  <div class="mt-6">
    <p>Administration</p>
    <ul>
      @!sidebar.item({ href: '#', icon: 'tabler:users', label: 'Utilisateurs' })
      @!sidebar.item({ href: '#', icon: 'tabler:shield', label: 'Rôles' })
    </ul>
  </div>
@end

{{-- After --}}
@can('permission', 'user:read')
  <div class="mt-6">
    <p>Administration</p>
    <ul>
      @!sidebar.item({ href: '#', icon: 'tabler:users', label: 'Utilisateurs' })
      @!sidebar.item({ href: '#', icon: 'tabler:shield', label: 'Rôles' })
    </ul>
  </div>
@end
```

Note: The current template gates the Administration section on `user:read || role:read`. With `@can`, we simplify to `user:read` since admin users who can manage roles will also have `user:read`. If finer-grained control is needed later, individual sidebar items can be wrapped in separate `@can` blocks.

The `@can` tag receives the exported ability name (`'permission'`) as the first argument, followed by the permission key. The `@cannot` tag works the same way for inverse checks.

The `@let(permissions = ...)` line at the top of the layout and the `permissions` prop become unnecessary and are removed.

## Files to create

| File | Purpose |
|------|---------|
| `app/abilities/main.ts` | Generic `permission` ability |
| `app/middleware/permission_middleware.ts` | Route-level permission gate |
| `app/middleware/permission_resolver_middleware.ts` | Request-scoped PermissionResolver |
| `resources/views/pages/errors/unauthorized.edge` | 403 error page |

Note: `initialize_bouncer_middleware.ts` is auto-generated by `node ace add @adonisjs/bouncer`.

## Files to modify

| File | Change |
|------|--------|
| `start/kernel.ts` | Add `initialize_bouncer_middleware` to `router.use()`, add `permission_resolver_middleware` to `router.use()`, add `permission` to named middleware |
| `app/exceptions/handler.ts` | Add `'403'` to `statusPages` |
| `app/controllers/dashboard_controller.ts` | Remove manual permission resolution and prop passing |
| `resources/views/components/layout/dashboard.edge` | Replace `permissions.includes()` with `@can`, remove `@let` for permissions prop |
| `resources/views/pages/dashboard/index.edge` | Remove permissions prop if passed |
| `adonisrc.ts` | Auto-updated by Bouncer installation |

## Type augmentation

Add `permissionResolver` to `HttpContext`:

```typescript
declare module '@adonisjs/core/http' {
  interface HttpContext {
    permissionResolver?: PermissionResolver
  }
}
```

This can go in the `PermissionResolverMiddleware` file or in a dedicated `types/` file.

## What does NOT change

- `PermissionResolver` — remains intact as the internal engine
- `config/rbac.ts` — permission catalog unchanged
- RBAC models (`Role`, `Permission`, `UserRoleAssignment`, `RolePermission`) — no modifications
- `TenantService` — role seeding logic unchanged
- Database migrations — no new tables or columns needed

## Usage examples

### In a controller (future CRUD)
```typescript
import { permission } from '#abilities/main'

export default class VehiclesController {
  async destroy({ bouncer, params }: HttpContext) {
    await bouncer.authorize(permission, 'vehicle:delete')
    const vehicle = await Vehicle.findOrFail(params.id)
    await vehicle.delete()
    // ...
  }
}
```

### In routes
```typescript
router.group(() => {
  router.get('/vehicles', [VehiclesController, 'index'])
  router.post('/vehicles', [VehiclesController, 'store'])
  router.delete('/vehicles/:id', [VehiclesController, 'destroy'])
}).use([middleware.auth(), middleware.permission({ keys: ['vehicle:read'] })])
```

### In Edge templates
```edge
@can('permission', 'vehicle:create')
  <a href="{{ route('vehicles.create') }}">Nouveau véhicule</a>
@end

@cannot('permission', 'vehicle:delete')
  {{-- Hide delete button --}}
@end
```

## Error handling summary

| Context | Trigger | Result |
|---------|---------|--------|
| Middleware `permission` | `resolver.canAny()` returns false | Redirect to `/dashboard` + flash message |
| `bouncer.authorize()` in controller | Permission denied | `AuthorizationException` → 403 status page |
| Unauthenticated user | No `ctx.auth.user` | Caught by `AuthMiddleware` before reaching Bouncer — redirected to `/login` |
