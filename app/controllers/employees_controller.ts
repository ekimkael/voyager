import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Role from '#models/role'
import Franchise from '#models/franchise'
import UserRoleAssignment from '#models/user_role_assignment'
import { createEmployeeValidator, updateEmployeeValidator } from '#validators/employee'
import { assignRoleValidator } from '#validators/role'

export default class EmployeesController {
  async index({ view, tenant, request, auth }: HttpContext) {
    const page = request.input('page', 1)
    const filterFranchiseId = request.input('franchise_id') || null

    const query = User.query()
      .where('tenantId', tenant!.id)
      .preload('franchise')
      .preload('roleAssignments', (q) => {
        q.preload('role')
      })
      .orderBy('firstName')
      .orderBy('lastName')

    const isScopedToFranchise = !!(
      auth.user!.franchiseId && !(await this.isAdminOrDispatcher(auth.user!.id, tenant!.id))
    )

    if (isScopedToFranchise) {
      query.where('franchiseId', auth.user!.franchiseId!)
    } else if (filterFranchiseId) {
      query.where('franchiseId', filterFranchiseId)
    }

    const employees = await query.paginate(page, 20)
    employees.baseUrl('/employees')
    if (filterFranchiseId) {
      employees.queryString({ franchise_id: filterFranchiseId })
    }

    const franchises = await Franchise.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .preload('city')
      .orderBy('name')

    return view.render('pages/dashboard/employees/index', {
      employees,
      franchises,
      filterFranchiseId,
      isScopedToFranchise,
    })
  }

  async create({ view, tenant, auth }: HttpContext) {
    const isScopedToFranchise = !!(
      auth.user!.franchiseId && !(await this.isAdminOrDispatcher(auth.user!.id, tenant!.id))
    )

    const franchises = await Franchise.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .preload('city')
      .orderBy('name')

    const roles = await Role.query()
      .where('tenantId', tenant!.id)
      .where('isSystem', true)
      .orderBy('name')

    return view.render('pages/dashboard/employees/edit', {
      franchises,
      roles,
      isScopedToFranchise,
      scopedFranchiseId: auth.user!.franchiseId,
    })
  }

  async store({ request, response, session, tenant, auth }: HttpContext) {
    const payload = await request.validateUsing(createEmployeeValidator)

    // Server-side enforcement: scoped agents can only create employees in their own franchise
    const isScopedToFranchise = !!(
      auth.user!.franchiseId && !(await this.isAdminOrDispatcher(auth.user!.id, tenant!.id))
    )
    if (isScopedToFranchise) {
      payload.franchiseId = auth.user!.franchiseId!
    }

    try {
      await db.transaction(async (trx) => {
        const user = await User.create(
          {
            tenantId: tenant!.id,
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            password: payload.password,
            phone: payload.phone || null,
            franchiseId: payload.franchiseId,
          },
          { client: trx }
        )

        await UserRoleAssignment.create(
          {
            userId: user.id,
            roleId: payload.roleId,
            grantedBy: auth.user!.id,
          },
          { client: trx }
        )
      })
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Un employé avec cet email existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Employé créé avec succès')
    return response.redirect().toRoute('employees.index')
  }

  async edit({ params, view, tenant, auth }: HttpContext) {
    const employee = await User.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .preload('roleAssignments', (q) => {
        q.preload('role')
      })
      .firstOrFail()

    const isScopedToFranchise = !!(
      auth.user!.franchiseId && !(await this.isAdminOrDispatcher(auth.user!.id, tenant!.id))
    )

    const franchises = await Franchise.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .preload('city')
      .orderBy('name')

    const roles = await Role.query()
      .where('tenantId', tenant!.id)
      .where('isSystem', true)
      .orderBy('name')

    return view.render('pages/dashboard/employees/edit', {
      employee,
      franchises,
      roles,
      isScopedToFranchise,
      scopedFranchiseId: auth.user!.franchiseId,
    })
  }

  async update({ params, request, response, session, tenant, auth }: HttpContext) {
    const employee = await User.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const payload = await request.validateUsing(updateEmployeeValidator)

    // Server-side enforcement: scoped agents can only assign employees to their own franchise
    const isScopedToFranchise = !!(
      auth.user!.franchiseId && !(await this.isAdminOrDispatcher(auth.user!.id, tenant!.id))
    )
    if (isScopedToFranchise) {
      payload.franchiseId = auth.user!.franchiseId!
    }

    try {
      await db.transaction(async (trx) => {
        employee.merge({
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          phone: payload.phone || null,
          franchiseId: payload.franchiseId,
          status: payload.status,
        })

        if (payload.password) {
          employee.password = payload.password
        }

        employee.useTransaction(trx)
        await employee.save()

        await UserRoleAssignment.updateOrCreate(
          { userId: employee.id },
          { roleId: payload.roleId },
          { client: trx }
        )
      })
    } catch (error) {
      if (error.code === '23505') {
        session.flash('error', 'Un employé avec cet email existe déjà.')
        return response.redirect().back()
      }
      throw error
    }

    session.flash('success', 'Employé mis à jour avec succès')
    return response.redirect().toRoute('employees.index')
  }

  async destroy({ params, response, session, tenant }: HttpContext) {
    const employee = await User.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const adminRole = await Role.query()
      .where('tenantId', tenant!.id)
      .where('name', 'Admin')
      .first()

    if (adminRole) {
      const isAdmin = await UserRoleAssignment.query()
        .where('userId', employee.id)
        .where('roleId', adminRole.id)
        .first()

      if (isAdmin) {
        const activeAdminCount = await UserRoleAssignment.query()
          .where('roleId', adminRole.id)
          .whereHas('user', (q) => {
            q.where('tenantId', tenant!.id).where('status', 'active')
          })
          .count('* as total')

        if (Number(activeAdminCount[0].$extras.total) <= 1) {
          session.flash('error', 'Impossible de désactiver le dernier administrateur actif.')
          return response.redirect().toRoute('employees.index')
        }
      }
    }

    employee.status = 'inactive'
    await employee.save()

    session.flash('success', 'Employé désactivé avec succès')
    return response.redirect().toRoute('employees.index')
  }

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

    return view.render('pages/dashboard/employees/roles', {
      employee,
      assignments,
      availableRoles,
    })
  }

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

  private async isAdminOrDispatcher(userId: string, tenantId: string): Promise<boolean> {
    const assignment = await UserRoleAssignment.query()
      .where('userId', userId)
      .whereHas('role', (q) => {
        q.where('tenantId', tenantId).whereIn('name', ['Admin', 'Dispatcher'])
      })
      .first()

    return !!assignment
  }
}
