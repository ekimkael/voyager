import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import env from '#start/env'
import hash from '@adonisjs/core/services/hash'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import User from '#models/user'
import PasswordResetToken from '#models/password_reset_token'
import PasswordResetMail from '#mails/password_reset_mail'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/password_reset'

export default class PasswordResetController {
  async forgot({ view }: HttpContext) {
    return view.render('pages/auth/forgot_password')
  }

  async sendResetLink({ request, response, session }: HttpContext) {
    const { email } = await request.validateUsing(forgotPasswordValidator)

    const user = await User.findBy('email', email)

    // Always show success message to prevent email enumeration
    session.flash('success', 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.')

    if (!user) {
      return response.redirect().back()
    }

    // Delete any existing tokens for this user
    await PasswordResetToken.query().where('userId', user.id).delete()

    const token = randomBytes(32).toString('hex')

    await PasswordResetToken.create({
      userId: user.id,
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    const resetUrl = `${env.get('APP_URL')}/password/reset?token=${token}`

    await mail.send(new PasswordResetMail(user, resetUrl))

    return response.redirect().back()
  }

  async reset({ request, view }: HttpContext) {
    const token = request.input('token')

    if (!token) {
      return view.render('pages/auth/reset_password', {
        status: 'error',
        message: 'Ce lien est invalide ou a expiré.',
      })
    }

    const resetToken = await PasswordResetToken.query().where('token', token).first()

    if (!resetToken || resetToken.expiresAt < DateTime.now()) {
      return view.render('pages/auth/reset_password', {
        status: 'error',
        message: 'Ce lien est invalide ou a expiré.',
      })
    }

    return view.render('pages/auth/reset_password', { token })
  }

  async update({ request, response, session }: HttpContext) {
    const { token, password } = await request.validateUsing(resetPasswordValidator)

    const resetToken = await PasswordResetToken.query()
      .where('token', token)
      .preload('user')
      .first()

    if (!resetToken || resetToken.expiresAt < DateTime.now()) {
      session.flash('error', 'Ce lien est invalide ou a expiré.')
      return response.redirect().toRoute('password.forgot')
    }

    const user = resetToken.user
    user.password = await hash.make(password)
    await user.save()

    await PasswordResetToken.query().where('userId', user.id).delete()

    session.flash('success', 'Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.')
    return response.redirect().toRoute('session.create')
  }
}
