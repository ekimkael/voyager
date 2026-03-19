import TenantService from '#services/tenant_service'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class NewAccountController {
  async create({ view }: HttpContext) {
    return view.render('pages/auth/signup')
  }

  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)
    const { user } = await TenantService.createWithAdmin(payload)

    await auth.use('web').login(user)
    response.redirect().toRoute('home')
  }
}
