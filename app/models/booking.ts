import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Company from '#models/company'
import Trip from '#models/trip'
import Customer from '#models/customer'
import User from '#models/user'
import Franchise from '#models/franchise'
import Passenger from '#models/passenger'
import Payment from '#models/payment'

export default class Booking extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare companyId: string

  @column()
  declare tripId: string

  @column()
  declare customerId: string | null

  @column()
  declare agentId: string | null

  @column()
  declare franchiseId: string | null

  @column()
  declare totalAmount: number

  @column()
  declare status: 'pending' | 'confirmed' | 'cancelled'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Company)
  declare company: BelongsTo<typeof Company>

  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => User, { foreignKey: 'agentId' })
  declare agent: BelongsTo<typeof User>

  @belongsTo(() => Franchise)
  declare franchise: BelongsTo<typeof Franchise>

  @hasMany(() => Passenger)
  declare passengers: HasMany<typeof Passenger>

  @hasOne(() => Payment)
  declare payment: HasOne<typeof Payment>

  get isExpired() {
    if (this.status !== 'pending') return false
    return this.updatedAt.diffNow('minutes').minutes < -15
  }
}
