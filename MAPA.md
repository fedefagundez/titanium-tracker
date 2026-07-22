# Titanium Tracker — Mapa del Proyecto

## Resumen

App de navegación y alertas para la corporación **Titanium State Logistics** en Eve Online.
Permite planificar rutas, recibir alertas de peligro en tiempo real y compartirlas con la corporación.

**Stack:** Vue 3 + Vite | Express 4 | PostgreSQL 16
**Auth:** EVE SSO (OAuth2 + PKCE) → JWT propio

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
│   ├── package.json                # Express 4, pg, jsonwebtoken, cors, helmet, dotenv, rate-limit
│   └── src/
│       ├── server.js               # Entry point. Helmet, CORS, rate-limit en /auth, /health, rutas
│       ├── db.js                   # Pool de conexión a PostgreSQL (DATABASE_URL)
│       ├── migrate.js              # Ejecuta migraciones SQL desde src/migrations/
│       ├── middleware/
│       │   └── auth.js             # requireAuth (JWT HS256) + requireRole(...roles)
│       ├── routes/
│       │   └── auth.js             # /auth/eve/login, /auth/eve/callback, /auth/me, /auth/logout
│       └── migrations/
│           └── 001_create_users.sql  # CREATE TABLE users (eve_character_id, role, avatar, etc.)
│
├── frontend/
│   ├── .env                        # VITE_API_URL=http://localhost:3000
│   ├── package.json                # Vue 3, vue-router@4, pinia (instalado, no usado)
│   ├── vite.config.js              # Proxy /auth y /health → localhost:3000
│   ├── index.html                  # Shell HTML (Vite entry point)
│   └── src/
│       ├── main.js                 # createApp + router + import style.css
│       ├── App.vue                 # <router-view />
│       ├── style.css               # Variables CSS + clases base (panel, btn, badge, divider)
│       ├── auth.js                 # State de sesión, loadSession(), getToken(), getLoginUrl()
│       ├── router.js               # Rutas: / (home, auth), /login (guest), /error (guest)
│       ├── assets/
│       │   └── vue.svg
│       ├── views/
│       │   ├── LoginView.vue       # Login con EVE SSO, estilo HUD
│       │   ├── HomeView.vue        # Dashboard post-login (placeholder)
│       │   └── ErrorView.vue       # Página de error (no-corp, auth-failed, expired)
│       └── components/
│           └── HelloWorld.vue      # (default Vite, no se usa)
│
├── eve_fw_corp.html                # Prototipo de referencia visual (Coldsteel Directive)
└── nul                             # Artifact accidental de Windows (ignorar)
```

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
10. Backend llama ESI /characters/{id}/roles/ → detecta:
      - CEO / Director  → admin
      - Accountant       → officer
      - Otro             → member
11. Upsert en tabla users → emite JWT (HS256, 12h)
12. Redirige a frontend: /?token=<jwt>
13. Frontend captura token via captureTokenFromUrl() → guarda en localStorage
14. Subsiguientes requests incluyen Bearer token → requireAuth middleware
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

## Paleta de colores (del ESTILO.md)

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

## Requerimientos (Fase 1)

| # | Requerimiento | Estado |
|---|---|---|
| 1.1 | Autenticación con Eve OAuth (Eve SSO) | ✅ Implementado |
| 1.2 | Selección de origen, destino y sistemas a evitar | ⏳ Pendiente |
| 1.3 | Selección de tipo de ruta (segura, cartografía, no segura) | ⏳ Pendiente |
| 1.4 | Cálculo de ruta óptima según tipo seleccionado | ⏳ Pendiente |
| 1.5 | Advertencias por sistema (kills, interdictors, smartbombs) | ⏳ Pendiente |
| 1.6 | Sugerencia de rutas alternativas | ⏳ Pendiente |

---

## Estado actual

- **Fase:** 1 de 6
- **Progreso:** Solo autenticación (1.1) implementada
- **Pinia:** Instalado pero sin usar (sin stores creados)
- **DB:** Migración `001_create_users.sql` creada, pero **no ejecutada** — la tabla `users` no existe en la base de datos. Ejecutar `cd backend && npm run migrate` antes de usar la app.

---

## Comandos útiles

```bash
# Levantar Postgres
docker compose up -d

# Migrar base de datos (CREA la tabla users)
cd backend && npm run migrate

# Desarrollo backend
cd backend && npm run dev

# Desarrollo frontend
cd frontend && npm run dev
```

---

## Notas

- Los archivos `.env` contienen secrets reales y están en el repo (ignorados por `.gitignore` pero creados localmente).
- No existe `.env.example` — las variables están documentadas arriba.
- `eve_fw_corp.html` es un prototipo visual de referencia (Coldsteel Directive).
- `HelloWorld.vue` es el scaffold de Vite, no se usa en ningún lado.
