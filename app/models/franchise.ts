import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenant'
import City from '#models/city'
import User from '#models/user'

export default class Franchise extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare name: string

  @column()
  declare cityId: string

  @column()
  declare address: string

  @column()
  declare phone: string | null

  @column()
  declare active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => City)
  declare city: BelongsTo<typeof City>

  @hasMany(() => User)
  declare users: HasMany<typeof User>
}
