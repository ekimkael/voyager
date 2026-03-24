import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Company from '#models/company'
import Bus from '#models/bus'

interface BusDef {
  licensePlate: string
  brand: string
  model: string
  capacity: number
  year: number
  status: 'available' | 'on_trip' | 'maintenance' | 'out_of_service'
  active: boolean
  nextMaintenanceDate: string | null
}

const busesPerCompany: Record<string, BusDef[]> = {
  'general-express-voyages': [
    { licensePlate: 'LT-4521-AB', brand: 'Toyota', model: 'Coaster', capacity: 30, year: 2022, status: 'available', active: true, nextMaintenanceDate: '2026-05-15' },
    { licensePlate: 'LT-7834-CD', brand: 'Yutong', model: 'ZK6122H9', capacity: 55, year: 2021, status: 'available', active: true, nextMaintenanceDate: '2026-06-01' },
    { licensePlate: 'LT-2198-EF', brand: 'Mercedes-Benz', model: 'Sprinter', capacity: 22, year: 2023, status: 'available', active: true, nextMaintenanceDate: '2026-07-10' },
    { licensePlate: 'CE-3345-GH', brand: 'Yutong', model: 'ZK6107HA', capacity: 45, year: 2020, status: 'on_trip', active: true, nextMaintenanceDate: '2026-04-20' },
    { licensePlate: 'CE-5567-IJ', brand: 'Golden Dragon', model: 'XML6102', capacity: 49, year: 2019, status: 'maintenance', active: true, nextMaintenanceDate: '2026-03-10' },
    { licensePlate: 'LT-8890-KL', brand: 'Zhongtong', model: 'LCK6125H', capacity: 53, year: 2017, status: 'out_of_service', active: false, nextMaintenanceDate: null },
  ],
  'touristique-express': [
    { licensePlate: 'CE-1122-MN', brand: 'Toyota', model: 'Coaster', capacity: 30, year: 2023, status: 'available', active: true, nextMaintenanceDate: '2026-06-15' },
    { licensePlate: 'CE-3344-OP', brand: 'Higer', model: 'KLQ6109Q', capacity: 45, year: 2022, status: 'available', active: true, nextMaintenanceDate: '2026-05-20' },
    { licensePlate: 'LT-5566-QR', brand: 'Yutong', model: 'ZK6122H9', capacity: 55, year: 2021, status: 'available', active: true, nextMaintenanceDate: '2026-08-01' },
    { licensePlate: 'CE-7788-ST', brand: 'Mercedes-Benz', model: 'Sprinter', capacity: 22, year: 2020, status: 'on_trip', active: true, nextMaintenanceDate: '2026-04-10' },
    { licensePlate: 'LT-9900-UV', brand: 'Golden Dragon', model: 'XML6102', capacity: 49, year: 2018, status: 'maintenance', active: true, nextMaintenanceDate: '2026-03-05' },
    { licensePlate: 'CE-2211-WX', brand: 'Toyota', model: 'HiAce', capacity: 15, year: 2016, status: 'out_of_service', active: false, nextMaintenanceDate: null },
  ],
}

export default class extends BaseSeeder {
  async run() {
    const companies = await Company.all()

    for (const company of companies) {
      const busDefs = busesPerCompany[company.slug]
      if (!busDefs) continue

      for (const busDef of busDefs) {
        await Bus.updateOrCreate(
          { licensePlate: busDef.licensePlate },
          { companyId: company.id, ...busDef }
        )
      }
    }
  }
}
