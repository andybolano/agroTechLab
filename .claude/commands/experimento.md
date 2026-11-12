---
description: Corre un experimento sobre el modelo con hipótesis, línea base y comparación
argument-hint: <hipótesis, p. ej. "si duplico los árboles de P4 baja el estrés calórico">
---

Quiero correr un experimento sobre la simulación: **$ARGUMENTS**

Sigue este protocolo:

1. **Hipótesis:** reescríbela en una frase medible (qué variable, en qué dirección, en cuánto tiempo).
2. **Línea base:** corre `node tools/sim-test.mjs 365` y guarda la tabla.
3. **Intervención:** haz el cambio mínimo en `src/js/` (parámetro, condición inicial o regla). Muéstrame el diff.
4. **Resultado:** vuelve a correr la misma prueba y compara índice y componentes mes a mes en una tabla antes/después.
5. **Lectura sistémica:** explica qué otros componentes se movieron y por qué (la finca es un sistema). Menciona efectos no deseados.
6. **Veredicto:** ¿se cumple la hipótesis? Aclara que el modelo es ilustrativo y no calibrado.
7. Pregúntame si conservo el cambio o lo revierto.
