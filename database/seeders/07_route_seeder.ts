import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Company from '#models/company'
import City from '#models/city'
import Route from '#models/route'

interface RouteDef {
  code: string
  from: string
  to: string
  distanceKm: number
  estimatedDurationMinutes: number
}

const routes: RouteDef[] = [
  { code: 'DLA-YDE', from: 'Douala', to: 'Yaoundé', distanceKm: 250, estimatedDurationMinutes: 240 },
  { code: 'YDE-BFM', from: 'Yaoundé', to: 'Bafoussam', distanceKm: 300, estimatedDurationMinutes: 300 },
  { code: 'DLA-KBI', from: 'Douala', to: 'Kribi', distanceKm: 150, estimatedDurationMinutes: 180 },
  { code: 'DLA-LBE', from: 'Douala', to: 'Limbé', distanceKm: 80, estimatedDurationMinutes: 90 },
  { code: 'YDE-ABJ', from: 'Yaoundé', to: 'Abidjan', distanceKm: 1450, estimatedDurationMinutes: 960 },
]

export default class extends BaseSeeder {
  async run() {
    const companies = await Company.all()
    const cities = await City.all()
    const cityMap = new Map(cities.map((c) => [c.name, c]))

    for (const company of companies) {
      for (const routeDef of routes) {
        const departureCity = cityMap.get(routeDef.from)
        const arrivalCity = cityMap.get(routeDef.to)
        if (!departureCity || !arrivalCity) continue

        await Route.updateOrCreate(
          { companyId: company.id, code: routeDef.code },
          {
            departureCityId: departureCity.id,
            arrivalCityId: arrivalCity.id,
            distanceKm: routeDef.distanceKm,
            estimatedDurationMinutes: routeDef.estimatedDurationMinutes,
            status: 'active',
          }
        )
      }
    }
  }
}
