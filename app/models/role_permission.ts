import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Role from '#models/role'
import Permission from '#models/permission'

export default class RolePermission extends BaseModel {
  static table = 'role_permissions'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare roleId: string

  @column()
  declare permissionId: string

  @column()
  declare policyId: string | null

  @column.dateTime({ autoCreate: true, columnName: 'granted_at' })
  declare grantedAt: DateTime

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>

  @belongsTo(() => Permission)
  declare permission: BelongsTo<typeof Permission>
}
