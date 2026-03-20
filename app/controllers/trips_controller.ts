import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Trip from '#models/trip'
import Route from '#models/route'
import Bus from '#models/bus'
import User from '#models/user'
import Role from '#models/role'
import { createTripValidator, updateTripValidator } from '#validators/trip'

export default class TripsController {
  async index({ view, tenant }: HttpContext) {
    const trips = await Trip.query()
      .where('tenantId', tenant!.id)
      .whereIn('status', ['scheduled', 'in_progress'])
      .preload('route', (query) => {
        query.preload('departureCity').preload('arrivalCity')
      })
      .preload('bus')
      .preload('driver')
      .orderBy('departureTime', 'desc')

    return view.render('pages/trips/index', { trips })
  }

  async create({ view, tenant }: HttpContext) {
    const routes = await Route.query()
      .where('tenantId', tenant!.id)
      .where('status', 'active')
      .preload('departureCity')
      .preload('arrivalCity')
      .orderBy('code')

    const buses = await Bus.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .where('status', 'available')
      .orderBy('licensePlate')

    const drivers = await this.getDrivers(tenant!.id)

    return view.render('pages/trips/form', { routes, buses, drivers })
  }

  async store({ request, response, session, tenant }: HttpContext) {
    const payload = await request.validateUsing(createTripValidator)
    const departureTime = DateTime.fromISO(payload.departureTime)
    const arrivalTime = DateTime.fromISO(payload.arrivalTime)

    if (!departureTime.isValid || !arrivalTime.isValid) {
      session.flash('error', 'Les dates saisies sont invalides.')
      return response.redirect().back()
    }

    if (arrivalTime <= departureTime) {
      session.flash('error', "L'heure d'arrivée doit être postérieure à l'heure de départ.")
      return response.redirect().back()
    }

    // Verify referenced entities belong to the current tenant
    await Route.query()
      .where('id', payload.routeId)
      .where('tenantId', tenant!.id)
      .where('status', 'active')
      .firstOrFail()
    await Bus.query()
      .where('id', payload.busId)
      .where('tenantId', tenant!.id)
      .where('active', true)
      .firstOrFail()
    await this.verifyDriver(payload.driverId, tenant!.id)

    const busOverlap = await this.checkBusOverlap(
      payload.busId,
      departureTime,
      arrivalTime,
      tenant!.id
    )
    if (busOverlap) {
      session.flash('error', 'Ce véhicule est déjà assigné à un autre voyage sur cette période.')
      return response.redirect().back()
    }

    const driverOverlap = await this.checkDriverOverlap(
      payload.driverId,
      departureTime,
      arrivalTime,
      tenant!.id
    )
    if (driverOverlap) {
      session.flash('error', 'Ce conducteur est déjà assigné à un autre voyage sur cette période.')
      return response.redirect().back()
    }

    await Trip.create({
      tenantId: tenant!.id,
      routeId: payload.routeId,
      busId: payload.busId,
      driverId: payload.driverId,
      departureTime: departureTime,
      arrivalTime: arrivalTime,
      travelClass: payload.travelClass,
      price: payload.price,
      status: 'scheduled',
    })

    session.flash('success', 'Voyage planifié avec succès')
    return response.redirect().toRoute('trips.index')
  }

  async edit({ params, view, response, tenant }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (trip.status === 'completed' || trip.status === 'cancelled') {
      return response.redirect().toRoute('trips.index')
    }

    const routes = await Route.query()
      .where('tenantId', tenant!.id)
      .where('status', 'active')
      .preload('departureCity')
      .preload('arrivalCity')
      .orderBy('code')

    const buses = await Bus.query()
      .where('tenantId', tenant!.id)
      .where('active', true)
      .where((query) => {
        query.where('status', 'available').orWhere('id', trip.busId)
      })
      .orderBy('licensePlate')

    const drivers = await this.getDrivers(tenant!.id, trip.driverId)

    return view.render('pages/trips/form', { trip, routes, buses, drivers })
  }

  async update({ params, request, response, session, tenant }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (trip.status === 'completed' || trip.status === 'cancelled') {
      session.flash('error', 'Impossible de modifier un voyage terminé ou annulé.')
      return response.redirect().toRoute('trips.index')
    }

    const payload = await request.validateUsing(updateTripValidator)
    const departureTime = DateTime.fromISO(payload.departureTime)
    const arrivalTime = DateTime.fromISO(payload.arrivalTime)

    if (!departureTime.isValid || !arrivalTime.isValid) {
      session.flash('error', 'Les dates saisies sont invalides.')
      return response.redirect().back()
    }

    if (arrivalTime <= departureTime) {
      session.flash('error', "L'heure d'arrivée doit être postérieure à l'heure de départ.")
      return response.redirect().back()
    }

    // Verify referenced entities belong to the current tenant
    await Route.query()
      .where('id', payload.routeId)
      .where('tenantId', tenant!.id)
      .where('status', 'active')
      .firstOrFail()

    await Bus.query()
      .where('id', payload.busId)
      .where('tenantId', tenant!.id)
      .where('active', true)
      .firstOrFail()

    await this.verifyDriver(payload.driverId, tenant!.id)

    const busOverlap = await this.checkBusOverlap(
      payload.busId,
      departureTime,
      arrivalTime,
      tenant!.id,
      trip.id
    )

    if (busOverlap) {
      session.flash('error', 'Ce véhicule est déjà assigné à un autre voyage sur cette période.')
      return response.redirect().back()
    }

    const driverOverlap = await this.checkDriverOverlap(
      payload.driverId,
      departureTime,
      arrivalTime,
      tenant!.id,
      trip.id
    )

    if (driverOverlap) {
      session.flash('error', 'Ce conducteur est déjà assigné à un autre voyage sur cette période.')
      return response.redirect().back()
    }

    trip.merge({
      routeId: payload.routeId,
      busId: payload.busId,
      driverId: payload.driverId,
      departureTime: departureTime,
      arrivalTime: arrivalTime,
      travelClass: payload.travelClass,
      price: payload.price,
    })

    await trip.save()

    session.flash('success', 'Voyage mis à jour avec succès')
    return response.redirect().toRoute('trips.index')
  }

  async transition({ params, request, response, session, tenant }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    const { status } = request.only(['status'])

    const validTransitions: Record<string, string[]> = {
      scheduled: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
    }

    const allowed = validTransitions[trip.status]
    if (!allowed || !allowed.includes(status)) {
      session.flash('error', `Transition de "${trip.status}" vers "${status}" non autorisée.`)
      return response.redirect().toRoute('trips.index')
    }

    const bus = await Bus.find(trip.busId)

    if (status === 'in_progress' && bus) {
      bus.status = 'on_trip'
      await bus.save()
    }

    if ((status === 'completed' || status === 'cancelled') && bus && bus.status === 'on_trip') {
      bus.status = 'available'
      await bus.save()
    }

    trip.status = status
    await trip.save()

    const labels: Record<string, string> = {
      in_progress: 'démarré',
      completed: 'terminé',
      cancelled: 'annulé',
    }
    session.flash('success', `Voyage ${labels[status]} avec succès`)
    return response.redirect().toRoute('trips.index')
  }

  async destroy({ params, response, session, tenant }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .firstOrFail()

    if (trip.status === 'in_progress') {
      session.flash('error', 'Impossible de supprimer un voyage en cours.')
      return response.redirect().toRoute('trips.index')
    }

    if (trip.status === 'completed' || trip.status === 'cancelled') {
      session.flash('error', 'Impossible de supprimer un voyage terminé ou annulé.')
      return response.redirect().toRoute('trips.index')
    }

    await trip.delete()
    session.flash('success', 'Voyage supprimé avec succès')
    return response.redirect().toRoute('trips.index')
  }

  private async checkBusOverlap(
    busId: string,
    departureTime: DateTime,
    arrivalTime: DateTime,
    tenantId: string,
    excludeTripId?: string
  ): Promise<boolean> {
    const query = Trip.query()
      .where('tenantId', tenantId)
      .where('busId', busId)
      .whereIn('status', ['scheduled', 'in_progress'])
      .where('departureTime', '<', arrivalTime.toSQL()!)
      .where('arrivalTime', '>', departureTime.toSQL()!)

    if (excludeTripId) {
      query.whereNot('id', excludeTripId)
    }

    const result = await query.count('* as total')
    return Number(result[0].$extras.total) > 0
  }

  private async checkDriverOverlap(
    driverId: string,
    departureTime: DateTime,
    arrivalTime: DateTime,
    tenantId: string,
    excludeTripId?: string
  ): Promise<boolean> {
    const query = Trip.query()
      .where('tenantId', tenantId)
      .where('driverId', driverId)
      .whereIn('status', ['scheduled', 'in_progress'])
      .where('departureTime', '<', arrivalTime.toSQL()!)
      .where('arrivalTime', '>', departureTime.toSQL()!)

    if (excludeTripId) {
      query.whereNot('id', excludeTripId)
    }

    const result = await query.count('* as total')
    return Number(result[0].$extras.total) > 0
  }

  private async verifyDriver(driverId: string, tenantId: string): Promise<void> {
    const chauffeurRole = await Role.query()
      .where('tenantId', tenantId)
      .where('name', 'Chauffeur')
      .firstOrFail()

    const driver = await User.query()
      .where('id', driverId)
      .where('tenantId', tenantId)
      .whereHas('roleAssignments', (q) => {
        q.where('roleId', chauffeurRole.id)
      })
      .firstOrFail()

    if (!driver) {
      throw new Error('Driver not found')
    }
  }

  private async getDrivers(tenantId: string, includeDriverId?: string): Promise<User[]> {
    const chauffeurRole = await Role.query()
      .where('tenantId', tenantId)
      .where('name', 'Chauffeur')
      .first()

    if (!chauffeurRole) return []

    return User.query()
      .where('tenantId', tenantId)
      .where((query) => {
        query.where('status', 'active')
        if (includeDriverId) {
          query.orWhere('id', includeDriverId)
        }
      })
      .whereHas('roleAssignments', (q) => {
        q.where('roleId', chauffeurRole.id)
      })
      .orderBy('firstName')
      .orderBy('lastName')
  }
}
