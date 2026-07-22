const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const EVE_AUTH_URL = 'https://login.eveonline.com/v2/oauth/authorize';
const EVE_TOKEN_URL = 'https://login.eveonline.com/v2/oauth/token';
const EVE_VERIFY_URL = 'https://login.eveonline.com/oauth/verify';

const pendingLogins = new Map();

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

router.get('/eve/login', (req, res) => {
  const state = base64url(crypto.randomBytes(16));
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());

  pendingLogins.set(state, { codeVerifier, createdAt: Date.now() });
  for (const [key, val] of pendingLogins) {
    if (Date.now() - val.createdAt > 10 * 60 * 1000) pendingLogins.delete(key);
  }

  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: process.env.EVE_SSO_CALLBACK_URL,
    client_id: process.env.EVE_SSO_CLIENT_ID,
    scope: process.env.EVE_SSO_SCOPES || '',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  res.redirect(`${EVE_AUTH_URL}?${params.toString()}`);
});

router.get('/eve/callback', async (req, res) => {
  const { code, state } = req.query;
  const pending = pendingLogins.get(state);

  if (!code || !state || !pending) {
    return res.redirect(`${process.env.FRONTEND_URL}/error?type=expired`);
  }
  pendingLogins.delete(state);

  try {
    const tokenResp = await fetch(EVE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${process.env.EVE_SSO_CLIENT_ID}:${process.env.EVE_SSO_CLIENT_SECRET}`).toString('base64'),
        Host: 'login.eveonline.com',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: pending.codeVerifier,
      }).toString(),
    });
    const tokenData = await tokenResp.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    const verifyResp = await fetch(EVE_VERIFY_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const verifyData = await verifyResp.json();
    const { CharacterID: eveCharacterId, CharacterName: characterName } = verifyData;

    const charResp = await fetch(`https://esi.evetech.net/latest/characters/${eveCharacterId}/`);
    const charData = await charResp.json();
    const { corporation_id: corporationId } = charData;

    const allowedCorp = process.env.ALLOWED_CORPORATION_ID;
    if (allowedCorp && String(corporationId) !== String(allowedCorp)) {
      return res.redirect(`${process.env.FRONTEND_URL}/error?type=no-corp`);
    }

    let corporationName = null;
    try {
      const corpResp = await fetch(`https://esi.evetech.net/latest/corporations/${corporationId}/`);
      const corpData = await corpResp.json();
      corporationName = corpData.name;
    } catch {}

    let detectedRole = 'member';
    if (allowedCorp && String(corporationId) === String(allowedCorp)) {
      try {
        const rolesResp = await fetch(`https://esi.evetech.net/latest/characters/${eveCharacterId}/roles/`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const rolesData = await rolesResp.json();
        const roles = rolesData.roles || [];
        if (roles.includes('CEO') || roles.includes('Director')) {
          detectedRole = 'admin';
        } else if (roles.includes('Accountant') || roles.includes('Junior Accountant')) {
          detectedRole = 'officer';
        }
      } catch {}
    }

    const existing = await pool.query('SELECT * FROM users WHERE eve_character_id = $1', [eveCharacterId]);
    let user;
    if (existing.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO users (eve_character_id, character_name, corporation_id, corporation_name, role, avatar_url, last_login, eve_access_token, eve_refresh_token, token_expires_at)
         VALUES ($1,$2,$3,$4,$5,$6, now(), $7, $8, NOW() + INTERVAL '${expires_in} seconds') RETURNING *`,
        [eveCharacterId, characterName, corporationId, corporationName, detectedRole, `https://images.evetech.net/characters/${eveCharacterId}/portrait?size=128`, access_token, refresh_token]
      );
      user = insert.rows[0];
    } else {
      const currentRole = existing.rows[0].role;
      const newRole = currentRole === 'member' ? detectedRole : currentRole;
      const update = await pool.query(
        `UPDATE users SET character_name=$1, corporation_id=$2, corporation_name=$3, role=$4, last_login=now(),
         eve_access_token=$5, eve_refresh_token=$6, token_expires_at=NOW() + INTERVAL '${expires_in} seconds'
         WHERE eve_character_id=$7 RETURNING *`,
        [characterName, corporationId, corporationName, newRole, access_token, refresh_token, eveCharacterId]
      );
      user = update.rows[0];
    }

    const token = jwt.sign(
      {
        id: user.id,
        eveCharacterId: user.eve_character_id,
        characterName: user.character_name,
        corporationId: user.corporation_id,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
  } catch (err) {
    console.error('Error en callback de EVE SSO:', err);
    res.redirect(`${process.env.FRONTEND_URL}/error?type=auth-failed`);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
