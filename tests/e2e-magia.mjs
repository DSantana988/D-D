// Prueba de conjuros en combate y de la subida de nivel con un mago creado a mano.
// Uso: node tests/e2e-magia.mjs [carpeta_capturas]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const capturas = process.argv[2] || null;
const errores = [];
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1360, height: 900 } });
pagina.on('pageerror', e => errores.push('pageerror: ' + e.message));
pagina.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errores.push('console: ' + m.text()); });
const foto = async (n) => { if (capturas) await pagina.screenshot({ path: path.join(capturas, n + '.png') }); };
const elegir = async (sel) => pagina.locator(sel).first().click();

await pagina.goto('file://' + path.join(raiz, 'index.html') + '#depurar');
await elegir('text=Nueva partida');
await elegir('.tarjeta:has-text("Elfo")'); await elegir('text=Siguiente');
await elegir('.tarjeta:has-text("Mago")'); await elegir('text=Siguiente');
await elegir('text=Siguiente');
await elegir('.tarjeta:has-text("Erudito")');
for (let k = 0; k < 2; k++) await elegir('.rejilla-casillas input:not(:checked):not([disabled])');
await elegir('text=Siguiente');
for (const n of ['Descarga de fuego', 'Rayo de escarcha', 'Toque helado', 'Proyectil mágico', 'Manos ardientes', 'Dormir', 'Escudo']) await elegir(`.tarjeta-conjuro:has-text("${n}")`);
await elegir('text=Siguiente');
await pagina.fill('#cr-nombre', 'Elminster');
await elegir('.tarjeta-modo:has-text("Mazmorra")');
await elegir('text=Comenzar la aventura');
await pagina.waitForSelector('.vista-mazmorra');

// Combate preparado
await pagina.evaluate(() => window.__dyd.empezarCombate({ enemigos: [{ id: 'zombi', cantidad: 1 }], terreno: 'mazmorra' }, 'mazmorra'));
await pagina.waitForSelector('.vista-combate');
const esperarTurno = async () => { for (let i = 0; i < 60; i++) { if (await pagina.$('.btn-fin-turno:not([disabled])')) return true; const m = await pagina.$('#capa-modal:not([hidden]) .modal-pie .btn-primario'); if (m) { await m.click().catch(() => {}); } await pagina.waitForTimeout(250); } return false; };
await esperarTurno();
// Proyectil mágico contra un goblin
await elegir('.botonera button:has-text("Conjuros")');
await foto('m-01-menu-conjuros');
await elegir('.submenu .item-menu:has-text("Proyectil mágico")');
await elegir('.cmb-celda.objetivo');
await pagina.waitForTimeout(1500);
const log1 = await pagina.locator('#cmb-log').innerText();
if (!/dardos impactan/.test(log1)) errores.push('Proyectil mágico no aparece en el registro');
await pagina.locator('.btn-fin-turno:not([disabled])').click().catch(() => {});
if (!(await esperarTurno()) || !(await pagina.$('.vista-combate'))) errores.push('No volvió el turno del héroe');
else {
  // Manos ardientes hacia el enemigo más cercano (doble toque para confirmar)
  await elegir('.botonera button:has-text("Conjuros")');
  const disp = await pagina.$('.submenu .item-menu:has-text("Manos ardientes"):not([disabled])');
  if (!disp) errores.push('Manos ardientes no está disponible en el segundo turno');
  if (disp) {
    await disp.click();
    const pos = await pagina.evaluate(() => { const c = window.__dyd.estado.combate; const H = c.ents.heroe; const e = Object.values(c.ents).find(x => x.id !== 'heroe' && x.pg > 0); return { x: H.x + Math.sign(e.x - H.x), y: H.y + Math.sign(e.y - H.y) }; });
    const sel = `.cmb-celda[data-k="${pos.x},${pos.y}"]`;
    await pagina.locator(sel).click();
    await foto('m-02-area');
    await pagina.locator(sel).click();
    await pagina.waitForTimeout(1500);
    const log2 = await pagina.locator('#cmb-log').innerText();
    if (!/Manos ardientes/.test(log2)) errores.push('Manos ardientes no se lanzó');
  }
}
await foto('m-03-tras-conjuros');
// Terminar el combate a la fuerza y probar la subida de nivel
await pagina.evaluate(() => { const c = window.__dyd.estado.combate; if (c) Object.values(c.ents).forEach(e => { if (e.id !== 'heroe') e.pg = 0; }); });
await pagina.locator('.btn-fin-turno:not([disabled])').click().catch(() => {});
for (let i = 0; i < 20 && await pagina.$('.vista-combate'); i++) { const m = await pagina.$('#capa-modal:not([hidden]) .modal-pie .btn-primario'); if (m) await m.click().catch(() => {}); await pagina.waitForTimeout(300); }
await pagina.evaluate(() => { const e = window.__dyd.estado; e.heroe.px = 950; window.__dyd.flujoSubidaNivel(); });
await pagina.waitForSelector('.subida');
await foto('m-04-subida');
for (let nivel = 0; nivel < 2; nivel++) {
  for (let k = 0; k < 4; k++) { const t = await pagina.$('.subida .tarjeta-conjuro:not(.activa):not([disabled])'); if (!t) break; await t.click(); }
  await pagina.locator('#capa-modal .modal-pie .btn-primario').click();
  await pagina.waitForTimeout(300);
  if (!(await pagina.$('.subida'))) break;
}
const nivel = await pagina.evaluate(() => window.__dyd.estado.heroe.nivel);
if (nivel !== 3) errores.push('Esperaba nivel 3 y es ' + nivel);
await pagina.locator('.panel-tabs button:has-text("Magia")').click();
await foto('m-05-magia');
await navegador.close();
if (errores.length) { console.log('ERRORES:\n' + errores.join('\n')); process.exit(1); }
console.log('OK: conjuros y subida de nivel sin errores (nivel ' + nivel + ').');
