import type { HttpContext } from '@adonisjs/core/http'
import { randomBytes } from 'node:crypto'
import env from '#start/env'
import hash from '@adonisjs/core/services/hash'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import User from '#models/user'
import Token from '#models/token'
import EmailChangeMail from '#mails/email_change_mail'
import { changeEmailValidator } from '#validators/profile'

export default class EmailChangeController {
  async store({ request, response, session, auth, company }: HttpContext) {
    const payload = await request.validateUsing(changeEmailValidator)
    const user = auth.user!

    const isPasswordValid = await hash.verify(user.password, payload.currentPassword)
    if (!isPasswordValid) {
      session.flash('error', 'Le mot de passe actuel est incorrect')
      return response.redirect().back()
    }

    const emailTaken = await User.query()
      .where('companyId', company!.id)
      .where('email', payload.newEmail)
      .whereNot('id', user.id)
      .first()

    if (emailTaken) {
      session.flash('error', 'Cet email est déjà utilisé par un autre compte')
      return response.redirect().back()
    }

    await Token.query().where('userId', user.id).where('type', 'email_change').delete()

    const token = randomBytes(32).toString('hex')

    await Token.create({
      userId: user.id,
      type: 'email_change',
      token,
      metadata: { newEmail: payload.newEmail },
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    const confirmationUrl = `${env.get('APP_URL')}/email/confirm?token=${token}`

    await mail.send(new EmailChangeMail(user, confirmationUrl))

    session.flash('success', `Un email de confirmation a été envoyé à ${payload.newEmail}`)
    return response.redirect().toRoute('profile.show')
  }

  async confirm({ request, view, auth }: HttpContext) {
    const tokenValue = request.input('token')

    if (!tokenValue) {
      return view.render('pages/profile/email_confirm', {
        status: 'error',
        message: 'Ce lien est invalide ou a expiré',
        isLoggedIn: auth.isAuthenticated,
      })
    }

    const tokenRecord = await Token.query()
      .where('token', tokenValue)
      .where('type', 'email_change')
      .preload('user')
      .first()

    if (!tokenRecord || tokenRecord.isExpired || tokenRecord.isUsed) {
      return view.render('pages/profile/email_confirm', {
        status: 'error',
        message: 'Ce lien est invalide ou a expiré',
        isLoggedIn: auth.isAuthenticated,
      })
    }

    try {
      const user = tokenRecord.user
      const metadata = tokenRecord.metadata as { newEmail: string }
      user.email = metadata.newEmail
      await user.save()

      tokenRecord.usedAt = DateTime.now()
      await tokenRecord.save()

      return view.render('pages/profile/email_confirm', {
        status: 'success',
        message: 'Votre adresse email a été mise à jour avec succès',
        isLoggedIn: auth.isAuthenticated,
      })
    } catch (error) {
      if (error.code === '23505') {
        return view.render('pages/profile/email_confirm', {
          status: 'error',
          message: 'Cet email est déjà utilisé par un autre compte',
          isLoggedIn: auth.isAuthenticated,
        })
      }
      throw error
    }
  }
}
