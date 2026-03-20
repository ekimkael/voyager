import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Permission from '#models/permission'
import Role from '#models/role'
import RolePermission from '#models/role_permission'
import { permissions, systemRoles } from '#config/rbac'

export default class extends BaseSeeder {
  async run() {
    // 1. Upsert all permissions from config
    for (const perm of permissions) {
      await Permission.updateOrCreate(
        { resource: perm.resource, action: perm.action },
        {
          description: perm.description,
          isSensitive: 'isSensitive' in perm ? perm.isSensitive : false,
        }
      )
    }

    // 2. Sync system roles: ensure existing roles have up-to-date permissions
    const allPermissions = await Permission.all()
    const permissionMap = new Map(allPermissions.map((p) => [`${p.resource}:${p.action}`, p]))

    for (const roleDef of systemRoles) {
      const roles = await Role.query().where('name', roleDef.name).where('isSystem', true)

      const permKeys =
        roleDef.permissions === '*' ? [...permissionMap.keys()] : roleDef.permissions

      for (const role of roles) {
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
