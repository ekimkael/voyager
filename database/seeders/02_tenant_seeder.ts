import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'

export default class extends BaseSeeder {
  async run() {
    const tenants = [
      { name: 'General Express Voyages', slug: 'general-express-voyages', plan: 'pro' as const },
      { name: 'Touristique Express', slug: 'touristique-express', plan: 'free' as const },
    ]

    for (const tenant of tenants) {
      await Tenant.updateOrCreate({ slug: tenant.slug }, tenant)
    }
  }
}
