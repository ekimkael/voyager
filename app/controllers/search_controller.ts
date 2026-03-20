import type { HttpContext } from '@adonisjs/core/http'
import Trip from '#models/trip'
import City from '#models/city'
import SeatAllocator from '#services/seat_allocator'
import { DateTime } from 'luxon'

export default class SearchController {
  private seatAllocator = new SeatAllocator()

  async index({ view, tenant, request }: HttpContext) {
    const { from, to, date } = request.qs()
    const cities = await City.query().orderBy('name')

    let trips: Trip[] = []

    if (from && to && date) {
      trips = await Trip.query()
        .where('tenantId', tenant!.id)
        .where('status', 'scheduled')
        .where('departureTime', '>', DateTime.now().toSQL()!)
        .whereHas('route', (query) => {
          query.where('departureCityId', from).where('arrivalCityId', to)
        })
        .whereBetween('departureTime', [
          `${date} 00:00:00`,
          `${date} 23:59:59`,
        ])
        .preload('route', (query) => {
          query.preload('departureCity').preload('arrivalCity')
        })
        .preload('bus')
        .orderBy('departureTime')
    }

    const tripsWithSeats = await Promise.all(
      trips.map(async (trip) => {
        const available = await this.seatAllocator.getAvailableSeatCount(trip.id)
        return { trip, availableSeats: available }
      })
    )

    return view.render('pages/trips/search', {
      cities,
      trips: tripsWithSeats,
      filters: { from, to, date },
      tenantSlug: tenant!.slug,
    })
  }

  async show({ params, view, tenant }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.id)
      .where('tenantId', tenant!.id)
      .where('status', 'scheduled')
      .where('departureTime', '>', DateTime.now().toSQL()!)
      .preload('route', (query) => {
        query.preload('departureCity').preload('arrivalCity')
      })
      .preload('bus')
      .firstOrFail()

    const availableSeats = await this.seatAllocator.getAvailableSeatCount(trip.id)

    return view.render('pages/trips/show', {
      trip,
      availableSeats,
      tenantSlug: tenant!.slug,
    })
  }
}
