import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Route from '#models/route'

export default class City extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare country: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => Route, { foreignKey: 'departureCityId' })
  declare departureRoutes: HasMany<typeof Route>

  @hasMany(() => Route, { foreignKey: 'arrivalCityId' })
  declare arrivalRoutes: HasMany<typeof Route>
}
