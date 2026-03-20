import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'
import Trip from '#models/trip'

export const TripFactory = factory
  .define(Trip, async ({ faker }) => {
    const departure = DateTime.now().plus({ days: faker.number.int({ min: 1, max: 30 }) })
    const durationMinutes = faker.number.int({ min: 60, max: 960 })
    return {
      departureTime: departure,
      arrivalTime: departure.plus({ minutes: durationMinutes }),
      travelClass: faker.helpers.arrayElement(['standard', 'vip'] as const),
      price: faker.number.int({ min: 3000, max: 15000 }),
      status: 'scheduled' as const,
    }
  })
  .build()
