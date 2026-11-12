---
description: Agrega una capa nueva al mapa isométrico
argument-hint: <capa, p. ej. "carbono en el suelo" o "riesgo de erosión">
---

Agrega la capa **$ARGUMENTS** al mapa.

1. Lee `src/js/04-layers.js` (`LAYERS`, `layerVal`) y la receta en `docs/ARQUITECTURA.md`.
2. Define qué significa 0 y qué significa 100 en esta capa, y de qué variables del estado sale. Si la variable no existe, agrégala al modelo en `03-sim.js` con una dinámica simple y explícala.
3. Usa la rampa divergente existente (`ramp`) para que la paleta sea consistente; la leyenda debe tener textos `lo` y `hi` claros.
4. Muestra el valor en la etiqueta de cada potrero si aporta.
5. Corre `/verificar` y mira la captura con la capa activa.
