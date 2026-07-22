require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const migrationPath = path.join(__dirname, 'migrations', '001_create_users.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await pool.query(sql);
  console.log('Migración completada: users table creada.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
