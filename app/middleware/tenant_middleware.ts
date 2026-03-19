import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'
import Tenant from '#models/tenant'

/**
 * Resolves the current tenant from the authenticated user,
 * makes it available on the HttpContext, and sets the
 * PostgreSQL RLS tenant context via SET LOCAL.
 */
export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user
    if (!user) {
      return next()
    }

    const tenant = await Tenant.findOrFail(user.tenantId)
    ctx.tenant = tenant

    // Set RLS tenant context within a transaction
    await db.rawQuery(`SET LOCAL app.current_tenant_id = '${tenant.id}'`)

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
