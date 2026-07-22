const express = require('express');
const { getThreats } = require('../data/threats');

const router = express.Router();

router.post('/threats', async (req, res) => {
  const { system_ids } = req.body;

  if (!Array.isArray(system_ids) || system_ids.length === 0) {
    return res.status(400).json({ error: 'system_ids debe ser un array de IDs' });
  }

  if (system_ids.length > 50) {
    return res.status(400).json({ error: 'Máximo 50 sistemas por request' });
  }

  try {
    const threats = await getThreats(system_ids);
    res.json(threats);
  } catch (err) {
    console.error('[threats] Error:', err);
    res.status(500).json({ error: 'Error obteniendo amenazas' });
  }
});

module.exports = router;
