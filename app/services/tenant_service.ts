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
