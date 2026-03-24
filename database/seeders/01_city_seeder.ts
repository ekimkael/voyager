import { BaseSeeder } from '@adonisjs/lucid/seeders'
import City from '#models/city'

export default class extends BaseSeeder {
  async run() {
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

    for (const city of cities) {
      await City.updateOrCreate(
        { name: city.name, country: city.country },
        {}
      )
    }
  }
}
