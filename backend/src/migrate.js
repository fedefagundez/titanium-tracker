require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    console.log(`Migración completada: ${file}`);
  }

  console.log('Todas las migraciones ejecutadas.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
