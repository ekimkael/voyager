import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('/', [controllers.Drivers, 'index']).as('drivers.index').use(middleware.permission({ keys: ['driver:read'] }))
  })
  .prefix('dashboard/drivers')
  .use(middleware.auth())
