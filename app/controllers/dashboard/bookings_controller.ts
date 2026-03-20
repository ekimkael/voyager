import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Trip from '#models/trip'
import Booking from '#models/booking'
import Customer from '#models/customer'
import Payment from '#models/payment'
import SeatAllocator from '#services/seat_allocator'
import { InsufficientSeatsError } from '#services/seat_allocator'
import UserRoleAssignment from '#models/user_role_assignment'
import { agentBookingValidator, updateBookingValidator } from '#validators/booking'

export default class DashboardBookingsController {
  private seatAllocator = new SeatAllocator()

  async index({ view, tenant, auth, request }: HttpContext) {
    const page = request.input('page', 1)
    const date = request.input('date') || null
    const tripId = request.input('trip_id') || null
    const status = request.input('status') || null
    const code = request.input('code') || null

    const isScopedToFranchise = !!(
      auth.user!.franchiseId && !(await this.isAdminOrDispatcher(auth.user!.id, tenant!.id))
    )

    const query = Booking.query().where('tenantId', tenant!.id)

    if (isScopedToFranchise) {
      query.where('franchiseId', auth.user!.franchiseId!)
    }

    if (date) {
      const dt = DateTime.fromISO(date)
      if (dt.isValid) {
        const nextDay = dt.plus({ days: 1 }).toISODate()
        query.whereHas('trip', (q) => {
          q.where('departureTime', '>=', date).where('departureTime', '<', nextDay!)
        })
      }
    }

    if (tripId) {
      query.where('tripId', tripId)
    }

    if (status) {
      query.where('status', status)
    }

    if (code) {
      query.whereHas('passengers', (q) => q.where('code', code))
    }

    query
      .preload('trip', (q) => {
        q.preload('route', (rq) => {
          rq.preload('departureCity').preload('arrivalCity')
        })
      })
      .preload('customer')
      .preload('passengers')
      .orderBy('createdAt', 'desc')

    const bookings = await query.paginate(page, 20)
    bookings.baseUrl('/dashboard/bookings')

    const qs: Record<string, string> = {}
    if (date) qs.date = date
    if (tripId) qs.trip_id = tripId
    if (status) qs.status = status
    if (code) qs.code = code
    bookings.queryString(qs)

    return view.render('pages/dashboard/bookings/index', {
      bookings,
      isScopedToFranchise,
      filters: { date, tripId, status, code },
    })
  }

  async create({ view, tenant }: HttpContext) {
    const trips = await Trip.query()
      .where('tenantId', tenant!.id)
      .where('status', 'scheduled')
      .where('departureTime', '>', DateTime.now().toSQL()!)
      .preload('route', (q) => {
        q.preload('departureCity').preload('arrivalCity')
      })
      .preload('bus')
      .orderBy('departureTime', 'asc')

    return view.render('pages/dashboard/bookings/create', { trips })
  }

  async store({ request, response, session, tenant, auth }: HttpContext) {
    const payload = await request.validateUsing(agentBookingValidator)

    try {
      const booking = await db.transaction(async (trx) => {
        // 1. Verify trip belongs to tenant, is scheduled, departure > NOW()
        const trip = await Trip.query({ client: trx })
          .where('id', payload.tripId)
          .where('tenantId', tenant!.id)
          .where('status', 'scheduled')
          .where('departureTime', '>', DateTime.now().toSQL()!)
          .firstOrFail()

        // 2. Find or create customer by (tenantId, phone)
        const customer = await Customer.firstOrCreate(
          { tenantId: tenant!.id, phone: payload.customer.phone },
          {
            tenantId: tenant!.id,
            firstName: payload.customer.firstName,
            lastName: payload.customer.lastName,
            phone: payload.customer.phone,
            email: payload.customer.email || null,
          },
          { client: trx }
        )

        // 3. Create booking
        const newBooking = await Booking.create(
          {
            tenantId: tenant!.id,
            tripId: trip.id,
            customerId: customer.id,
            agentId: auth.user!.id,
            franchiseId: auth.user!.franchiseId,
            status: 'confirmed',
            totalAmount: payload.passengers.length * trip.price,
          },
          { client: trx }
        )

        // 4. Allocate seats via SeatAllocator
        await this.seatAllocator.allocate(trip.id, payload.passengers, newBooking.id, trx)

        // 5. Create payment
        await Payment.create(
          {
            bookingId: newBooking.id,
            amount: newBooking.totalAmount,
            paymentMethod: 'cash',
            status: 'success',
            paidAt: DateTime.now(),
          },
          { client: trx }
        )

        return newBooking
      })

      session.flash('success', 'Réservation créée avec succès')
      return response.redirect().toRoute('dashboard.bookings.show', { id: booking.id })
    } catch (error) {
      if (error instanceof InsufficientSeatsError) {
        session.flash('error', 'Nombre de places insuffisant pour ce voyage.')
        return response.redirect().back()
      }
      throw error
    }
  }

  async show({ params, view, tenant }: HttpContext) {
    const booking = await Booking.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .preload('trip', (q) => {
        q.preload('route', (rq) => {
          rq.preload('departureCity').preload('arrivalCity')
        })
        q.preload('bus')
      })
      .preload('customer')
      .preload('passengers')
      .preload('payment')
      .firstOrFail()

    return view.render('pages/dashboard/bookings/show', { booking })
  }

  async edit({ params, view, response, session, tenant }: HttpContext) {
    const booking = await Booking.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .preload('trip')
      .preload('passengers')
      .firstOrFail()

    if (booking.status !== 'confirmed') {
      session.flash('error', 'Seules les réservations confirmées peuvent être modifiées.')
      return response.redirect().toRoute('dashboard.bookings.show', { id: booking.id })
    }

    if (booking.trip.departureTime <= DateTime.now()) {
      session.flash('error', 'Impossible de modifier une réservation pour un voyage passé.')
      return response.redirect().toRoute('dashboard.bookings.show', { id: booking.id })
    }

    return view.render('pages/dashboard/bookings/edit', { booking })
  }

  async update({ params, request, response, session, tenant }: HttpContext) {
    const booking = await Booking.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .preload('passengers')
      .firstOrFail()

    const payload = await request.validateUsing(updateBookingValidator)

    for (const passengerData of payload.passengers) {
      const passenger = booking.passengers.find((p) => p.id === passengerData.id)
      if (passenger) {
        passenger.merge({
          firstName: passengerData.firstName,
          lastName: passengerData.lastName,
          phone: passengerData.phone || null,
        })
        await passenger.save()
      }
    }

    session.flash('success', 'Réservation mise à jour avec succès')
    return response.redirect().toRoute('dashboard.bookings.show', { id: booking.id })
  }

  async destroy({ params, response, session, tenant }: HttpContext) {
    const booking = await Booking.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .preload('trip')
      .firstOrFail()

    if (booking.trip.departureTime <= DateTime.now()) {
      session.flash('error', 'Impossible d\'annuler une réservation pour un voyage passé.')
      return response.redirect().toRoute('dashboard.bookings.index')
    }

    booking.status = 'cancelled'
    await booking.save()

    session.flash('success', 'Réservation annulée avec succès')
    return response.redirect().toRoute('dashboard.bookings.index')
  }

  private async isAdminOrDispatcher(userId: string, tenantId: string): Promise<boolean> {
    const assignment = await UserRoleAssignment.query()
      .where('userId', userId)
      .whereHas('role', (q) => {
        q.where('tenantId', tenantId).whereIn('name', ['Admin', 'Dispatcher'])
      })
      .first()

    return !!assignment
  }
}
