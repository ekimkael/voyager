import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'
import Role from '#models/role'
import Permission from '#models/permission'
import RolePermission from '#models/role_permission'
import { systemRoles } from '#config/rbac'

export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()
    const allPermissions = await Permission.all()
    const permissionMap = new Map(allPermissions.map((p) => [`${p.resource}:${p.action}`, p]))

    for (const tenant of tenants) {
      for (const roleDef of systemRoles) {
        const role = await Role.updateOrCreate(
          { tenantId: tenant.id, name: roleDef.name },
          { scope: 'global', isSystem: true }
        )

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
