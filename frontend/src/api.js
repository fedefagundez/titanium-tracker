import { API_URL } from './constants';

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
