import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Company from '#models/company'
import City from '#models/city'
import Trip from '#models/trip'

export default class Route extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare companyId: string

  @column()
  declare code: string

  @column()
  declare departureCityId: string

  @column()
  declare arrivalCityId: string

  @column()
  declare distanceKm: number

  @column()
  declare estimatedDurationMinutes: number

  @column()
  declare status: 'active' | 'inactive'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Company)
  declare company: BelongsTo<typeof Company>

  @belongsTo(() => City, { foreignKey: 'departureCityId' })
  declare departureCity: BelongsTo<typeof City>

  @belongsTo(() => City, { foreignKey: 'arrivalCityId' })
  declare arrivalCity: BelongsTo<typeof City>

  @hasMany(() => Trip)
  declare trips: HasMany<typeof Trip>

  get formattedDuration(): string {
    const hours = Math.floor(this.estimatedDurationMinutes / 60)
    const minutes = this.estimatedDurationMinutes % 60
    return minutes > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`
  }

  get durationTimeValue(): string {
    const hours = Math.floor(this.estimatedDurationMinutes / 60)
    const minutes = this.estimatedDurationMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
}
