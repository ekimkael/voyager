import factory from '@adonisjs/lucid/factories'
import City from '#models/city'

const cities = [
  { name: 'Douala', country: 'Cameroun' },
  { name: 'Yaoundé', country: 'Cameroun' },
  { name: 'Bafoussam', country: 'Cameroun' },
  { name: 'Bamenda', country: 'Cameroun' },
  { name: 'Kribi', country: 'Cameroun' },
  { name: 'Limbé', country: 'Cameroun' },
  { name: 'Bertoua', country: 'Cameroun' },
  { name: 'Abidjan', country: "Côte d'Ivoire" },
  { name: 'Lomé', country: 'Togo' },
  { name: 'Cotonou', country: 'Bénin' },
]

export const CityFactory = factory
  .define(City, async ({ faker }) => {
    const city = faker.helpers.arrayElement(cities)
    return {
      name: city.name,
      country: city.country,
    }
  })
  .build()
