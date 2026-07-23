const express = require('express');
const router = express.Router();
const { getMapData } = require('../data/map');

router.get('/data', (req, res) => {
  try {
    const data = getMapData();
    res.json(data);
  } catch (err) {
    console.error('[map] Error getting map data:', err);
    res.status(500).json({ error: 'Error obteniendo datos del mapa' });
  }
});

module.exports = router;
