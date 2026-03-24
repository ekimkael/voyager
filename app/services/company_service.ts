import db from '@adonisjs/lucid/services/db'
import Company from '#models/company'
import User from '#models/user'
import Role from '#models/role'
import RolePermission from '#models/role_permission'
import Permission from '#models/permission'
import UserRoleAssignment from '#models/user_role_assignment'
import { systemRoles } from '#config/rbac'
import string from '@adonisjs/core/helpers/string'

interface CreateCompanyInput {
  companyName: string
  firstName: string
  lastName: string
  email: string
  password: string
}

export default class CompanyService {
  static async createWithAdmin(input: CreateCompanyInput) {
    return db.transaction(async (trx) => {
      const slug = await this.#generateUniqueSlug(input.companyName, trx)

      const company = await Company.create({ name: input.companyName, slug }, { client: trx })

      const user = await User.create(
        {
          companyId: company.id,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          password: input.password,
        },
        { client: trx }
      )

      const adminRole = await this.#seedSystemRoles(company.id, trx)

      await UserRoleAssignment.create(
        {
          userId: user.id,
          roleId: adminRole.id,
          grantedBy: user.id,
        },
        { client: trx }
      )

      return { company, user }
    })
  }

  static async #seedSystemRoles(companyId: string, trx: any) {
    const allPermissions = await Permission.query({ client: trx })
    const permissionMap = new Map(allPermissions.map((p) => [`${p.resource}:${p.action}`, p]))

    let adminRole: Role | undefined

    for (const roleDef of systemRoles) {
      const role = await Role.create(
        {
          companyId,
          name: roleDef.name,
          isSystem: true,
        },
        { client: trx }
      )

      if (roleDef.name === 'Admin') {
        adminRole = role
      }

      const permKeys = roleDef.permissions === '*' ? [...permissionMap.keys()] : roleDef.permissions

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

    while (await Company.query({ client: trx }).where('slug', slug).first()) {
      slug = `${baseSlug}-${suffix}`
      suffix++
    }

    return slug
  }
}
