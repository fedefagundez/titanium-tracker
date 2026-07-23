const path = require('path');
const { parseCSVFile, downloadCSV, CACHE_DIR } = require('./csv');

const CSV_URL = 'https://www.fuzzwork.co.uk/dump/latest/csv/mapSolarSystems.csv';
const REGIONS_URL = 'https://www.fuzzwork.co.uk/dump/latest/csv/mapRegions.csv';
const CSV_PATH = path.join(CACHE_DIR, 'mapSolarSystems.csv');
const REGIONS_PATH = path.join(CACHE_DIR, 'mapRegions.csv');

let systems = {};
let regions = {};

function classifySecurity(status) {
  if (status >= 0.5) return 'highsec';
  if (status > 0) return 'lowsec';
  return 'nullsec';
}

async function loadSystems() {
  await downloadCSV(CSV_URL, CSV_PATH, 'mapSolarSystems.csv');
  await downloadCSV(REGIONS_URL, REGIONS_PATH, 'mapRegions.csv');

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
      x: parseFloat(row.x) || 0,
      y: parseFloat(row.y) || 0,
      z: parseFloat(row.z) || 0,
    };
  }
  console.log(`[systems] ${Object.keys(systems).length} sistemas, ${Object.keys(regions).length} regiones cargadas`);
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
