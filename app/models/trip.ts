import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenant'
import Route from '#models/route'
import Bus from '#models/bus'
import User from '#models/user'

export default class Trip extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare routeId: string

  @column()
  declare busId: string

  @column()
  declare driverId: string

  @column.dateTime()
  declare departureTime: DateTime

  @column.dateTime()
  declare arrivalTime: DateTime

  @column()
  declare travelClass: 'standard' | 'vip'

  @column()
  declare price: number

  @column()
  declare status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>

  @belongsTo(() => Route)
  declare route: BelongsTo<typeof Route>

  @belongsTo(() => Bus)
  declare bus: BelongsTo<typeof Bus>

  @belongsTo(() => User, { foreignKey: 'driverId' })
  declare driver: BelongsTo<typeof User>
}
