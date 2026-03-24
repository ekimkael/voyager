import factory from '@adonisjs/lucid/factories'
import Route from '#models/route'

export const RouteFactory = factory
  .define(Route, async ({ faker }) => {
    const distance = faker.number.int({ min: 50, max: 1500 })
    return {
      code: `${faker.string.alpha({ length: 3, casing: 'upper' })}-${faker.string.alpha({ length: 3, casing: 'upper' })}`,
      distanceKm: distance,
      estimatedDurationMinutes: Math.round(distance * 1.2),
      status: 'active' as const,
    }
  })
  .build()
