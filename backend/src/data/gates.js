const path = require('path');
const { parseCSVFile, downloadCSV, CACHE_DIR } = require('./csv');
const { getById } = require('./systems');

const DENORMALIZE_PATH = path.join(CACHE_DIR, 'mapDenormalize.csv');
const JUMPS_PATH = path.join(CACHE_DIR, 'mapSolarSystemJumps.csv');
const GATE_JUMPS_PATH = path.join(CACHE_DIR, 'mapJumps.csv');
const GATE_JUMPS_URL = 'https://www.fuzzwork.co.uk/dump/latest/csv/mapJumps.csv';
const STARGATE_GROUP_ID = '10';
const AU_EN_METROS = 149_597_870_700;
const GATE_JUMP_TIME = 5;
const ALIGN_TIME = 5;
const GRID_LOAD_TIME = 3;
const SERVER_LAG = 1;
const SESSION_CHANGE_TIME = 15;
const INITIAL_WARP_AU = 15;
const FINAL_WARP_AU = 15;

const SHIP_WARP_SPEEDS = {
  601: 5.0, 605: 5.0, 603: 5.0,
  10188: 8.0, 10190: 8.0, 10192: 8.0, 10186: 8.0,
  582: 5.0, 584: 5.0, 586: 5.0, 587: 5.0, 589: 5.0,
  593: 5.0, 594: 5.0, 598: 5.0, 599: 5.0,
  1622: 5.0, 1623: 5.0, 1624: 5.0, 1625: 5.0, 1626: 5.0, 1627: 5.0,
  16227: 2.75, 16228: 2.75, 16229: 2.75, 16230: 2.75, 16231: 2.75, 16232: 2.75,
  620: 3.0, 621: 3.0, 622: 3.0, 623: 3.0, 624: 3.0,
  625: 3.0, 626: 3.0, 627: 3.0, 628: 3.0, 629: 3.0, 631: 3.0,
  638: 2.0, 639: 2.0, 640: 2.0, 641: 2.0, 642: 2.0,
  643: 2.0, 644: 2.0, 645: 2.0, 648: 2.0, 649: 2.0,
  651: 2.0, 652: 2.0, 653: 2.0, 654: 2.0, 655: 2.0,
  37453: 5.0, 37454: 5.0, 37455: 5.0, 37456: 5.0,
  11400: 5.0, 11402: 5.0, 11404: 5.0, 11406: 5.0,
  11420: 3.0, 11422: 3.0, 11424: 3.0, 11426: 3.0,
  11401: 3.0, 11403: 3.0, 11405: 3.0, 11407: 3.0,
  29984: 3.0, 29986: 3.0, 29988: 3.0, 29990: 3.0,
  22456: 5.0, 22460: 5.0, 22464: 5.0, 22466: 5.0,
  22852: 3.0, 22854: 3.0, 22876: 3.0, 22878: 3.0,
  28659: 2.0, 28661: 2.0, 28665: 2.0, 28667: 2.0,
  28660: 2.0, 28662: 2.0, 28664: 2.0, 28666: 2.0,
  1944: 1.5, 1952: 1.5, 1954: 1.5, 1956: 1.5,
  28846: 1.5, 28848: 1.5, 28850: 1.5, 28852: 1.5,
};

let gates = {};
let systemGates = {};
let jumpConnections = {};
let gateConnections = {};

function getWarpSpeedByTypeId(typeId) {
  return SHIP_WARP_SPEEDS[typeId] || 3.0;
}

function findGateDistance(gate1, gate2) {
  const dx = gate2.x - gate1.x;
  const dy = gate2.y - gate1.y;
  const dz = gate2.z - gate1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function findGateByConnection(systemId, targetSystemId) {
  const gatesInSystem = systemGates[systemId] || [];
  for (const gate of gatesInSystem) {
    const connectedGateId = gateConnections[gate.id];
    if (connectedGateId && gates[connectedGateId]?.system_id === targetSystemId) {
      return gate;
    }
  }
  return null;
}

function calcularTiempoWarp(distanciaMetros, warpSpeedAU) {
  if (distanciaMetros <= 0) return 0;

  const k = warpSpeedAU;
  const j = Math.min(k / 3, 2);
  const warpDropoutSpeed = 100;
  const maxMsWarpSpeed = k * AU_EN_METROS;

  const accelDist = maxMsWarpSpeed / k;
  const decelDist = maxMsWarpSpeed / j;
  const minimumDist = accelDist + decelDist;

  let cruiseTime = 0;
  let effectiveMaxSpeed = maxMsWarpSpeed;

  if (minimumDist > distanciaMetros) {
    effectiveMaxSpeed = distanciaMetros * k * j / (k + j);
  } else {
    cruiseTime = (distanciaMetros - minimumDist) / maxMsWarpSpeed;
  }

  const accelTime = Math.log(effectiveMaxSpeed / k) / k;
  const decelTime = Math.log(effectiveMaxSpeed / warpDropoutSpeed) / j;

  return Math.ceil(accelTime + decelTime + cruiseTime);
}

function calcularTiempoWarpAU(distanciaAU, warpSpeedAU) {
  return calcularTiempoWarp(distanciaAU * AU_EN_METROS, warpSpeedAU);
}

function getSecurityLevel(systemId) {
  const sys = getById(systemId);
  if (!sys) return 'unknown';
  if (sys.security_status >= 0.5) return 'highsec';
  if (sys.security_status > 0) return 'lowsec';
  return 'nullsec';
}

function calculateSessionChanges(systemIds) {
  let changes = 0;
  for (let i = 1; i < systemIds.length; i++) {
    const prev = getSecurityLevel(systemIds[i - 1]);
    const curr = getSecurityLevel(systemIds[i]);
    if (prev !== curr) changes++;
  }
  return changes;
}

function calculateRouteTime(systemIds, warpSpeedAU, alignTime = ALIGN_TIME) {
  const hasGates = Object.keys(systemGates).length > 0;
  const hasGateConnections = Object.keys(gateConnections).length > 0;
  let totalTime = 0;
  const jumps = [];
  const debug = [];

  if (hasGates && hasGateConnections && systemIds.length > 0) {
    const firstSystem = systemIds[0];
    const firstDepartureGate = findGateByConnection(firstSystem, systemIds[1]);
    if (firstDepartureGate) {
      const firstSystemGates = systemGates[firstSystem] || [];
      let avgDist = 0;
      if (firstSystemGates.length > 0) {
        const totalDist = firstSystemGates.reduce((sum, g) => sum + findGateDistance(g, firstDepartureGate), 0);
        avgDist = totalDist / firstSystemGates.length;
      }
      const initialWarpAU = avgDist / AU_EN_METROS;
      const initialWarpTime = calcularTiempoWarpAU(initialWarpAU, warpSpeedAU);
      totalTime += alignTime + initialWarpTime;
      debug.push(`initial_warp: ${Math.round(initialWarpAU)}AU = ${initialWarpTime}s`);
    } else {
      const initialWarpTime = calcularTiempoWarpAU(INITIAL_WARP_AU, warpSpeedAU);
      totalTime += alignTime + initialWarpTime;
      debug.push(`initial_warp: ${INITIAL_WARP_AU}AU (fallback) = ${initialWarpTime}s`);
    }
  } else {
    const initialWarpTime = calcularTiempoWarpAU(INITIAL_WARP_AU, warpSpeedAU);
    totalTime += alignTime + initialWarpTime;
    debug.push(`initial_warp: ${INITIAL_WARP_AU}AU (no gates) = ${initialWarpTime}s`);
  }

  for (let i = 0; i < systemIds.length - 1; i++) {
    const fromSystem = systemIds[i];
    const toSystem = systemIds[i + 1];

    let interSystemWarpTime = 45;
    let intraSystemWarpTime = 0;
    let interDistAU = 0;
    let intraDistAU = 0;

    if (hasGates && hasGateConnections) {
      const fromGate = findGateByConnection(fromSystem, toSystem);
      const toGate = findGateByConnection(toSystem, fromSystem);

      if (fromGate && toGate) {
        const interDist = findGateDistance(fromGate, toGate);
        interDistAU = interDist / AU_EN_METROS;
        if (interDist > 0) interSystemWarpTime = calcularTiempoWarp(interDist, warpSpeedAU);

        if (i > 0) {
          const prevSystem = systemIds[i - 1];
          const arrivalGate = findGateByConnection(fromSystem, prevSystem);
          const departureGate = findGateByConnection(fromSystem, toSystem);

          if (arrivalGate && departureGate && arrivalGate.id !== departureGate.id) {
            const intraDist = findGateDistance(arrivalGate, departureGate);
            intraDistAU = intraDist / AU_EN_METROS;
            if (intraDist > 0) intraSystemWarpTime = calcularTiempoWarp(intraDist, warpSpeedAU) + alignTime;
          }
        }
      }
    }

    const jumpTotal = alignTime + interSystemWarpTime + GATE_JUMP_TIME + GRID_LOAD_TIME + SERVER_LAG + intraSystemWarpTime;
    totalTime += jumpTotal;

    debug.push(`${fromSystem}→${toSystem}: inter=${Math.round(interDistAU)}AU/${interSystemWarpTime}s intra=${Math.round(intraDistAU)}AU/${intraSystemWarpTime}s total=${jumpTotal}s`);

    jumps.push({
      from: fromSystem,
      to: toSystem,
      warp_time: interSystemWarpTime,
      intra_warp_time: intraSystemWarpTime,
      gate_time: GATE_JUMP_TIME,
      align_time: alignTime,
    });
  }

  if (hasGates && hasGateConnections && systemIds.length > 0) {
    const lastSystem = systemIds[systemIds.length - 1];
    const lastArrivalGate = findGateByConnection(lastSystem, systemIds[systemIds.length - 2]);
    if (lastArrivalGate) {
      const lastSystemGates = systemGates[lastSystem] || [];
      let avgDist = 0;
      if (lastSystemGates.length > 0) {
        const totalDist = lastSystemGates.reduce((sum, g) => sum + findGateDistance(g, lastArrivalGate), 0);
        avgDist = totalDist / lastSystemGates.length;
      }
      const finalWarpAU = avgDist / AU_EN_METROS;
      const finalWarpTime = calcularTiempoWarpAU(finalWarpAU, warpSpeedAU);
      totalTime += alignTime + finalWarpTime;
      debug.push(`final_warp: ${Math.round(finalWarpAU)}AU = ${finalWarpTime}s`);
    } else {
      const finalWarpTime = calcularTiempoWarpAU(FINAL_WARP_AU, warpSpeedAU);
      totalTime += alignTime + finalWarpTime;
      debug.push(`final_warp: ${FINAL_WARP_AU}AU (fallback) = ${finalWarpTime}s`);
    }
  } else {
    const finalWarpTime = calcularTiempoWarpAU(FINAL_WARP_AU, warpSpeedAU);
    totalTime += alignTime + finalWarpTime;
    debug.push(`final_warp: ${FINAL_WARP_AU}AU (no gates) = ${finalWarpTime}s`);
  }

  const sessionChanges = calculateSessionChanges(systemIds);
  const sessionTime = sessionChanges * SESSION_CHANGE_TIME;
  totalTime += sessionTime;
  debug.push(`session_changes: ${sessionChanges} = ${sessionTime}s`);

  console.log('[calculateRouteTime] Debug:', debug.join(' | '));

  return {
    total_seconds: totalTime,
    jumps,
    breakdown: {
      initial_warp: debug[0],
      final_warp: debug[debug.length - 2],
      session_changes: sessionChanges,
      session_change_time: sessionTime,
    },
    debug,
  };
}

function formatTime(seconds) {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

async function loadGates() {
  await downloadCSV(GATE_JUMPS_URL, GATE_JUMPS_PATH, 'mapJumps.csv');

  if (require('fs').existsSync(DENORMALIZE_PATH)) {
    const records = await parseCSVFile(DENORMALIZE_PATH);
    gates = {};
    systemGates = {};

    for (const row of records) {
      if (row.groupID !== STARGATE_GROUP_ID) continue;
      const id = Number(row.itemID);
      const systemId = Number(row.solarSystemID);

      gates[id] = {
        id,
        name: row.itemName || row.name || `Stargate ${id}`,
        system_id: systemId,
        x: parseFloat(row.x) || 0,
        y: parseFloat(row.y) || 0,
        z: parseFloat(row.z) || 0,
      };

      if (!systemGates[systemId]) systemGates[systemId] = [];
      systemGates[systemId].push(gates[id]);
    }
    console.log(`[gates] ${Object.keys(gates).length} gates en ${Object.keys(systemGates).length} sistemas`);
  }

  if (require('fs').existsSync(JUMPS_PATH)) {
    const records = await parseCSVFile(JUMPS_PATH);
    jumpConnections = {};

    for (const row of records) {
      const from = Number(row.fromSolarSystemID);
      const to = Number(row.toSolarSystemID);
      if (!jumpConnections[from]) jumpConnections[from] = new Set();
      if (!jumpConnections[to]) jumpConnections[to] = new Set();
      jumpConnections[from].add(to);
      jumpConnections[to].add(from);
    }
    console.log(`[gates] ${Object.keys(jumpConnections).length} sistemas con conexiones de salto`);
  }

  if (require('fs').existsSync(GATE_JUMPS_PATH)) {
    const records = await parseCSVFile(GATE_JUMPS_PATH);
    gateConnections = {};

    for (const row of records) {
      const from = Number(row.stargateID);
      const to = Number(row.destinationID);
      if (from && to) {
        gateConnections[from] = to;
        gateConnections[to] = from;
      }
    }
    console.log(`[gates] ${Object.keys(gateConnections).length} conexiones puerta-a-puerta cargadas`);
  }
}

module.exports = {
  loadGates,
  calculateRouteTime,
  formatTime,
  getWarpSpeedByTypeId,
  getSystemGates: () => systemGates,
  getGates: () => gates,
  getJumpConnections: () => jumpConnections,
  getGateConnections: () => gateConnections,
};
