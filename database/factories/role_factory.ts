import factory from '@adonisjs/lucid/factories'
import Role from '#models/role'

export const RoleFactory = factory
  .define(Role, async ({ faker }) => {
    return {
      name: faker.person.jobTitle(),
      scope: 'global' as const,
      isSystem: false,
    }
  })
  .build()
