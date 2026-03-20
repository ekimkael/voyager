import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Tenant from '#models/tenant'

export default class Bus extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare tenantId: string

  @column()
  declare licensePlate: string

  @column()
  declare brand: string

  @column()
  declare model: string

  @column()
  declare capacity: number

  @column()
  declare year: number

  @column()
  declare status: 'available' | 'on_trip' | 'maintenance' | 'out_of_service'

  @column()
  declare nextMaintenanceDate: string | null

  @column()
  declare active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Tenant)
  declare tenant: BelongsTo<typeof Tenant>
}
