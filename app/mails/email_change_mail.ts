import { BaseMail } from '@adonisjs/mail'
import User from '#models/user'

export default class EmailChangeMail extends BaseMail {
  subject = 'Confirmez votre nouvelle adresse email'

  constructor(
    private user: User,
    private confirmationUrl: string
  ) {
    super()
  }

  prepare() {
    this.message.to(this.user.email).htmlView('emails/email_change', {
      user: this.user,
      confirmationUrl: this.confirmationUrl,
    })
  }
}
