import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Company from '#models/company'

export default class extends BaseSeeder {
  async run() {
    const companies = [
      { name: 'General Express Voyages', slug: 'general-express-voyages', plan: 'pro' as const },
      { name: 'Touristique Express', slug: 'touristique-express', plan: 'free' as const },
    ]

    for (const company of companies) {
      await Company.updateOrCreate({ slug: company.slug }, company)
    }
  }
}
