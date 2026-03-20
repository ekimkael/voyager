import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('/', [controllers.Routes, 'index']).as('routes.index').use(middleware.permission({ keys: ['route:read'] }))
    router.get('/create', [controllers.Routes, 'create']).as('routes.create').use(middleware.permission({ keys: ['route:create'] }))
    router.post('/', [controllers.Routes, 'store']).as('routes.store').use(middleware.permission({ keys: ['route:create'] }))
    router.get('/:id/edit', [controllers.Routes, 'edit']).as('routes.edit').use(middleware.permission({ keys: ['route:update'] }))
    router.put('/:id', [controllers.Routes, 'update']).as('routes.update').use(middleware.permission({ keys: ['route:update'] }))
    router.delete('/:id', [controllers.Routes, 'destroy']).as('routes.destroy').use(middleware.permission({ keys: ['route:delete'] }))
  })
  .prefix('routes')
  .use(middleware.auth())
