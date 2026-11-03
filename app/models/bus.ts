import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Company from '#models/company'
import Trip from '#models/trip'

export default class Bus extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare companyId: string

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

  @belongsTo(() => Company)
  declare company: BelongsTo<typeof Company>

  @hasMany(() => Trip)
  declare trips: HasMany<typeof Trip>
}
