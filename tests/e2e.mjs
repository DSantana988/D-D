// Prueba de humo en navegador: crea un héroe, entra en la mazmorra y juega un combate.
// Uso: node tests/e2e.mjs [carpeta_capturas]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const capturas = process.argv[2] || null;
const errores = [];
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1360, height: 860 } });
pagina.on('pageerror', e => errores.push('pageerror: ' + e.message));
pagina.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errores.push('console: ' + m.text()); });
const clic = async (el) => { try { await el.click({ timeout: 2500 }); return true; } catch (e) { return false; } };
const foto = async (n) => { if (capturas) await pagina.screenshot({ path: path.join(capturas, n + '.png') }); };

await pagina.goto('file://' + path.join(raiz, 'index.html'));
await pagina.waitForSelector('.portada');
await foto('01-titulo');
await pagina.click('text=Nueva partida');
await pagina.waitForSelector('.creacion');
await foto('02-raza');
await pagina.click('text=Héroe aleatorio');
await pagina.waitForTimeout(200);
await foto('03-final');
// Elegir mazmorra (sin IA en el navegador de pruebas)
await pagina.click('.tarjeta-modo:has-text("Mazmorra clásica")');
await pagina.click('text=Comenzar la aventura');
await pagina.waitForSelector('.vista-mazmorra');
await foto('04-mazmorra');

// Recorrer salas hasta encontrar combate o agotar intentos
for (let paso = 0; paso < 30; paso++) {
  if (await pagina.$('.vista-combate')) break;
  const luchar = await pagina.$('button:has-text("Luchar")');
  if (luchar) { await luchar.click(); await pagina.waitForSelector('.vista-combate'); break; }
  // Resolver eventos / trampas / santuario / mercader
  const opcion = (await pagina.$('.mz-acciones .opciones .opcion:not([disabled]):has-text("sin explorar")')) || (await pagina.$('.mz-acciones .opciones .opcion:not([disabled]):not(:has-text("explorada"))')) || (await pagina.$('.mz-acciones .opciones .opcion:not([disabled])'));
  if (opcion) { await opcion.click(); await pagina.waitForTimeout(1600); }
  const cerrarModal = await pagina.$('#capa-modal:not([hidden]) .modal-pie .btn-primario:not([disabled])');
  if (cerrarModal) { await cerrarModal.click(); await pagina.waitForTimeout(200); }
}
await foto('05-antes-combate');
if (await pagina.$('.vista-combate')) {
  await foto('06-combate');
  for (let t = 0; t < 40; t++) {
    const fin = await pagina.$('#capa-modal:not([hidden]) .modal-pie .btn-primario');
    if (fin) {
      const txt = await fin.innerText().catch(() => '');
      await clic(fin); await pagina.waitForTimeout(400);
      if (!(await pagina.$('.vista-combate'))) { console.log('Combate cerrado con:', txt); break; }
      continue;
    }
    const finTurno = await pagina.$('.btn-fin-turno:not([disabled])');
    if (!finTurno) { await pagina.waitForTimeout(500); continue; }
    // Atacar si hay un objetivo con el botón rápido; si no, moverse hacia un enemigo
    const enemigo = await pagina.$('.cmb-celda .ficha-ent.enemigo');
    if (enemigo) { await clic(enemigo); await pagina.waitForTimeout(150); }
    const atacar = await pagina.$('.ficha-enemigo .btn-primario');
    if (atacar) { await clic(atacar); await pagina.waitForTimeout(1500); if (t === 0) await foto('07-ataque'); continue; }
    const celdas = await pagina.$$('.cmb-celda.alcanzable');
    if (celdas.length) {
      const ult = celdas[celdas.length - 1];
      await clic(ult); await pagina.waitForTimeout(100);
      const mover = await pagina.$('button:has-text("Mover aquí")');
      if (mover) { await clic(mover); await pagina.waitForTimeout(900); }
    }
    const ft = await pagina.$('.btn-fin-turno:not([disabled])');
    if (ft) { await clic(ft); await pagina.waitForTimeout(1800); }
  }
  await foto('08-tras-combate');
}
// Ficha y equipo
await pagina.click('.panel-tabs button:has-text("Equipo")').catch(() => {});
await foto('09-equipo');
// Móvil
await pagina.setViewportSize({ width: 390, height: 844 });
await pagina.waitForTimeout(300);
await foto('10-movil');
const anchoDoc = await pagina.evaluate(() => document.documentElement.scrollWidth);
if (anchoDoc > 392) errores.push('Desbordamiento horizontal en móvil: ' + anchoDoc + 'px');
await navegador.close();
if (errores.length) { console.log('ERRORES:\n' + errores.join('\n')); process.exit(1); }
console.log('OK: prueba de navegador sin errores.');
