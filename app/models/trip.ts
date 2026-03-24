import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Company from '#models/company'
import Route from '#models/route'
import Bus from '#models/bus'
import User from '#models/user'
import Booking from '#models/booking'

export default class Trip extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare companyId: string

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

  @belongsTo(() => Company)
  declare company: BelongsTo<typeof Company>

  @belongsTo(() => Route)
  declare route: BelongsTo<typeof Route>

  @belongsTo(() => Bus)
  declare bus: BelongsTo<typeof Bus>

  @belongsTo(() => User, { foreignKey: 'driverId' })
  declare driver: BelongsTo<typeof User>

  @hasMany(() => Booking)
  declare bookings: HasMany<typeof Booking>
}
