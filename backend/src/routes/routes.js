const express = require('express');
const { getById, getNames } = require('../data/systems');
const { calculateRouteTime, getWarpSpeedByTypeId } = require('../data/gates');

const router = express.Router();

const ESI_ROUTE_URL = 'https://esi.evetech.net/v1/route';

const FLAG_MAP = {
  safe: 'secure',
  secure: 'secure',
  fast: 'shortest',
  shortest: 'shortest',
  dangerous: 'insecure',
  insecure: 'insecure',
};

router.post('/calculate', async (req, res) => {
  const { origin_id, destination_id, flag, avoid_ids, ship_type_id, warp_speed, align_time } = req.body;

  if (!origin_id || !destination_id) {
    return res.status(400).json({ error: 'origin_id y destination_id son requeridos' });
  }

  const origin = getById(origin_id);
  const dest = getById(destination_id);

  if (!origin) return res.status(400).json({ error: `Sistema origen ${origin_id} no encontrado` });
  if (!dest) return res.status(400).json({ error: `Sistema destino ${origin_id} no encontrado` });

  const esiFlag = FLAG_MAP[flag] || 'shortest';
  const warpSpeed = warp_speed || (ship_type_id ? getWarpSpeedByTypeId(ship_type_id) : 3.0);
  const alignTime = align_time || 5;

  try {
    let url = `${ESI_ROUTE_URL}/${origin_id}/${destination_id}/?flag=${esiFlag}`;
    if (avoid_ids && avoid_ids.length > 0) {
      const avoidParam = avoid_ids.map((id) => `avoid=${id}`).join('&');
      url += `&${avoidParam}`;
    }

    const routeResp = await fetch(url);
    if (!routeResp.ok) {
      const err = await routeResp.text();
      console.error('[routes] ESI error:', routeResp.status, err);
      return res.status(routeResp.status).json({ error: 'No se pudo calcular la ruta desde ESI' });
    }

    const routeIds = await routeResp.json();
    const route = getNames(routeIds);

    const timeData = calculateRouteTime(routeIds, warpSpeed, alignTime);

    console.log('=== ROUTE DEBUG ===');
    console.log('Systems:', routeIds.join(' → '));
    console.log('Warp speed:', warpSpeed, 'AU/s');
    console.log('Align time:', alignTime, 's');
    console.log('Breakdown:', JSON.stringify(timeData.breakdown));
    console.log('Jumps:');
    timeData.jumps.forEach((j, i) => {
      console.log(`  ${i}: ${j.from}→${j.to} inter=${j.warp_time}s intra=${j.intra_warp_time}s`);
    });
    console.log('Total:', timeData.total_seconds, 'seconds =', Math.floor(timeData.total_seconds / 60) + 'm ' + (timeData.total_seconds % 60) + 's');
    console.log('===================');

    res.json({
      origin: { id: origin.id, name: origin.name },
      destination: { id: dest.id, name: dest.name },
      flag: esiFlag,
      jump_count: routeIds.length - 1,
      estimated_time_seconds: timeData.total_seconds,
      warp_speed: warpSpeed,
      align_time: alignTime,
      ship_type_id: ship_type_id || null,
      route,
      time_breakdown: timeData.breakdown,
      jumps_detail: timeData.jumps,
      debug: timeData.debug,
    });
  } catch (err) {
    console.error('[routes] Error calculando ruta:', err);
    res.status(500).json({ error: 'Error interno calculando ruta' });
  }
});

module.exports = router;
