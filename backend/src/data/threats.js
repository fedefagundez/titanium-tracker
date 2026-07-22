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
  const locStr = String(loc);
  return locStr.startsWith('500');
}

function classifyAttackers(kill) {
  const hasDictors = kill.attackers?.some((a) => INTERDICTOR_TYPE_IDS.has(a.ship_type_id)) || false;
  const hasHictors = kill.attackers?.some((a) => HEAVY_INTERDICTOR_TYPE_IDS.has(a.ship_type_id)) || false;
  return { hasDictors, hasHictors };
}

function classifyWeapon(kill) {
  if (kill.attackers?.some((a) => SMARTBOMB_TYPE_IDS.has(a.weapon_type_id))) return true;
  if (kill.victim?.items?.some((item) => SMARTBOMB_TYPE_IDS.has(item.item_type_id))) return true;
  return false;
}

function analyzeKills(kills) {
  const gateKills = kills.filter(isAtStargate);
  const killCount = gateKills.length;

  let hasDictors = false;
  let hasHictors = false;
  let hasSmartbombs = false;

  for (const kill of gateKills) {
    const { hasDictors: d, hasHictors: h } = classifyAttackers(kill);
    if (d) hasDictors = true;
    if (h) hasHictors = true;
    if (classifyWeapon(kill)) hasSmartbombs = true;
  }

  let threatLevel = 'safe';
  if (hasDictors || hasHictors || hasSmartbombs) {
    threatLevel = 'danger';
  } else if (killCount >= 3) {
    threatLevel = 'danger';
  } else if (killCount >= 1) {
    threatLevel = 'warning';
  }

  return {
    kill_count: killCount,
    has_dictors: hasDictors,
    has_hictors: hasHictors,
    has_smartbombs: hasSmartbombs,
    threat_level: threatLevel,
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

async function getThreats(systemIds) {
  const cached = getCached(systemIds);
  if (cached) return cached;

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
        results[id] = analyzeKills(kills);
      } catch {
        results[id] = { kill_count: 0, has_dictors: false, has_hictors: false, has_smartbombs: false, threat_level: 'unknown' };
      }
    });
    await Promise.all(promises);
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  setCache(systemIds, results);
  return results;
}

module.exports = { getThreats };
