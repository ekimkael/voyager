import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'
import Tenant from '#models/tenant'

export default class TenantMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    let tenant: Tenant | null = null

    if (user) {
      tenant = await Tenant.findOrFail(user.tenantId)
    } else if (ctx.params.tenantSlug) {
      tenant = await Tenant.findByOrFail('slug', ctx.params.tenantSlug)
    }

    if (tenant) {
      ctx.tenant = tenant
      await db.rawQuery(`SET LOCAL app.current_tenant_id = '${tenant.id}'`)
    }

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
