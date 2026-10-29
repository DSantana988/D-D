// Pruebas del motor sin interfaz: carga los scripts en un contexto y simula combates con un bot.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'js');
const archivos = ['util.js', 'data/reglas.js', 'data/razas.js', 'data/clases.js', 'data/conjuros.js', 'data/objetos.js', 'data/monstruos.js', 'personaje.js', 'combate.js'];
const codigo = archivos.map(f => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n;\n') + '\n;var estado = null; globalThis.__exp = { crearHeroe, iniciarCombate, bucleCombate, terminarTurnoHeroe, heroeAtaca, moverHeroe, ataquesDisponibles, enemigosVivos, rutaHeroe, dist, lanzarConjuro, conjurosDisponibles, infoLanzamiento, usarRasgo, rasgosUsables, CLASES, RAZAS, MONSTRUOS, CONJUROS, Hooks, mapaDistancias, setEstado: e => { estado = e; }, getEstado: () => estado, ALTO_MAPA, ANCHO_MAPA, celdaLibre, subirNivel, puedeSubirNivel, espaciosLibres, claseArmadura, calcularPgMax, objetivosValidosArma, despuesAccionHeroe, terminarCombate };';
const ctx = { console, crypto: globalThis.crypto, TextEncoder, TextDecoder, setTimeout, Math, JSON };
vm.createContext(ctx);
vm.runInContext(codigo, ctx);
const M = ctx.__exp;

const errores = [];
function heroePara(clase, raza, nivel) {
  const reparto = M.CLASES[clase].reparto;
  const c = M.CLASES[clase];
  const habs = c.habilidades.de.slice(0, c.habilidades.elegir);
  const trucos = Object.keys(M.CONJUROS).filter(id => M.CONJUROS[id].nivel === 0 && M.CONJUROS[id].clases.includes(clase)).slice(0, 3);
  const conjs = Object.keys(M.CONJUROS).filter(id => M.CONJUROS[id].nivel > 0 && M.CONJUROS[id].clases.includes(clase));
  const h = M.crearHeroe({ nombre: 'Prueba', raza, clase, trasfondo: 'soldado', base: reparto, habilidades: habs, estilo: c.estilos ? c.estilos[0] : null, linaje: 'rojo', trucos, conjuros: conjs, pericia: habs.slice(0, 2), enemigoPredilecto: 'humanoide' });
  for (let n = 2; n <= nivel; n++) M.subirNivel(h, { pg: 'media' });
  h.invocaciones = ['descarga_agonizante', 'descarga_repulsora'];
  return h;
}

async function turnoBot() {
  const e = M.getEstado(); const c = e.combate; const h = e.heroe;
  for (let guard = 0; guard < 6 && c.esperandoJugador && !c.resultado; guard++) {
    const H = c.ents.heroe;
    // Usar un rasgo o conjuro al azar de vez en cuando
    const rasgos = M.rasgosUsables().filter(r => r.usable && !r.objetivo);
    if (rasgos.length && Math.random() < 0.3) await M.usarRasgo(rasgos[Math.floor(Math.random() * rasgos.length)].id);
    const vivos = M.enemigosVivos();
    if (!vivos.length) break;
    vivos.sort((a, b) => M.dist(H, a) - M.dist(H, b));
    const obj = vivos[0];
    const conjs = M.conjurosDisponibles(h).map(id => M.infoLanzamiento(id, true)).filter(i => !i.motivo && i.niveles.length);
    if (conjs.length && Math.random() < 0.5 && c.t.accion) {
      const i = conjs[Math.floor(Math.random() * conjs.length)];
      let objetivo = obj.id;
      if (i.cj.objetivo === 'punto' || i.cj.objetivo === 'direccion') objetivo = { x: obj.x, y: obj.y };
      if (i.cj.objetivo === 'casilla_libre') objetivo = { x: H.x, y: Math.max(0, H.y - 1) };
      if (i.cj.alcance === 1 && M.dist(H, obj) > 1 && i.cj.objetivo === 'enemigo') objetivo = null;
      if (objetivo) { await M.lanzarConjuro(i.idConjuro, i.niveles[i.niveles.length - 1], objetivo); continue; }
    }
    const armas = M.ataquesDisponibles(h);
    const usable = armas.find(a => M.objetivosValidosArma(a).includes(obj));
    if (usable && (c.t.accion || c.t.ataquesRestantes > 0)) { await M.heroeAtaca(usable.uid, obj.id); await M.despuesAccionHeroe(); continue; }
    if (c.t.mov > 0) {
      let mejor = null;
      for (let y = 0; y < M.ALTO_MAPA; y++) for (let x = 0; x < M.ANCHO_MAPA; x++) {
        const r = M.rutaHeroe(x, y); if (!r) continue;
        const d = Math.max(Math.abs(x - obj.x), Math.abs(y - obj.y));
        if (!mejor || d < mejor.d) mejor = { x, y, d };
      }
      if (mejor) { await M.moverHeroe(mejor.x, mejor.y); if (h.caido) break; continue; }
    }
    break;
  }
}

async function simular(clase, raza, nivel, enemigos, dificultad = 'normal') {
  const e = { heroe: null, ajustes: { dificultad }, combate: null };
  M.setEstado(e);
  e.heroe = heroePara(clase, raza, nivel);
  let fin = null;
  M.Hooks.finCombate = c => { fin = c.resumen; };
  const c = M.iniciarCombate({ enemigos, terreno: 'cueva' }, 'prueba');
  if (!c) throw new Error('No se creó el combate');
  await M.bucleCombate();
  let vueltas = 0;
  while (!fin && vueltas++ < 200) {
    if (c.esperandoJugador) { await turnoBot(); await M.despuesAccionHeroe(); if (!c.resultado && c.esperandoJugador) await M.terminarTurnoHeroe(); }
    else if (!c.resultado) await M.bucleCombate();
    if (c.resultado && !fin) await new Promise(r => setTimeout(r, 0));
  }
  return { fin, rondas: c.ronda, pg: e.heroe.pg, log: c.log };
}

const casos = [];
const REPETICIONES = parseInt(process.env.REPS || '1', 10);
const clases = Object.keys(M.CLASES), razas = Object.keys(M.RAZAS);
const grupos = [[{ id: 'goblin', cantidad: 2 }], [{ id: 'esqueleto', cantidad: 2 }, { id: 'zombi', cantidad: 1 }], [{ id: 'lobo', cantidad: 3 }], [{ id: 'orco', cantidad: 2 }], [{ id: 'fanatico', cantidad: 1 }, { id: 'cultista', cantidad: 2 }], [{ id: 'arana_gigante' }], [{ id: 'necrofago' }], [{ id: 'dragon_rojo_joven' }], [{ id: 'troll' }], [{ id: 'cubo_gelatinoso' }], [{ id: 'mimeto' }], [{ id: 'capitan_bandido' }, { id: 'bandido', cantidad: 2 }], [{ id: 'minotauro' }], [{ id: 'gargola' }, { id: 'espectro' }], [{ id: 'hobgoblin', cantidad: 3 }], [{ id: 'jefe_orco' }], [{ id: 'kobold', cantidad: 4 }], [{ id: 'cieno_gris' }, { id: 'rata_gigante', cantidad: 3 }]];
let n = 0;
const resultados = {};
for (let rep = 0; rep < REPETICIONES; rep++) for (const clase of clases) for (let k = 0; k < 6; k++) {
  const raza = razas[(n++) % razas.length];
  const nivel = 1 + (k % 5);
  const grupo = grupos[(n * 7 + k) % grupos.length];
  const dif = ['facil', 'normal', 'dificil'][k % 3];
  try {
    const r = await simular(clase, raza, nivel, grupo, dif);
    if (!r.fin) throw new Error('El combate no terminó');
    resultados[r.fin.resultado] = (resultados[r.fin.resultado] || 0) + 1;
  } catch (err) {
    errores.push(`${clase}/${raza}/n${nivel}/${grupo.map(g => g.id).join('+')}: ${err.stack.split('\n').slice(0, 4).join(' | ')}`);
  }
}
console.log('Resultados:', JSON.stringify(resultados));
if (errores.length) { console.log('ERRORES (' + errores.length + '):\n' + errores.slice(0, 12).join('\n')); process.exit(1); }
console.log('OK: todos los combates simulados terminaron sin errores.');
