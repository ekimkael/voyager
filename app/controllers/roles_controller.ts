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

  async create({ view, tenant }: HttpContext) {
    const roles = await Role.query()
      .where('tenantId', tenant!.id)
      .orderBy('name')

    return view.render('pages/roles/form', { roles })
  }

  async store({ request, response, session, tenant }: HttpContext) {
    const payload = await request.validateUsing(createRoleValidator)

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

    const allPermissions = await Permission.all()
    const directPermissionIds = new Set(role.rolePermissions.map((rp) => rp.permissionId))

    // Walk parent chain to collect inherited permissions
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

    // Build CRUD grid + special permissions
    const crudActions = ['read', 'create', 'update', 'delete']
    const resourceMap = new Map<
      string,
      Map<
        string,
        { permissionId: string; granted: boolean; inherited: boolean; from: string | null }
      >
    >()
    const specialPermissions: Array<{
      permissionId: string
      key: string
      description: string | null
      granted: boolean
      inherited: boolean
      from: string | null
    }> = []

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

    if (payload.parentRoleId) {
      if (payload.parentRoleId === role.id) {
        session.flash('error', 'Un rôle ne peut pas être son propre parent.')
        return response.redirect().back()
      }

      const parentExists = await Role.query()
        .where('id', payload.parentRoleId)
        .where('tenantId', tenant!.id)
        .first()

      if (!parentExists) {
        session.flash('error', 'Le rôle parent sélectionné est invalide.')
        return response.redirect().back()
      }

      let currentId: string | null = payload.parentRoleId
      let depth = 0
      while (currentId && depth < 4) {
        const ancestor: Role | null = await Role.find(currentId)
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

  async destroy({ params, response, session, tenant }: HttpContext) {
    const role = await Role.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (role.isSystem) {
      session.flash('error', 'Les rôles système ne peuvent pas être supprimés.')
      return response.redirect().toRoute('roles.index')
    }

    const assignedCount = await UserRoleAssignment.query()
      .where('roleId', role.id)
      .count('* as total')

    if (Number(assignedCount[0].$extras.total) > 0) {
      session.flash('error', 'Impossible de supprimer un rôle assigné à des utilisateurs.')
      return response.redirect().toRoute('roles.index')
    }

    const childCount = await Role.query()
      .where('parentRoleId', role.id)
      .count('* as total')

    if (Number(childCount[0].$extras.total) > 0) {
      session.flash('error', 'Impossible de supprimer un rôle qui a des rôles enfants.')
      return response.redirect().toRoute('roles.index')
    }

    await db.transaction(async (trx) => {
      await RolePermission.query({ client: trx }).where('roleId', role.id).delete()
      role.useTransaction(trx)
      await role.delete()
    })

    session.flash('success', 'Rôle supprimé avec succès.')
    return response.redirect().toRoute('roles.index')
  }

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

    const permissionIds = payload.permissions ?? []

    await db.transaction(async (trx) => {
      await RolePermission.query({ client: trx }).where('roleId', role.id).delete()

      if (permissionIds.length > 0) {
        const records = permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        }))
        await RolePermission.createMany(records, { client: trx })
      }
    })

    session.flash('success', 'Permissions mises à jour avec succès.')
    return response.redirect().toRoute('roles.show', { id: role.id })
  }
}
