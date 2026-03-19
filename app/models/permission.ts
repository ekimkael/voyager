import { DateTime } from 'luxon'
import { BaseModel, column, computed } from '@adonisjs/lucid/orm'

export default class Permission extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare resource: string

  @column()
  declare action: string

  @column()
  declare description: string | null

  @column()
  declare isSensitive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @computed()
  get key() {
    return `${this.resource}:${this.action}`
  }
}
