import { BaseMail } from '@adonisjs/mail'
import User from '#models/user'

export default class PasswordResetMail extends BaseMail {
  subject = 'Réinitialisation de votre mot de passe'

  constructor(
    private user: User,
    private resetUrl: string
  ) {
    super()
  }

  prepare() {
    this.message.to(this.user.email).htmlView('emails/password_reset', {
      user: this.user,
      resetUrl: this.resetUrl,
    })
  }
}
