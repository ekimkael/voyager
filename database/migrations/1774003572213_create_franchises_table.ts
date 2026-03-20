import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'franchises'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('RESTRICT')
      table.string('name', 100).notNullable()
      table.uuid('city_id').notNullable().references('id').inTable('cities').onDelete('RESTRICT')
      table.text('address').notNullable()
      table.string('phone', 20).nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['tenant_id', 'name'])
      table.index(['tenant_id'])
      table.index(['city_id'])
      table.index(['active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}