# Migrations

Place migration files here. Migration files are plain Node.js modules that export `up` and `down` async functions.

Example filename: `20260123123045_add_users_table.js`

Run the generator to create a new migration:

```bash
# from repository root
node infrastructure/scripts/generate-migration.js add_users_table
```

The generated file will include `module.exports.up` and `module.exports.down` templates.
