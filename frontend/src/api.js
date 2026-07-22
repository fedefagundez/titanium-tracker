import { API_URL } from './constants';
import { getToken } from './auth';

export async function searchSystems(query) {
  const resp = await fetch(`${API_URL}/api/systems/search?q=${encodeURIComponent(query)}`);
  if (!resp.ok) throw new Error('Error buscando sistemas');
  return resp.json();
}

export async function calculateRoute({ origin_id, destination_id, flag, avoid_ids }) {
  const resp = await fetch(`${API_URL}/api/routes/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin_id, destination_id, flag, avoid_ids }),
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
