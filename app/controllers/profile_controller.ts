import type { HttpContext } from '@adonisjs/core/http'
import { updateProfileValidator } from '#validators/profile'

export default class ProfileController {
  async show({ view, auth }: HttpContext) {
    return view.render('pages/profile/index', {
      user: auth.user!,
    })
  }

  async update({ request, response, session, auth }: HttpContext) {
    const payload = await request.validateUsing(updateProfileValidator)
    const user = auth.user!

    user.firstName = payload.firstName
    user.lastName = payload.lastName
    user.phone = payload.phone ?? null

    await user.save()

    session.flash('success', 'Vos informations ont été mises à jour avec succès')
    return response.redirect().toRoute('profile.show')
  }
}
