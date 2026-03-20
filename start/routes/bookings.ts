import router from '@adonisjs/core/services/router'

const BookingsController = () => import('#controllers/bookings_controller')
const TicketsController = () => import('#controllers/tickets_controller')

router
  .group(() => {
    router.post('/trips/:tripId/book', [BookingsController, 'initiate']).as('public.bookings.initiate')

    router.get('/bookings/:id/passengers', [BookingsController, 'passengers']).as('public.bookings.passengers')
    router.post('/bookings/:id/passengers', [BookingsController, 'storePassengers']).as('public.bookings.storePassengers')
    router.get('/bookings/:id/customer', [BookingsController, 'customer']).as('public.bookings.customer')
    router.post('/bookings/:id/customer', [BookingsController, 'storeCustomer']).as('public.bookings.storeCustomer')
    router.get('/bookings/:id/summary', [BookingsController, 'summary']).as('public.bookings.summary')
    router.post('/bookings/:id/summary', [BookingsController, 'confirm']).as('public.bookings.confirm')
    router.get('/bookings/:id/payment', [BookingsController, 'payment']).as('public.bookings.payment')
    router.post('/bookings/:id/payment', [BookingsController, 'processPayment']).as('public.bookings.processPayment')
    router.get('/bookings/:id/completed', [BookingsController, 'completed']).as('public.bookings.completed')
    router.get('/bookings/:id/failed', [BookingsController, 'failed']).as('public.bookings.failed')

    router.get('/bookings/verify', [BookingsController, 'verify']).as('public.bookings.verify')
    router.post('/bookings/verify', [BookingsController, 'verifySubmit']).as('public.bookings.verifySubmit')

    router.get('/bookings/:bookingId/passengers/:passengerId/ticket', [TicketsController, 'download']).as('public.tickets.download')
  })
  .prefix(':tenantSlug')
