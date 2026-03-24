import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const BoardingController = () => import('#controllers/dashboard/boarding_controller')

router
  .group(() => {
    router.get('/', [BoardingController, 'index']).as('dashboard.boarding.index')
    router.post('/', [BoardingController, 'validate']).as('dashboard.boarding.validate')
  })
  .prefix('dashboard/boarding')
  .use(middleware.auth())
  .use(middleware.permission({ keys: ['boarding:validate'] }))
