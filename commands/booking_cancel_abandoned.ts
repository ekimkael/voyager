import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

export default class BookingCancelAbandoned extends BaseCommand {
  static commandName = 'booking:cancel-abandoned'
  static description = 'Annuler les réservations pending dont le voyage est déjà parti'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { default: Booking } = await import('#models/booking')

    const bookings = await Booking.query()
      .where('status', 'pending')
      .whereHas('trip', (q) => {
        q.where('departureTime', '<', DateTime.now().toSQL()!)
      })

    let count = 0
    for (const booking of bookings) {
      booking.status = 'cancelled'
      await booking.save()
      count++
    }

    this.logger.info(`${count} réservation(s) abandonnée(s) annulée(s).`)
  }
}
