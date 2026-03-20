import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Role from '#models/role'

export default class DriversController {
  async index({ view, tenant }: HttpContext) {
    const chauffeurRole = await Role.query()
      .where('tenantId', tenant!.id)
      .where('name', 'Chauffeur')
      .first()

    if (!chauffeurRole) {
      return view.render('pages/drivers/index', { drivers: [] })
    }

    const drivers = await User.query()
      .where('tenantId', tenant!.id)
      .whereHas('roleAssignments', (query) => {
        query.where('roleId', chauffeurRole.id)
      })
      .orderBy('firstName')
      .orderBy('lastName')

    return view.render('pages/drivers/index', { drivers })
  }
}
