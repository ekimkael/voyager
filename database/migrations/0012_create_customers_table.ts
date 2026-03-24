import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'customers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('company_id')
        .notNullable()
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE')
      table.string('first_name', 80).notNullable()
      table.string('last_name', 80).notNullable()
      table.string('phone', 20).notNullable()
      table.string('email', 150).nullable()
      table
        .enum('sex', ['male', 'female'], {
          useNative: true,
          enumName: 'sex',
        })
        .nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['company_id', 'phone'])
      table.index(['company_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "sex"')
  }
}
