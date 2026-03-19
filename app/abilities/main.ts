import { Bouncer } from '@adonisjs/bouncer'
import User from '#models/user'
import PermissionResolver from '#services/permission_resolver'
import { HttpContext } from '@adonisjs/core/http'

export const permission = Bouncer.ability(async (user: User, key: string) => {
  const ctx = HttpContext.get()
  const resolver = ctx?.permissionResolver ?? new PermissionResolver(user)
  return resolver.can(key)
})
