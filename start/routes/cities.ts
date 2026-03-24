import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('/', [controllers.Cities, 'index']).as('cities.index').use(middleware.permission({ keys: ['city:read'] }))
    router.get('/create', [controllers.Cities, 'create']).as('cities.create').use(middleware.permission({ keys: ['city:create'] }))
    router.post('/', [controllers.Cities, 'store']).as('cities.store').use(middleware.permission({ keys: ['city:create'] }))
    router.get('/:id/edit', [controllers.Cities, 'edit']).as('cities.edit').use(middleware.permission({ keys: ['city:update'] }))
    router.put('/:id', [controllers.Cities, 'update']).as('cities.update').use(middleware.permission({ keys: ['city:update'] }))
    router.delete('/:id', [controllers.Cities, 'destroy']).as('cities.destroy').use(middleware.permission({ keys: ['city:delete'] }))
  })
  .prefix('dashboard/cities')
  .use(middleware.auth())
