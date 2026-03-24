import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Company from '#models/company'
import UserRoleAssignment from '#models/user_role_assignment'
import Trip from '#models/trip'
import Franchise from '#models/franchise'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare companyId: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare externalId: string | null

  @column()
  declare status: 'active' | 'inactive' | 'suspended'

  @column()
  declare mfaEnabled: boolean

  @column()
  declare franchiseId: string | null

  @column()
  declare phone: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Company)
  declare company: BelongsTo<typeof Company>

  @hasMany(() => UserRoleAssignment)
  declare roleAssignments: HasMany<typeof UserRoleAssignment>

  @hasMany(() => Trip, { foreignKey: 'driverId' })
  declare driverTrips: HasMany<typeof Trip>

  @belongsTo(() => Franchise)
  declare franchise: BelongsTo<typeof Franchise>

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  get initials() {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase()
  }
}
