import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const NewAccountController = () => import('#controllers/auth/new_account_controller')
const PasswordResetController = () => import('#controllers/auth/password_reset_controller')
const SessionController = () => import('#controllers/auth/session_controller')

router
  .group(() => {
    router.get('signup', [NewAccountController, 'create']).as('new_account.create')
    router.post('signup', [NewAccountController, 'store']).as('new_account.store')

    router.get('signin', [SessionController, 'create']).as('session.create')
    router.post('signin', [SessionController, 'store']).as('session.store')

    router.get('password/forgot', [PasswordResetController, 'forgot']).as('password.forgot')
    router
      .post('password/forgot', [PasswordResetController, 'sendResetLink'])
      .as('password.sendResetLink')
    router.get('password/reset', [PasswordResetController, 'reset']).as('password.reset')
    router.post('password/reset', [PasswordResetController, 'update']).as('password.update')
  })
  .prefix('auth')
  .use(middleware.guest())

router
  .post('auth/logout', [SessionController, 'destroy'])
  .as('session.destroy')
  .use(middleware.auth())
