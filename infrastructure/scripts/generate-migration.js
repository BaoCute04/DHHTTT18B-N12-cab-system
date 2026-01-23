#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function pad(n){return String(n).padStart(2,'0')}

function ts() {
  const d = new Date()
  const YYYY = d.getFullYear()
  const MM = pad(d.getMonth()+1)
  const DD = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())
  return `${YYYY}${MM}${DD}${hh}${mm}${ss}`
}

function sanitize(name){
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\-]/g, '')
}

async function main(){
  const [, , rawName] = process.argv
  if (!rawName) {
    console.error('Usage: node generate-migration.js my_migration_name')
    process.exit(1)
  }

  const name = sanitize(rawName)
  const migrationsDir = path.resolve(__dirname, '..', 'migrations')
  if (!fs.existsSync(migrationsDir)) fs.mkdirSync(migrationsDir, { recursive: true })

  const filename = `${ts()}_${name}.js`
  const filepath = path.join(migrationsDir, filename)

  const content = `/**\n * Migration: ${name}\n * Created: ${new Date().toISOString()}\n */\n\nmodule.exports.up = async function(db) {\n  // implement this migration, e.g. run SQL or use query builder\n}\n\nmodule.exports.down = async function(db) {\n  // implement rollback\n}\n` 

  fs.writeFileSync(filepath, content, { encoding: 'utf8' })
  console.log('Created migration:', filepath)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
