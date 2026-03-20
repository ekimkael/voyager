import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'

export default class Payment extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare bookingId: string

  @column()
  declare amount: number

  @column()
  declare paymentMethod: 'cash' | 'mobile_money' | 'card'

  @column()
  declare operator: string | null

  @column()
  declare status: 'pending' | 'success' | 'failed' | 'refunded'

  @column()
  declare externalReference: string | null

  @column.dateTime()
  declare paidAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>
}
