import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import TenantService from '#services/tenant_service'
import PermissionResolver from '#services/permission_resolver'
import Role from '#models/role'
import Permission from '#models/permission'
import RolePermission from '#models/role_permission'
import UserRoleAssignment from '#models/user_role_assignment'

test.group('PermissionResolver', (group) => {
  group.setup(async () => {
    const { default: PermissionsSeeder } = await import('#database/seeders/permissions_seeder')
    await new PermissionsSeeder(db.connection()).run()
  })
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('admin user has all permissions', async ({ assert }) => {
    const { user } = await TenantService.createWithAdmin({
      companyName: 'Test Co',
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      password: 'password123',
    })

    const resolver = new PermissionResolver(user)
    assert.isTrue(await resolver.can('vehicle:delete'))
    assert.isTrue(await resolver.can('route:create'))
    assert.isTrue(await resolver.can('user:delete'))
  })

  test('lecteur can only read', async ({ assert }) => {
    const { user, tenant } = await TenantService.createWithAdmin({
      companyName: 'Test Co',
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      password: 'password123',
    })

    const UserModule = await import('#models/user')
    const User = UserModule.default
    const lecteur = await User.create({
      tenantId: tenant.id,
      firstName: 'C',
      lastName: 'D',
      email: 'c@test.co',
      password: 'password123',
    })

    const lecteurRole = await Role.query()
      .where('tenant_id', tenant.id)
      .where('name', 'Lecteur')
      .firstOrFail()

    await UserRoleAssignment.create({
      userId: lecteur.id,
      roleId: lecteurRole.id,
      grantedBy: user.id,
    })

    const resolver = new PermissionResolver(lecteur)
    assert.isTrue(await resolver.can('vehicle:read'))
    assert.isTrue(await resolver.can('route:read'))
    assert.isFalse(await resolver.can('vehicle:create'))
    assert.isFalse(await resolver.can('vehicle:delete'))
  })

  test('inherited permissions from parent role', async ({ assert }) => {
    const { user, tenant } = await TenantService.createWithAdmin({
      companyName: 'Test Co',
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      password: 'password123',
    })

    const lecteurRole = await Role.query()
      .where('tenant_id', tenant.id)
      .where('name', 'Lecteur')
      .firstOrFail()

    const seniorLecteur = await Role.create({
      tenantId: tenant.id,
      name: 'Senior Lecteur',
      parentRoleId: lecteurRole.id,
    })

    const vehicleCreate = await Permission.query()
      .where('resource', 'vehicle')
      .where('action', 'create')
      .firstOrFail()

    await RolePermission.create({
      roleId: seniorLecteur.id,
      permissionId: vehicleCreate.id,
    })

    const UserModule = await import('#models/user')
    const User = UserModule.default
    const testUser = await User.create({
      tenantId: tenant.id,
      firstName: 'E',
      lastName: 'F',
      email: 'e@test.co',
      password: 'password123',
    })

    await UserRoleAssignment.create({
      userId: testUser.id,
      roleId: seniorLecteur.id,
      grantedBy: user.id,
    })

    const resolver = new PermissionResolver(testUser)
    assert.isTrue(await resolver.can('vehicle:create'))
    assert.isTrue(await resolver.can('vehicle:read'))
    assert.isTrue(await resolver.can('route:read'))
    assert.isFalse(await resolver.can('vehicle:delete'))
  })

  test('user with no roles has no permissions', async ({ assert }) => {
    const { tenant } = await TenantService.createWithAdmin({
      companyName: 'Test Co',
      firstName: 'A',
      lastName: 'B',
      email: 'a@test.co',
      password: 'password123',
    })

    const UserModule = await import('#models/user')
    const User = UserModule.default
    const noRoleUser = await User.create({
      tenantId: tenant.id,
      firstName: 'G',
      lastName: 'H',
      email: 'g@test.co',
      password: 'password123',
    })

    const resolver = new PermissionResolver(noRoleUser)
    assert.isFalse(await resolver.can('vehicle:read'))
  })
})
