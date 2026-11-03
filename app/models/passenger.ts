import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'

export default class Passenger extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare bookingId: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare phone: string | null

  @column()
  declare idDocumentType: 'cni' | 'passport' | 'permit' | 'other' | null

  @column()
  declare idDocumentNumber: string | null

  @column()
  declare seatNumber: number

  @column()
  declare code: string

  @column()
  declare qrCode: string

  @column()
  declare status: 'pending' | 'boarded'

  @column.dateTime()
  declare boardedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}
