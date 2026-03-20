import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.uuid('franchise_id').nullable().references('id').inTable('franchises').onDelete('SET NULL')
      table.string('phone', 20).nullable()
      table.index(['franchise_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('franchise_id')
      table.dropColumn('phone')
    })
  }
}