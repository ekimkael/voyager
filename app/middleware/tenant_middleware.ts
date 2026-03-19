import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Tenant from '#models/tenant'

/**
 * Resolves the current tenant from the authenticated user
 * and makes it available on the HttpContext.
 */
export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user) {
      return next()
    }

    const tenant = await Tenant.findOrFail(user.tenantId)
    ctx.tenant = tenant

    return next()
  }
}

/**
 * Extend HttpContext to include the tenant property.
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    tenant?: Tenant
  }
}
