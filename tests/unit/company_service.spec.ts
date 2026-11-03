import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import CompanyService from '#services/company_service'
import Role from '#models/role'
import RolePermission from '#models/role_permission'

test.group('CompanyService', (group) => {
  group.setup(async () => {
    // Seed permissions catalog (required by CompanyService)
    const { default: PermissionsSeeder } = await import('#database/seeders/00_permissions_seeder')
    await new PermissionsSeeder(db.connection()).run()
  })
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('createWithAdmin creates company, admin user, and system roles', async ({ assert }) => {
    const result = await CompanyService.createWithAdmin({
      companyName: 'TransCo Test',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@transco.test',
      password: 'password123',
    })

    assert.exists(result.company)
    assert.exists(result.user)
    assert.equal(result.company.name, 'TransCo Test')
    assert.equal(result.company.slug, 'transco-test')
    assert.equal(result.user.companyId, result.company.id)

    // Verify system roles were created
    const roles = await Role.query().where('company_id', result.company.id)
    assert.equal(roles.length, 4)
    const roleNames = roles.map((r) => r.name).sort()
    assert.deepEqual(roleNames, ['Admin', 'Chauffeur', 'Dispatcher', 'Lecteur'])

    // Verify all system roles are flagged
    assert.isTrue(roles.every((r) => r.isSystem))

    // Verify admin role has permissions
    const adminRole = roles.find((r) => r.name === 'Admin')!
    const adminPermissions = await RolePermission.query().where('role_id', adminRole.id)
    assert.isAbove(adminPermissions.length, 0)

    // Verify user has admin role
    const assignments = await result.user.related('roleAssignments').query()
    assert.equal(assignments.length, 1)
    assert.equal(assignments[0].roleId, adminRole.id)
  })

  test('createWithAdmin generates unique slug on conflict', async ({ assert }) => {
    const first = await CompanyService.createWithAdmin({
      companyName: 'TransCo',
      firstName: 'A',
      lastName: 'B',
      email: 'a@transco.test',
      password: 'password123',
    })

    const second = await CompanyService.createWithAdmin({
      companyName: 'TransCo',
      firstName: 'C',
      lastName: 'D',
      email: 'c@transco2.test',
      password: 'password123',
    })

    assert.notEqual(first.company.slug, second.company.slug)
    assert.isTrue(second.company.slug.startsWith('transco-'))
  })
})
