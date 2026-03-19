import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tenants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('name').notNullable()
      table.string('slug').notNullable().unique()
      table
        .enum('plan', ['free', 'pro', 'enterprise'], {
          useNative: true,
          enumName: 'tenant_plan',
          existsCheck: false,
        })
        .defaultTo('free')
        .notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "tenant_plan"')
  }
}
