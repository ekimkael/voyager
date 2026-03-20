import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('name', 255).notNullable()
      table.string('country', 255).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.unique(['name', 'country'])
    })

    // Cities are global — bypass RLS so all tenants can access
    this.schema.raw(`
      ALTER TABLE ${this.tableName} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY cities_global_access ON ${this.tableName} USING (true) WITH CHECK (true);
    `)
  }

  async down() {
    this.schema.raw(`DROP POLICY IF EXISTS cities_global_access ON ${this.tableName}`)
    this.schema.dropTable(this.tableName)
  }
}
