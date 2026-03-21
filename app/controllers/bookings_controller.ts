import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Trip from '#models/trip'
import Booking from '#models/booking'
import Customer from '#models/customer'
import Passenger from '#models/passenger'
import Payment from '#models/payment'
import SeatAllocator from '#services/seat_allocator'
import { InsufficientSeatsError } from '#services/seat_allocator'
import {
  storePassengersValidator,
  storeCustomerValidator,
  processPaymentValidator,
  verifyBookingValidator,
} from '#validators/booking'

export default class BookingsController {
  private seatAllocator = new SeatAllocator()

  private async getBookingFromSession(ctx: HttpContext) {
    const { params, session, response } = ctx
    const currentBookingId = session.get('currentBookingId')
    if (currentBookingId !== params.id) {
      session.flash('error', 'Réservation introuvable')
      return response.redirect().toRoute('public.globalTrips.index')
    }

    const booking = await Booking.query().where('id', params.id).preload('tenant').firstOrFail()

    if (booking.status === 'pending' && booking.isExpired) {
      session.flash('error', 'Réservation expirée')
      return response.redirect().toRoute('public.globalTrips.index')
    }

    return booking
  }

  async initiate({ params, response, session }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.tripId)
      .where('status', 'scheduled')
      .preload('tenant')
      .firstOrFail()

    if (trip.departureTime <= DateTime.now()) {
      session.flash('error', 'Ce voyage a déjà commencé ou est passé.')
      return response.redirect().back()
    }

    const booking = await Booking.create({
      tenantId: trip.tenantId,
      tripId: trip.id,
      status: 'pending',
    })

    const bookingIds: string[] = session.get('bookingIds', [])
    bookingIds.push(booking.id)
    session.put('bookingIds', bookingIds)
    session.put('currentBookingId', booking.id)

    return response.redirect().toRoute('public.bookings.passengers', { id: booking.id })
  }

  async passengers(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    const booking = result
    await booking.load('trip', (q) => {
      q.preload('route', (rq) => {
        rq.preload('departureCity').preload('arrivalCity')
      })
    })

    const availableSeats = await this.seatAllocator.getAvailableSeatCount(booking.tripId)

    return ctx.view.render('pages/bookings/passengers', {
      booking,
      trip: booking.trip,
      availableSeats,
    })
  }

  async storePassengers(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    const booking = result
    const payload = await ctx.request.validateUsing(storePassengersValidator)

    try {
      await db.transaction(async (trx) => {
        await this.seatAllocator.allocate(booking.tripId, payload.passengers, booking.id, trx)
      })
    } catch (error) {
      if (error instanceof InsufficientSeatsError) {
        ctx.session.flash('error', 'Nombre de places insuffisant pour ce voyage.')
        return ctx.response.redirect().back()
      }
      throw error
    }

    // Broadcast updated seat count AFTER transaction committed
    await this.seatAllocator.broadcastAvailability(booking.tripId)

    return ctx.response.redirect().toRoute('public.bookings.customer', { id: booking.id })
  }

  async customer(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    const booking = result

    return ctx.view.render('pages/bookings/customer', {
      booking,
    })
  }

  async storeCustomer(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    const booking = result
    const payload = await ctx.request.validateUsing(storeCustomerValidator)

    const customer = await Customer.firstOrCreate(
      { tenantId: booking.tenantId, phone: payload.phone },
      { ...payload, tenantId: booking.tenantId }
    )

    await booking.load('passengers')
    await booking.load('trip')

    booking.customerId = customer.id
    booking.totalAmount = booking.passengers.length * booking.trip.price
    await booking.save()

    return ctx.response.redirect().toRoute('public.bookings.summary', { id: booking.id })
  }

  async summary(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    const booking = result
    await booking.load('trip', (q) => {
      q.preload('route', (rq) => {
        rq.preload('departureCity').preload('arrivalCity')
      })
    })
    await booking.load('customer')
    await booking.load('passengers')

    return ctx.view.render('pages/bookings/summary', {
      booking,
    })
  }

  async confirm(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    return ctx.response.redirect().toRoute('public.bookings.payment', { id: ctx.params.id })
  }

  async payment(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    const booking = result
    await booking.load('trip')
    await booking.load('customer')

    const availableSeats = await this.seatAllocator.getAvailableSeatCount(booking.tripId)

    return ctx.view.render('pages/bookings/payment', {
      booking,
      availableSeats,
    })
  }

  async processPayment(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    const booking = result
    const payload = await ctx.request.validateUsing(processPaymentValidator)

    await Payment.create({
      bookingId: booking.id,
      amount: booking.totalAmount,
      paymentMethod: payload.paymentMethod,
      operator: payload.operator || null,
      status: 'success',
      paidAt: DateTime.now(),
    })

    booking.status = 'confirmed'
    await booking.save()

    // Broadcast updated seat count after confirmation
    await this.seatAllocator.broadcastAvailability(booking.tripId)

    return ctx.response.redirect().toRoute('public.bookings.completed', { id: booking.id })
  }

  async completed({ params, view, session }: HttpContext) {
    const bookingIds: string[] = session.get('bookingIds', [])
    if (!bookingIds.includes(params.id)) {
      session.flash('error', 'Réservation introuvable')
      return view.render('pages/bookings/failed', {
        booking: null,
      })
    }

    const booking = await Booking.query()
      .where('id', params.id)
      .preload('passengers')
      .preload('tenant')
      .preload('trip', (q) => {
        q.preload('route', (rq) => {
          rq.preload('departureCity').preload('arrivalCity')
        })
      })
      .preload('customer')
      .firstOrFail()

    if (booking.status !== 'confirmed') {
      session.flash('error', "Cette réservation n'est pas confirmée.")
      return view.render('pages/bookings/failed', {
        booking,
      })
    }

    return view.render('pages/bookings/completed', {
      booking,
    })
  }

  async failed({ params, view }: HttpContext) {
    const booking = await Booking.query().where('id', params.id).preload('tenant').firstOrFail()

    return view.render('pages/bookings/failed', {
      booking,
    })
  }

  async verify({ view }: HttpContext) {
    return view.render('pages/bookings/verify')
  }

  async verifySubmit({ request, view, session }: HttpContext) {
    const payload = await request.validateUsing(verifyBookingValidator)

    const passenger = await Passenger.query()
      .where('code', payload.code)
      .whereHas('booking', (q) => {
        q.where('status', 'confirmed').whereHas('customer', (cq) => {
          cq.where('phone', payload.phone)
        })
      })
      .preload('booking', (q) => {
        q.preload('tenant')
        q.preload('trip', (tq) => {
          tq.preload('route', (rq) => {
            rq.preload('departureCity').preload('arrivalCity')
          })
        }).preload('customer')
      })
      .first()

    if (!passenger) {
      session.flash('error', 'Aucune réservation trouvée avec ces informations.')
      return view.render('pages/bookings/verify')
    }

    const bookingIds: string[] = session.get('bookingIds', [])
    if (!bookingIds.includes(passenger.booking.id)) {
      bookingIds.push(passenger.booking.id)
      session.put('bookingIds', bookingIds)
    }

    return view.render('pages/bookings/verify', {
      passenger,
    })
  }
}
