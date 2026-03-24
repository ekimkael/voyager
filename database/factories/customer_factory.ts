import factory from '@adonisjs/lucid/factories'
import Customer from '#models/customer'

const firstNames = [
  'Paul', 'Marie', 'Jean', 'Cécile', 'Pierre',
  'Angèle', 'François', 'Hortense', 'Emmanuel', 'Nadège',
  'Thierry', 'Solange', 'Rodrigue', 'Clarisse', 'Hervé',
]

const lastNames = [
  'Kamga', 'Tchinda', 'Nganou', 'Fotso', 'Tagne',
  'Njoya', 'Mbouda', 'Kenfack', 'Nguemo', 'Tchoumi',
  'Djomo', 'Pokam', 'Feudjio', 'Noumsi', 'Tsague',
]

export const CustomerFactory = factory
  .define(Customer, async ({ faker }) => {
    const firstName = faker.helpers.arrayElement(firstNames)
    const lastName = faker.helpers.arrayElement(lastNames)
    return {
      firstName,
      lastName,
      phone: `+237 6${faker.string.numeric(2)} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`,
      email: faker.helpers.maybe(
        () => `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${faker.internet.domainName()}`,
        { probability: 0.6 }
      ) ?? null,
    }
  })
  .build()
