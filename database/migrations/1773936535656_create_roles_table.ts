import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('tenant_id')
        .notNullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE')
      table
        .uuid('parent_role_id')
        .nullable()
        .references('id')
        .inTable('roles')
        .onDelete('SET NULL')
      table.string('name').notNullable()
      table
        .enum('scope', ['global', 'resource'], {
          useNative: true,
          enumName: 'role_scope',
          existsCheck: false,
        })
        .defaultTo('global')
        .notNullable()
      table.boolean('is_system').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['tenant_id', 'name'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP TYPE IF EXISTS "role_scope"')
  }
}
