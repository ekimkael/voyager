import type { HttpContext } from '@adonisjs/core/http'
import PermissionResolver from '#services/permission_resolver'

export default class DashboardController {
  async index({ view, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const resolver = new PermissionResolver(user)
    const permissions = await resolver.permissions()

    return view.render('pages/dashboard/index', {
      permissions: [...permissions],
    })
  }
}
