import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const FranchisesController = () => import('#controllers/franchises_controller')

router
  .get('/franchises/:id/performance', [FranchisesController, 'performance'])
  .as('franchises.performance')
  .use([middleware.auth(), middleware.permission({ keys: ['franchise:read'] })])

router
  .resource('franchises', FranchisesController)
  .except(['show'])
  .use('*', middleware.auth())
  .use(['index'], middleware.permission({ keys: ['franchise:read'] }))
  .use(['create', 'store'], middleware.permission({ keys: ['franchise:create'] }))
  .use(['edit', 'update'], middleware.permission({ keys: ['franchise:update'] }))
  .use(['destroy'], middleware.permission({ keys: ['franchise:delete'] }))
