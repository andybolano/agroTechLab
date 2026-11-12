---
description: Verifica que la finca sigue sana después de un cambio (modelo, captura y consola)
---

Verifica el estado del proyecto después de los últimos cambios:

1. Corre `node tools/sim-test.mjs` y muestra la tabla. Si falla, detente y explica la causa.
2. Corre `node tools/captura.mjs` y **mira** `docs/img/captura.png`. Describe en dos líneas si algo se ve roto (paneles cortados, mapa vacío, textos encimados).
3. Revisa con `git diff --stat` qué archivos cambiaron y confirma que se respetan los principios de `CLAUDE.md` (sin dependencias, sin `Math.random()` en `03-sim.js`, estado con forma + color + texto, eventos registrados en la bitácora).
4. Resume en una lista corta: qué pasó, qué falló y qué falta. No declares éxito si algo no se verificó.

$ARGUMENTS
