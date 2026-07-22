const express = require('express');
const { getById, getNames } = require('../data/systems');

const router = express.Router();

const ESI_ROUTE_URL = 'https://esi.evetech.net/v1/route';
const ESI_NAMES_URL = 'https://esi.evetech.net/v2/universe/names';

const FLAG_MAP = {
  safe: 'secure',
  secure: 'secure',
  fast: 'shortest',
  shortest: 'shortest',
  dangerous: 'insecure',
  insecure: 'insecure',
};

router.post('/calculate', async (req, res) => {
  const { origin_id, destination_id, flag, avoid_ids } = req.body;

  if (!origin_id || !destination_id) {
    return res.status(400).json({ error: 'origin_id y destination_id son requeridos' });
  }

  const origin = getById(origin_id);
  const dest = getById(destination_id);

  if (!origin) return res.status(400).json({ error: `Sistema origen ${origin_id} no encontrado` });
  if (!dest) return res.status(400).json({ error: `Sistema destino ${destination_id} no encontrado` });

  const esiFlag = FLAG_MAP[flag] || 'shortest';

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

    res.json({
      origin: { id: origin.id, name: origin.name },
      destination: { id: dest.id, name: dest.name },
      flag: esiFlag,
      jump_count: routeIds.length - 1,
      route,
    });
  } catch (err) {
    console.error('[routes] Error calculando ruta:', err);
    res.status(500).json({ error: 'Error interno calculando ruta' });
  }
});

module.exports = router;
