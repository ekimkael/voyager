import type { HttpContext } from '@adonisjs/core/http'
import Trip from '#models/trip'
import City from '#models/city'
import SeatAllocator from '#services/seat_allocator'
import { DateTime } from 'luxon'

export default class SearchController {
  private seatAllocator = new SeatAllocator()

  async index({ view, company, request }: HttpContext) {
    const { from, to, date } = request.qs()
    const cities = await City.query().orderBy('name')

    const hasSearchFilters = Boolean(from && to && date)

    const query = Trip.query()
      .where('status', 'scheduled')
      .where('departureTime', '>', DateTime.now().toSQL()!)
      .preload('route', (query) => {
        query.preload('departureCity').preload('arrivalCity')
      })
      .preload('company')
      .preload('bus')
      .orderBy('departureTime')

    if (company) {
      query.where('companyId', company.id)
    }

    if (hasSearchFilters) {
      query
        .whereHas('route', (routeQuery) => {
          routeQuery.where('departureCityId', from).where('arrivalCityId', to)
        })
        .whereBetween('departureTime', [`${date} 00:00:00`, `${date} 23:59:59`])
    } else {
      query.limit(20)
    }

    const trips = await query

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
      companySlug: company?.slug,
    })
  }

  async show({ params, view, company }: HttpContext) {
    const query = Trip.query()
      .where('id', params.id)
      .where('status', 'scheduled')
      .where('departureTime', '>', DateTime.now().toSQL()!)
      .preload('route', (query) => {
        query.preload('departureCity').preload('arrivalCity')
      })
      .preload('company')
      .preload('bus')

    if (company) {
      query.where('companyId', company.id)
    }

    const trip = await query.firstOrFail()

    const availableSeats = await this.seatAllocator.getAvailableSeatCount(trip.id)

    return view.render('pages/trips/show', {
      trip,
      availableSeats,
      companySlug: company?.slug,
    })
  }

  async companyShow({ view, company, response }: HttpContext) {
    if (!company) {
      return response.notFound()
    }

    const upcomingTrips = await Trip.query()
      .where('companyId', company.id)
      .where('status', 'scheduled')
      .where('departureTime', '>', DateTime.now().toSQL()!)
      .preload('route', (query) => {
        query.preload('departureCity').preload('arrivalCity')
      })
      .orderBy('departureTime')
      .limit(5)

    return view.render('pages/companies/show', {
      company,
      upcomingTrips,
    })
  }
}
