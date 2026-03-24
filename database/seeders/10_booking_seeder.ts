import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'
import Company from '#models/company'
import Trip from '#models/trip'
import Customer from '#models/customer'
import User from '#models/user'
import Franchise from '#models/franchise'
import Booking from '#models/booking'
import Passenger from '#models/passenger'
import Payment from '#models/payment'
import Role from '#models/role'

const passengerNames = [
  { firstName: 'Alain', lastName: 'Mbarga' },
  { firstName: 'Berthe', lastName: 'Essomba' },
  { firstName: 'Charles', lastName: 'Atangana' },
  { firstName: 'Denise', lastName: 'Owona' },
  { firstName: 'Étienne', lastName: 'Mvondo' },
  { firstName: 'Félicité', lastName: 'Messi' },
  { firstName: 'Gaston', lastName: 'Belinga' },
  { firstName: 'Hélène', lastName: 'Nkoulou' },
  { firstName: 'Isidore', lastName: 'Abena' },
  { firstName: 'Joséphine', lastName: 'Ekotto' },
  { firstName: 'Lambert', lastName: 'Onana' },
  { firstName: 'Monique', lastName: 'Nkodo' },
  { firstName: 'Norbert', lastName: 'Elong' },
  { firstName: 'Odette', lastName: 'Manga' },
  { firstName: 'Pascal', lastName: 'Biya' },
]

interface BookingTemplate {
  bookingStatus: 'pending' | 'confirmed' | 'cancelled'
  paymentStatus: 'pending' | 'success' | 'failed' | 'refunded'
  paymentMethod: 'cash' | 'mobile_money' | 'card'
  passengerCount: number
  hasBoarded: boolean
}

const bookingTemplates: BookingTemplate[] = [
  // 10 confirmed + success
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'cash', passengerCount: 2, hasBoarded: true },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'mobile_money', passengerCount: 1, hasBoarded: true },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'mobile_money', passengerCount: 3, hasBoarded: false },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'cash', passengerCount: 1, hasBoarded: false },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'card', passengerCount: 2, hasBoarded: true },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'cash', passengerCount: 4, hasBoarded: false },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'mobile_money', passengerCount: 1, hasBoarded: true },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'cash', passengerCount: 2, hasBoarded: false },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'mobile_money', passengerCount: 1, hasBoarded: true },
  { bookingStatus: 'confirmed', paymentStatus: 'success', paymentMethod: 'card', passengerCount: 3, hasBoarded: false },
  // 5 pending
  { bookingStatus: 'pending', paymentStatus: 'pending', paymentMethod: 'cash', passengerCount: 1, hasBoarded: false },
  { bookingStatus: 'pending', paymentStatus: 'pending', paymentMethod: 'mobile_money', passengerCount: 2, hasBoarded: false },
  { bookingStatus: 'pending', paymentStatus: 'pending', paymentMethod: 'cash', passengerCount: 1, hasBoarded: false },
  { bookingStatus: 'pending', paymentStatus: 'pending', paymentMethod: 'mobile_money', passengerCount: 3, hasBoarded: false },
  { bookingStatus: 'pending', paymentStatus: 'pending', paymentMethod: 'card', passengerCount: 1, hasBoarded: false },
  // 3 cancelled + refunded
  { bookingStatus: 'cancelled', paymentStatus: 'refunded', paymentMethod: 'mobile_money', passengerCount: 2, hasBoarded: false },
  { bookingStatus: 'cancelled', paymentStatus: 'refunded', paymentMethod: 'cash', passengerCount: 1, hasBoarded: false },
  { bookingStatus: 'cancelled', paymentStatus: 'refunded', paymentMethod: 'card', passengerCount: 1, hasBoarded: false },
  // 2 confirmed + failed
  { bookingStatus: 'confirmed', paymentStatus: 'failed', paymentMethod: 'mobile_money', passengerCount: 1, hasBoarded: false },
  { bookingStatus: 'confirmed', paymentStatus: 'failed', paymentMethod: 'card', passengerCount: 2, hasBoarded: false },
]

export default class extends BaseSeeder {
  async run() {
    const companies = await Company.all()
    let globalPaxCounter = 0

    for (const company of companies) {
      const trips = await Trip.query()
        .where('companyId', company.id)
        .whereNot('status', 'cancelled')

      const customers = await Customer.query().where('companyId', company.id)
      const franchises = await Franchise.query().where('companyId', company.id)

      const dispatcherRole = await Role.query()
        .where('companyId', company.id)
        .where('name', 'Dispatcher')
        .firstOrFail()

      const agents = await User.query()
        .where('companyId', company.id)
        .whereHas('roleAssignments', (q) => q.where('roleId', dispatcherRole.id))

      if (trips.length === 0 || customers.length === 0 || agents.length === 0) continue

      let seatCounters: Record<string, number> = {}

      for (let i = 0; i < bookingTemplates.length; i++) {
        const template = bookingTemplates[i]
        const trip = trips[i % trips.length]
        const customer = customers[i % customers.length]
        const agent = agents[i % agents.length]
        const franchise = franchises[i % franchises.length]

        if (!seatCounters[trip.id]) seatCounters[trip.id] = 0

        const totalAmount = trip.price * template.passengerCount

        const booking = await Booking.create({
          companyId: company.id,
          tripId: trip.id,
          customerId: customer.id,
          agentId: agent.id,
          franchiseId: franchise.id,
          totalAmount,
          status: template.bookingStatus,
        })

        // Create passengers
        for (let p = 0; p < template.passengerCount; p++) {
          globalPaxCounter++
          seatCounters[trip.id]++

          const nameData = passengerNames[globalPaxCounter % passengerNames.length]
          const isBoarded = template.hasBoarded && p === 0

          await Passenger.create({
            bookingId: booking.id,
            firstName: nameData.firstName,
            lastName: nameData.lastName,
            phone: p === 0 ? `+237 6${String(Math.floor(globalPaxCounter / 100) % 100).padStart(2, '0')} ${String(globalPaxCounter % 1000).padStart(3, '0')} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}` : null,
            seatNumber: seatCounters[trip.id],
            code: `P${String(globalPaxCounter).padStart(2, '0')}${String.fromCharCode(65 + (globalPaxCounter % 26))}${String(Math.floor(globalPaxCounter / 26) % 10)}${String.fromCharCode(65 + ((globalPaxCounter * 7) % 26))}`,
            qrCode: randomUUID(),
            status: isBoarded ? 'boarded' : 'pending',
            boardedAt: isBoarded ? DateTime.now().minus({ hours: 1 }) : null,
          })
        }

        // Create payment
        const operator = template.paymentMethod === 'mobile_money'
          ? (['Orange Money', 'MTN MoMo'] as const)[i % 2]
          : null

        const isPaid = template.paymentStatus === 'success'
        const isMobileMoney = template.paymentMethod === 'mobile_money'

        await Payment.create({
          bookingId: booking.id,
          amount: totalAmount,
          paymentMethod: template.paymentMethod,
          operator,
          status: template.paymentStatus,
          paidAt: isPaid ? DateTime.now().minus({ minutes: 30 }) : null,
          externalReference: isMobileMoney ? `TXN-${randomUUID().slice(0, 12).toUpperCase()}` : null,
        })
      }
    }
  }
}
