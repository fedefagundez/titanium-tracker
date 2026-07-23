import { API_URL } from './constants';
import { getToken } from './auth';

export async function searchSystems(query) {
  const resp = await fetch(`${API_URL}/api/systems/search?q=${encodeURIComponent(query)}`);
  if (!resp.ok) throw new Error('Error buscando sistemas');
  return resp.json();
}

export async function calculateRoute({ origin_id, destination_id, flag, avoid_ids, ship_type_id, warp_speed, align_time }) {
  const resp = await fetch(`${API_URL}/api/routes/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin_id, destination_id, flag, avoid_ids, ship_type_id, warp_speed, align_time }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Error calculando ruta');
  }
  return resp.json();
}

export async function getThreats(systemIds) {
  const resp = await fetch(`${API_URL}/api/systems/threats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system_ids: systemIds }),
  });
  if (!resp.ok) throw new Error('Error obteniendo amenazas');
  return resp.json();
}

export async function getCharacterLocation() {
  const token = getToken();
  if (!token) throw new Error('No hay sesión');
  const resp = await fetch(`${API_URL}/api/location`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('Error obteniendo ubicación');
  return resp.json();
}

export async function getCharacterShip() {
  const token = getToken();
  if (!token) throw new Error('No hay sesión');
  const resp = await fetch(`${API_URL}/api/ship`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('Error obteniendo nave');
  return resp.json();
}

let mapDataCache = null

export async function getMapData() {
  if (mapDataCache) return mapDataCache
  const resp = await fetch(`${API_URL}/api/map/data`);
  if (!resp.ok) throw new Error('Error obteniendo datos del mapa');
  mapDataCache = await resp.json();
  return mapDataCache
}
