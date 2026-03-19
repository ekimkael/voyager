import PermissionResolver from '#services/permission_resolver'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class PermissionMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { keys: string[] }) {
    const resolver = ctx.permissionResolver ?? new PermissionResolver(ctx.auth.user!)
    const allowed = await resolver.canAny(options.keys)

    if (!allowed) {
      ctx.session.flash('error', "Vous n'avez pas accès à cette section.")
      return ctx.response.redirect().toRoute('dashboard.index')
    }

    return next()
  }
}
