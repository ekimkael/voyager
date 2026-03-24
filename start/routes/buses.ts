import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router
      .get('/', [controllers.Buses, 'index'])
      .as('buses.index')
      .use(middleware.permission({ keys: ['vehicle:read'] }))

    router
      .get('/create', [controllers.Buses, 'create'])
      .as('buses.create')
      .use(middleware.permission({ keys: ['vehicle:create'] }))

    router
      .post('/', [controllers.Buses, 'store'])
      .as('buses.store')
      .use(middleware.permission({ keys: ['vehicle:create'] }))

    router
      .get('/:id/edit', [controllers.Buses, 'edit'])
      .as('buses.edit')
      .use(middleware.permission({ keys: ['vehicle:update'] }))

    router
      .put('/:id', [controllers.Buses, 'update'])
      .as('buses.update')
      .use(middleware.permission({ keys: ['vehicle:update'] }))

    router
      .delete('/:id', [controllers.Buses, 'destroy'])
      .as('buses.destroy')
      .use(middleware.permission({ keys: ['vehicle:delete'] }))
  })
  .prefix('dashboard/buses')
  .use(middleware.auth())
