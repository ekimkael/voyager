import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'buses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('license_plate', 20).notNullable().unique()
      table.string('brand', 80).notNullable()
      table.string('model', 80).notNullable()
      table.integer('capacity').notNullable()
      table.integer('year').notNullable()
      table
        .enum('status', ['available', 'on_trip', 'maintenance', 'out_of_service'], {
          useNative: true,
          enumName: 'bus_status',
        })
        .defaultTo('available')
        .notNullable()
      table.date('next_maintenance_date').nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['tenant_id'])
      table.index(['status'])
      table.index(['next_maintenance_date'])
      table.check('capacity > 0', [], 'chk_buses_positive_capacity')
      table.check('"year" BETWEEN 1990 AND 2035', [], 'chk_buses_valid_year')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "bus_status"')
  }
}
