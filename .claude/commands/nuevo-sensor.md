---
description: Agrega un sensor simulado al mapa con su ficha, estado y serie de tiempo
argument-hint: <sensor, p. ej. "estación de CO2 en el bosque" o "collar GPS para el toro">
---

Agrega el sensor **$ARGUMENTS**.

1. Lee cómo están definidos los sensores en `SENS` (`src/js/02-world.js`) y cómo se leen en `sensorStatus` / `sensorScore` (`05-render.js`) y `detailSensor` (`06-panels.js`).
2. Ubícalo en una celda coherente con lo que mide (no encima de etiquetas ni edificios).
3. Su lectura debe salir del estado simulado `S`, con ruido determinista si hace falta (nunca `Math.random()`).
4. Debe poder fallar con el escenario "Falla de sensor" y mostrar "Sin señal".
5. Corre `/verificar`.
