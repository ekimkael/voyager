import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.dropTableIfExists(this.tableName)

    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE')
      table.string('first_name').notNullable()
      table.string('last_name').notNullable()
      table.string('email', 254).notNullable()
      table.string('password').notNullable()
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

      table.unique(['tenant_id', 'email'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "user_status"')
  }
}
