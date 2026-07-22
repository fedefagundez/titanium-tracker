const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

const CSV_URL = 'https://www.fuzzwork.co.uk/dump/latest/csv/mapSolarSystems.csv';
const REGIONS_URL = 'https://www.fuzzwork.co.uk/dump/latest/csv/mapRegions.csv';
const CACHE_DIR = path.join(__dirname, '..', '..', '.cache');
const CSV_PATH = path.join(CACHE_DIR, 'mapSolarSystems.csv');
const REGIONS_PATH = path.join(CACHE_DIR, 'mapRegions.csv');

let systems = {};
let regions = {};

function classifySecurity(status) {
  if (status >= 0.5) return 'highsec';
  if (status > 0) return 'lowsec';
  return 'nullsec';
}

async function downloadCSV() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  const exists = fs.existsSync(CSV_PATH);
  const regionsExist = fs.existsSync(REGIONS_PATH);
  const age = exists ? (Date.now() - fs.statSync(CSV_PATH).mtimeMs) : Infinity;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  if (exists && regionsExist && age < ONE_DAY) {
    console.log('[systems] Usando CSV cacheado');
    return;
  }

  console.log('[systems] Descargando mapSolarSystems.csv de Fuzzwork...');
  const resp = await fetch(CSV_URL);
  if (!resp.ok) throw new Error(`Error descargando CSV: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(CSV_PATH, buffer);

  console.log('[systems] Descargando mapRegions.csv...');
  const regionsResp = await fetch(REGIONS_URL);
  if (!regionsResp.ok) throw new Error(`Error descargando regions CSV: ${regionsResp.status}`);
  const regionsBuffer = Buffer.from(await regionsResp.arrayBuffer());
  fs.writeFileSync(REGIONS_PATH, regionsBuffer);

  console.log('[systems] CSVs descargados y guardados en', CACHE_DIR);
}

async function loadSystems() {
  await downloadCSV();

  const regionRecords = await parseCSVFile(REGIONS_PATH);
  regions = {};
  for (const row of regionRecords) {
    if (row.regionID) regions[row.regionID] = row.regionName;
  }

  const records = await parseCSVFile(CSV_PATH);

  systems = {};
  for (const row of records) {
    const id = row.solarSystemID;
    if (!id) continue;
    systems[id] = {
      id: Number(id),
      name: row.solarSystemName,
      region_id: Number(row.regionID),
      region_name: regions[row.regionID] || 'Unknown',
      constellation_id: Number(row.constellationID),
      security_status: parseFloat(row.security) || 0,
      security_class: row.securityClass || '',
      security_level: classifySecurity(parseFloat(row.security) || 0),
    };
  }
  console.log(`[systems] ${Object.keys(systems).length} sistemas, ${Object.keys(regions).length} regiones cargadas`);
}

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

function search(query, limit = 10) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results = [];
  for (const id in systems) {
    const s = systems[id];
    if (s.name.toLowerCase().startsWith(q)) {
      results.push(s);
      if (results.length >= limit) break;
    }
  }
  return results;
}

function getById(id) {
  return systems[String(id)] || null;
}

function getNames(ids) {
  return ids.map((id) => {
    const s = systems[String(id)];
    return s
      ? { id: s.id, name: s.name, region_name: s.region_name, security_status: s.security_status, security_level: s.security_level }
      : { id, name: `Unknown (${id})`, region_name: 'Unknown', security_status: 0, security_level: 'unknown' };
  });
}

module.exports = { loadSystems, search, getById, getNames };
