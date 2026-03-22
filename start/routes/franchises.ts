import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const FranchisesController = () => import('#controllers/franchises_controller')

router
  .group(() => {
    router
      .get('/franchises/:id/performance', [FranchisesController, 'performance'])
      .as('franchises.performance')
      .use(middleware.permission({ keys: ['franchise:read'] }))

    router
      .resource('franchises', FranchisesController)
      .except(['show'])
      .use(['index'], middleware.permission({ keys: ['franchise:read'] }))
      .use(['create', 'store'], middleware.permission({ keys: ['franchise:create'] }))
      .use(['edit', 'update'], middleware.permission({ keys: ['franchise:update'] }))
      .use(['destroy'], middleware.permission({ keys: ['franchise:delete'] }))
  })
  .prefix('dashboard')
  .use(middleware.auth())
