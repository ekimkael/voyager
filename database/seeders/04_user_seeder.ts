import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Tenant from '#models/tenant'
import User from '#models/user'
import Role from '#models/role'
import UserRoleAssignment from '#models/user_role_assignment'

interface UserDef {
  firstName: string
  lastName: string
  email: string
  role: string
}

const usersPerTenant: Record<string, UserDef[]> = {
  'general-express-voyages': [
    { firstName: 'Kouamé', lastName: 'Diallo', email: 'admin@general-express-voyages.com', role: 'Admin' },
    { firstName: 'Aminata', lastName: 'Traoré', email: 'aminata.traore@general-express-voyages.com', role: 'Dispatcher' },
    { firstName: 'Moussa', lastName: 'Bamba', email: 'moussa.bamba@general-express-voyages.com', role: 'Dispatcher' },
    { firstName: 'Ibrahim', lastName: 'Konaté', email: 'ibrahim.konate@general-express-voyages.com', role: 'Chauffeur' },
    { firstName: 'Seydou', lastName: 'Touré', email: 'seydou.toure@general-express-voyages.com', role: 'Chauffeur' },
    { firstName: 'Oumar', lastName: 'Camara', email: 'oumar.camara@general-express-voyages.com', role: 'Chauffeur' },
    { firstName: 'Fatou', lastName: 'Sow', email: 'fatou.sow@general-express-voyages.com', role: 'Dispatcher' },
    { firstName: 'Aïssatou', lastName: 'Keïta', email: 'aissatou.keita@general-express-voyages.com', role: 'Dispatcher' },
    { firstName: 'Awa', lastName: 'Coulibaly', email: 'awa.coulibaly@general-express-voyages.com', role: 'Lecteur' },
  ],
  'touristique-express': [
    { firstName: 'Mamadou', lastName: 'Coulibaly', email: 'admin@touristique-express.com', role: 'Admin' },
    { firstName: 'Bintou', lastName: 'Ndiaye', email: 'bintou.ndiaye@touristique-express.com', role: 'Dispatcher' },
    { firstName: 'Abdoulaye', lastName: 'Fofana', email: 'abdoulaye.fofana@touristique-express.com', role: 'Dispatcher' },
    { firstName: 'Boubacar', lastName: 'Sanogo', email: 'boubacar.sanogo@touristique-express.com', role: 'Chauffeur' },
    { firstName: 'Cheick', lastName: 'Cissé', email: 'cheick.cisse@touristique-express.com', role: 'Chauffeur' },
    { firstName: 'Souleymane', lastName: 'Dembélé', email: 'souleymane.dembele@touristique-express.com', role: 'Chauffeur' },
    { firstName: 'Mariam', lastName: 'Sylla', email: 'mariam.sylla@touristique-express.com', role: 'Dispatcher' },
    { firstName: 'Djénéba', lastName: 'Koné', email: 'djeneba.kone@touristique-express.com', role: 'Dispatcher' },
    { firstName: 'Nafissatou', lastName: 'Barry', email: 'nafissatou.barry@touristique-express.com', role: 'Lecteur' },
  ],
}

export default class extends BaseSeeder {
  async run() {
    const tenants = await Tenant.all()

    for (const tenant of tenants) {
      const userDefs = usersPerTenant[tenant.slug]
      if (!userDefs) continue

      const admin = await User.updateOrCreate(
        { tenantId: tenant.id, email: userDefs[0].email },
        {
          firstName: userDefs[0].firstName,
          lastName: userDefs[0].lastName,
          password: 'password123',
          status: 'active',
          mfaEnabled: false,
        }
      )

      // Assign admin role
      const adminRole = await Role.query()
        .where('tenantId', tenant.id)
        .where('name', 'Admin')
        .firstOrFail()

      await UserRoleAssignment.firstOrCreate(
        { userId: admin.id, roleId: adminRole.id },
        { grantedBy: admin.id, isTemporary: false }
      )

      // Create remaining users
      for (const userDef of userDefs.slice(1)) {
        const user = await User.updateOrCreate(
          { tenantId: tenant.id, email: userDef.email },
          {
            firstName: userDef.firstName,
            lastName: userDef.lastName,
            password: 'password123',
            status: 'active',
            mfaEnabled: false,
            phone: `+237 6${String(Math.floor(Math.random() * 100)).padStart(2, '0')} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')} ${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
          }
        )

        const role = await Role.query()
          .where('tenantId', tenant.id)
          .where('name', userDef.role)
          .firstOrFail()

        await UserRoleAssignment.firstOrCreate(
          { userId: user.id, roleId: role.id },
          { grantedBy: admin.id, isTemporary: false }
        )
      }
    }
  }
}
