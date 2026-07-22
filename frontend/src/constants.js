export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const ROLE_LABELS = {
  admin: 'Director',
  officer: 'Oficial',
  member: 'Miembro',
}

export const FLAG_OPTIONS = [
  { value: 'safe', label: 'Segura', icon: '\u26E9', esiFlag: 'secure', badgeClass: 'allied' },
  { value: 'fast', label: 'R\u00E1pida', icon: '\u26A1', esiFlag: 'shortest', badgeClass: 'neutral' },
  { value: 'dangerous', label: 'Peligrosa', icon: '\u2620', esiFlag: 'insecure', badgeClass: 'hostile' },
]

export const FLAG_LABELS = { secure: 'Segura', shortest: 'R\u00E1pida', insecure: 'Peligrosa' }
