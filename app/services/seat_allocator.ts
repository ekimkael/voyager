import { randomInt } from 'node:crypto'
import Passenger from '#models/passenger'
import Trip from '#models/trip'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

interface PassengerData {
  firstName: string
  lastName: string
  phone?: string
}

export class InsufficientSeatsError extends Error {
  constructor(available: number, requested: number) {
    super(`Not enough seats: ${available} available, ${requested} requested`)
    this.name = 'InsufficientSeatsError'
  }
}

export default class SeatAllocator {
  async allocate(
    tripId: string,
    passengerDataList: PassengerData[],
    bookingId: string,
    trx: TransactionClientContract
  ): Promise<Passenger[]> {
    // 1. Get trip with bus to know capacity
    const trip = await Trip.query({ client: trx })
      .where('id', tripId)
      .preload('bus')
      .firstOrFail()

    const capacity = trip.bus.capacity

    // 2. Lock and get taken seats (only from active bookings)
    const takenRows = await db
      .query()
      .useTransaction(trx)
      .from('passengers')
      .join('bookings', 'bookings.id', 'passengers.booking_id')
      .where('bookings.trip_id', tripId)
      .where((query) => {
        query
          .where('bookings.status', 'confirmed')
          .orWhere((sub) => {
            sub
              .where('bookings.status', 'pending')
              .where('bookings.updated_at', '>', db.raw("NOW() - INTERVAL '15 minutes'"))
          })
      })
      .select('passengers.seat_number')
      .forUpdate()

    const takenSeats = new Set(takenRows.map((r: { seat_number: number }) => r.seat_number))

    // 3. Compute available seats
    const availableSeats: number[] = []
    for (let i = 1; i <= capacity; i++) {
      if (!takenSeats.has(i)) {
        availableSeats.push(i)
      }
    }

    if (availableSeats.length < passengerDataList.length) {
      throw new InsufficientSeatsError(availableSeats.length, passengerDataList.length)
    }

    // 4. Create passengers with assigned seats
    const passengers: Passenger[] = []
    for (let i = 0; i < passengerDataList.length; i++) {
      const data = passengerDataList[i]
      const seatNumber = availableSeats[i]
      const code = await this.generateUniqueCode(trx)

      const passenger = await Passenger.create(
        {
          bookingId,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          seatNumber,
          code,
          status: 'pending',
        },
        { client: trx }
      )

      passengers.push(passenger)
    }

    return passengers
  }

  private async generateUniqueCode(trx: TransactionClientContract): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const maxRetries = 10

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      let code = ''
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(randomInt(chars.length))
      }

      const existing = await Passenger.query({ client: trx }).where('code', code).first()
      if (!existing) {
        return code
      }
    }

    throw new Error('Failed to generate unique passenger code after max retries')
  }

  async getAvailableSeatCount(tripId: string): Promise<number> {
    const trip = await Trip.query().where('id', tripId).preload('bus').firstOrFail()

    const result = await db
      .query()
      .from('passengers')
      .join('bookings', 'bookings.id', 'passengers.booking_id')
      .where('bookings.trip_id', tripId)
      .where((query) => {
        query
          .where('bookings.status', 'confirmed')
          .orWhere((sub) => {
            sub
              .where('bookings.status', 'pending')
              .where('bookings.updated_at', '>', db.raw("NOW() - INTERVAL '15 minutes'"))
          })
      })
      .count('* as total')

    const taken = Number(result[0].total)
    return trip.bus.capacity - taken
  }
}
