import type { HttpContext } from '@adonisjs/core/http'
import Passenger from '#models/passenger'
import TicketGenerator from '#services/ticket_generator'

export default class TicketsController {
  private ticketGenerator = new TicketGenerator()

  async download({ params, response, session, tenant }: HttpContext) {
    const bookingId = params.bookingId
    const passengerId = params.passengerId

    // Verify session owns this booking (bookingIds is an array, appended during flow)
    const sessionBookingIds: string[] = session.get('bookingIds', [])
    if (!sessionBookingIds.includes(bookingId)) {
      return response.unauthorized('Accès non autorisé')
    }

    const passenger = await Passenger.query()
      .where('id', passengerId)
      .whereHas('booking', (query) => {
        query.where('id', bookingId).where('tenantId', tenant!.id).where('status', 'confirmed')
      })
      .preload('booking', (query) => {
        query
          .preload('trip', (tripQuery) => {
            tripQuery.preload('route', (routeQuery) => {
              routeQuery.preload('departureCity').preload('arrivalCity')
            })
            tripQuery.preload('bus')
          })
      })
      .firstOrFail()

    const trip = passenger.booking.trip
    const route = trip.route

    const pdfBuffer = await this.ticketGenerator.generate({
      tenant: tenant!,
      passenger,
      tripInfo: {
        departureCity: route.departureCity.name,
        arrivalCity: route.arrivalCity.name,
        departureTime: trip.departureTime.toFormat('dd/MM/yyyy HH:mm'),
        arrivalTime: trip.arrivalTime.toFormat('dd/MM/yyyy HH:mm'),
        travelClass: trip.travelClass,
        price: trip.price,
        busLicensePlate: trip.bus.licensePlate,
      },
    })

    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `attachment; filename="ticket-${passenger.code}.pdf"`)
    return response.send(pdfBuffer)
  }
}
