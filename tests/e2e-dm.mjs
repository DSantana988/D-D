// Prueba del modo DM con un Claude simulado: narración, tirada, combate, efectos y tienda.
// Uso: node tests/e2e-dm.mjs [carpeta_capturas]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const capturas = process.argv[2] || null;
const errores = [];
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1360, height: 860 } });
pagina.on('pageerror', e => errores.push('pageerror: ' + e.message));
pagina.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errores.push('console: ' + m.text()); });
const clic = async (el) => { try { await el.click({ timeout: 2500 }); return true; } catch (e) { return false; } };
const foto = async (n) => { if (capturas) await pagina.screenshot({ path: path.join(capturas, n + '.png') }); };

await pagina.addInitScript(() => {
  const R = [
    'La niebla se arrastra sobre los campos de **Brumaverde** cuando llegas a la aldea. Las campanas de la capilla doblan sin que nadie las toque. Junto al pozo, la alcaldesa **Imelda Corvo** te espera con los brazos cruzados.\n\n—Llegas tarde —dice—. Anoche se llevaron a otro.\n@@@\n{"lugar":"Plaza de Brumaverde","mision":"Descubrir qué despierta a los muertos","opciones":["Preguntar por los desaparecidos","Ir a la capilla","Examinar el pozo"],"diario":["La alcaldesa Imelda Corvo ofrece 200 po."]}',
    'Te inclinas sobre el brocal. Algo brilla en el fondo, entre el musgo.\n@@@\n{"tirada":{"tipo":"habilidad","habilidad":"Percepción","cd":12,"motivo":"Distinguir qué hay en el fondo del pozo"}}',
    'Ves un anillo de plata... y una mano huesuda que trepa por la pared. ¡Dos esqueletos emergen del pozo!\n@@@\n{"combate":{"enemigos":[{"id":"esqueleto","cantidad":2}],"terreno":"ciudad","sorpresa":"ninguna"}}',
    'Los huesos se desmoronan sobre los adoquines. Imelda te mira con otros ojos y te entrega una bolsa. —Hay un mercader en la posada, por si necesitas algo.\n@@@\n{"lugar":"Posada del Ganso Tuerto","efectos":[{"tipo":"oro","cantidad":40},{"tipo":"objeto","nombre":"Anillo de plata con un sello","descripcion":"Lleva el emblema del rey Valdren."},{"tipo":"px","cantidad":50,"motivo":"Salvar la aldea"}],"tienda":["pocion_curacion","antidoto","escudo"],"opciones":["Hablar con el mercader","Descansar en la posada"]}',
    'Duermes a pierna suelta en la posada.\n@@@\n{"efectos":[{"tipo":"descanso","clase":"largo"},{"tipo":"inspiracion"}],"opciones":["Partir hacia la cripta"]}',
  ];
  let i = 0;
  window.__entradas = [];
  const sample = async (entrada, op = {}) => {
    window.__entradas.push(entrada);
    const t = R[Math.min(i++, R.length - 1)];
    for (let k = 20; k < t.length + 20; k += 20) { await new Promise(r => setTimeout(r, 8)); if (op.onText) op.onText({ text: t.slice(0, k), delta: '' }); }
    return { text: t, truncated: false, modelTierApplied: op.modelTier || 'default' };
  };
  window.claude = { use: async (n) => (n === 'sample' ? sample : null) };
});

await pagina.goto('file://' + path.join(raiz, 'index.html'));
await pagina.waitForSelector('.portada');
await pagina.click('text=Nueva partida');
await pagina.click('text=Héroe aleatorio');
await pagina.waitForTimeout(200);
await pagina.click('.tarjeta-modo:has-text("Campaña con Claude")');
await foto('dm-01-final');
await pagina.click('text=Comenzar la aventura');
await pagina.waitForSelector('.msg-dm:not(.escribiendo)');
await pagina.waitForSelector('.opciones .opcion');
await foto('dm-02-intro');
await pagina.click('.opcion:has-text("Examinar el pozo")');
await pagina.waitForSelector('.tarjeta-tirada');
await foto('dm-03-tirada');
await pagina.click('.btn-tirar-d20');
await pagina.waitForSelector('.tarjeta-combate-pend', { timeout: 15000 });
await foto('dm-04-combate-pend');
await pagina.click('.tarjeta-combate-pend button:has-text("Luchar")');
await pagina.waitForSelector('.vista-combate');
await foto('dm-05-combate');
// Ganar o perder: bucle de turnos
for (let t = 0; t < 60; t++) {
  const fin = await pagina.$('#capa-modal:not([hidden]) .modal-pie .btn-primario');
  if (fin) { const txt = await fin.innerText().catch(() => ''); await clic(fin); await pagina.waitForTimeout(400); if (!(await pagina.$('.vista-combate'))) break; continue; }
  const ft = await pagina.$('.btn-fin-turno:not([disabled])');
  if (!ft) { await pagina.waitForTimeout(400); continue; }
  const enemigo = await pagina.$('.cmb-celda .ficha-ent.enemigo');
  if (enemigo) { await clic(enemigo); await pagina.waitForTimeout(100); }
  const atacar = await pagina.$('.ficha-enemigo .btn-primario');
  if (atacar) { await clic(atacar); await pagina.waitForTimeout(1300); continue; }
  const celdas = await pagina.$$('.cmb-celda.alcanzable');
  if (celdas.length) { await clic(celdas[celdas.length - 1]); await pagina.waitForTimeout(80); const mv = await pagina.$('button:has-text("Mover aquí")'); if (mv) { await clic(mv); await pagina.waitForTimeout(800); } }
  const ft2 = await pagina.$('.btn-fin-turno:not([disabled])');
  if (ft2) { await clic(ft2); await pagina.waitForTimeout(1500); }
}
// Si murió, el modal de muerte bloquea: lo aceptamos como resultado válido
const muerte = await pagina.$('.modal-muerte');
if (!muerte) {
  await pagina.waitForSelector('button:has-text("Abrir tienda")', { timeout: 15000 });
  await foto('dm-06-tras-combate');
  await pagina.click('button:has-text("Abrir tienda")');
  await pagina.waitForSelector('.tienda');
  await foto('dm-07-tienda');
  const comprar = await pagina.$('.lista-tienda button:not([disabled])');
  if (comprar) await comprar.click();
  await pagina.click('#capa-modal .modal-pie .btn-primario');
  await pagina.click('.opcion:has-text("Descansar en la posada")');
  await pagina.waitForSelector('.opcion:has-text("Partir hacia la cripta")', { timeout: 15000 });
  await pagina.click('.panel-tabs button:has-text("Diario")');
  await foto('dm-08-diario');
}
const info = await pagina.evaluate(() => {
  const ult = window.__entradas[window.__entradas.length - 1];
  return { llamadas: window.__entradas.length, reglas: ult[0].content.includes('BESTIARIO'), estado: ult[ult.length - 1].content.includes('[ESTADO ACTUAL DEL HÉROE]'), roles: ult.map(t => t.role).join(','), ultimo: ult[ult.length - 1].content.slice(-400) };
});
console.log(JSON.stringify(info, null, 1));
if (!info.reglas || !info.estado) errores.push('La entrada al DM no tiene el formato esperado');
await pagina.setViewportSize({ width: 390, height: 844 });
await pagina.waitForTimeout(300);
await foto('dm-09-movil');
const anchoDoc = await pagina.evaluate(() => document.documentElement.scrollWidth);
if (anchoDoc > 392) errores.push('Desbordamiento horizontal en móvil: ' + anchoDoc + 'px');
await navegador.close();
if (errores.length) { console.log('ERRORES:\n' + errores.join('\n')); process.exit(1); }
console.log('OK: modo DM sin errores.' + (muerte ? ' (el héroe murió en el combate de prueba)' : ''));
