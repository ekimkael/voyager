import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'routes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('company_id')
        .notNullable()
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE')
      table.string('code', 50).notNullable()
      table
        .uuid('departure_city_id')
        .notNullable()
        .references('id')
        .inTable('cities')
        .onDelete('RESTRICT')
      table
        .uuid('arrival_city_id')
        .notNullable()
        .references('id')
        .inTable('cities')
        .onDelete('RESTRICT')
      table.decimal('distance_km', 10, 2).notNullable()
      table.integer('estimated_duration_minutes').notNullable()
      table
        .enum('status', ['active', 'inactive'], {
          useNative: true,
          enumName: 'route_status',
        })
        .defaultTo('active')
        .notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['company_id', 'code'])
      table.check('departure_city_id != arrival_city_id', [], 'chk_routes_different_cities')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "route_status"')
  }
}
