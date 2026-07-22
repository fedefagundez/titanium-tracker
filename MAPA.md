# Titanium Tracker — Mapa del Proyecto

## Resumen

App de navegación y alertas para la corporación **Titanium State Logistics** en Eve Online.
Permite planificar rutas, recibir alertas de peligro en tiempo real y compartirlas con la corporación.

**Stack:** Vue 3 + Vite | Express 4 | PostgreSQL 16
**Auth:** EVE SSO (OAuth2 + PKCE) → JWT propio
**Arquitectura:** MVC simplificado + Component-based UI con CSS Grid

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
│   ├── package.json                # Express 4, pg, jsonwebtoken, cors, helmet, csv-parse
│   ├── .cache/                     # CSVs descargados de Fuzzwork (gitignored)
│   └── src/
│       ├── server.js               # Entry point. Helmet, CORS, rate-limit, carga de datos
│       ├── db.js                   # Pool de conexión a PostgreSQL (DATABASE_URL)
│       ├── migrate.js              # Ejecuta migraciones SQL desde src/migrations/
│       ├── data/
│       │   ├── systems.js          # Carga CSVs de Fuzzwork, lookup table, búsqueda, regiones
│       │   └── threats.js          # Detección de amenazas vía zKillboard API
│       ├── middleware/
│       │   └── auth.js             # requireAuth (JWT HS256) + requireRole(...roles)
│       ├── routes/
│       │   ├── auth.js             # /auth/eve/login, /auth/eve/callback, /auth/me, /auth/logout
│       │   ├── systems.js          # GET /api/systems/search?q= — autocompletado
│       │   ├── routes.js           # POST /api/routes/calculate — cálculo vía ESI
│       │   └── threats.js          # POST /api/systems/threats — amenazas por sistemas
│       └── migrations/
│           └── 001_create_users.sql  # CREATE TABLE users
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
│       ├── constants.js            # API_URL, ROLE_LABELS, FLAG_OPTIONS
│       ├── api.js                  # Cliente HTTP: searchSystems(), calculateRoute(), getThreats()
│       ├── auth.js                 # State de sesión, loadSession(), getToken()
│       ├── router.js               # Rutas: / (home, auth), /login (guest), /error (guest)
│       ├── assets/
│       │   └── vue.svg
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
│           ├── RouteList.vue           # Tabla estilo Gatecamp Check con amenazas
│           └── RouteMap.vue            # Placeholder para futuro mapa
│
└── eve_fw_corp.html                # Prototipo de referencia visual (Coldsteel Directive)
```

---

## Arquitectura

### Backend — MVC Simplificado

```
server.js
├── data/systems.js      ← Model: carga datos, lookup, búsqueda, regiones
├── data/threats.js      ← Model: detección de amenazas vía zKillboard
├── routes/auth.js       ← Controller: autenticación EVE SSO
├── routes/systems.js    ← Controller: búsqueda de sistemas
├── routes/routes.js     ← Controller: cálculo de rutas vía ESI
├── routes/threats.js    ← Controller: amenazas por sistemas
└── middleware/auth.js    ← Middleware: JWT + roles
```

### Frontend — Component-based + CSS Grid

```
HomeView.vue             ← Grid shell: header + sidebar + main
├── .app-header          ← Header fijo (brand, usuario, logout)
├── .app-body (grid)
│   ├── RouteSidebar     ← Sidebar colapsable (380px / 48px)
│   │   └── RoutePlanner ← Form de planificación
│   └── MainContent      ← Panel derecho
│       ├── ViewToggle   ← Toggle Ruta/Mapa
│       ├── RouteList    ← Tabla de amenazas estilo Gatecamp Check
│       └── RouteMap     ← Placeholder para mapa
```

**Layout:** CSS Grid con `grid-template-columns: 380px 1fr`
**State:** `routeResult` se levanta a HomeView y se pasa como prop a MainContent
**Comunicación:** RoutePlanner emite `route-calculated` → RouteSidebar lo re-emite → HomeView lo recibe

---

## Flujo de autenticación

```
 1. Usuario clickea "Iniciar sesión con EVE Online"
 2. Frontend → GET /auth/eve/login
 3. Backend genera state + PKCE code_verifier → almacena en Map (TTL 10min)
 4. Backend redirige a login.eveonline.com con code_challenge (S256)
 5. Usuario autentica en CCP → CCP redirige a /auth/eve/callback?code=&state=
 6. Backend intercambia code + code_verifier por access_token
 7. Backend llama /oauth/verify → obtiene CharacterID, CharacterName
 8. Backend llama ESI /characters/{id}/ → obtiene corporation_id
 9. Si ALLOWED_CORPORATION_ID está seteado → valida membresía
10. Backend llama ESI /characters/{id}/roles/ → detecta rol
11. Upsert en tabla users → emite JWT (HS256, 12h)
12. Redirige a frontend: /?token=<jwt>
13. Frontend captura token → guarda en localStorage
14. Subsiguientes requests incluyen Bearer token → requireAuth middleware
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
8. Backend resuelve IDs a nombres desde lookup table (incluye region_name)
9. RoutePlanner emite 'route-calculated' con el resultado
10. HomeView actualiza routeResult → MainContent muestra tabla de amenazas
```

---

## Flujo de detección de amenazas

```
1. RouteList recibe route como prop
2. OnMounted → fetchThreats() llama POST /api/systems/threats
3. Backend recibe array de system IDs
4. Para cada sistema → fetchKillsForSystem() llama zKillboard API
   - Endpoint: /api/kills/solarSystemID/{id}/pastSeconds/3600/
   - Ventana: última hora (3600 segundos)
5. analyzeKills() filtra kills en stargates (locationID empieza con 500)
6. Para cada kill en gate:
   - classifyAttackers(): verifica ship_type_id contra interdictors (22456-22466)
   - classifyWeapon(): verifica weapon_type_id contra smartbombs (3419-3666)
7. Calcula threat_level: safe / warning (1-2 kills) / danger (3+ o amenazas especiales)
8. Cache: resultados cacheados 60 segundos en memoria
9. Frontend renderiza tabla: #, Región, Sistema/Sec, Kills, Info, Links
```

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

## API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/auth/eve/login` | Iniciar login EVE SSO |
| GET | `/auth/eve/callback` | Callback OAuth2 de CCP |
| GET | `/auth/me` | Obtener usuario actual (requiere JWT) |
| POST | `/auth/logout` | Cerrar sesión |
| GET | `/api/systems/search?q=jita` | Buscar sistemas por nombre |
| POST | `/api/routes/calculate` | Calcular ruta entre sistemas |
| POST | `/api/systems/threats` | Obtener amenazas por sistemas (zKillboard) |

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
│  Ruta        │                                           │
│              │  #  Region  Sistema/Sec  Kills  Info  Links│
│  [Origen]    │  0  Forge   Jita 0.9     -     ✓    zKb·D│
│  [Destino]   │  1  Forge   Perm 0.9     -     ✓    zKb·D│
│  [Evitar]    │  2  Heimat  Amam 0.4     2     ⚠    zKb·D│
│  [Tipo]      │  3  Citadel Tama 0.3    33     🔴    zKb·D│
│  [Calcular]  │                                           │
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
| Kills (1h) | Kills en stargates en la última hora |
| Info | Texto descriptivo del nivel de amenaza |
| Links | zKillboard y Dotlan (abren en nueva pestaña) |

**Niveles de amenaza:**
- `safe` → 0 kills, fondo normal, checkmark verde
- `warning` → 1-2 kills, borde amarillo, fondo sutil amarillo
- `danger` → 3+ kills o dictors/hictors/smartbombs, borde rojo

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
| --online | #3ddc97 | En línea |
| --contested | #e0a83e | Disputado |

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

### Fase 2-6 — Ver guia-proyecto.md

---

## Fuentes de datos

| Fuente | Uso | Frecuencia de actualización |
|---|---|---|
| Fuzzwork mapSolarSystems.csv | Nombres de sistemas, regiones, seguridad | Diaria (expires 11:05 UTC) |
| Fuzzwork mapRegions.csv | Nombres de regiones | Diaria |
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
