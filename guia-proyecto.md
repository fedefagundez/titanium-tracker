# Titanium Tracker

## Descripción

Titanium State Logistics es una corporación de Latinoamérica en Eve Online. Esta aplicación funciona como **compañero de viaje** para sus miembros: permite planificar rutas entre sistemas, recibir alertas de peligro en tiempo real y compartirlas con la corporación.

El piloto define origen, destino y preferencias de ruta. A medida que viaja, el sistema monitorea condiciones de seguridad y genera advertencias si detecta actividad hostil (gankeos, muertes, camps) en sistemas de la trayectoria.

---

## Requerimientos

### Fase 1 — Funcionalidad base

1. Autenticación con Eve OAuth (Eve SSO).
2. Selección de origen, destino y sistemas a evitar.
3. Selección de tipo de ruta: segura, cartografía y no segura (consistente con la API del juego).
4. Cálculo de ruta óptima según el tipo seleccionado.
5. Advertencias por sistema en la ruta, similares a Gatecamp Check:
   - Cantidad de kills (0, 1-2, 3+).
   - Uso de interdictors / heavy interdictors.
   - Presencia de smartbombs.
6. Sugerencia de rutas alternativas cuando se detectan alertas (algoritmos de búsqueda).

### Fase 2 — Experiencia de viaje

7. Visualización de la ruta con posición actual del piloto (sistema por sistema).
8. Indicador de progreso del viaje (sistemas visitados vs. pendientes).
9. Estimación de tiempo total de viaje (saltos × tiempo promedio por salto).
10. Score de riesgo por sistema, basado en kills recientes de la API.

### Fase 3 — Alertas en tiempo real

11. Notificación cuando un sistema de la ruta recibe kills nuevos durante el viaje.
12. Alerta si el piloto se desvía de la ruta planificada.

### Fase 4 — Uso grupal

13. Compartir la ruta activa con miembros de la corporación.
14. Visualización de rutas activas de otros pilotos.
15. Modo convoy: rutas grupales con alertas si alguien se queda atrás o se desvía.

### Fase 5 — Datos e integraciones (progresivo)

16. Integración con zKillboard: kills recientes en sistemas de la ruta, con filtros por tipo de nave.
17. Estadísticas agregadas: sistemas más peligrosos, rutas con más actividad hostil, tendencias históricas.
18. Consulta automática a la API de Gatecamp Check en sistemas críticos.

### Fase 6 — Funcionalidades complementarias

19. Marcadores personales: guardar sistemas como favoritos o peligrosos.
20. Notas por sistema ("safe spot aquí", "evitar portal X").
21. Modo offline: caché de rutas y datos de sistemas para zonas sin conexión (wormholes).
22. API pública para integración con bots de Discord.
23. Dashboard corporativo: mapa de rutas activas y heatmap de zonas de riesgo.

---

## Notas de desarrollo

- Las estadísticas y datos de la API (fase 5) se implementarán de forma incremental a medida que se disponga de datos.
- Priorizar la funcionalidad base antes de agregar features sociales o de integración.
