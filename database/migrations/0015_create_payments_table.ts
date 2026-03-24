import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('booking_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('bookings')
        .onDelete('CASCADE')
      table.decimal('amount', 10, 2).notNullable()
      table
        .enum('payment_method', ['cash', 'mobile_money', 'card'], {
          useNative: true,
          enumName: 'payment_method',
        })
        .notNullable()
      table.string('operator', 50).nullable()
      table
        .enum('status', ['pending', 'success', 'failed', 'refunded'], {
          useNative: true,
          enumName: 'payment_status',
        })
        .defaultTo('pending')
        .notNullable()
      table.string('external_reference', 200).nullable().unique()
      table.timestamp('paid_at').nullable()
      table.timestamp('created_at').notNullable()

      table.check('?? > 0', ['amount'], 'chk_payments_amount')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "payment_method"')
    this.schema.raw('DROP TYPE IF EXISTS "payment_status"')
  }
}
