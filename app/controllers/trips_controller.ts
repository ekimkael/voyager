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

  async history({ view, request, tenant }: HttpContext) {
    const filters = this.parseHistoryFilters(request.qs())

    const query = Trip.query()
      .where('tenantId', tenant!.id)
      .whereIn('status', ['completed', 'cancelled'])

    if (filters.status) {
      query.where('status', filters.status)
    }
    if (filters.route_id) {
      query.where('routeId', filters.route_id)
    }
    if (filters.driver_id) {
      query.where('driverId', filters.driver_id)
    }
    if (filters.bus_id) {
      query.where('busId', filters.bus_id)
    }
    if (filters.travel_class) {
      query.where('travelClass', filters.travel_class)
    }
    if (filters.date_from) {
      query.where('departureTime', '>=', filters.date_from)
    }
    if (filters.date_to) {
      const nextDay = DateTime.fromISO(filters.date_to).plus({ days: 1 }).toISODate()
      if (nextDay) query.where('departureTime', '<', nextDay)
    }
    if (filters.price_min !== undefined) {
      query.where('price', '>=', filters.price_min)
    }
    if (filters.price_max !== undefined) {
      query.where('price', '<=', filters.price_max)
    }

    query
      .preload('route', (q) => {
        q.preload('departureCity').preload('arrivalCity')
      })
      .preload('bus')
      .preload('driver')
      .orderBy('departureTime', 'desc')

    const { page, ...queryFilters } = filters
    const trips = await query.paginate(page, 20)
    trips.baseUrl('/trips/history')
    trips.queryString(queryFilters)

    // Load filter dropdown data in parallel — all queries are independent
    // Note: drivers query is inlined (not using getDrivers()) because getDrivers()
    // filters by status='active', but history needs ALL drivers including inactive ones
    // since historical trips may reference now-inactive drivers.
    const chauffeurRole = await Role.query()
      .where('tenantId', tenant!.id)
      .where('name', 'Chauffeur')
      .first()

    const [routes, buses, drivers] = await Promise.all([
      Route.query()
        .where('tenantId', tenant!.id)
        .preload('departureCity')
        .preload('arrivalCity')
        .orderBy('code'),
      Bus.query()
        .where('tenantId', tenant!.id)
        .orderBy('licensePlate'),
      chauffeurRole
        ? User.query()
            .where('tenantId', tenant!.id)
            .whereHas('roleAssignments', (q) => {
              q.where('roleId', chauffeurRole.id)
            })
            .orderBy('firstName')
            .orderBy('lastName')
        : Promise.resolve([] as User[]),
    ])

    return view.render('pages/trips/history', { trips, routes, buses, drivers, filters })
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

  private parseHistoryFilters(qs: Record<string, any>) {
    const filters: Record<string, any> = {}
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    if (['completed', 'cancelled'].includes(qs.status)) {
      filters.status = qs.status
    }
    if (typeof qs.route_id === 'string' && uuidRegex.test(qs.route_id)) {
      filters.route_id = qs.route_id
    }
    if (typeof qs.driver_id === 'string' && uuidRegex.test(qs.driver_id)) {
      filters.driver_id = qs.driver_id
    }
    if (typeof qs.bus_id === 'string' && uuidRegex.test(qs.bus_id)) {
      filters.bus_id = qs.bus_id
    }
    if (['standard', 'vip'].includes(qs.travel_class)) {
      filters.travel_class = qs.travel_class
    }
    if (typeof qs.date_from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(qs.date_from)) {
      const dt = DateTime.fromISO(qs.date_from)
      if (dt.isValid) filters.date_from = qs.date_from
    }
    if (typeof qs.date_to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(qs.date_to)) {
      const dt = DateTime.fromISO(qs.date_to)
      if (dt.isValid) filters.date_to = qs.date_to
    }
    if (qs.price_min !== undefined && qs.price_min !== '') {
      const n = Number(qs.price_min)
      if (!Number.isNaN(n) && n >= 0) filters.price_min = n
    }
    if (qs.price_max !== undefined && qs.price_max !== '') {
      const n = Number(qs.price_max)
      if (!Number.isNaN(n) && n >= 0) filters.price_max = n
    }

    const page = Number(qs.page)
    filters.page = Number.isInteger(page) && page >= 1 ? page : 1

    return filters
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
