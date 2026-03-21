import router from '@adonisjs/core/services/router'

const BookingsController = () => import('#controllers/bookings_controller')
const TicketsController = () => import('#controllers/tickets_controller')

router
  .group(() => {
    router.post('/trips/:tripId', [BookingsController, 'initiate']).as('public.bookings.initiate')

    router
      .get('/:id/passengers', [BookingsController, 'passengers'])
      .as('public.bookings.passengers')
    router
      .post('/:id/passengers', [BookingsController, 'storePassengers'])
      .as('public.bookings.storePassengers')
    router.get('/:id/customer', [BookingsController, 'customer']).as('public.bookings.customer')
    router
      .post('/:id/customer', [BookingsController, 'storeCustomer'])
      .as('public.bookings.storeCustomer')
    router.get('/:id/summary', [BookingsController, 'summary']).as('public.bookings.summary')
    router.post('/:id/summary', [BookingsController, 'confirm']).as('public.bookings.confirm')
    router.get('/:id/payment', [BookingsController, 'payment']).as('public.bookings.payment')
    router
      .post('/:id/payment', [BookingsController, 'processPayment'])
      .as('public.bookings.processPayment')
    router.get('/:id/completed', [BookingsController, 'completed']).as('public.bookings.completed')
    router.get('/:id/failed', [BookingsController, 'failed']).as('public.bookings.failed')

    router.get('/verify', [BookingsController, 'verify']).as('public.bookings.verify')
    router.post('/verify', [BookingsController, 'verifySubmit']).as('public.bookings.verifySubmit')

    router
      .get('/:bookingId/passengers/:passengerId/ticket', [TicketsController, 'download'])
      .as('public.tickets.download')
  })
  .prefix('booking')
