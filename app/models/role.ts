import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenant'
import RolePermission from '#models/role_permission'
import UserRoleAssignment from '#models/user_role_assignment'

export default class Role extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare parentRoleId: string | null

  @column()
  declare name: string

  @column()
  declare scope: 'global' | 'resource'

  @column()
  declare isSystem: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Role, { foreignKey: 'parentRoleId' })
  declare parent: BelongsTo<typeof Role>

  @hasMany(() => Role, { foreignKey: 'parentRoleId' })
  declare children: HasMany<typeof Role>

  @hasMany(() => RolePermission)
  declare rolePermissions: HasMany<typeof RolePermission>

  @hasMany(() => UserRoleAssignment)
  declare userRoleAssignments: HasMany<typeof UserRoleAssignment>
}
