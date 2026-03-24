import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'
import Company from '#models/company'

export default class CompanyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    let company: Company | null = null

    if (user) {
      company = await Company.findOrFail(user.companyId)
    } else if (ctx.params.companySlug) {
      company = await Company.findByOrFail('slug', ctx.params.companySlug)
    }

    if (company) {
      ctx.company = company
      await db.rawQuery(`SET LOCAL app.current_tenant_id = '${company.id}'`)
    }

    return next()
  }
}

/**
 * Extend HttpContext to include the company property.
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    company?: Company
  }
}
