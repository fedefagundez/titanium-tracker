const ZKB_API = 'https://zkillboard.com/api';
const CACHE_TTL = 60 * 1000;

const INTERDICTOR_TYPE_IDS = new Set([22456, 22460, 22464, 22466]);
const HEAVY_INTERDICTOR_TYPE_IDS = new Set([22852, 22876, 22854, 22878]);
const SMARTBOMB_TYPE_IDS = new Set([
  3650, 3653, 3656, 3659,
  3419, 3422, 3425, 3428,
  3651, 3654, 3657, 3660,
  3652, 3655, 3658, 3661,
  3662, 3665, 3644, 3647, 3663, 3666,
]);

const threatCache = new Map();

function resolveGateDestination(locationId, gatesData, gateConns, systemsData) {
  const gateId = Number(locationId);
  const gate = gatesData[gateId];
  if (!gate) return null;

  const connectedGateId = gateConns[gateId];
  if (!connectedGateId) return null;

  const connectedGate = gatesData[connectedGateId];
  if (!connectedGate) return null;

  const destSystem = systemsData[String(connectedGate.system_id)];
  return destSystem ? destSystem.name : null;
}

function getCached(systemIds) {
  const key = systemIds.sort().join(',');
  const cached = threatCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  threatCache.delete(key);
  return null;
}

function setCache(systemIds, data) {
  const key = systemIds.sort().join(',');
  threatCache.set(key, { data, timestamp: Date.now() });
}

function isAtStargate(kill) {
  const loc = kill.zkb?.locationID;
  if (!loc) return false;
  return String(loc).startsWith('500');
}

function classifyAttackers(kill) {
  const hasDictors = kill.attackers?.some(a => INTERDICTOR_TYPE_IDS.has(a.ship_type_id)) || false;
  const hasHictors = kill.attackers?.some(a => HEAVY_INTERDICTOR_TYPE_IDS.has(a.ship_type_id)) || false;
  return { hasDictors, hasHictors };
}

function classifyWeapon(kill) {
  if (kill.attackers?.some(a => SMARTBOMB_TYPE_IDS.has(a.weapon_type_id))) return true;
  if (kill.victim?.items?.some(item => SMARTBOMB_TYPE_IDS.has(item.item_type_id))) return true;
  return false;
}

function buildGateAggregates(gateKills) {
  const gatesByName = {};
  for (const kill of gateKills) {
    const { hasDictors, hasHictors } = classifyAttackers(kill);
    const hasSmartbombs = classifyWeapon(kill);
    const locId = String(kill.zkb?.locationID || 'unknown');

    if (!gatesByName[locId]) {
      gatesByName[locId] = { count: 0, has_dictors: false, has_hictors: false, has_smartbombs: false };
    }
    gatesByName[locId].count++;
    if (hasDictors) gatesByName[locId].has_dictors = true;
    if (hasHictors) gatesByName[locId].has_hictors = true;
    if (hasSmartbombs) gatesByName[locId].has_smartbombs = true;
  }
  return gatesByName;
}

function resolveThreatLevel(killCount, hasDictors, hasHictors, hasSmartbombs) {
  if (hasDictors || hasHictors || hasSmartbombs) return 'danger';
  if (killCount >= 3) return 'danger';
  if (killCount >= 1) return 'warning';
  return 'safe';
}

function buildGateDetails(gatesByName, gatesData, gateConns, systemsData) {
  return Object.entries(gatesByName).map(([locId, info]) => ({
    gate_id: locId,
    destination: resolveGateDestination(locId, gatesData, gateConns, systemsData),
    kills: info.count,
    has_dictors: info.has_dictors,
    has_hictors: info.has_hictors,
    has_smartbombs: info.has_smartbombs,
  }));
}

function analyzeKills(kills, gatesData, gateConns, systemsData) {
  const gateKills = kills.filter(isAtStargate);
  const killCount = gateKills.length;

  let hasDictors = false;
  let hasHictors = false;
  let hasSmartbombs = false;

  for (const kill of gateKills) {
    const a = classifyAttackers(kill);
    if (a.hasDictors) hasDictors = true;
    if (a.hasHictors) hasHictors = true;
    if (classifyWeapon(kill)) hasSmartbombs = true;
  }

  const gateAggregates = buildGateAggregates(gateKills);

  return {
    kill_count: killCount,
    has_dictors: hasDictors,
    has_hictors: hasHictors,
    has_smartbombs: hasSmartbombs,
    threat_level: resolveThreatLevel(killCount, hasDictors, hasHictors, hasSmartbombs),
    gate_details: buildGateDetails(gateAggregates, gatesData, gateConns, systemsData),
  };
}

async function fetchKillsForSystem(systemId) {
  const url = `${ZKB_API}/kills/solarSystemID/${systemId}/pastSeconds/3600/`;
  const resp = await fetch(url, {
    headers: {
      'Accept-Encoding': 'gzip',
      'User-Agent': 'TitaniumTracker/1.0',
    },
  });
  if (!resp.ok) return [];
  return resp.json();
}

function loadGateData() {
  const { getGates, getGateConnections } = require('./gates');
  const { getSystems } = require('./systems');
  return {
    gatesData: getGates(),
    gateConns: getGateConnections(),
    systemsData: getSystems(),
  };
}

async function getThreats(systemIds) {
  const cached = getCached(systemIds);
  if (cached) return cached;

  const { gatesData, gateConns, systemsData } = loadGateData();

  const results = {};
  const batchSize = 5;
  const batches = [];
  for (let i = 0; i < systemIds.length; i += batchSize) {
    batches.push(systemIds.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const promises = batch.map(async (id) => {
      try {
        const kills = await fetchKillsForSystem(id);
        results[id] = analyzeKills(kills, gatesData, gateConns, systemsData);
      } catch {
        results[id] = { kill_count: 0, has_dictors: false, has_hictors: false, has_smartbombs: false, threat_level: 'unknown', gate_details: [] };
      }
    });
    await Promise.all(promises);
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(r => setTimeout(r, 1100));
    }
  }

  setCache(systemIds, results);
  return results;
}

module.exports = { getThreats };
