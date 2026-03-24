import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Company from '#models/company'
import Role from '#models/role'
import Permission from '#models/permission'
import RolePermission from '#models/role_permission'
import { systemRoles } from '#config/rbac'

export default class extends BaseSeeder {
  async run() {
    const companies = await Company.all()
    const allPermissions = await Permission.all()
    const permissionMap = new Map(allPermissions.map((p) => [`${p.resource}:${p.action}`, p]))

    for (const company of companies) {
      for (const roleDef of systemRoles) {
        const role = await Role.updateOrCreate(
          { companyId: company.id, name: roleDef.name },
          { scope: 'global', isSystem: true }
        )

        // Remove existing permissions
        await RolePermission.query().where('roleId', role.id).delete()

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
