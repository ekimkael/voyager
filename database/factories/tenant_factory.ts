import factory from '@adonisjs/lucid/factories'
import Tenant from '#models/tenant'

export const TenantFactory = factory
  .define(Tenant, async ({ faker }) => {
    const name = faker.helpers.arrayElement([
      'General Express Voyages',
      'Touristique Express',
      'Cam Voyages',
      'Buca Voyages',
      'Finexs Voyages',
      'Central Voyages',
      'Sahel Express',
      'Littoral Transport',
    ])
    return {
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      plan: faker.helpers.arrayElement(['free', 'pro', 'enterprise'] as const),
    }
  })
  .build()
