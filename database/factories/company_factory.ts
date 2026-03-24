import factory from '@adonisjs/lucid/factories'
import Company from '#models/company'

export const CompanyFactory = factory
  .define(Company, async ({ faker }) => {
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
