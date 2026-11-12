// Captura de pantalla de la app con Chrome sin interfaz, sin dependencias de npm.
// Uso: node tools/captura.mjs [salida.png] [ancho] [alto]
// Si Chrome no está en la ruta habitual, define la variable CHROME con su ruta.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] || path.join(root, "docs/img/captura.png"));
if (fs.existsSync(out)) fs.rmSync(out);
const [w, h] = [process.argv[3] || 1600, process.argv[4] || 940];

const candidates = [
  process.env.CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].filter(Boolean);
const chrome = candidates.find(p => fs.existsSync(p));
if (!chrome) { console.error("No encontré Chrome. Define CHROME=/ruta/a/chrome"); process.exit(1); }

execFileSync(chrome, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
  `--window-size=${w},${h}`, "--virtual-time-budget=4000", `--screenshot=${out}`,
  pathToFileURL(path.join(root, "index.html")).href,
], { stdio: "ignore" });
if (!fs.existsSync(out)) { console.error("Chrome no escribió la captura (¿carpeta fuera del proyecto o sin permisos?)"); process.exit(1); }
console.log(`Captura guardada en ${path.relative(process.cwd(), out)} (${w}×${h})`);
