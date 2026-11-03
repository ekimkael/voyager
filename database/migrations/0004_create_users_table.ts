import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('company_id')
        .notNullable()
        .references('id')
        .inTable('companies')
        .onDelete('CASCADE')
      table
        .uuid('franchise_id')
        .nullable()
        .references('id')
        .inTable('franchises')
        .onDelete('SET NULL')
      table.string('first_name').notNullable()
      table.string('last_name').notNullable()
      table.string('email', 254).notNullable()
      table.string('password').notNullable()
      table.string('phone', 20).nullable()
      table.string('external_id').nullable()
      table
        .enum('status', ['active', 'inactive', 'suspended'], {
          useNative: true,
          enumName: 'user_status',
        })
        .defaultTo('active')
        .notNullable()
      table.boolean('mfa_enabled').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['company_id', 'email'])
      table.index(['franchise_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "user_status"')
  }
}
