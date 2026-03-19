import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_role_assignments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .uuid('role_id')
        .notNullable()
        .references('id')
        .inTable('roles')
        .onDelete('CASCADE')
      table
        .uuid('resource_id')
        .nullable()
      table
        .uuid('granted_by')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.timestamp('expires_at').nullable()
      table.boolean('is_temporary').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()
    })

    // Partial unique indexes for uniqueness with nullable resource_id
    this.schema.raw(`
      CREATE UNIQUE INDEX user_role_global_unique
      ON user_role_assignments (user_id, role_id)
      WHERE resource_id IS NULL
    `)
    this.schema.raw(`
      CREATE UNIQUE INDEX user_role_resource_unique
      ON user_role_assignments (user_id, role_id, resource_id)
      WHERE resource_id IS NOT NULL
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
