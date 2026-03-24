import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'
import Customer from '#models/customer'

const customerData = [
  { firstName: 'Paul', lastName: 'Kamga', email: 'paul.kamga@gmail.com' },
  { firstName: 'Marie', lastName: 'Tchinda', email: null },
  { firstName: 'Jean', lastName: 'Nganou', email: 'jean.nganou@yahoo.fr' },
  { firstName: 'Cécile', lastName: 'Fotso', email: null },
  { firstName: 'Pierre', lastName: 'Tagne', email: 'pierre.tagne@outlook.com' },
  { firstName: 'Angèle', lastName: 'Njoya', email: null },
  { firstName: 'François', lastName: 'Mbouda', email: 'francois.mbouda@gmail.com' },
  { firstName: 'Hortense', lastName: 'Kenfack', email: null },
  { firstName: 'Emmanuel', lastName: 'Nguemo', email: 'emmanuel.nguemo@gmail.com' },
  { firstName: 'Nadège', lastName: 'Tchoumi', email: 'nadege.tchoumi@yahoo.fr' },
  { firstName: 'Thierry', lastName: 'Djomo', email: null },
  { firstName: 'Solange', lastName: 'Pokam', email: null },
  { firstName: 'Rodrigue', lastName: 'Feudjio', email: 'rodrigue.feudjio@gmail.com' },
  { firstName: 'Clarisse', lastName: 'Noumsi', email: null },
  { firstName: 'Hervé', lastName: 'Tsague', email: 'herve.tsague@outlook.com' },
]

export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()
    let phoneCounter = 0

    for (const tenant of tenants) {
      for (const data of customerData) {
        phoneCounter++
        const phone = `+237 6${String(Math.floor(phoneCounter / 100) % 100).padStart(2, '0')} ${String(phoneCounter % 1000).padStart(3, '0')} ${String(phoneCounter * 7 % 1000).padStart(3, '0')}`
        await Customer.updateOrCreate(
          { tenantId: tenant.id, phone },
          {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
          }
        )
      }
    }
  }
}
