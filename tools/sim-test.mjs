// Prueba del modelo SIN navegador: carga util + mundo + simulación en una VM de Node
// y comprueba invariantes en una corrida larga. Uso: node tools/sim-test.mjs [días]
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DAYS = Number(process.argv[2] || 300);
const ctx = vm.createContext({
  console, Math, JSON, Date,
  matchMedia: () => ({ matches: false }),
  document: { getElementById: () => null },
  // Ganchos visuales que la simulación invoca (están en 05-render / 06-panels / 08-interaction).
  dispatchWorker() {}, goLive() {}, selectE() {}, terrDirty: false, uiDirty: false,
});
for (const f of ["01-util.js", "02-world.js", "03-sim.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "src/js", f), "utf8"), ctx, { filename: f });
}
const run = code => vm.runInContext(code, ctx);

let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log("  ✗ " + msg); } };
const finite = (obj, where) => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number") check(Number.isFinite(v), `${where}.${k} no es finito (${v})`);
  }
};

run("bootSim()");
const t0 = run("S.t");
console.log(`Arranque: índice ${run("Math.round(S.idx)")}, ${run("LOG.length")} eventos, ${run("LOTS.length")} lotes, ${run("SNAP.length")} instantáneas`);

// 1. La cerca de P4 arranca rota y ensucia la quebrada; repararla debe limpiar el agua.
const ntuBefore = run("S.q.Q2.ntu");
run("act('fence','P4')");
for (let h = 0; h < 72; h++) run("step()");
const ntuAfter = run("S.q.Q2.ntu");
console.log(`Cerca P4 reparada: turbidez Q media ${ntuBefore.toFixed(1)} → ${ntuAfter.toFixed(1)} NTU en 72 h`);
check(ntuAfter < ntuBefore, "reparar la cerca no bajó la turbidez de Q media");

// 2. Corrida larga: nada se sale de rango ni se vuelve NaN.
const rows = [];
for (let d = 1; d <= DAYS; d++) {
  for (let h = 0; h < 24; h++) run("step()");
  const s = run("S");
  check(s.idx >= 0 && s.idx <= 100, `día ${d}: índice fuera de rango (${s.idx})`);
  for (const [k, v] of Object.entries(s.scores)) check(v >= 0 && v <= 100 && Number.isFinite(v), `día ${d}: score ${k}=${v}`);
  check(s.res.level >= 0 && s.res.level <= 100, `día ${d}: reservorio ${s.res.level}`);
  for (const [id, z] of Object.entries(s.pad)) finite(z, `día ${d} pad ${id}`);
  if (d % 30 === 0) rows.push({ día: d, índice: Math.round(s.idx), reservorio: Math.round(s.res.level), ...Object.fromEntries(Object.entries(s.scores).map(([k, v]) => [k, Math.round(v)])) });
  if (fails > 20) break;
}
console.table(rows);
// LOTS guarda los 45 lotes más recientes; el último debe ser de ayer o de hoy.
check(run("S.t - LOTS[0].t") <= 48, "el último lote de leche tiene más de 2 días");
check(run("S.t") - t0 === (DAYS * 24 + 72), "el reloj no avanzó una hora por paso");

console.log(fails ? `\n${fails} problema(s).` : `\nModelo OK: ${DAYS} días simulados sin valores fuera de rango.`);
process.exit(fails ? 1 : 0);
