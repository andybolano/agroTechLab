# CLAUDE.md — AgroTech Lab · Finca El Porvenir

Guía para Claude (y para humanos) al trabajar en este repositorio. Léela completa antes de tocar código.

## Qué es esto

Un **gemelo digital simulado** de una finca ganadera del Caribe colombiano para explorar la *integralidad del entorno*: suelo, agua, vegetación, animal, clima, biodiversidad y dimensión humana como **un solo sistema**. No hay sensores reales: todo sale de un modelo determinista que avanza hora a hora. Es un **experimento**, no un producto ni una herramienta agronómica validada.

## Principios del proyecto (no negociables)

1. **Cero dependencias y cero build.** HTML + CSS + JavaScript clásico. Se abre con doble clic en `index.html` y se publica tal cual en GitHub Pages. No agregues npm, bundlers, frameworks ni módulos ES (`import`/`export` rompen `file://`).
2. **Todo es sistema.** Un cambio en un componente debe poder afectar a otros. Si agregas una variable nueva, piensa qué la causa y a qué afecta, y muéstralo en la pestaña *Relaciones* si es relevante.
3. **Trazabilidad.** Todo lo que cambia el estado de la finca deja huella en la bitácora (`addLog`). Nada pasa “en silencio”.
4. **Estado = forma + color + texto.** Nunca codifiques un estado solo con color. Usa `ST`, `mark()` y `drawMark()` de `01-util.js`.
5. **Determinismo.** Usa `simR()` (PRNG con semilla) en la simulación, nunca `Math.random()`. La misma semilla debe producir la misma finca.
6. **Honestidad.** Los números son ilustrativos. No presentes fórmulas como calibradas. En la UI se ve el sello “Datos simulados”: no lo quites.
7. **Español** en la UI, comentarios, commits y documentación.

## Mapa del código

Scripts clásicos que comparten el ámbito global y se cargan **en este orden** desde `index.html`:

| Archivo | Responsabilidad | Toca el DOM |
|---|---|---|
| `src/js/01-util.js` | Utilidades, colores, fechas, estados (`ST`, `stOf`), componentes (`COMP`) | Mínimo (`$`) |
| `src/js/02-world.js` | Mundo: rejilla 40×30, potreros `PADDEF`, quebrada, edificios, sensores `SENS`, árboles, cercas, caminos | No |
| `src/js/03-sim.js` | **Modelo.** `newState`, `step` (1 h), `computeScores`, alertas, lotes de leche, `act` (acciones del operador), `provoke` (escenarios), `bootSim` | No* |
| `src/js/04-layers.js` | Capas del mapa (`LAYERS`) y su color por celda | No |
| `src/js/05-render.js` | Motor isométrico en Canvas 2D: cámara, terreno, sprites, vacas, trabajadores, clima, `frame()` | Sí |
| `src/js/06-panels.js` | Paneles HTML: índice, componentes, fichas de detalle, alertas, relaciones, lotes | Sí |
| `src/js/07-timeline.js` | Línea de tiempo y modo revisión (`VIEW`) | Sí |
| `src/js/08-interaction.js` | Clics, arrastre, zoom, teclado, tooltips | Sí |
| `src/js/09-boot.js` | Arranque y gancho de pruebas `window.__finca` | Sí |
| `src/css/app.css` | Estilos (tema oscuro único, tokens en `:root`) | — |

\* La simulación llama cinco ganchos visuales definidos más adelante: `dispatchWorker`, `goLive`, `selectE`, `terrDirty`, `uiDirty`. `tools/sim-test.mjs` los reemplaza por stubs. **No agregues más dependencias de la simulación hacia la UI**; si necesitas avisar a la UI, marca `uiDirty = true`.

Arquitectura detallada, forma del estado y recetas de extensión: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Comandos

```bash
node tools/servir.mjs          # servidor local en http://localhost:8080 (o abre index.html con doble clic)
node tools/sim-test.mjs        # prueba del modelo sin navegador: 300 días, invariantes y rangos
node tools/sim-test.mjs 720    # corrida más larga
node tools/captura.mjs         # captura PNG con Chrome sin interfaz → docs/img/captura.png
```

## Flujo de trabajo esperado

1. **Antes de cambiar el modelo**, corre `node tools/sim-test.mjs` y guarda la tabla como línea base.
2. Haz el cambio más pequeño posible en el archivo que corresponde (ver tabla).
3. **Después**, vuelve a correr `sim-test` y compara: ¿el índice sigue entre 0 y 100? ¿la estación seca/lluviosa sigue teniendo forma razonable? Explica la diferencia.
4. Si cambiaste algo visible, genera una captura (`node tools/captura.mjs`) y **mírala** antes de declarar que terminaste.
5. Verifica que la consola del navegador queda limpia.
6. Si agregaste algo que el usuario puede ver o hacer, documéntalo en el README.

## Convenciones de código

- Estilo compacto existente: funciones flecha cortas, sin punto y coma extra, nombres cortos en el modelo (`z` = potrero, `s` = estado, `q` = tramo de quebrada). Respeta el estilo del archivo que editas.
- Constantes de mundo en MAYÚSCULAS (`PADDEF`, `SENS`, `LAYERS`).
- Valores 0–100 pasan por `clamp()`. Puntajes siempre 0–100.
- Unidades en la UI: formato colombiano con `num()` (coma decimal) y `cop()` para pesos.
- Textos de la UI cortos, en voz activa, explicando *por qué* pasa algo (“El hato entra por la cerca rota de P4: pisotea la orilla”).
- Accesibilidad: botones reales (`<button>`), `aria-label` en controles sin texto, respeta `RM` (movimiento reducido).

## Qué NO hacer

- No conviertas el proyecto a React/Vite/TypeScript sin que te lo pidan explícitamente.
- No uses `Math.random()` dentro de `03-sim.js`.
- No guardes estado en `localStorage` como si fuera la fuente de verdad.
- No borres el sello “Datos simulados” ni el aviso de experimento del README.
- No subas capturas enormes: PNG ≤ 1,5 MB en `docs/img/`.

## Comandos de Claude incluidos

En `.claude/commands/` hay atajos para tareas típicas: `/verificar`, `/experimento`, `/nuevo-evento`, `/nueva-capa`, `/nuevo-sensor`, `/conectar-datos-reales`. En `.claude/agents/` está el agente `revisor-agronomico`, que revisa la plausibilidad de los cambios al modelo.
