import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bookings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('company_id')
        .notNullable()
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE')
      table.uuid('trip_id').notNullable().references('id').inTable('trips').onDelete('RESTRICT')
      table
        .uuid('customer_id')
        .nullable()
        .references('id')
        .inTable('customers')
        .onDelete('RESTRICT')
      table.uuid('agent_id').nullable().references('id').inTable('users').onDelete('RESTRICT')
      table
        .uuid('franchise_id')
        .nullable()
        .references('id')
        .inTable('franchises')
        .onDelete('RESTRICT')
      table.decimal('total_amount', 10, 2).notNullable().defaultTo(0)
      table
        .enum('status', ['pending', 'confirmed', 'cancelled'], {
          useNative: true,
          enumName: 'booking_status',
        })
        .defaultTo('pending')
        .notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['trip_id'])
      table.index(['customer_id'])
      table.index(['company_id'])
      table.index(['status'])
      table.check('?? >= 0', ['total_amount'], 'chk_bookings_total_amount')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "booking_status"')
  }
}
