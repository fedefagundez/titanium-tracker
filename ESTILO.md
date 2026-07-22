# Estilo Visual — Titanium Tracker

Referencia de diseño extraída del prototipo `eve_fw_corp(3).html`.

---

## Paleta de colores

```css
:root {
  --void: #070a0c;          /* fondo principal */
  --panel: #0e1417;          /* fondo de paneles */
  --panel-alt: #131b1f;      /* fondo alternativo (inputs, tarjetas secundarias) */
  --steel-blue: #3a8fc7;     /* acento primario, bordes, barras de progreso */
  --steel-bright: #5fc9ff;   /* acento brillante, hover, texto de enlace */
  --hostile: #d1483f;        /* rojo hostil (pérdidas, peligro) */
  --ink: #dbe6ea;            /* texto principal */
  --ink-dim: #8ea0a8;        /* texto secundario / deshabilitado */
  --line: #2a3a42;           /* bordes principales */
  --line-dim: #151d21;       /* bordes sutiles, divisores */
  --online: #3ddc97;         /* verde estado en línea */
  --contested: #e0a83e;      /* amarillo/naranja disputado */
}
```

---

## Tipografía

| Uso | Familia | Peso | Estilo |
|-----|---------|------|--------|
| Display / títulos | Rajdhani | 700 | uppercase, letter-spacing .02em |
| UI / cuerpo | Rajdhani | 600 | normal |
| Datos / monoespaciado | Space Mono | 700 | para valores numéricos |
| Código / IDs | Space Mono | 400 | para tablas |

Clases utilitarias:
- `.display` → Rajdhani 700, uppercase
- `.mono` → Space Mono

---

## Componentes clave

### Paneles (`.panel`)
- Fondo `--panel`, borde 1px `--line`
- Borde superior 2px `--steel-blue` (acento)
- Esquina superior derecha cortada: `clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)`
- Variantes: `.no-clip` (sin recorte), `.flat-top` (borde superior normal)

### Botones
- `.btn-primary` → fondo `--steel-blue`, texto `--void`, hover `--steel-bright`
- `.btn-secondary` → transparente, borde `--line`, hover borde `--steel-blue`
- `.btn-danger` → fondo `--hostile`
- `.btn-disabled` → transparente, borde atenuado, cursor not-allowed
- Recorte angular: `clip-path: polygon(10px 0, 100% 0, 100% 100%, 0 100%, 0 10px)`
- Tamaños: `.btn-sm` (padding reducido), `.btn-block` (width 100%)

### Badges
- `.badge.hostile` → rojo con fondo translúcido
- `.badge.allied` → azul brillante con fondo translúcido
- `.badge.neutral` → amarillo/naranja con fondo translúcido
- `.badge.kill` / `.badge.loss` → misma paleta que allied/hostile

### Dividers
- Línea horizontal 1px `--line-dim`
- Diamante centrado: cuadrado 8px rotado 45° con borde `--steel-blue`

### Dropdowns
- Botón con fondo `--panel-alt`, borde `--line`
- Lista desplegable con sombra `box-shadow: 0 14px 26px rgba(0,0,0,.5)`
- Hover: fondo translúcido `rgba(95,201,255,.1)`, texto `--steel-bright`

### Sliders
- Track: 6px alto, fondo `--line-dim`
- Fill: fondo `--steel-blue`
- Thumb: 16px, fondo `--steel-bright`, borde 2px `--void`

### Tablas
- Encabezados: 12px, uppercase, `--ink-dim`
- Filas: borde inferior `--line-dim`, hover `rgba(95,201,255,.06)`
- Celdas: Space Mono 400
- Pilot cells: Rajdhani 700
- ISK values: `--steel-bright`

### Tarjetas de roster
- Icono hexagonal con clip-path de diamante
- Indicador de estado: `.dot.online` (verde con animación ping), `.dot.offline` (gris)

### Tarjetas de sistema (warzone)
- Borde lateral según estado: `.owned` (azul), `.enemy` (rojo), `.contested` (amarillo)
- Barra de progreso con fill `--steel-blue` o `.danger` (`--hostile`)

### Formularios
- Inputs: fondo `--panel-alt`, borde `--line`, texto `--ink`
- Labels: 12px, uppercase, `--ink-dim`
- Checkboxes: cuadrado 17px, checked = fondo `--steel-blue` con check SVG

### Tooltips
- Fondo `--panel-alt`, borde `--line`
- Posicionamiento absoluto arriba del elemento
- Opacidad 0 → 1 en hover

### Modales
- Overlay: fondo negro 75% opaco
- Box: panel con `.no-clip`, padding 30px, centrado
- Icono hexagonal con fondo translúcido azul

---

## Layout

- Contenedor máximo: 1280px (`.wrap`)
- Padding horizontal: 20px
- Header fijo: `backdrop-filter: blur(6px)`, fondo `rgba(7,10,12,.96)`
- Main: padding-top 70px (altura del header)
- Grid breakpoints:
  - 640px → columnas intermedias
  - 768px → nav desktop visible
  - 1024px → grid expandido

---

## Efectos yanimaciones

- Transiciones: 150ms en hover/focus (background, color, border-color, transform)
- Animación ping para `.dot.online`: escala de 1 a 2.2 con opacidad decreciente
- Focus visible: outline 2px `--steel-bright` con offset 2px

---

## Paleta semántica

| Contexto | Color | Uso |
|----------|-------|-----|
| Propio / aliado | `--steel-bright` / `--steel-blue` | Bajas, sistemas controlados, badges allied |
| Hostil / peligro | `--hostile` | Pérdidas, sistemas enemigos, badges hostile |
| Disputado / alerta | `--contested` | Sistemas contested, badges neutral |
| En línea | `--online` | Estado de conexión |
| Inactivo | `--line` / `--ink-dim` | Desconectado, deshabilitado |
