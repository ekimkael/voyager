import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router
      .get('/', [controllers.Trips, 'index'])
      .as('trips.index')
      .use(middleware.permission({ keys: ['trip:read'] }))

    router
      .get('/create', [controllers.Trips, 'create'])
      .as('trips.create')
      .use(middleware.permission({ keys: ['trip:create'] }))

    router
      .post('/', [controllers.Trips, 'store'])
      .as('trips.store')
      .use(middleware.permission({ keys: ['trip:create'] }))

    router
      .get('/history', [controllers.Trips, 'history'])
      .as('trips.history')
      .use(middleware.permission({ keys: ['trip:read'] }))

    router
      .get('/:id', [controllers.Trips, 'show'])
      .as('trips.show')
      .use(middleware.permission({ keys: ['trip:read'] }))

    router
      .get('/:id/edit', [controllers.Trips, 'edit'])
      .as('trips.edit')
      .use(middleware.permission({ keys: ['trip:update'] }))

    router
      .put('/:id', [controllers.Trips, 'update'])
      .as('trips.update')
      .use(middleware.permission({ keys: ['trip:update'] }))

    router
      .put('/:id/transition', [controllers.Trips, 'transition'])
      .as('trips.transition')
      .use(middleware.permission({ keys: ['trip:update'] }))

    router
      .delete('/:id', [controllers.Trips, 'destroy'])
      .as('trips.destroy')
      .use(middleware.permission({ keys: ['trip:delete'] }))
  })
  .prefix('dashboard/trips')
  .use(middleware.auth())
