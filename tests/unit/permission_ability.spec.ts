import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import CompanyService from '#services/company_service'
import { permission } from '#abilities/main'
import { Bouncer } from '@adonisjs/bouncer'

test.group('Permission ability', (group) => {
  group.setup(async () => {
    const { default: PermissionsSeeder } = await import('#database/seeders/00_permissions_seeder')
    await new PermissionsSeeder(db.connection()).run()
  })
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('admin user is allowed for any permission', async ({ assert }) => {
    const { user } = await CompanyService.createWithAdmin({
      companyName: 'Test Co',
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      password: 'password123',
    })

    const bouncer = new Bouncer(() => user)
    const result = await bouncer.execute(permission, 'vehicle:delete')
    assert.isTrue(result.authorized)
  })

  test('user without permission is denied', async ({ assert }) => {
    const { company } = await CompanyService.createWithAdmin({
      companyName: 'Test Co',
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      password: 'password123',
    })

    const UserModule = await import('#models/user')
    const User = UserModule.default
    const noRoleUser = await User.create({
      companyId: company.id,
      firstName: 'C',
      lastName: 'D',
      email: 'c@test.co',
      password: 'password123',
    })

    const bouncer = new Bouncer(() => noRoleUser)
    const result = await bouncer.execute(permission, 'vehicle:read')
    assert.isFalse(result.authorized)
  })
})
