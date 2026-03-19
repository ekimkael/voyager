import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import Tenant from '#models/tenant'
import Role from '#models/role'
import User from '#models/user'

test.group('Tenant creation via signup', (group) => {
  group.setup(async () => {
    const { default: PermissionsSeeder } = await import('#database/seeders/permissions_seeder')
    await new PermissionsSeeder(db).run()
  })
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('POST /signup creates tenant, admin user, and system roles', async ({ assert, client }) => {
    const response = await client.post('/signup').withCsrfToken().redirects(0).form({
      companyName: 'Bus Express',
      firstName: 'Marie',
      lastName: 'Dupont',
      email: 'marie@busexpress.com',
      password: 'securepass123',
      passwordConfirmation: 'securepass123',
    })

    response.assertStatus(302)

    const user = await User.findBy('email', 'marie@busexpress.com')
    assert.exists(user)

    const tenant = await Tenant.findOrFail(user!.tenantId)
    assert.equal(tenant.name, 'Bus Express')
    assert.equal(tenant.slug, 'bus-express')

    const roles = await Role.query().where('tenant_id', tenant.id).orderBy('name')
    assert.equal(roles.length, 4)
    assert.deepEqual(
      roles.map((r) => r.name),
      ['Admin', 'Chauffeur', 'Dispatcher', 'Lecteur']
    )
  })
})
