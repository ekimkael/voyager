import factory from '@adonisjs/lucid/factories'
import Booking from '#models/booking'

// NOTE: totalAmount must be > 0 when creating an associated Payment (DB CHECK constraint).
// Always .merge({ totalAmount }) with the real value in seeders/tests.
export const BookingFactory = factory
  .define(Booking, async () => {
    return {
      totalAmount: 5000,
      status: 'pending' as const,
    }
  })
  .build()
