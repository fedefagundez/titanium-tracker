const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

const CACHE_DIR = path.join(__dirname, '..', '..', '.cache');
const ONE_DAY = 24 * 60 * 60 * 1000;

function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    const stream = fs.createReadStream(filePath).pipe(
      parse({ columns: true, skip_empty_lines: true, trim: true })
    );
    stream.on('data', (record) => records.push(record));
    stream.on('end', () => resolve(records));
    stream.on('error', reject);
  });
}

async function downloadCSV(url, filePath, label) {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  const exists = fs.existsSync(filePath);
  const age = exists ? (Date.now() - fs.statSync(filePath).mtimeMs) : Infinity;

  if (exists && age < ONE_DAY) {
    console.log(`[csv] Usando ${label} cacheado`);
    return;
  }

  console.log(`[csv] Descargando ${label} de Fuzzwork...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Error descargando ${label}: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  console.log(`[csv] ${label} descargado y guardado en`, CACHE_DIR);
}

module.exports = { parseCSVFile, downloadCSV, CACHE_DIR };
