import factory from '@adonisjs/lucid/factories'
import Bus from '#models/bus'

const busModels = [
  { brand: 'Toyota', model: 'Coaster', capacity: 30 },
  { brand: 'Mercedes-Benz', model: 'Sprinter', capacity: 22 },
  { brand: 'Yutong', model: 'ZK6122H9', capacity: 55 },
  { brand: 'Yutong', model: 'ZK6107HA', capacity: 45 },
  { brand: 'Golden Dragon', model: 'XML6102', capacity: 49 },
  { brand: 'Zhongtong', model: 'LCK6125H', capacity: 53 },
  { brand: 'Toyota', model: 'HiAce', capacity: 15 },
  { brand: 'Higer', model: 'KLQ6109Q', capacity: 45 },
]

export const BusFactory = factory
  .define(Bus, async ({ faker }) => {
    const busModel = faker.helpers.arrayElement(busModels)
    const regionCode = faker.helpers.arrayElement(['LT', 'CE', 'OU', 'NW', 'SW'])
    return {
      licensePlate: `${regionCode}-${faker.string.numeric(4)}-${faker.string.alpha({ length: 2, casing: 'upper' })}`,
      brand: busModel.brand,
      model: busModel.model,
      capacity: busModel.capacity,
      year: faker.number.int({ min: 2015, max: 2025 }),
      status: 'available' as const,
      active: true,
      nextMaintenanceDate: null,
    }
  })
  .build()
