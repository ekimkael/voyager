import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Token extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare type: 'password_reset' | 'email_change'

  @column()
  declare token: string

  @column()
  declare metadata: Record<string, unknown> | null

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare usedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get isExpired() {
    return this.expiresAt < DateTime.now()
  }

  get isUsed() {
    return this.usedAt !== null
  }
}
