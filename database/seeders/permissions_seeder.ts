import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Permission from '#models/permission'
import { permissions } from '#config/rbac'

export default class extends BaseSeeder {
  async run() {
    for (const perm of permissions) {
      await Permission.updateOrCreate(
        { resource: perm.resource, action: perm.action },
        {
          description: perm.description,
          isSensitive: 'isSensitive' in perm ? perm.isSensitive : false,
        }
      )
    }
  }
}
