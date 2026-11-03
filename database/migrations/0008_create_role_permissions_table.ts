import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'role_permissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE')
      table
        .uuid('permission_id')
        .notNullable()
        .references('id')
        .inTable('permissions')
        .onDelete('CASCADE')
      table.uuid('policy_id').nullable()
      table.timestamp('granted_at').notNullable()

      table.unique(['role_id', 'permission_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
