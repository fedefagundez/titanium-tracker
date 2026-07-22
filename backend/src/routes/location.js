const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const EVE_TOKEN_URL = 'https://login.eveonline.com/v2/oauth/token';

async function refreshAccessToken(user) {
  const resp = await fetch(EVE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${process.env.EVE_SSO_CLIENT_ID}:${process.env.EVE_SSO_CLIENT_SECRET}`).toString('base64'),
      Host: 'login.eveonline.com',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: user.eve_refresh_token,
    }).toString(),
  });

  if (!resp.ok) throw new Error('Error refreshing token');
  const data = await resp.json();

  await pool.query(
    `UPDATE users SET eve_access_token=$1, eve_refresh_token=$2, token_expires_at=NOW() + INTERVAL '${data.expires_in} seconds'
     WHERE id=$3`,
    [data.access_token, data.refresh_token, user.id]
  );

  return data.access_token;
}

async function getAccessToken(userId) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = result.rows[0];
  if (!user) throw new Error('Usuario no encontrado');

  if (user.token_expires_at && new Date(user.token_expires_at) > new Date(Date.now() + 60000)) {
    return user.eve_access_token;
  }

  return refreshAccessToken(user);
}

router.get('/location', requireAuth, async (req, res) => {
  try {
    const characterId = req.user.eveCharacterId;
    const accessToken = await getAccessToken(req.user.id);

    const resp = await fetch(`https://esi.evetech.net/latest/characters/${characterId}/location/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('[location] ESI error:', resp.status, err);
      return res.status(resp.status).json({ error: 'Error obteniendo ubicación desde ESI', detail: err });
    }

    const data = await resp.json();
    console.log('[location] Ubicación obtenida:', data);
    res.json(data);
  } catch (err) {
    console.error('[location] Error:', err);
    res.status(500).json({ error: 'Error obteniendo ubicación' });
  }
});

module.exports = router;
