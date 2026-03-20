/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').render('pages/home').as('home')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
    router.get('dashboard', [controllers.Dashboard, 'index']).as('dashboard.index')

    // Cities (global)
    router
      .group(() => {
        router.get('/', [controllers.Cities, 'index']).as('cities.index').use(middleware.permission({ keys: ['city:read'] }))
        router.get('/create', [controllers.Cities, 'create']).as('cities.create').use(middleware.permission({ keys: ['city:create'] }))
        router.post('/', [controllers.Cities, 'store']).as('cities.store').use(middleware.permission({ keys: ['city:create'] }))
        router.get('/:id/edit', [controllers.Cities, 'edit']).as('cities.edit').use(middleware.permission({ keys: ['city:update'] }))
        router.put('/:id', [controllers.Cities, 'update']).as('cities.update').use(middleware.permission({ keys: ['city:update'] }))
        router.delete('/:id', [controllers.Cities, 'destroy']).as('cities.destroy').use(middleware.permission({ keys: ['city:delete'] }))
      })
      .prefix('cities')

    // Routes (tenant-scoped)
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

    // Buses (tenant-scoped)
    router
      .group(() => {
        router.get('/', [controllers.Buses, 'index']).as('buses.index').use(middleware.permission({ keys: ['vehicle:read'] }))
        router.get('/create', [controllers.Buses, 'create']).as('buses.create').use(middleware.permission({ keys: ['vehicle:create'] }))
        router.post('/', [controllers.Buses, 'store']).as('buses.store').use(middleware.permission({ keys: ['vehicle:create'] }))
        router.get('/:id/edit', [controllers.Buses, 'edit']).as('buses.edit').use(middleware.permission({ keys: ['vehicle:update'] }))
        router.put('/:id', [controllers.Buses, 'update']).as('buses.update').use(middleware.permission({ keys: ['vehicle:update'] }))
        router.delete('/:id', [controllers.Buses, 'destroy']).as('buses.destroy').use(middleware.permission({ keys: ['vehicle:delete'] }))
      })
      .prefix('buses')

    // Drivers (tenant-scoped, read-only)
    router
      .group(() => {
        router.get('/', [controllers.Drivers, 'index']).as('drivers.index').use(middleware.permission({ keys: ['driver:read'] }))
      })
      .prefix('drivers')

    // Trips (tenant-scoped)
    router
      .group(() => {
        router.get('/', [controllers.Trips, 'index']).as('trips.index').use(middleware.permission({ keys: ['trip:read'] }))
        router.get('/create', [controllers.Trips, 'create']).as('trips.create').use(middleware.permission({ keys: ['trip:create'] }))
        router.post('/', [controllers.Trips, 'store']).as('trips.store').use(middleware.permission({ keys: ['trip:create'] }))
        router.get('/:id/edit', [controllers.Trips, 'edit']).as('trips.edit').use(middleware.permission({ keys: ['trip:update'] }))
        router.put('/:id', [controllers.Trips, 'update']).as('trips.update').use(middleware.permission({ keys: ['trip:update'] }))
        router.delete('/:id', [controllers.Trips, 'destroy']).as('trips.destroy').use(middleware.permission({ keys: ['trip:delete'] }))
      })
      .prefix('trips')
  })
  .use(middleware.auth())
