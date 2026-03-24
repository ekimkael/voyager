import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import env from '#start/env'
import hash from '@adonisjs/core/services/hash'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import User from '#models/user'
import Token from '#models/token'
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
    session.flash(
      'success',
      'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.'
    )

    if (!user) {
      return response.redirect().back()
    }

    // Delete any existing tokens for this user
    await Token.query().where('userId', user.id).where('type', 'password_reset').delete()

    const token = randomBytes(32).toString('hex')

    await Token.create({
      userId: user.id,
      type: 'password_reset',
      token,
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    const resetUrl = `${env.get('APP_URL')}/password/reset?token=${token}`

    await mail.send(new PasswordResetMail(user, resetUrl))

    return response.redirect().back()
  }

  async reset({ request, view }: HttpContext) {
    const tokenValue = request.input('token')

    if (!tokenValue) {
      return view.render('pages/auth/reset_password', {
        status: 'error',
        message: 'Ce lien est invalide ou a expiré.',
      })
    }

    const tokenRecord = await Token.query()
      .where('token', tokenValue)
      .where('type', 'password_reset')
      .first()

    if (!tokenRecord || tokenRecord.isExpired || tokenRecord.isUsed) {
      return view.render('pages/auth/reset_password', {
        status: 'error',
        message: 'Ce lien est invalide ou a expiré.',
      })
    }

    return view.render('pages/auth/reset_password', { token: tokenValue })
  }

  async update({ request, response, session }: HttpContext) {
    const { token, password } = await request.validateUsing(resetPasswordValidator)

    const tokenRecord = await Token.query()
      .where('token', token)
      .where('type', 'password_reset')
      .preload('user')
      .first()

    if (!tokenRecord || tokenRecord.isExpired || tokenRecord.isUsed) {
      session.flash('error', 'Ce lien est invalide ou a expiré.')
      return response.redirect().toRoute('password.forgot')
    }

    const user = tokenRecord.user
    user.password = await hash.make(password)
    await user.save()

    // Mark token as used and clean up other tokens
    tokenRecord.usedAt = DateTime.now()
    await tokenRecord.save()

    session.flash('success', 'Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.')
    return response.redirect().toRoute('session.create')
  }
}
