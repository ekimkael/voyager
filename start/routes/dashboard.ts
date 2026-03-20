import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('dashboard', [controllers.Dashboard, 'index']).as('dashboard.index')
  })
  .use(middleware.auth())
