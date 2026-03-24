import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Role from '#models/role'

export default class DriversController {
  async index({ view, company }: HttpContext) {
    const chauffeurRole = await Role.query()
      .where('companyId', company!.id)
      .where('name', 'Chauffeur')
      .first()

    if (!chauffeurRole) {
      return view.render('pages/dashboard/drivers/index', { drivers: [] })
    }

    const drivers = await User.query()
      .where('companyId', company!.id)
      .whereHas('roleAssignments', (query) => {
        query.where('roleId', chauffeurRole.id)
      })
      .orderBy('firstName')
      .orderBy('lastName')

    return view.render('pages/dashboard/drivers/index', { drivers })
  }
}
