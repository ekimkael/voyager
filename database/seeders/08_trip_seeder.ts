import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Tenant from '#models/tenant'
import Route from '#models/route'
import Bus from '#models/bus'
import User from '#models/user'
import Role from '#models/role'
import Trip from '#models/trip'

interface TripDef {
  routeCode: string
  busIndex: number
  driverIndex: number
  departureOffset: { days: number; hours: number }
  travelClass: 'standard' | 'vip'
  price: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
}

const tripsTemplate: TripDef[] = [
  // Scheduled (future)
  { routeCode: 'DLA-YDE', busIndex: 0, driverIndex: 0, departureOffset: { days: 1, hours: 6 }, travelClass: 'standard', price: 5000, status: 'scheduled' },
  { routeCode: 'YDE-BFM', busIndex: 1, driverIndex: 1, departureOffset: { days: 2, hours: 7 }, travelClass: 'standard', price: 6000, status: 'scheduled' },
  { routeCode: 'DLA-KBI', busIndex: 2, driverIndex: 2, departureOffset: { days: 3, hours: 8 }, travelClass: 'vip', price: 10000, status: 'scheduled' },
  { routeCode: 'DLA-LBE', busIndex: 0, driverIndex: 0, departureOffset: { days: 5, hours: 14 }, travelClass: 'standard', price: 3000, status: 'scheduled' },
  // In progress (departed today)
  { routeCode: 'DLA-YDE', busIndex: 1, driverIndex: 1, departureOffset: { days: 0, hours: -2 }, travelClass: 'standard', price: 5000, status: 'in_progress' },
  { routeCode: 'YDE-ABJ', busIndex: 2, driverIndex: 2, departureOffset: { days: 0, hours: -5 }, travelClass: 'vip', price: 15000, status: 'in_progress' },
  { routeCode: 'DLA-LBE', busIndex: 0, driverIndex: 0, departureOffset: { days: 0, hours: -1 }, travelClass: 'standard', price: 3000, status: 'in_progress' },
  // Completed (past)
  { routeCode: 'DLA-YDE', busIndex: 0, driverIndex: 0, departureOffset: { days: -3, hours: 6 }, travelClass: 'standard', price: 5000, status: 'completed' },
  { routeCode: 'YDE-BFM', busIndex: 1, driverIndex: 1, departureOffset: { days: -5, hours: 7 }, travelClass: 'vip', price: 12000, status: 'completed' },
  { routeCode: 'DLA-KBI', busIndex: 2, driverIndex: 2, departureOffset: { days: -7, hours: 9 }, travelClass: 'standard', price: 4000, status: 'completed' },
  // Cancelled
  { routeCode: 'DLA-LBE', busIndex: 0, driverIndex: 0, departureOffset: { days: -1, hours: 15 }, travelClass: 'standard', price: 3000, status: 'cancelled' },
  { routeCode: 'YDE-ABJ', busIndex: 1, driverIndex: 1, departureOffset: { days: 4, hours: 6 }, travelClass: 'vip', price: 15000, status: 'cancelled' },
]

// Non-idempotent: uses Trip.create. Run after `node ace migration:fresh` for clean state.
export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()

    for (const tenant of tenants) {
      const routes = await Route.query().where('tenantId', tenant.id)
      const routeMap = new Map(routes.map((r) => [r.code, r]))

      const buses = await Bus.query().where('tenantId', tenant.id).where('active', true).orderBy('createdAt')

      const chauffeurRole = await Role.query()
        .where('tenantId', tenant.id)
        .where('name', 'Chauffeur')
        .firstOrFail()

      const drivers = await User.query()
        .where('tenantId', tenant.id)
        .whereHas('roleAssignments', (q) => q.where('roleId', chauffeurRole.id))
        .orderBy('createdAt')

      if (buses.length === 0 || drivers.length === 0) continue

      for (const tripDef of tripsTemplate) {
        const route = routeMap.get(tripDef.routeCode)
        if (!route) continue

        const bus = buses[tripDef.busIndex % buses.length]
        const driver = drivers[tripDef.driverIndex % drivers.length]

        const now = DateTime.now()
        const departure = now.plus({
          days: tripDef.departureOffset.days,
          hours: tripDef.departureOffset.hours,
        })
        const arrival = departure.plus({ minutes: route.estimatedDurationMinutes })

        await Trip.create({
          tenantId: tenant.id,
          routeId: route.id,
          busId: bus.id,
          driverId: driver.id,
          departureTime: departure,
          arrivalTime: arrival,
          travelClass: tripDef.travelClass,
          price: tripDef.price,
          status: tripDef.status,
        })
      }
    }
  }
}
