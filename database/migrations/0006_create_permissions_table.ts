import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'permissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('resource').notNullable()
      table.string('action').notNullable()
      table.text('description').nullable()
      table.boolean('is_sensitive').defaultTo(false).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['resource', 'action'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
