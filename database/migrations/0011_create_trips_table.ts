import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trips'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('company_id')
        .notNullable()
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE')
      table.uuid('route_id').notNullable().references('id').inTable('routes').onDelete('RESTRICT')
      table.uuid('bus_id').notNullable().references('id').inTable('buses').onDelete('RESTRICT')
      table.uuid('driver_id').notNullable().references('id').inTable('users').onDelete('RESTRICT')
      table.timestamp('departure_time').notNullable()
      table.timestamp('arrival_time').notNullable()
      table
        .enum('travel_class', ['standard', 'vip'], {
          useNative: true,
          enumName: 'trip_travel_class',
        })
        .defaultTo('standard')
        .notNullable()
      table.decimal('price', 10, 2).notNullable()
      table
        .enum('status', ['scheduled', 'in_progress', 'completed', 'cancelled'], {
          useNative: true,
          enumName: 'trip_status',
        })
        .defaultTo('scheduled')
        .notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['route_id'])
      table.index(['bus_id'])
      table.index(['driver_id'])
      table.index(['departure_time'])
      table.index(['status'])
      table.index(['bus_id', 'status', 'departure_time', 'arrival_time'])
      table.index(['driver_id', 'status', 'departure_time', 'arrival_time'])
      table.check('"arrival_time" > "departure_time"', [], 'chk_trips_arrival_after_departure')
      table.check('"price" >= 0', [], 'chk_trips_positive_price')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "trip_status"')
    this.schema.raw('DROP TYPE IF EXISTS "trip_travel_class"')
  }
}
