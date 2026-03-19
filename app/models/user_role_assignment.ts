import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Role from '#models/role'

export default class UserRoleAssignment extends BaseModel {
  static table = 'user_role_assignments'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare roleId: string

  @column()
  declare resourceId: string | null

  @column()
  declare grantedBy: string

  @column.dateTime()
  declare expiresAt: DateTime | null

  @column()
  declare isTemporary: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>

  @belongsTo(() => User, { foreignKey: 'grantedBy' })
  declare granter: BelongsTo<typeof User>
}
