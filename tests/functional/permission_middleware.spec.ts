import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import router from '@adonisjs/core/services/router'
import CompanyService from '#services/company_service'
import { middleware } from '#start/kernel'

// Register the test route at module load time so it is available when the HTTP
// server boots (group.setup runs after the server starts and is too late).
router
  .get('/__test/permission-gate', async () => {
    return 'OK'
  })
  .use([middleware.auth(), middleware.permission({ keys: ['vehicle:delete'] })])

test.group('Permission middleware', (group) => {
  group.setup(async () => {
    const { default: PermissionsSeeder } = await import('#database/seeders/00_permissions_seeder')
    await new PermissionsSeeder(db.connection()).run()
  })
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('admin passes permission middleware', async ({ client }) => {
    const { user } = await CompanyService.createWithAdmin({
      companyName: 'Test Co',
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      password: 'password123',
    })

    const response = await client
      .get('/__test/permission-gate')
      .withSession({ auth_web: user.id })
      .withCsrfToken()
    response.assertStatus(200)
    response.assertTextIncludes('OK')
  })

  test('user without permission is redirected to dashboard', async ({ client }) => {
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

    const response = await client
      .get('/__test/permission-gate')
      .withSession({ auth_web: noRoleUser.id })
      .withCsrfToken()
      .redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
  })
})
