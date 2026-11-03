import type { HttpContext } from '@adonisjs/core/http'
import Passenger from '#models/passenger'
import TicketGenerator from '#services/ticket_generator'

export default class DashboardTicketsController {
  private ticketGenerator = new TicketGenerator()

  async download({ params, response, company }: HttpContext) {
    const passenger = await Passenger.query()
      .where('id', params.passengerId)
      .whereHas('booking', (query) => {
        query.where('id', params.id).where('companyId', company!.id).where('status', 'confirmed')
      })
      .preload('booking', (query) => {
        query.preload('trip', (tripQuery) => {
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
      company: company!,
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
