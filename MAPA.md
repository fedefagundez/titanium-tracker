# Titanium Tracker — Mapa del Proyecto

## Resumen

App de navegación y alertas para la corporación **Titanium State Logistics** en Eve Online.
Permite planificar rutas, recibir alertas de peligro en tiempo real y compartirlas con la corporación.

**Stack:** Vue 3 + Vite | Express 4 | PostgreSQL 16
**Auth:** EVE SSO (OAuth2 + PKCE) → JWT propio
**Arquitectura:** MVC simplificado + Component-based UI con CSS Grid + Composables

---

## Estructura de archivos

```
titanium-tracker/
│
├── docker-compose.yml              # PostgreSQL 16 (puerto 5432)
├── guia-proyecto.md                # Requerimientos por fases (6 fases, 23 features)
├── ESTILO.md                       # Guía de diseño visual (paleta, componentes, layout)
├── MAPA.md                         # Este archivo
│
├── backend/
│   ├── .env                        # Variables de entorno (⚠ contiene secrets)
│   ├── .env.example                # Template de variables de entorno
│   ├── package.json                # Express 4, pg, jsonwebtoken, cors, helmet, csv-parse, rate-limit
│   ├── .cache/                     # CSVs descargados de Fuzzwork (gitignored)
│   └── src/
│       ├── server.js               # Entry point. Helmet, CORS, rate-limit, carga de datos
│       ├── db.js                   # Pool de conexión a PostgreSQL (DATABASE_URL)
│       ├── migrate.js              # Ejecuta migraciones SQL desde src/migrations/
│       ├── data/
│       │   ├── csv.js              # Utilidades compartidas: parseCSVFile(), downloadCSV(), CACHE_DIR
│       │   ├── systems.js          # Carga CSVs de Fuzzwork, lookup table, búsqueda, regiones, coordenadas
│       │   ├── gates.js            # Stargates, cálculo de tiempo de warp, conexiones puerta-a-puerta
│       │   ├── threats.js          # Detección de amenazas vía zKillboard API (con gate_details)
│       │   └── map.js              # Datos del mapa completo: sistemas + conexiones + regiones (cache 1h)
│       ├── middleware/
│       │   └── auth.js             # requireAuth (JWT HS256) + requireRole(...roles)
│       ├── routes/
│       │   ├── auth.js             # /auth/eve/login, /auth/eve/callback, /auth/me, /auth/logout
│       │   ├── systems.js          # GET /api/systems/search?q= — autocompletado
│       │   ├── routes.js           # POST /api/routes/calculate — cálculo vía ESI
│       │   ├── threats.js          # POST /api/systems/threats — amenazas por sistemas
│       │   ├── map.js              # GET /api/map/data — datos del mapa (sistemas, conexiones, regiones)
│       │   └── location.js         # GET /api/location, GET /api/ship — posición y nave actual
│       └── migrations/
│           ├── 001_create_users.sql    # CREATE TABLE users
│           └── 002_add_tokens.sql      # ALTER TABLE users ADD token columns (access, refresh, expires)
│
├── frontend/
│   ├── .env                        # VITE_API_URL=http://localhost:3000
│   ├── .env.example                # Template de variables de entorno
│   ├── package.json                # Vue 3, vue-router@4, pinia (instalado, no usado)
│   ├── vite.config.js              # Proxy /auth, /api, /health → localhost:3000
│   ├── index.html                  # Shell HTML (Vite entry point)
│   └── src/
│       ├── main.js                 # createApp + router + import style.css
│       ├── App.vue                 # <router-view />
│       ├── style.css               # Variables CSS + utilidades globales
│       ├── constants.js            # API_URL, ROLE_LABELS, FLAG_OPTIONS, FLAG_LABELS, THREAT_COLORS, SECURITY_COLORS, DEFAULT_WARP_SPEED, DEFAULT_ALIGN_TIME
│       ├── api.js                  # Cliente HTTP: searchSystems(), calculateRoute(), getThreats(), getCharacterLocation(), getCharacterShip(), getMapData()
│       ├── auth.js                 # State de sesión, loadSession(), getToken(), logout()
│       ├── router.js               # Rutas: / (home, auth), /login (guest), /error (guest)
│       ├── assets/
│       │   └── vue.svg
│       ├── composables/
│       │   ├── usePilotLocation.js # Ubicación del piloto: fetch + interval 30s + cleanup
│       │   ├── useThreats.js       # Fetch de amenazas: reactivo al route, loading state
│       │   └── useMapInteraction.js# Drag/zoom/pan del mapa SVG: mouse + wheel + teclado
│       ├── data/
│       │   └── warp.js             # getWarpSpeedByTypeId(), formatTime(), SHIP_WARP_SPEEDS
│       ├── views/
│       │   ├── LoginView.vue       # Login con EVE SSO, estilo HUD
│       │   ├── HomeView.vue        # Grid layout: header + sidebar + main content
│       │   └── ErrorView.vue       # Página de error (no-corp, auth-failed, expired)
│       └── components/
│           ├── SystemAutocomplete.vue  # Input con dropdown, debounce, dots de seguridad
│           ├── RoutePlanner.vue        # Form: origen, destino, evitar, tipo de ruta
│           ├── RouteSidebar.vue        # Sidebar colapsable que contiene el planner
│           ├── MainContent.vue         # Panel derecho: toolbar + viewport (ruta/amenazas/mapa)
│           ├── ViewToggle.vue          # Toggle Ruta/Mapa
│           ├── RouteList.vue           # Tabla estilo Gatecamp Check con amenazas + progreso
│           ├── RouteMap.vue            # Mapa SVG interactivo: drag/zoom, nodos, amenazas, piloto
│           └── GateDetails.vue         # Componente reutilizable de detalles de gate (kills, badges)
│
└── eve_fw_corp.html                # Prototipo de referencia visual (Coldsteel Directive)
```

---

## Arquitectura

### Backend — MVC Simplificado

```
server.js
├── data/csv.js         ← Utilidades: parseCSVFile(), downloadCSV(), CACHE_DIR
├── data/systems.js     ← Model: carga datos, lookup, búsqueda, regiones, coordenadas (x,y,z)
├── data/gates.js       ← Model: stargates, cálculo de tiempo de warp, conexiones puerta-a-puerta
├── data/threats.js     ← Model: detección de amenazas vía zKillboard (con gate_details por destino)
├── data/map.js         ← Model: datos completos del mapa (sistemas + conexiones + regiones, cache 1h)
├── routes/auth.js      ← Controller: autenticación EVE SSO
├── routes/systems.js   ← Controller: búsqueda de sistemas
├── routes/routes.js    ← Controller: cálculo de rutas vía ESI
├── routes/threats.js   ← Controller: amenazas por sistemas
├── routes/map.js       ← Controller: datos del mapa
├── routes/location.js  ← Controller: ubicación y nave del personaje
└── middleware/auth.js   ← Middleware: JWT + roles
```

### Frontend — Component-based + CSS Grid + Composables

```
HomeView.vue             ← Grid shell: header + sidebar + main
├── .app-header          ← Header fijo (brand, usuario, logout)
├── .app-body (grid)
│   ├── RouteSidebar     ← Sidebar colapsable (380px / 48px)
│   │   └── RoutePlanner ← Form de planificación
│   └── MainContent      ← Panel derecho
│       ├── ViewToggle   ← Toggle Ruta/Mapa
│       ├── RouteList    ← Tabla de amenazas estilo Gatecamp Check
│       │   └── GateDetails ← Detalle de kills por gate (reutilizable)
│       └── RouteMap     ← Mapa SVG interactivo (drag/zoom, nodos, amenazas, piloto)
```

**Composables** (lógica reutilizable extraída de componentes):
```
composables/
├── usePilotLocation.js  ← Ubicación del piloto: fetch + interval 30s + cleanup
├── useThreats.js        ← Fetch de amenazas: reactivo al route + loading state
└── useMapInteraction.js ← Drag/zoom/pan del mapa SVG: mouse + wheel + teclado (+/-/0)
```

**Layout:** CSS Grid con `grid-template-columns: 380px 1fr`
**State:** `routeResult` se levanta a HomeView y se pasa como prop a MainContent
**Comunicación:** RoutePlanner emite `route-calculated` → RouteSidebar lo re-emite → HomeView lo recibe
**Configuración:** Opciones avanzadas para warp_speed (AU/s) y align_time (s) con valores por defecto

### Datos de Stargates y Warp (gates.js)

```
gates.js ← Carga CSVs: mapDenormalize.csv + mapSolarSystemJumps.csv + mapJumps.csv
├── calcularTiempoWarp()      ← Fórmula oficial CCP: aceleración + crucero + desaceleración
├── calcularTiempoWarpAU()    ← Misma fórmula pero con distancia en AU directa
├── calculateRouteTime()      ← Tiempo total: warp inicial + saltos + warp final + session changes
├── calculateSessionChanges() ← Cuenta transiciones de clase de seguridad
├── getSecurityLevel()        ← Determina highsec/lowsec/nullsec por sistema
├── findGateByConnection()    ← Puerta de conexión usando mapJumps.csv
├── findGateDistance()        ← Distancia euclidiana entre dos puertas
├── getGateConnections()      ← Mapa bidireccional: stargateID ↔ destinationID
├── getJumpConnections()      ← Mapa de saltos entre sistemas (para mapa completo)
├── SHIP_WARP_SPEEDS          ← Mapa de velocidades por ship_type_id
└── gateConnections           ← Mapa bidireccional: stargateID ↔ destinationID
```

**Velocidades de warp por tipo de nave:**
- Interceptors: 8.0 AU/s
- Frigates: 5.0 AU/s
- Battlecruisers: 2.75 AU/s
- Cruisers: 3.0 AU/s
- Battleships: 2.0 AU/s
- Freighters/Jump Freighters: 1.5 AU/s

**Fórmula de warp (basada en CCP Warp Drive Active):**
```
k = warp_speed (AU/s)
j = min(k/3, 2)  ← velocidad de desaceleración
warp_dropout_speed = 100 m/s

accel_time = ln(v_max / k) / k
decel_time = ln(v_max / warp_dropout_speed) / j
cruise_time = (distancia - accel_dist - decel_dist) / v_max

total_warp_time = ceil(accel_time + decel_time + cruise_time)
```

**Cálculo de tiempo total por viaje:**
1. Warp inicial: posición del jugador → puerta de salida del sistema origen
2. Por cada salto en la ruta:
   - Warp inter-sistema: puerta de salida (sistema A) → puerta de llegada (sistema B)
   - Warp intra-sistema (si aplica): puerta de llegada → puerta de salida dentro del mismo sistema
   - Overhead fijo: align (5s) + gate jump (5s) + grid load (3s) + server lag (1s) = 14s
3. Warp final: puerta de llegada del último sistema → destino del jugador
4. Session change timer: 15 segundos por cada cambio de clase de seguridad (nullsec→lowsec→highsec)

---

## Flujo de autenticación

```
 1. Usuario clickea "Iniciar sesión con EVE Online"
 2. Frontend → GET /auth/eve/login
 3. Backend genera state + PKCE code_verifier → almacena en Map (TTL 10min)
 4. Backend redirige a login.eveonline.com con code_challenge (S256)
 5. Usuario autentica en CCP → CCP redirige a /auth/eve/callback?code=&state=
 6. Backend intercambia code + code_verifier por access_token + refresh_token
 7. Backend llama /oauth/verify → obtiene CharacterID, CharacterName
 8. Backend llama ESI /characters/{id}/ → obtiene corporation_id
 9. Si ALLOWED_CORPORATION_ID está seteado → valida membresía
10. Backend llama ESI /characters/{id}/roles/ → detecta rol
11. Upsert en tabla users (incluye eve_access_token, eve_refresh_token, token_expires_at) → emite JWT (HS256, 12h)
12. Redirige a frontend: /?token=<jwt>
13. Frontend captura token → guarda en localStorage
14. Subsiguientes requests incluyen Bearer token → requireAuth middleware
```

### Refresh Token ESI

```
location.js
├── getAccessToken()        ← Verifica si token expira en <60s
├── refreshAccessToken()    ← Renueva access_token usando refresh_token de la DB
└── Endpoints:
    ├── GET /api/location   ← Posición actual del personaje (solar_system_id)
    └── GET /api/ship       ← Nave actual del personaje (ship_type_id, ship_name)
```

---

## Flujo de planificación de ruta

```
1. Usuario escribe en autocomplete → GET /api/systems/search?q=...
2. Backend busca en lookup table (CSV de Fuzzwork, 8490 sistemas)
3. Usuario selecciona origen, destino, sistemas a evitar, tipo de ruta
4. Frontend envía → POST /api/routes/calculate
5. Backend valida IDs contra lookup table
6. Backend llama ESI → GET /v1/route/{origin}/{destination}/?flag=...&avoid=...
7. ESI retorna array de system IDs
8. Backend resuelve IDs a nombres desde lookup table (incluye region_name + coordenadas x,y,z)
9. RoutePlanner emite 'route-calculated' con el resultado
10. HomeView actualiza routeResult → MainContent muestra tabla de amenazas / mapa
```

---

## Flujo de detección de amenazas

```
1. RouteList / RouteMap reciben route como prop
2. useThreats composable → fetchThreats() llama POST /api/systems/threats
3. Backend recibe array de system IDs
4. Para cada sistema → fetchKillsForSystem() llama zKillboard API
   - Endpoint: /api/kills/solarSystemID/{id}/pastSeconds/3600/
   - Ventana: última hora (3600 segundos)
5. analyzeKills() filtra kills en stargates (locationID empieza con 500)
6. Para cada kill en gate:
   - classifyAttackers(): verifica ship_type_id contra interdictors (22456-22466) / heavy interdictors (22852-22878)
   - classifyWeapon(): verifica weapon_type_id contra smartbombs (3419-3666)
   - buildGateAggregates(): agrupa kills por locationID con contadores de dictors/hictors/smartbombs
7. Calcula threat_level: safe / warning (1-2 kills) / danger (3+ o amenazas especiales)
8. buildGateDetails(): resuelve destination name por gate usando gateConnections
9. Cache: resultados cacheados 60 segundos en memoria
10. Frontend renderiza: tabla (RouteList) / mapa con nodos coloreados + triángulos pulsantes (RouteMap)
```

---

## Flujo del mapa interactivo

```
1. RouteMap recibe route como prop
2. useThreats composable → fetchThreats() para colorir nodos por amenaza
3. usePilotLocation composable → fetchLocation() cada 30s para posición del piloto
4. nodes computed → normaliza coordenadas x,z del route a espacio SVG (escala 500px)
   - Color por security_level: highsec=#5fc9ff, lowsec=#e0a83e, nullsec=#d1483f
   - Override por threat_level: warning=#e0a83e, danger=#d1483f
   - Override especial: origen/destino siempre #5fc9ff
5. threatNodes computed → filtra nodos con warning/danger para triángulos pulsantes
6. segments computed → pares de nodos adyacentes para líneas de ruta
7. Zoom animado (50ms linear vía requestAnimationFrame) con mouse wheel + pincha
8. Tooltip: muestra nombre, sec status, region, kills, gate_details con badges D/H/S
```

### Comportamiento de zoom "vast space"

El zoom implementa un comportamiento de "espacio vasto" donde los elementos se escalan de forma distinta:

| Elemento | Comportamiento de zoom |
|----------|------------------------|
| `<line>` | `vector-effect="non-scaling-stroke"` — el grosor se mantiene constante (1.5px) sin importar el zoom |
| `<circle>` | Radio = `baseR / Math.sqrt(zoom)` — los nodos se encogen al acercarse |
| `<polygon>` | `counter-scale="1/zoom"` — tamaño constante en pantalla |
| `pulse-ring` | `counter-scale="1/zoom"` — tamaño constante en pantalla |
| `text` (tooltip) | Renderizado via portal, no afectado por zoom |

### Elementos del mapa SVG

| Elemento | Descripción |
|----------|-------------|
| `<line>` | Segmentos de ruta entre sistemas adyacentes (grosor constante 1.5px) |
| `<circle>` | Nodos de sistema (radio 8px base en zoom=1, encoge con zoom) |
| `<polygon>` | Triángulos pulsantes sobre sistemas con amenaza (tamaño constante en pantalla) |
| `<circle class="pulse-ring">` | Anillo pulsante sobre la posición actual del piloto (tamaño constante) |

### Colores del mapa

| Elemento | Color | Descripción |
|----------|-------|-------------|
| Highsec | `#5fc9ff` | Seguridad alta |
| Lowsec | `#e0a83e` | Seguridad baja |
| Nullsec | `#d1483f` | Seguridad nula |
| Safe threat | `#3ddc97` | Sin actividad hostil |
| Warning threat | `#e0a83e` | 1-2 kills en puertas |
| Danger threat | `#d1483f` | 3+ kills o dictors/hictors/smartbombs |
| Pilot position | `#5fc9ff` | Ubicación actual del piloto |
| Route segments | `#3a8fc7` | Líneas de ruta |

---

## Variables de entorno

### Backend (.env)

| Variable | Ejemplo | Descripción |
|---|---|---|
| PORT | 3000 | Puerto del servidor |
| FRONTEND_URL | http://localhost:5173 | URL del frontend (CORS + redirect) |
| DATABASE_URL | postgres://user:pass@localhost:5432/titanium_tracker | Conexión PostgreSQL |
| JWT_SECRET | (hex de 128 chars) | Secreto para firmar JWTs (HS256) |
| JWT_EXPIRES_IN | 12h | Expiración del token |
| EVE_SSO_CLIENT_ID | (de EVE Developers) | Client ID de la app OAuth |
| EVE_SSO_CLIENT_SECRET | eat_... | Secret de la app OAuth |
| EVE_SSO_CALLBACK_URL | http://localhost:3000/auth/eve/callback | Callback URI registrado en CCP |
| EVE_SSO_SCOPES | esi-characters.read_corporation_roles.v1 | Scopes de ESI necesarios |
| ALLOWED_CORPORATION_ID | 98830206 | Corp restringida (vacío = sin restricción) |

### Frontend (.env)

| Variable | Ejemplo | Descripción |
|---|---|---|
| VITE_API_URL | http://localhost:3000 | URL del backend API |

---

## Migraciones SQL

### 001_create_users.sql

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  eve_character_id BIGINT UNIQUE NOT NULL,
  character_name VARCHAR(255) NOT NULL,
  corporation_id BIGINT,
  corporation_name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'member',
  avatar_url TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 002_add_tokens.sql

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS eve_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS eve_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
```

---

## API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/auth/eve/login` | Iniciar login EVE SSO |
| GET | `/auth/eve/callback` | Callback OAuth2 de CCP |
| GET | `/auth/me` | Obtener usuario actual (requiere JWT) |
| POST | `/auth/logout` | Cerrar sesión |
| GET | `/api/systems/search?q=jita` | Buscar sistemas por nombre |
| POST | `/api/routes/calculate` | Calcular ruta entre sistemas (incluye time_breakdown) |
| POST | `/api/systems/threats` | Obtener amenazas por sistemas (zKillboard, con gate_details) |
| GET | `/api/map/data` | Datos completos del mapa: sistemas + conexiones + regiones (cache 1h) |
| GET | `/api/location` | Ubicación actual del personaje (requiere JWT + refresh token ESI) |
| GET | `/api/ship` | Nave actual del personaje con tipo de nave (requiere JWT + refresh token ESI) |

### POST /api/routes/calculate — Request

```json
{
  "origin_id": 30000142,
  "destination_id": 30000144,
  "flag": "secure",
  "avoid_ids": [30000143],
  "ship_type_id": 621,
  "warp_speed": 5.0,
  "align_time": 5
}
```

**Parámetros opcionales:**
| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `warp_speed` | number | 5.0 | Velocidad de warp en AU/s (sobreescribe ship_type_id) |
| `align_time` | number | 5 | Tiempo de alineación en segundos |

### POST /api/routes/calculate — Respuesta

```json
{
  "origin": { "id": 30000142, "name": "Jita" },
  "destination": { "id": 30000144, "name": "Amarr" },
  "flag": "secure",
  "jump_count": 4,
  "estimated_time_seconds": 420,
  "warp_speed": 5.0,
  "align_time": 5,
  "ship_type_id": 621,
  "route": [...],
  "time_breakdown": {
    "initial_warp": "initial_warp: 6AU = 20s",
    "final_warp": "final_warp: 19AU = 25s",
    "session_changes": 2,
    "session_change_time": 30
  },
  "jumps_detail": [
    {
      "from": 30000142,
      "to": 30000143,
      "warp_time": 15,
      "intra_warp_time": 0,
      "gate_time": 5,
      "align_time": 5
    }
  ],
  "debug": [...]
}
```

### POST /api/systems/threats — Respuesta (por sistema)

```json
{
  "30000142": {
    "kill_count": 3,
    "has_dictors": true,
    "has_hictors": false,
    "has_smartbombs": false,
    "threat_level": "danger",
    "gate_details": [
      {
        "gate_id": "50000142",
        "destination": "Jita",
        "kills": 2,
        "has_dictors": true,
        "has_hictors": false,
        "has_smartbombs": false
      }
    ]
  }
}
```

### GET /api/map/data — Respuesta

```json
{
  "systems": [
    {
      "id": 30000142,
      "name": "Jita",
      "region_id": 10000002,
      "region_name": "The Forge",
      "constellation_id": 20000020,
      "security_status": 0.946,
      "security_level": "highsec",
      "x": -7.16919e+16,
      "y": -1.65951e+17,
      "z": -2.74455e+17
    }
  ],
  "connections": [
    { "from": 30000142, "to": 30000143 }
  ],
  "regions": [
    { "id": 10000002, "name": "The Forge" }
  ],
  "system_count": 8490,
  "connection_count": 45210
}
```

---

## Layout — CSS Grid

```
┌──────────────────────────────────────────────────────────┐
│  HEADER (fijo, 70px)                                     │
├──────────────┬───────────────────────────────────────────┤
│  SIDEBAR     │  MAIN CONTENT                             │
│  (380px)     │  Toolbar: [Ruta] [Mapa]                   │
│              ├───────────────────────────────────────────┤
│  Planificar  │  Tabla de amenazas (estilo Gatecamp Check)│
│  Ruta        │  o                                        │
│              │  Mapa SVG interactivo                     │
│  [Origen]    │  (drag/zoom, nodos, amenazas, piloto)    │
│  [Destino]   │                                           │
│  [Evitar]    │  #  Region  Sistema/Sec  Kills  Info  Links│
│  [Tipo]      │  0  Forge   Jita 0.9     -     ✓    zKb·D│
│  [Calcular]  │  1  Forge   Perm 0.9     -     ✓    zKb·D│
│              │  2  Heimat  Amam 0.4     2     ⚠    zKb·D│
│              │  3  Citadel Tama 0.3    33     🔴    zKb·D│
├──────────────┴───────────────────────────────────────────┤
```

**Responsive:**
- >= 1024px: Split completo (380px + fluido)
- 768-1023px: Sidebar colapsado (48px rail)
- < 768px: Sidebar como bottom sheet

---

## Tabla de amenazas (estilo Gatecamp Check)

| Columna | Contenido |
|---|---|
| # | Número de orden en la ruta |
| Región | Nombre de la región (The Forge, Heimatar, etc.) |
| Sistema / Sec | Dot de seguridad + nombre + valor numérico |
| Pos | Indicador de posición actual del piloto (punto pulsante) / check de visitado |
| Kills (1h) | Kills en stargates en la última hora |
| Info | Detalle de kills por gate: "X kills hacia SistemaDestino" + badges D/H/S |
| Riesgo | Score numérico: 0 (safe) / 50 (warning) / 100 (danger) |
| Links | zKillboard y Dotlan (abren en nueva pestaña) |

**Niveles de amenaza:**
- `safe` → 0 kills, fondo normal, checkmark verde
- `warning` → 1-2 kills, borde amarillo izquierdo, fondo sutil amarillo
- `danger` → 3+ kills o dictors/hictors/smartbombs, borde rojo izquierdo, fondo sutil rojo

**Estados de fila:**
- `row-current` → Sistema actual del piloto (fondo azul sutil, borde azul)
- `row-visited` → Sistemas ya visitados (opacity reducida)
- `row-warning` / `row-danger` → Nivel de amenaza

---

## Paleta de colores

| Variable | Valor | Uso |
|---|---|---|
| --void | #070a0c | Fondo principal |
| --panel | #0e1417 | Fondo de paneles |
| --panel-alt | #131b1f | Fondo alternativo |
| --steel-blue | #3a8fc7 | Acento primario |
| --steel-bright | #5fc9ff | Acento brillante |
| --hostile | #d1483f | Rojo hostil |
| --ink | #dbe6ea | Texto principal |
| --ink-dim | #8ea0a8 | Texto secundario |
| --line | #2a3a42 | Bordes |
| --line-dim | #151d21 | Bordes sutiles |
| --online | #3ddc97 | En línea / safe |
| --contested | #e0a83e | Disputado / warning |

**Constantes centralizadas (constants.js):**
```js
THREAT_COLORS = { safe: '#3ddc97', warning: '#e0a83e', danger: '#d1483f' }
SECURITY_COLORS = { highsec: '#5fc9ff', lowsec: '#e0a83e', nullsec: '#d1483f', unknown: '#8ea0a8' }
```

---

## Requerimientos

### Fase 1 — Funcionalidad base

| # | Requerimiento | Estado |
|---|---|---|
| 1.1 | Autenticación con Eve OAuth (Eve SSO) | ✅ |
| 1.2 | Selección de origen, destino y sistemas a evitar | ✅ |
| 1.3 | Selección de tipo de ruta (segura, cartografía, no segura) | ✅ |
| 1.4 | Cálculo de ruta óptima según tipo seleccionado | ✅ |
| 1.5 | Advertencias por sistema (kills, interdictors, smartbombs) | ✅ |
| 1.6 | Sugerencia de rutas alternativas | ⏳ |

### Fase 2 — Experiencia de viaje

| # | Requerimiento | Estado |
|---|---|---|
| 2.1 | Visualización de la ruta con posición actual del piloto | ✅ |
| 2.2 | Indicador de progreso del viaje (sistemas visitados vs. pendientes) | ✅ |
| 2.3 | Estimación de tiempo total de viaje (cálculo de warp real) | ✅ |
| 2.4 | Score de riesgo por sistema, basado en kills recientes | ✅ |

### Fase 2.5 — Mapa interactivo

| # | Requerimiento | Estado |
|---|---|---|
| 2.5.1 | Mapa SVG con drag (pan) y scroll (zoom) con animación suave (50ms) | ✅ |
| 2.5.2 | Nodos coloreados por security level y threat level | ✅ |
| 2.5.3 | Triángulos pulsantes en sistemas con amenaza (warning/danger) | ✅ |
| 2.5.4 | Indicador de posición del piloto (anillo pulsante) | ✅ |
| 2.5.5 | Tooltip con kills, region, gate details y badges D/H/S | ✅ |
| 2.5.6 | Zoom "vast space": non-scaling-stroke + nodos encogen + elementos UI constante | ✅ |
| 2.5.7 | Labels de sistema | ⏳ pendiente reintegro (bug de doble escala corregido) |

### Fase 3-6 — Ver guia-proyecto.md

---

## Fuentes de datos

| Fuente | Uso | Frecuencia de actualización |
|---|---|---|
| Fuzzwork mapSolarSystems.csv | Nombres de sistemas, regiones, seguridad, coordenadas | Diaria (expires 11:05 UTC) |
| Fuzzwork mapRegions.csv | Nombres de regiones | Diaria |
| Fuzzwork mapJumps.csv | Conexiones exactas puerta-a-puerta | Diaria |
| CCP ESI /route/ | Cálculo de rutas | Cache 24h |
| zKillboard API | Kills recientes para detección de amenazas | Real-time (cache 60s) |

---

## Comandos útiles

```bash
# Levantar Postgres
docker compose up -d

# Migrar base de datos
cd backend && npm run migrate

# Desarrollo backend
cd backend && npm run dev

# Desarrollo frontend
cd frontend && npm run dev
```
