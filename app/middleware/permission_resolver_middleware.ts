import PermissionResolver from '#services/permission_resolver'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    permissionResolver?: PermissionResolver
  }
}

export default class PermissionResolverMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (ctx.auth.user) {
      ctx.permissionResolver = new PermissionResolver(ctx.auth.user)
    }
    return next()
  }
}
