---
description: Agrega un nuevo escenario al panel "Provocar un evento"
argument-hint: <evento, p. ej. "incendio en el bosque" o "llegada de un comprador que exige trazabilidad">
---

Agrega el escenario **$ARGUMENTS** a la finca.

1. Lee `docs/ARQUITECTURA.md` (receta "Agregar un escenario") y `provoke()` en `src/js/03-sim.js`.
2. Diseña antes de codificar: qué variables del estado toca, cuánto dura, qué componentes afecta en cadena y cómo se recupera la finca. Muéstrame ese diseño en 5 líneas.
3. Implementa: botón en `#scen` (`index.html`), rama en `provoke()`, duración en `S.ev` si aplica, registro en la bitácora con `addLog`, y una alerta si corresponde.
4. Si el evento crea una relación nueva entre componentes, agrégala en `relations()` (`06-panels.js`).
5. Corre `/verificar`.
