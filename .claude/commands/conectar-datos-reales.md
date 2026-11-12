---
description: Planea (y opcionalmente implementa) reemplazar una variable simulada por datos reales
argument-hint: <fuente, p. ej. "temperatura desde Open-Meteo para Montería" o "CSV de pesajes">
---

Quiero reemplazar una parte de la simulación por datos reales: **$ARGUMENTS**

1. Identifica qué variables de `S` alimenta esta fuente y en qué punto de `step()` se calculan hoy.
2. Propón un **adaptador** en un archivo nuevo `src/js/10-datos-reales.js` (cargado después de `03-sim.js`) que sobrescriba solo esas variables, sin tocar la vista. Si la fuente no responde, la simulación sigue como respaldo y queda registrado en la bitácora.
3. Respeta los principios de `CLAUDE.md`: sin dependencias, sin claves secretas en el repositorio, y marca en la UI qué datos son reales y cuáles simulados.
4. Muéstrame el plan antes de implementar. Si apruebo, implementa y corre `/verificar`.
