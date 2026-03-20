import type { HttpContext } from '@adonisjs/core/http'
import Passenger from '#models/passenger'
import { validateBoardingValidator } from '#validators/boarding'
import PermissionResolver from '#services/permission_resolver'
import { DateTime } from 'luxon'

export default class BoardingController {
  async index({ view }: HttpContext) {
    return view.render('pages/dashboard/boarding/index')
  }

  async validate({ request, response, session, tenant, auth }: HttpContext) {
    const payload = await request.validateUsing(validateBoardingValidator)
    const code = payload.code

    // Look up passenger by code OR qrCode, scoped to tenant
    const passenger = await Passenger.query()
      .where((query) => {
        query.where('code', code).orWhere('qrCode', code)
      })
      .whereHas('booking', (q) => {
        q.where('tenantId', tenant!.id).where('status', 'confirmed')
      })
      .preload('booking', (q) => {
        q.preload('trip', (tq) => {
          tq.preload('route', (rq) => {
            rq.preload('departureCity').preload('arrivalCity')
          })
        })
      })
      .first()

    if (!passenger) {
      session.flash('error', 'Aucun passager trouvé avec ce code.')
      return response.redirect().toRoute('dashboard.boarding.index')
    }

    const trip = passenger.booking.trip

    // Verify trip is scheduled or in_progress
    if (!['scheduled', 'in_progress'].includes(trip.status)) {
      session.flash('error', "Ce voyage n'est pas en cours.")
      return response.redirect().toRoute('dashboard.boarding.index')
    }

    // Chauffeur scoping: if user does NOT have booking:read, they are a chauffeur
    // and can only validate passengers on trips assigned to them
    const resolver = new PermissionResolver(auth.user!)
    const canReadBookings = await resolver.can('booking:read')
    if (!canReadBookings && trip.driverId !== auth.user!.id) {
      session.flash('error', 'Vous ne pouvez valider que les passagers de vos voyages.')
      return response.redirect().toRoute('dashboard.boarding.index')
    }

    // Check if already boarded
    if (passenger.status === 'boarded') {
      session.flash(
        'warning',
        `${passenger.fullName} est déjà embarqué(e) (siège ${passenger.seatNumber}).`
      )
      return response.redirect().toRoute('dashboard.boarding.index')
    }

    // Mark as boarded
    passenger.status = 'boarded'
    passenger.boardedAt = DateTime.now()
    await passenger.save()

    session.flash(
      'success',
      `${passenger.fullName} embarqué(e) — Siège ${passenger.seatNumber} — ${trip.route.departureCity.name} → ${trip.route.arrivalCity.name}`
    )
    return response.redirect().toRoute('dashboard.boarding.index')
  }
}
