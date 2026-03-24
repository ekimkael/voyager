import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'passengers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('booking_id')
        .notNullable()
        .references('id')
        .inTable('bookings')
        .onDelete('CASCADE')
      table.string('first_name', 80).notNullable()
      table.string('last_name', 80).notNullable()
      table.string('phone', 20).nullable()
      table
        .enum('id_document_type', ['cni', 'passport', 'permit', 'other'], {
          useNative: true,
          enumName: 'id_document_type',
        })
        .nullable()
      table.string('id_document_number', 50).nullable()
      table.integer('seat_number').notNullable()
      table.string('code', 6).notNullable().unique()
      table.uuid('qr_code').notNullable().unique().defaultTo(this.raw('gen_random_uuid()'))
      table
        .enum('status', ['pending', 'boarded'], {
          useNative: true,
          enumName: 'passenger_status',
        })
        .defaultTo('pending')
        .notNullable()
      table.timestamp('boarded_at').nullable()
      table.timestamp('created_at').notNullable()

      table.index(['booking_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "passenger_status"')
    this.schema.raw('DROP TYPE IF EXISTS "id_document_type"')
  }
}
