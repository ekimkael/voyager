# Admin Roles & Permissions Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin UI pages for managing roles (CRUD, permission assignment, hierarchy) and assigning roles to employees with optional expiration.

**Architecture:** Server-rendered pages following existing AdonisJS patterns (controller + VineJS validators + Edge.js views). New `RolesController` for role CRUD + permission sync. Extends existing `EmployeesController` with role assignment methods. All queries tenant-isolated.

**Tech Stack:** AdonisJS v7, Lucid ORM (PostgreSQL), VineJS validation, Edge.js templates, TailwindCSS

**Spec:** `docs/superpowers/specs/2026-03-22-admin-roles-permissions-design.md`

---

## File Structure

### Files to Create

| File | Responsibility |
|------|---------------|
| `app/controllers/roles_controller.ts` | CRUD for roles + syncPermissions |
| `app/validators/role.ts` | Validators: createRole, updateRole, syncPermissions, assignRole |
| `start/routes/roles.ts` | Route definitions for roles resource + syncPermissions |
| `resources/views/pages/roles/index.edge` | Hierarchical role list |
| `resources/views/pages/roles/show.edge` | Role detail with hybrid permission grid |
| `resources/views/pages/roles/form.edge` | Create/edit role form wrapper |
| `resources/views/partials/roles/form_fields.edge` | Reusable role form fields |
| `resources/views/pages/employees/roles.edge` | Employee role assignment page |

### Files to Modify

| File | Change |
|------|--------|
| `config/rbac.ts` | Already has role:* permissions — no change needed |
| `start/routes.ts` | Import new roles route file |
| `start/routes/employees.ts` | Add 3 employee role assignment routes |
| `resources/views/components/layout/dashboard.edge` | Update Rôles sidebar link |
| `app/controllers/employees_controller.ts` | Add roles, assignRole, revokeRole methods |

---

## Task 1: Validators

**Files:**
- Create: `app/validators/role.ts`

- [ ] **Step 1: Create role validators file**

```typescript
// app/validators/role.ts
import vine from '@vinejs/vine'

export const createRoleValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(80),
    parentRoleId: vine.string().uuid().optional(),
  })
)

export const updateRoleValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(80),
    parentRoleId: vine.string().uuid().optional().nullable(),
  })
)

export const syncPermissionsValidator = vine.compile(
  vine.object({
    permissions: vine.array(vine.string().uuid()),
  })
)

export const assignRoleValidator = vine.compile(
  vine.object({
    roleId: vine.string().uuid(),
    expiresAt: vine.date({ formats: ['YYYY-MM-DD'] }).afterOrEqual('today').optional(),
  })
)
```

- [ ] **Step 2: Verify the file compiles**

Run: `node ace type-check`
Expected: No errors in `app/validators/role.ts`

- [ ] **Step 3: Commit**

```bash
git add app/validators/role.ts
git commit -m "feat(rbac): add role and assignment validators"
```

---

## Task 2: Roles Controller — CRUD Methods

**Files:**
- Create: `app/controllers/roles_controller.ts`

**Reference patterns:**
- `app/controllers/employees_controller.ts` — CRUD structure, tenant isolation, flash messages
- `app/services/permission_resolver.ts` — `#collectRoleChain` for hierarchy traversal (max depth 4)
- `app/models/role.ts` — relations: `parent`, `children`, `rolePermissions`, `userRoleAssignments`

- [ ] **Step 1: Create the controller with index method**

```typescript
// app/controllers/roles_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import Role from '#models/role'
import Permission from '#models/permission'
import RolePermission from '#models/role_permission'
import UserRoleAssignment from '#models/user_role_assignment'
import db from '@adonisjs/lucid/services/db'
import { createRoleValidator, updateRoleValidator, syncPermissionsValidator } from '#validators/role'

export default class RolesController {
  async index({ view, tenant }: HttpContext) {
    const roles = await Role.query()
      .where('tenantId', tenant!.id)
      .preload('parent')
      .preload('children')
      .withCount('rolePermissions', (q) => q.as('permissionsCount'))
      .withCount('userRoleAssignments', (q) => q.as('usersCount'))
      .orderBy('name')

    // Build tree: top-level roles (no parent), each with their children
    const rootRoles = roles.filter((r) => !r.parentRoleId)
    const childMap = new Map<string, typeof roles>()
    for (const role of roles) {
      if (role.parentRoleId) {
        const siblings = childMap.get(role.parentRoleId) || []
        siblings.push(role)
        childMap.set(role.parentRoleId, siblings)
      }
    }

    return view.render('pages/roles/index', { rootRoles, childMap })
  }
}
```

- [ ] **Step 2: Add create and store methods**

Append to the controller class:

```typescript
  async create({ view, tenant }: HttpContext) {
    const roles = await Role.query()
      .where('tenantId', tenant!.id)
      .orderBy('name')

    return view.render('pages/roles/form', { roles })
  }

  async store({ request, response, session, tenant }: HttpContext) {
    const payload = await request.validateUsing(createRoleValidator)

    // Cycle check: parentRoleId must not create a cycle
    if (payload.parentRoleId) {
      const parentExists = await Role.query()
        .where('id', payload.parentRoleId)
        .where('tenantId', tenant!.id)
        .first()

      if (!parentExists) {
        session.flash('error', 'Le rôle parent sélectionné est invalide.')
        return response.redirect().back()
      }
    }

    try {
      await Role.create({
        tenantId: tenant!.id,
        name: payload.name,
        parentRoleId: payload.parentRoleId || null,
        scope: 'global',
        isSystem: false,
      })
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Un rôle avec ce nom existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Rôle créé avec succès.')
    return response.redirect().toRoute('roles.index')
  }
```

- [ ] **Step 3: Add show method with permission grid logic**

This is the core method. It builds the hybrid permission grid with inherited permissions.

```typescript
  async show({ params, view, tenant }: HttpContext) {
    const role = await Role.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .preload('parent')
      .preload('rolePermissions', (q) => q.preload('permission'))
      .preload('userRoleAssignments', (q) => {
        q.preload('user').preload('granter').orderBy('createdAt', 'desc')
      })
      .firstOrFail()

    // All system permissions
    const allPermissions = await Permission.all()

    // Direct permission IDs for this role
    const directPermissionIds = new Set(role.rolePermissions.map((rp) => rp.permissionId))

    // Collect inherited permissions by walking parent chain
    const inheritedPermissions = new Map<string, string>() // permissionId -> source role name
    let currentRole = role
    let depth = 0
    const MAX_DEPTH = 4

    while (currentRole.parentRoleId && depth < MAX_DEPTH) {
      const parentRole = await Role.query()
        .where('id', currentRole.parentRoleId)
        .preload('parent')
        .preload('rolePermissions', (q) => q.preload('permission'))
        .firstOrFail()

      for (const rp of parentRole.rolePermissions) {
        if (!directPermissionIds.has(rp.permissionId) && !inheritedPermissions.has(rp.permissionId)) {
          inheritedPermissions.set(rp.permissionId, parentRole.name)
        }
      }

      currentRole = parentRole
      depth++
    }

    // Build CRUD grid
    const crudActions = ['read', 'create', 'update', 'delete']
    const resourceMap = new Map<string, Map<string, { permissionId: string; granted: boolean; inherited: boolean; from: string | null }>>()
    const specialPermissions: Array<{ permissionId: string; key: string; description: string | null; granted: boolean; inherited: boolean; from: string | null }> = []

    for (const perm of allPermissions) {
      const isDirect = directPermissionIds.has(perm.id)
      const inheritedFrom = inheritedPermissions.get(perm.id) || null
      const isGranted = isDirect || !!inheritedFrom

      if (crudActions.includes(perm.action)) {
        if (!resourceMap.has(perm.resource)) {
          resourceMap.set(perm.resource, new Map())
        }
        resourceMap.get(perm.resource)!.set(perm.action, {
          permissionId: perm.id,
          granted: isGranted,
          inherited: !!inheritedFrom,
          from: inheritedFrom,
        })
      } else {
        specialPermissions.push({
          permissionId: perm.id,
          key: perm.key,
          description: perm.description,
          granted: isGranted,
          inherited: !!inheritedFrom,
          from: inheritedFrom,
        })
      }
    }

    // Convert map to sorted array for the view
    const crudGrid = [...resourceMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([resource, actions]) => ({
        resource,
        actions: Object.fromEntries(
          crudActions.map((action) => [
            action,
            actions.get(action) || { permissionId: null, granted: false, inherited: false, from: null },
          ])
        ),
      }))

    return view.render('pages/roles/show', {
      role,
      crudGrid,
      crudActions,
      specialPermissions,
    })
  }
```

- [ ] **Step 4: Add edit and update methods**

```typescript
  async edit({ params, view, response, session, tenant }: HttpContext) {
    const role = await Role.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (role.isSystem) {
      session.flash('error', 'Les rôles système ne peuvent pas être modifiés.')
      return response.redirect().toRoute('roles.show', { id: role.id })
    }

    const roles = await Role.query()
      .where('tenantId', tenant!.id)
      .whereNot('id', role.id)
      .orderBy('name')

    return view.render('pages/roles/form', { role, roles })
  }

  async update({ params, request, response, session, tenant }: HttpContext) {
    const role = await Role.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (role.isSystem) {
      session.flash('error', 'Les rôles système ne peuvent pas être modifiés.')
      return response.redirect().toRoute('roles.show', { id: role.id })
    }

    const payload = await request.validateUsing(updateRoleValidator)

    // Cycle detection: walk parent chain from proposed parent, ensure we don't hit this role
    if (payload.parentRoleId) {
      if (payload.parentRoleId === role.id) {
        session.flash('error', 'Un rôle ne peut pas être son propre parent.')
        return response.redirect().back()
      }

      let currentId: string | null = payload.parentRoleId
      let depth = 0
      while (currentId && depth < 4) {
        const ancestor = await Role.find(currentId)
        if (!ancestor) break
        if (ancestor.id === role.id) {
          session.flash('error', 'Cette hiérarchie créerait un cycle.')
          return response.redirect().back()
        }
        currentId = ancestor.parentRoleId
        depth++
      }
    }

    try {
      role.merge({
        name: payload.name,
        parentRoleId: payload.parentRoleId || null,
      })
      await role.save()
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Un rôle avec ce nom existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Rôle mis à jour avec succès.')
    return response.redirect().toRoute('roles.show', { id: role.id })
  }
```

- [ ] **Step 5: Add destroy method**

```typescript
  async destroy({ params, response, session, tenant }: HttpContext) {
    const role = await Role.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (role.isSystem) {
      session.flash('error', 'Les rôles système ne peuvent pas être supprimés.')
      return response.redirect().toRoute('roles.index')
    }

    // Check for assigned users
    const assignedCount = await UserRoleAssignment.query()
      .where('roleId', role.id)
      .count('* as total')

    if (Number(assignedCount[0].$extras.total) > 0) {
      session.flash('error', 'Impossible de supprimer un rôle assigné à des utilisateurs.')
      return response.redirect().toRoute('roles.index')
    }

    // Check for child roles
    const childCount = await Role.query()
      .where('parentRoleId', role.id)
      .count('* as total')

    if (Number(childCount[0].$extras.total) > 0) {
      session.flash('error', 'Impossible de supprimer un rôle qui a des rôles enfants.')
      return response.redirect().toRoute('roles.index')
    }

    // Delete role permissions first, then the role
    await db.transaction(async (trx) => {
      await RolePermission.query({ client: trx }).where('roleId', role.id).delete()
      role.useTransaction(trx)
      await role.delete()
    })

    session.flash('success', 'Rôle supprimé avec succès.')
    return response.redirect().toRoute('roles.index')
  }
```

- [ ] **Step 6: Add syncPermissions method**

```typescript
  async syncPermissions({ params, request, response, session, tenant }: HttpContext) {
    const role = await Role.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (role.isSystem) {
      session.flash('error', 'Les permissions des rôles système ne peuvent pas être modifiées.')
      return response.redirect().toRoute('roles.show', { id: role.id })
    }

    const payload = await request.validateUsing(syncPermissionsValidator)

    await db.transaction(async (trx) => {
      // Remove all existing permissions for this role
      await RolePermission.query({ client: trx }).where('roleId', role.id).delete()

      // Create new permission assignments
      if (payload.permissions.length > 0) {
        const records = payload.permissions.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        }))
        await RolePermission.createMany(records, { client: trx })
      }
    })

    session.flash('success', 'Permissions mises à jour avec succès.')
    return response.redirect().toRoute('roles.show', { id: role.id })
  }
```

- [ ] **Step 7: Verify the controller compiles**

Run: `node ace type-check`
Expected: No errors in `app/controllers/roles_controller.ts`

- [ ] **Step 8: Commit**

```bash
git add app/controllers/roles_controller.ts
git commit -m "feat(rbac): add roles controller with CRUD and permission sync"
```

---

## Task 3: Routes

**Files:**
- Create: `start/routes/roles.ts`
- Modify: `start/routes.ts:29` — add import
- Modify: `start/routes/employees.ts:13` — add assignment routes

- [ ] **Step 1: Create roles route file**

```typescript
// start/routes/roles.ts
import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const RolesController = () => import('#controllers/roles_controller')

router
  .resource('roles', RolesController)
  .use('*', middleware.auth())
  .use(['index', 'show'], middleware.permission({ keys: ['role:read'] }))
  .use(['create', 'store'], middleware.permission({ keys: ['role:create'] }))
  .use(['edit', 'update'], middleware.permission({ keys: ['role:update'] }))
  .use(['destroy'], middleware.permission({ keys: ['role:delete'] }))

router
  .post('roles/:id/permissions', [RolesController, 'syncPermissions'])
  .as('roles.syncPermissions')
  .use(middleware.auth())
  .use(middleware.permission({ keys: ['role:update'] }))
```

- [ ] **Step 2: Add import in main routes file**

In `start/routes.ts`, add after line 24 (`import '#start/routes/employees'`):

```typescript
import '#start/routes/roles'
```

- [ ] **Step 3: Add employee role assignment routes**

In `start/routes/employees.ts`, append after line 13. Reuse the existing `EmployeesController` lazy import already declared at the top of the file — do NOT redeclare it.

```typescript
router
  .get('employees/:id/roles', [EmployeesController, 'roles'])
  .as('employees.roles')
  .use(middleware.auth())
  .use(middleware.permission({ keys: ['role:assign'] }))

router
  .post('employees/:id/roles', [EmployeesController, 'assignRole'])
  .as('employees.assignRole')
  .use(middleware.auth())
  .use(middleware.permission({ keys: ['role:assign'] }))

router
  .delete('employees/:id/roles/:assignmentId', [EmployeesController, 'revokeRole'])
  .as('employees.revokeRole')
  .use(middleware.auth())
  .use(middleware.permission({ keys: ['role:assign'] }))
```

Note: The `EmployeesController` lazy import is already defined at the top of this file. Reuse it — do NOT redeclare. The snippet above shows the import for clarity; in practice, just add the 3 route blocks.

- [ ] **Step 4: Verify routes are registered**

Run: `node ace list:routes | grep -E "role|employees.*roles"`
Expected: All role CRUD routes + syncPermissions + 3 employee role routes listed

- [ ] **Step 5: Commit**

```bash
git add start/routes/roles.ts start/routes.ts start/routes/employees.ts
git commit -m "feat(rbac): add role and employee assignment routes"
```

---

## Task 4: Role Views — Index (Hierarchical List)

**Files:**
- Create: `resources/views/pages/roles/index.edge`

**Reference:** `resources/views/pages/employees/index.edge` for table styling, `@can` guards, action buttons.

- [ ] **Step 1: Create the roles index view**

```edge
{{-- resources/views/pages/roles/index.edge --}}
@layout.dashboard()
  <div class="mx-auto max-w-7xl">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-on-surface-strong">Rôles</h1>
      @can('permission', 'role:create')
        <a href="{{ route('roles.create') }}"
          class="inline-flex items-center gap-2 rounded-radius bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-secondary transition-colors">
          @svg('tabler:plus', { class: 'size-4' })
          <span>Nouveau rôle</span>
        </a>
      @end
    </div>

    <div class="overflow-hidden rounded-radius border border-outline bg-surface">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
          <tr>
            <th class="px-6 py-3">Nom</th>
            <th class="px-6 py-3">Type</th>
            <th class="px-6 py-3">Parent</th>
            <th class="px-6 py-3">Permissions</th>
            <th class="px-6 py-3">Utilisateurs</th>
            <th class="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          @each(role in rootRoles)
            {{-- Parent role row --}}
            <tr class="hover:bg-surface-alt/50">
              <td class="px-6 py-4 font-medium text-on-surface-strong">
                {{ role.name }}
              </td>
              <td class="px-6 py-4">
                @if(role.isSystem)
                  <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Système</span>
                @else
                  <span class="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">Custom</span>
                @end
              </td>
              <td class="px-6 py-4 text-on-surface">—</td>
              <td class="px-6 py-4 text-on-surface">{{ role.$extras.permissionsCount }}</td>
              <td class="px-6 py-4 text-on-surface">{{ role.$extras.usersCount }}</td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  @can('permission', 'role:read')
                    <a href="{{ route('roles.show', { id: role.id }) }}"
                      class="text-on-surface hover:text-primary transition-colors" title="Voir">
                      @svg('tabler:eye', { class: 'size-4' })
                    </a>
                  @end
                  @if(!role.isSystem)
                    @can('permission', 'role:update')
                      <a href="{{ route('roles.edit', { id: role.id }) }}"
                        class="text-on-surface hover:text-primary transition-colors" title="Modifier">
                        @svg('tabler:edit', { class: 'size-4' })
                      </a>
                    @end
                    @can('permission', 'role:delete')
                      @form({ route: 'roles.destroy', routeParams: { id: role.id }, method: 'DELETE' })
                        <button type="submit"
                          class="cursor-pointer text-on-surface hover:text-danger transition-colors"
                          onclick="return confirm('Supprimer ce rôle ?')" title="Supprimer">
                          @svg('tabler:trash', { class: 'size-4' })
                        </button>
                      @end
                    @end
                  @end
                </div>
              </td>
            </tr>

            {{-- Child roles (indented) --}}
            @if(childMap.has(role.id))
              @each(child in childMap.get(role.id))
                <tr class="hover:bg-surface-alt/50 bg-surface-alt/20">
                  <td class="px-6 py-4 font-medium text-on-surface-strong">
                    <span class="ml-6 inline-flex items-center gap-1">
                      @svg('tabler:corner-down-right', { class: 'size-4 text-on-surface' })
                      {{ child.name }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    @if(child.isSystem)
                      <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Système</span>
                    @else
                      <span class="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800">Custom</span>
                    @end
                  </td>
                  <td class="px-6 py-4 text-on-surface">{{ role.name }}</td>
                  <td class="px-6 py-4 text-on-surface">{{ child.$extras.permissionsCount }}</td>
                  <td class="px-6 py-4 text-on-surface">{{ child.$extras.usersCount }}</td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      @can('permission', 'role:read')
                        <a href="{{ route('roles.show', { id: child.id }) }}"
                          class="text-on-surface hover:text-primary transition-colors" title="Voir">
                          @svg('tabler:eye', { class: 'size-4' })
                        </a>
                      @end
                      @if(!child.isSystem)
                        @can('permission', 'role:update')
                          <a href="{{ route('roles.edit', { id: child.id }) }}"
                            class="text-on-surface hover:text-primary transition-colors" title="Modifier">
                            @svg('tabler:edit', { class: 'size-4' })
                          </a>
                        @end
                        @can('permission', 'role:delete')
                          @form({ route: 'roles.destroy', routeParams: { id: child.id }, method: 'DELETE' })
                            <button type="submit"
                              class="cursor-pointer text-on-surface hover:text-danger transition-colors"
                              onclick="return confirm('Supprimer ce rôle ?')" title="Supprimer">
                              @svg('tabler:trash', { class: 'size-4' })
                            </button>
                          @end
                        @end
                      @end
                    </div>
                  </td>
                </tr>
              @end
            @end
          @end
        </tbody>
      </table>

      @if(!rootRoles.length)
        <div class="px-6 py-12 text-center text-on-surface">
          Aucun rôle trouvé.
        </div>
      @end
    </div>
  </div>
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/roles/index.edge
git commit -m "feat(rbac): add roles index view with hierarchical display"
```

---

## Task 5: Role Views — Form (Create/Edit)

**Files:**
- Create: `resources/views/pages/roles/form.edge`
- Create: `resources/views/partials/roles/form_fields.edge`

**Reference:** `resources/views/pages/employees/form.edge` and `resources/views/partials/employees/form_fields.edge`

- [ ] **Step 1: Create the form wrapper view**

```edge
{{-- resources/views/pages/roles/form.edge --}}
@layout.dashboard()
  <div class="mx-auto max-w-lg">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-on-surface-strong">
        {{ role ? 'Modifier le rôle' : 'Nouveau rôle' }}
      </h1>
    </div>

    <div class="rounded-radius border border-outline bg-surface p-6">
      @if(role)
        @form({ route: 'roles.update', routeParams: { id: role.id }, method: 'PUT' })
          @include('partials/roles/form_fields')
        @end
      @else
        @form({ route: 'roles.store', method: 'POST' })
          @include('partials/roles/form_fields')
        @end
      @end
    </div>
  </div>
@end
```

- [ ] **Step 2: Create the form fields partial**

```edge
{{-- resources/views/partials/roles/form_fields.edge --}}
<div class="flex flex-col gap-6">
  <div>
    @field.root({ name: 'name' })
      @!field.label({ text: 'Nom du rôle' })
      @!input.control({ placeholder: 'Ex: Agent commercial', value: role?.name ?? '' })
      @!field.error()
    @end
  </div>

  <div>
    @field.root({ name: 'parentRoleId' })
      @!field.label({ text: 'Rôle parent (optionnel)' })
      @!select.control({
        options: [
          { value: '', name: 'Aucun (rôle racine)' },
          ...roles.map((r) => ({
            value: r.id,
            name: r.name,
            isSelected: role ? role.parentRoleId === r.id : false,
          }))
        ]
      })
      @!field.error()
    @end
  </div>

  <div class="flex items-center gap-3">
    @!button({ text: role ? 'Mettre à jour' : 'Créer', type: 'submit' })
    <a href="{{ route('roles.index') }}" class="text-sm text-on-surface hover:text-on-surface-strong transition-colors">Annuler</a>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add resources/views/pages/roles/form.edge resources/views/partials/roles/form_fields.edge
git commit -m "feat(rbac): add role create/edit form views"
```

---

## Task 6: Role Views — Show (Permission Grid)

**Files:**
- Create: `resources/views/pages/roles/show.edge`

This is the most complex view. It renders the hybrid permission grid (CRUD table + special permissions list).

**Key data from controller:**
- `role` — the Role model with preloaded relations
- `crudGrid` — array of `{ resource, actions: { read, create, update, delete } }` where each action has `{ permissionId, granted, inherited, from }`
- `crudActions` — `['read', 'create', 'update', 'delete']`
- `specialPermissions` — array of `{ permissionId, key, description, granted, inherited, from }`

- [ ] **Step 1: Create the show view**

```edge
{{-- resources/views/pages/roles/show.edge --}}
@layout.dashboard()
  <div class="mx-auto max-w-5xl">

    {{-- Header --}}
    <div class="mb-6 flex items-center justify-between">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-on-surface-strong">{{ role.name }}</h1>
          @if(role.isSystem)
            <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Système</span>
          @end
        </div>
        @if(role.parent)
          <p class="mt-1 text-sm text-on-surface">
            Hérite de :
            <a href="{{ route('roles.show', { id: role.parent.id }) }}" class="text-primary hover:underline">{{ role.parent.name }}</a>
          </p>
        @end
      </div>
      <div class="flex items-center gap-2">
        @if(!role.isSystem)
          @can('permission', 'role:update')
            <a href="{{ route('roles.edit', { id: role.id }) }}"
              class="inline-flex items-center gap-2 rounded-radius bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-secondary transition-colors">
              @svg('tabler:edit', { class: 'size-4' })
              <span>Modifier</span>
            </a>
          @end
        @end
        <a href="{{ route('roles.index') }}" class="text-sm text-on-surface hover:text-on-surface-strong transition-colors">
          Retour à la liste
        </a>
      </div>
    </div>

    {{-- Permission Grid --}}
    <div class="mb-8">
      <h2 class="mb-4 text-lg font-semibold text-on-surface-strong">Permissions</h2>

      @if(!role.isSystem)
        @form({ route: 'roles.syncPermissions', routeParams: { id: role.id }, method: 'POST' })
      @end

        {{-- CRUD Grid --}}
        <div class="mb-6 overflow-hidden rounded-radius border border-outline bg-surface">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
              <tr>
                <th class="px-6 py-3">Ressource</th>
                @each(action in crudActions)
                  <th class="px-6 py-3 text-center">{{ action }}</th>
                @end
              </tr>
            </thead>
            <tbody class="divide-y divide-outline">
              @each(row in crudGrid)
                <tr class="hover:bg-surface-alt/50">
                  <td class="px-6 py-4 font-medium text-on-surface-strong capitalize">{{ row.resource }}</td>
                  @each(action in crudActions)
                    <td class="px-6 py-4 text-center">
                      @set('cell', row.actions[action])
                      @if(cell.permissionId)
                        @if(cell.inherited)
                          <label class="inline-flex items-center gap-1 cursor-default" title="Hérité de {{ cell.from }}">
                            <input type="checkbox" checked disabled
                              class="size-4 rounded border-neutral-300 text-primary/50" />
                            <span class="text-xs text-on-surface">hérité</span>
                          </label>
                        @elseif(role.isSystem)
                          <input type="checkbox" {{ cell.granted ? 'checked' : '' }} disabled
                            class="size-4 rounded border-neutral-300 text-primary/50" />
                        @else
                          <input type="checkbox" name="permissions" value="{{ cell.permissionId }}"
                            {{ cell.granted ? 'checked' : '' }}
                            class="size-4 rounded border-neutral-300 text-primary focus:ring-primary" />
                        @end
                      @else
                        <span class="text-on-surface">—</span>
                      @end
                    </td>
                  @end
                </tr>
              @end
            </tbody>
          </table>
        </div>

        {{-- Special Permissions --}}
        @if(specialPermissions.length)
          <div class="mb-6 rounded-radius border border-outline bg-surface p-6">
            <h3 class="mb-4 text-sm font-semibold uppercase tracking-wider text-on-surface">Permissions spéciales</h3>
            <div class="space-y-3">
              @each(perm in specialPermissions)
                <label class="flex items-center gap-3 {{ perm.inherited ? 'cursor-default' : '' }}">
                  @if(perm.inherited)
                    <input type="checkbox" checked disabled
                      class="size-4 rounded border-neutral-300 text-primary/50" />
                    <span class="text-sm text-on-surface-strong">{{ perm.key }}</span>
                    <span class="text-xs text-on-surface">(hérité de {{ perm.from }})</span>
                  @elseif(role.isSystem)
                    <input type="checkbox" {{ perm.granted ? 'checked' : '' }} disabled
                      class="size-4 rounded border-neutral-300 text-primary/50" />
                    <span class="text-sm text-on-surface-strong">{{ perm.key }}</span>
                  @else
                    <input type="checkbox" name="permissions" value="{{ perm.permissionId }}"
                      {{ perm.granted ? 'checked' : '' }}
                      class="size-4 rounded border-neutral-300 text-primary focus:ring-primary" />
                    <span class="text-sm text-on-surface-strong">{{ perm.key }}</span>
                  @end
                  @if(perm.description)
                    <span class="text-xs text-on-surface">— {{ perm.description }}</span>
                  @end
                </label>
              @end
            </div>
          </div>
        @end

        {{-- Submit button (only for custom roles) --}}
        @if(!role.isSystem)
          <div class="flex items-center gap-3">
            @!button({ text: 'Enregistrer les permissions', type: 'submit' })
          </div>
        @end

      @if(!role.isSystem)
        @end {{-- close form --}}
      @end
    </div>

    {{-- Assigned Users --}}
    <div>
      <h2 class="mb-4 text-lg font-semibold text-on-surface-strong">Utilisateurs assignés</h2>
      <div class="overflow-hidden rounded-radius border border-outline bg-surface">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
            <tr>
              <th class="px-6 py-3">Nom</th>
              <th class="px-6 py-3">Email</th>
              <th class="px-6 py-3">Assigné le</th>
              <th class="px-6 py-3">Expire le</th>
              <th class="px-6 py-3">Accordé par</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline">
            @each(assignment in role.userRoleAssignments)
              <tr class="hover:bg-surface-alt/50 {{ assignment.expiresAt && assignment.expiresAt < new Date() ? 'opacity-50' : '' }}">
                <td class="px-6 py-4 font-medium text-on-surface-strong">{{ assignment.user.fullName }}</td>
                <td class="px-6 py-4 text-on-surface">{{ assignment.user.email }}</td>
                <td class="px-6 py-4 text-on-surface">{{ assignment.createdAt.toFormat('dd/MM/yyyy') }}</td>
                <td class="px-6 py-4 text-on-surface">
                  @if(assignment.expiresAt)
                    @if(assignment.expiresAt < new Date())
                      <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        Expiré {{ assignment.expiresAt.toFormat('dd/MM/yyyy') }}
                      </span>
                    @else
                      {{ assignment.expiresAt.toFormat('dd/MM/yyyy') }}
                    @end
                  @else
                    <span class="text-on-surface">Permanent</span>
                  @end
                </td>
                <td class="px-6 py-4 text-on-surface">{{ assignment.granter?.fullName || '—' }}</td>
              </tr>
            @end
          </tbody>
        </table>

        @if(!role.userRoleAssignments.length)
          <div class="px-6 py-12 text-center text-on-surface">
            Aucun utilisateur assigné à ce rôle.
          </div>
        @end
      </div>
    </div>
  </div>
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/roles/show.edge
git commit -m "feat(rbac): add role show view with hybrid permission grid"
```

---

## Task 7: Employee Role Assignment — Controller Methods

**Files:**
- Modify: `app/controllers/employees_controller.ts`

Add three new methods: `roles`, `assignRole`, `revokeRole`.

**Reference:**
- `app/models/user_role_assignment.ts` — fields: userId, roleId, grantedBy, expiresAt, isTemporary
- Import `assignRoleValidator` from `#validators/role`

- [ ] **Step 1: Add imports at top of employees_controller.ts**

Add to existing imports at top of file:

```typescript
import { assignRoleValidator } from '#validators/role'
```

`UserRoleAssignment` and `Role` are already imported.

- [ ] **Step 2: Add the roles method**

Add after the `destroy` method (before `private async isAdminOrDispatcher`):

```typescript
  async roles({ params, view, tenant }: HttpContext) {
    const employee = await User.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const assignments = await UserRoleAssignment.query()
      .where('userId', employee.id)
      .preload('role')
      .preload('granter')
      .orderBy('createdAt', 'desc')

    const assignedRoleIds = assignments.map((a) => a.roleId)

    const availableRoles = await Role.query()
      .where('tenantId', tenant!.id)
      .if(assignedRoleIds.length > 0, (q) => q.whereNotIn('id', assignedRoleIds))
      .orderBy('name')

    return view.render('pages/employees/roles', {
      employee,
      assignments,
      availableRoles,
    })
  }
```

- [ ] **Step 3: Add the assignRole method**

```typescript
  async assignRole({ params, request, response, session, auth, tenant }: HttpContext) {
    const employee = await User.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const payload = await request.validateUsing(assignRoleValidator)

    // Verify role belongs to this tenant
    const role = await Role.query()
      .where('id', payload.roleId)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    try {
      await UserRoleAssignment.create({
        userId: employee.id,
        roleId: role.id,
        grantedBy: auth.user!.id,
        expiresAt: payload.expiresAt || null,
        isTemporary: !!payload.expiresAt,
      })
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Ce rôle est déjà assigné à cet employé.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', `Rôle "${role.name}" assigné avec succès.`)
    return response.redirect().toRoute('employees.roles', { id: employee.id })
  }
```

- [ ] **Step 4: Add the revokeRole method**

```typescript
  async revokeRole({ params, response, session, auth, tenant }: HttpContext) {
    const employee = await User.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const assignment = await UserRoleAssignment.query()
      .where('id', params.assignmentId)
      .where('userId', employee.id)
      .preload('role')
      .firstOrFail()

    // Prevent admin from removing their own Admin role
    if (employee.id === auth.user!.id && assignment.role.name === 'Admin') {
      session.flash('error', 'Vous ne pouvez pas retirer votre propre rôle Admin.')
      return response.redirect().toRoute('employees.roles', { id: employee.id })
    }

    await assignment.delete()

    session.flash('success', `Rôle "${assignment.role.name}" retiré avec succès.`)
    return response.redirect().toRoute('employees.roles', { id: employee.id })
  }
```

- [ ] **Step 5: Verify the controller compiles**

Run: `node ace type-check`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add app/controllers/employees_controller.ts
git commit -m "feat(rbac): add employee role assignment methods to controller"
```

---

## Task 8: Employee Role Assignment — View

**Files:**
- Create: `resources/views/pages/employees/roles.edge`

**Reference:** `resources/views/pages/employees/index.edge` for table styling

- [ ] **Step 1: Create the employee roles view**

```edge
{{-- resources/views/pages/employees/roles.edge --}}
@layout.dashboard()
  <div class="mx-auto max-w-4xl">

    {{-- Header --}}
    <div class="mb-6">
      <div class="flex items-center gap-2 text-sm text-on-surface mb-2">
        <a href="{{ route('employees.index') }}" class="hover:text-primary transition-colors">Employés</a>
        @svg('tabler:chevron-right', { class: 'size-4' })
        <span>{{ employee.fullName }}</span>
        @svg('tabler:chevron-right', { class: 'size-4' })
        <span>Rôles</span>
      </div>
      <h1 class="text-2xl font-bold text-on-surface-strong">Rôles de {{ employee.fullName }}</h1>
    </div>

    {{-- Assign Role Form --}}
    @if(availableRoles.length)
      <div class="mb-6 rounded-radius border border-outline bg-surface p-6">
        <h2 class="mb-4 text-sm font-semibold uppercase tracking-wider text-on-surface">Assigner un rôle</h2>
        @form({ route: 'employees.assignRole', routeParams: { id: employee.id }, method: 'POST' })
          <div class="flex items-end gap-4">
            <div class="flex-1">
              @field.root({ name: 'roleId' })
                @!field.label({ text: 'Rôle' })
                @!select.control({
                  options: availableRoles.map((r) => ({
                    value: r.id,
                    name: r.name,
                  }))
                })
                @!field.error()
              @end
            </div>
            <div class="flex-1">
              @field.root({ name: 'expiresAt' })
                @!field.label({ text: 'Date d\'expiration (optionnel)' })
                @!input.control({ type: 'date' })
                @!field.error()
              @end
            </div>
            <div>
              @!button({ text: 'Assigner', type: 'submit' })
            </div>
          </div>
        @end
      </div>
    @end

    {{-- Current Roles --}}
    <div class="overflow-hidden rounded-radius border border-outline bg-surface">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-outline bg-surface-alt text-xs uppercase tracking-wider text-on-surface">
          <tr>
            <th class="px-6 py-3">Rôle</th>
            <th class="px-6 py-3">Assigné le</th>
            <th class="px-6 py-3">Expire le</th>
            <th class="px-6 py-3">Accordé par</th>
            <th class="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline">
          @each(assignment in assignments)
            <tr class="hover:bg-surface-alt/50 {{ assignment.expiresAt && assignment.expiresAt < new Date() ? 'opacity-50' : '' }}">
              <td class="px-6 py-4 font-medium text-on-surface-strong">
                <a href="{{ route('roles.show', { id: assignment.role.id }) }}" class="hover:text-primary transition-colors">
                  {{ assignment.role.name }}
                </a>
                @if(assignment.role.isSystem)
                  <span class="ml-1 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Système</span>
                @end
                @if(assignment.isTemporary)
                  <span class="ml-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Temporaire</span>
                @end
              </td>
              <td class="px-6 py-4 text-on-surface">{{ assignment.createdAt.toFormat('dd/MM/yyyy') }}</td>
              <td class="px-6 py-4 text-on-surface">
                @if(assignment.expiresAt)
                  @if(assignment.expiresAt < new Date())
                    <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                      Expiré {{ assignment.expiresAt.toFormat('dd/MM/yyyy') }}
                    </span>
                  @else
                    {{ assignment.expiresAt.toFormat('dd/MM/yyyy') }}
                  @end
                @else
                  Permanent
                @end
              </td>
              <td class="px-6 py-4 text-on-surface">{{ assignment.granter?.fullName || '—' }}</td>
              <td class="px-6 py-4 text-right">
                @form({ route: 'employees.revokeRole', routeParams: { id: employee.id, assignmentId: assignment.id }, method: 'DELETE' })
                  <button type="submit"
                    class="cursor-pointer text-on-surface hover:text-danger transition-colors"
                    onclick="return confirm('Retirer ce rôle ?')">
                    @svg('tabler:trash', { class: 'size-4' })
                  </button>
                @end
              </td>
            </tr>
          @end
        </tbody>
      </table>

      @if(!assignments.length)
        <div class="px-6 py-12 text-center text-on-surface">
          Aucun rôle assigné à cet employé.
        </div>
      @end
    </div>
  </div>
@end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/employees/roles.edge
git commit -m "feat(rbac): add employee role assignment view"
```

---

## Task 9: Sidebar Update

**Files:**
- Modify: `resources/views/components/layout/dashboard.edge:107-128`

- [ ] **Step 1: Update the sidebar Rôles link**

In `resources/views/components/layout/dashboard.edge`, replace the placeholder link (lines 117-121):

```edge
          @!sidebar.item({
          href: '#',
          icon: 'tabler:shield',
          label: 'Rôles',
          })
```

with:

```edge
          @can('permission', 'role:read')
          @!sidebar.item({
          href: route('roles.index'),
          icon: 'tabler:shield',
          label: 'Rôles',
          })
          @end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/components/layout/dashboard.edge
git commit -m "feat(rbac): update sidebar with active roles link"
```

---

## Task 10: Smoke Test & Seed Sync

- [ ] **Step 1: Run the permissions seeder to sync new role permissions**

Run: `node ace db:seed --files database/seeders/00_permissions_seeder.ts`
Expected: Seeder runs successfully, new `role:*` permissions are synced to system roles

Note: The `role:*` permissions already exist in `config/rbac.ts` (lines 66-70). The seeder will pick them up via `updateOrCreate`.

- [ ] **Step 2: Start the dev server and verify pages load**

Run: `node ace serve --watch`

Manual checks:
1. Navigate to `/dashboard/roles` — should see hierarchical list of system roles (Admin, Dispatcher, Chauffeur, Lecteur)
2. Click "Voir" on Admin role → `/dashboard/roles/:id` should show full permission grid, all checkboxes disabled (system role)
3. Click "Nouveau rôle" → form should display with name + parent select
4. Create a custom role → should redirect to index with success flash
5. Click "Voir" on custom role → permission grid with editable checkboxes
6. Check/uncheck permissions and save → should persist
7. Navigate to `/dashboard/employees/:id/roles` (via URL) → should show assignments + assign form
8. Assign a role with expiration date → should appear in table
9. Revoke a role → should be removed

- [ ] **Step 3: Commit any fixes from smoke testing**

```bash
git add -A
git commit -m "fix(rbac): address smoke test issues"
```

Only commit this if fixes were needed. Skip if everything works.

---

## Task 11: Add Role Management Link to Employee Actions

**Files:**
- Modify: `resources/views/pages/employees/index.edge:78-95`

- [ ] **Step 1: Add a "manage roles" icon-link in employee table actions**

In `resources/views/pages/employees/index.edge`, in the actions `<div>` (around line 78), add before the edit link:

```edge
                  @can('permission', 'role:assign')
                    <a href="{{ route('employees.roles', { id: item.id }) }}"
                      class="text-on-surface hover:text-primary transition-colors" title="Gérer les rôles">
                      @svg('tabler:shield', { class: 'size-4' })
                    </a>
                  @end
```

- [ ] **Step 2: Commit**

```bash
git add resources/views/pages/employees/index.edge
git commit -m "feat(rbac): add role management link to employee list"
```
