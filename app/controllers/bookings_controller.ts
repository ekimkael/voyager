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
    const { params, session, response, tenant } = ctx
    const currentBookingId = session.get('currentBookingId')
    if (currentBookingId !== params.id) {
      session.flash('error', 'Réservation introuvable')
      return response.redirect().toRoute('public.trips.index', { tenantSlug: tenant!.slug })
    }

    const booking = await Booking.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (booking.status === 'pending' && booking.isExpired) {
      session.flash('error', 'Réservation expirée')
      return response.redirect().toRoute('public.trips.index', { tenantSlug: tenant!.slug })
    }

    return booking
  }

  async initiate({ params, response, session, tenant }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.tripId)
      .where('tenantId', tenant!.id)
      .where('status', 'scheduled')
      .firstOrFail()

    if (trip.departureTime <= DateTime.now()) {
      session.flash('error', 'Ce voyage a déjà commencé ou est passé.')
      return response.redirect().back()
    }

    const booking = await Booking.create({
      tenantId: tenant!.id,
      tripId: trip.id,
      status: 'pending',
    })

    const bookingIds: string[] = session.get('bookingIds', [])
    bookingIds.push(booking.id)
    session.put('bookingIds', bookingIds)
    session.put('currentBookingId', booking.id)

    return response.redirect().toRoute('public.bookings.passengers', {
      tenantSlug: tenant!.slug,
      id: booking.id,
    })
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

    return ctx.view.render('pages/bookings/passengers', {
      booking,
      trip: booking.trip,
      tenantSlug: ctx.tenant!.slug,
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

    return ctx.response.redirect().toRoute('public.bookings.customer', {
      tenantSlug: ctx.tenant!.slug,
      id: booking.id,
    })
  }

  async customer(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    const booking = result

    return ctx.view.render('pages/bookings/customer', {
      booking,
      tenantSlug: ctx.tenant!.slug,
    })
  }

  async storeCustomer(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    const booking = result
    const payload = await ctx.request.validateUsing(storeCustomerValidator)

    const customer = await Customer.firstOrCreate(
      { tenantId: ctx.tenant!.id, phone: payload.phone },
      { ...payload, tenantId: ctx.tenant!.id }
    )

    await booking.load('passengers')
    await booking.load('trip')

    booking.customerId = customer.id
    booking.totalAmount = booking.passengers.length * booking.trip.price
    await booking.save()

    return ctx.response.redirect().toRoute('public.bookings.summary', {
      tenantSlug: ctx.tenant!.slug,
      id: booking.id,
    })
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
      tenantSlug: ctx.tenant!.slug,
    })
  }

  async confirm(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    return ctx.response.redirect().toRoute('public.bookings.payment', {
      tenantSlug: ctx.tenant!.slug,
      id: ctx.params.id,
    })
  }

  async payment(ctx: HttpContext) {
    const result = await this.getBookingFromSession(ctx)
    if (!(result instanceof Booking)) return result

    const booking = result
    await booking.load('trip')
    await booking.load('customer')

    return ctx.view.render('pages/bookings/payment', {
      booking,
      tenantSlug: ctx.tenant!.slug,
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

    return ctx.response.redirect().toRoute('public.bookings.completed', {
      tenantSlug: ctx.tenant!.slug,
      id: booking.id,
    })
  }

  async completed({ params, view, session, tenant }: HttpContext) {
    const bookingIds: string[] = session.get('bookingIds', [])
    if (!bookingIds.includes(params.id)) {
      session.flash('error', 'Réservation introuvable')
      return view.render('pages/bookings/failed', {
        booking: null,
        tenantSlug: tenant!.slug,
      })
    }

    const booking = await Booking.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .preload('passengers')
      .preload('trip', (q) => {
        q.preload('route', (rq) => {
          rq.preload('departureCity').preload('arrivalCity')
        })
      })
      .preload('customer')
      .firstOrFail()

    if (booking.status !== 'confirmed') {
      session.flash('error', 'Cette réservation n\'est pas confirmée.')
      return view.render('pages/bookings/failed', {
        booking,
        tenantSlug: tenant!.slug,
      })
    }

    return view.render('pages/bookings/completed', {
      booking,
      tenantSlug: tenant!.slug,
    })
  }

  async failed({ params, view, tenant }: HttpContext) {
    const booking = await Booking.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    return view.render('pages/bookings/failed', {
      booking,
      tenantSlug: tenant!.slug,
    })
  }

  async verify({ view, tenant }: HttpContext) {
    return view.render('pages/bookings/verify', {
      tenantSlug: tenant!.slug,
    })
  }

  async verifySubmit({ request, view, session, tenant }: HttpContext) {
    const payload = await request.validateUsing(verifyBookingValidator)

    const passenger = await Passenger.query()
      .where('code', payload.code)
      .whereHas('booking', (q) => {
        q.where('tenantId', tenant!.id)
          .where('status', 'confirmed')
          .whereHas('customer', (cq) => {
            cq.where('phone', payload.phone)
          })
      })
      .preload('booking', (q) => {
        q.preload('trip', (tq) => {
          tq.preload('route', (rq) => {
            rq.preload('departureCity').preload('arrivalCity')
          })
        }).preload('customer')
      })
      .first()

    if (!passenger) {
      session.flash('error', 'Aucune réservation trouvée avec ces informations.')
      return view.render('pages/bookings/verify', {
        tenantSlug: tenant!.slug,
      })
    }

    const bookingIds: string[] = session.get('bookingIds', [])
    if (!bookingIds.includes(passenger.booking.id)) {
      bookingIds.push(passenger.booking.id)
      session.put('bookingIds', bookingIds)
    }

    return view.render('pages/bookings/verify', {
      tenantSlug: tenant!.slug,
      passenger,
    })
  }
}
