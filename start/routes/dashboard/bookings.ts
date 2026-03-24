import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const BookingsController = () => import('#controllers/dashboard/bookings_controller')
const TicketsController = () => import('#controllers/dashboard/tickets_controller')

router
  .group(() => {
    router
      .get('/', [BookingsController, 'index'])
      .as('dashboard.bookings.index')
      .use(middleware.permission({ keys: ['booking:read'] }))
    router
      .get('/create', [BookingsController, 'create'])
      .as('dashboard.bookings.create')
      .use(middleware.permission({ keys: ['booking:create'] }))
    router
      .post('/', [BookingsController, 'store'])
      .as('dashboard.bookings.store')
      .use(middleware.permission({ keys: ['booking:create'] }))
    router
      .get('/:id', [BookingsController, 'show'])
      .as('dashboard.bookings.show')
      .use(middleware.permission({ keys: ['booking:read'] }))
    router
      .get('/:id/edit', [BookingsController, 'edit'])
      .as('dashboard.bookings.edit')
      .use(middleware.permission({ keys: ['booking:update'] }))
    router
      .put('/:id', [BookingsController, 'update'])
      .as('dashboard.bookings.update')
      .use(middleware.permission({ keys: ['booking:update'] }))
    router
      .delete('/:id', [BookingsController, 'destroy'])
      .as('dashboard.bookings.destroy')
      .use(middleware.permission({ keys: ['booking:delete'] }))
    router
      .get('/:id/passengers/:passengerId/ticket', [TicketsController, 'download'])
      .as('dashboard.tickets.download')
      .use(middleware.permission({ keys: ['booking:read'] }))
  })
  .prefix('dashboard/bookings')
  .use(middleware.auth())
