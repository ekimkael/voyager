import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import { updatePasswordValidator } from '#validators/profile'

export default class SecurityController {
  async show({ view, auth }: HttpContext) {
    return view.render('pages/dashboard/profile/security', {
      user: auth.user!,
    })
  }

  async update({ request, response, session, auth }: HttpContext) {
    const payload = await request.validateUsing(updatePasswordValidator)
    const user = auth.user!

    const isPasswordValid = await hash.verify(user.password, payload.currentPassword)
    if (!isPasswordValid) {
      session.flash('error', 'Le mot de passe actuel est incorrect')
      return response.redirect().back()
    }

    user.password = payload.newPassword
    await user.save()

    session.flash('success', 'Votre mot de passe a été mis à jour avec succès')
    return response.redirect().toRoute('security.show')
  }
}
