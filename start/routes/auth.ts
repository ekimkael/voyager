import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

const PasswordResetController = () => import('#controllers/password_reset_controller')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])

    router.get('password/forgot', [PasswordResetController, 'forgot']).as('password.forgot')
    router.post('password/forgot', [PasswordResetController, 'sendResetLink']).as('password.sendResetLink')
    router.get('password/reset', [PasswordResetController, 'reset']).as('password.reset')
    router.post('password/reset', [PasswordResetController, 'update']).as('password.update')
  })
  .use(middleware.guest())

router.post('logout', [controllers.Session, 'destroy']).use(middleware.auth())
