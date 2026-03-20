import factory from '@adonisjs/lucid/factories'
import UserRoleAssignment from '#models/user_role_assignment'

export const UserRoleAssignmentFactory = factory
  .define(UserRoleAssignment, async () => {
    return {
      isTemporary: false,
      resourceId: null,
      expiresAt: null,
    }
  })
  .build()
