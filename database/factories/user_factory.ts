import factory from '@adonisjs/lucid/factories'
import User from '#models/user'

const firstNames = [
  'Kouamé', 'Aminata', 'Moussa', 'Fatou', 'Ibrahim',
  'Aïssatou', 'Oumar', 'Bintou', 'Mamadou', 'Awa',
  'Seydou', 'Mariam', 'Abdoulaye', 'Ramatoulaye', 'Boubacar',
  'Djénéba', 'Cheick', 'Kadiatou', 'Souleymane', 'Nafissatou',
]

const lastNames = [
  'Diallo', 'Traoré', 'Bamba', 'Konaté', 'Touré',
  'Ouédraogo', 'Sow', 'Camara', 'Keïta', 'Coulibaly',
  'Ndiaye', 'Fofana', 'Sanogo', 'Cissé', 'Dembélé',
  'Sylla', 'Koné', 'Diabaté', 'Bah', 'Barry',
]

export const UserFactory = factory
  .define(User, async ({ faker }) => {
    const firstName = faker.helpers.arrayElement(firstNames)
    const lastName = faker.helpers.arrayElement(lastNames)
    return {
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${faker.internet.domainName()}`,
      password: 'password123',
      status: 'active' as const,
      mfaEnabled: false,
      phone: `+237 6${faker.string.numeric(2)} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`,
    }
  })
  .build()
