import factory from '@adonisjs/lucid/factories'
import Franchise from '#models/franchise'

const agencies = [
  { name: 'Agence Akwa', address: 'Rue de l\'Hôpital, Akwa, Douala' },
  { name: 'Agence Bastos', address: 'Carrefour Bastos, Yaoundé' },
  { name: 'Agence Tamdja', address: 'Rue du Marché, Tamdja, Bafoussam' },
  { name: 'Agence Plateau', address: 'Boulevard de la République, Plateau, Abidjan' },
  { name: 'Agence Mokolo', address: 'Carrefour Mokolo, Yaoundé' },
  { name: 'Agence Bonabéri', address: 'Route de Bonabéri, Douala' },
  { name: 'Agence Nkondengui', address: 'Avenue Kennedy, Nkondengui, Yaoundé' },
  { name: 'Agence Déido', address: 'Rue Déido, Douala' },
]

export const FranchiseFactory = factory
  .define(Franchise, async ({ faker }) => {
    const agency = faker.helpers.arrayElement(agencies)
    return {
      name: agency.name,
      address: agency.address,
      phone: `+237 6${faker.string.numeric(2)} ${faker.string.numeric(3)} ${faker.string.numeric(3)}`,
      active: true,
    }
  })
  .build()
