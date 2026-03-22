import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const ProfileController = () => import('#controllers/profile_controller')
const EmailChangeController = () => import('#controllers/email_change_controller')
const SecurityController = () => import('#controllers/security_controller')

router
  .group(() => {
    router.get('profile', [ProfileController, 'show']).as('profile.show')
    router.put('profile', [ProfileController, 'update']).as('profile.update')

    router
      .post('profile/email', [EmailChangeController, 'store'])
      .as('profile.email.store')
      .use(middleware.throttle({ maxAttempts: 3, decayMinutes: 60, key: 'throttle:email-change' }))

    router.get('profile/security', [SecurityController, 'show']).as('security.show')
    router.put('profile/security', [SecurityController, 'update']).as('security.update')
  })
  .prefix('dashboard')
  .use(middleware.auth())

// Public email confirmation route (accessible without auth)
router.get('email/confirm', [EmailChangeController, 'confirm']).as('email.confirm')
