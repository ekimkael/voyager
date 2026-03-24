import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'
import City from '#models/city'
import Franchise from '#models/franchise'
import User from '#models/user'
import Role from '#models/role'

interface FranchiseDef {
  name: string
  cityName: string
  address: string
  phone: string
}

const franchisesPerTenant: Record<string, FranchiseDef[]> = {
  'general-express-voyages': [
    { name: 'Agence Akwa', cityName: 'Douala', address: "Rue de l'Hôpital, Akwa, Douala", phone: '+237 699 100 200' },
    { name: 'Agence Bastos', cityName: 'Yaoundé', address: 'Carrefour Bastos, Yaoundé', phone: '+237 699 100 201' },
    { name: 'Agence Tamdja', cityName: 'Bafoussam', address: 'Rue du Marché, Tamdja, Bafoussam', phone: '+237 699 100 202' },
    { name: 'Agence Plateau', cityName: 'Abidjan', address: 'Boulevard de la République, Plateau, Abidjan', phone: '+237 699 100 203' },
  ],
  'touristique-express': [
    { name: 'Agence Mokolo', cityName: 'Yaoundé', address: 'Carrefour Mokolo, Yaoundé', phone: '+237 698 200 300' },
    { name: 'Agence Bonabéri', cityName: 'Douala', address: 'Route de Bonabéri, Douala', phone: '+237 698 200 301' },
    { name: 'Agence Plateau', cityName: 'Abidjan', address: 'Avenue Houphouët-Boigny, Plateau, Abidjan', phone: '+237 698 200 302' },
  ],
}

export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()

    for (const tenant of tenants) {
      const defs = franchisesPerTenant[tenant.slug]
      if (!defs) continue

      const franchises: Franchise[] = []
      for (const def of defs) {
        const city = await City.query().where('name', def.cityName).firstOrFail()
        const franchise = await Franchise.updateOrCreate(
          { tenantId: tenant.id, name: def.name },
          { cityId: city.id, address: def.address, phone: def.phone, active: true }
        )
        franchises.push(franchise)
      }

      // Assign last 2 dispatcher-role users (agents) to franchises
      const dispatcherRole = await Role.query()
        .where('tenantId', tenant.id)
        .where('name', 'Dispatcher')
        .firstOrFail()

      const agents = await User.query()
        .whereHas('roleAssignments', (q) => q.where('roleId', dispatcherRole.id))
        .where('tenantId', tenant.id)
        .orderBy('createdAt', 'desc')
        .limit(2)

      for (let i = 0; i < agents.length; i++) {
        const franchise = franchises[i % franchises.length]
        agents[i].franchiseId = franchise.id
        await agents[i].save()
      }
    }
  }
}
