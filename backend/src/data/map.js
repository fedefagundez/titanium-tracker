const { getSystems, getRegions } = require('./systems');
const { getJumpConnections } = require('./gates');

let mapCache = null;
let mapCacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000;

function getMapData() {
  const now = Date.now();
  if (mapCache && (now - mapCacheTime) < CACHE_TTL) {
    return mapCache;
  }

  const systemsMap = getSystems();
  const regionsMap = getRegions();
  const jumpConns = getJumpConnections();

  const allSystems = [];
  for (const id in systemsMap) {
    const s = systemsMap[id];
    allSystems.push({
      id: s.id,
      name: s.name,
      region_id: s.region_id,
      region_name: s.region_name,
      constellation_id: s.constellation_id,
      security_status: s.security_status,
      security_level: s.security_level,
      x: s.x,
      y: s.y,
      z: s.z,
    });
  }

  const connections = [];
  for (const fromId in jumpConns) {
    const toSet = jumpConns[fromId];
    if (toSet instanceof Set) {
      for (const toId of toSet) {
        if (Number(fromId) < toId) {
          connections.push({ from: Number(fromId), to: toId });
        }
      }
    }
  }

  const regionsList = [];
  for (const rid in regionsMap) {
    regionsList.push({ id: Number(rid), name: regionsMap[rid] });
  }

  mapCache = {
    systems: allSystems,
    connections,
    regions: regionsList,
    system_count: allSystems.length,
    connection_count: connections.length,
  };
  mapCacheTime = now;

  console.log(`[map] ${mapCache.system_count} sistemas, ${mapCache.connection_count} conexiones cacheadas`);
  return mapCache;
}

module.exports = { getMapData };
