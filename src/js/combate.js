// ─── Motor de combate táctico en cuadrícula ───
// La interfaz se conecta a través de Hooks (ver combate-ui.js). Sin interfaz, los hooks no hacen nada.

const Hooks = {
  render() {},
  log() {},
  async dado(tirada, etiqueta) {},
  async preguntar(titulo, texto, opciones) { return opciones[0].valor; },
  flotante(entId, texto, clase) {},
  async pausa(ms) {},
  finCombate(c) {},
};

const ANCHO_MAPA = 12, ALTO_MAPA = 8;

const TERRENOS = {
  mazmorra: { nombre: 'Mazmorra', obstaculo: 'Pilar', n: [6, 10] },
  cripta: { nombre: 'Cripta', obstaculo: 'Sarcófago', n: [6, 10] },
  cueva: { nombre: 'Cueva', obstaculo: 'Roca', n: [8, 13] },
  bosque: { nombre: 'Bosque', obstaculo: 'Árbol', n: [8, 14] },
  templo: { nombre: 'Templo', obstaculo: 'Columna', n: [6, 9] },
  ciudad: { nombre: 'Calle', obstaculo: 'Carro', n: [5, 9] },
  taberna: { nombre: 'Taberna', obstaculo: 'Mesa', n: [7, 11] },
  llanura: { nombre: 'Campo abierto', obstaculo: 'Roca', n: [2, 5] },
  pantano: { nombre: 'Pantano', obstaculo: 'Fango profundo', n: [8, 13] },
  ruinas: { nombre: 'Ruinas', obstaculo: 'Escombros', n: [7, 12] },
  volcan: { nombre: 'Volcán', obstaculo: 'Lava', n: [6, 10] },
};

// ─── Geometría ───
function dist(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
function enMapa(x, y) { return x >= 0 && y >= 0 && x < ANCHO_MAPA && y < ALTO_MAPA; }
function esObstaculo(c, x, y) { return !enMapa(x, y) || c.celdas[y][x] === 1; }
function entEn(c, x, y) { return Object.values(c.ents).find(e => e.x === x && e.y === y && (e.id === 'heroe' || e.pg > 0)); }
function celdaLibre(c, x, y) { return enMapa(x, y) && !esObstaculo(c, x, y) && !entEn(c, x, y); }

function lineaCeldas(x0, y0, x1, y1) {
  const celdas = []; let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
  for (;;) {
    celdas.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return celdas;
}
function tieneCobertura(c, a, b) {
  const l = lineaCeldas(a.x, a.y, b.x, b.y);
  return l.slice(1, -1).some(([x, y]) => esObstaculo(c, x, y));
}

// BFS: distancias desde (x,y). bloqueaEnts: no se puede atravesar a los rivales.
function mapaDistancias(c, origen, opciones = {}) {
  const { vuela = false, bando = 'heroe' } = opciones;
  const d = Array.from({ length: ALTO_MAPA }, () => Array(ANCHO_MAPA).fill(Infinity));
  const previo = {};
  d[origen.y][origen.x] = 0;
  const cola = [[origen.x, origen.y]];
  while (cola.length) {
    const [x, y] = cola.shift();
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!enMapa(nx, ny) || d[ny][nx] !== Infinity) continue;
      if (esObstaculo(c, nx, ny) && !vuela) continue;
      const o = entEn(c, nx, ny);
      if (o) {
        const rival = bando === 'heroe' ? o.id !== 'heroe' : o.id === 'heroe';
        if (rival) continue;
      }
      d[ny][nx] = d[y][x] + 1;
      previo[nx + ',' + ny] = [x, y];
      cola.push([nx, ny]);
    }
  }
  return { d, previo };
}
function reconstruirRuta(previo, origen, destino) {
  const ruta = []; let cur = [destino.x, destino.y];
  while (cur && !(cur[0] === origen.x && cur[1] === origen.y)) { ruta.unshift({ x: cur[0], y: cur[1] }); cur = previo[cur[0] + ',' + cur[1]]; }
  return ruta;
}

// Celdas de un área de efecto
function celdasArea(c, area, origen, objetivo) {
  const res = [];
  for (let y = 0; y < ALTO_MAPA; y++) for (let x = 0; x < ANCHO_MAPA; x++) {
    if (area.forma === 'esfera') {
      const dx = x - objetivo.x, dy = y - objetivo.y;
      if (dx * dx + dy * dy <= (area.tam + 0.5) * (area.tam + 0.5)) res.push({ x, y });
    } else if (area.forma === 'radio_yo') {
      if ((x !== origen.x || y !== origen.y) && dist({ x, y }, origen) <= area.tam) res.push({ x, y });
    } else if (area.forma === 'cono' || area.forma === 'linea') {
      if (x === origen.x && y === origen.y) continue;
      const vx = objetivo.x - origen.x, vy = objetivo.y - origen.y;
      const largo = Math.hypot(vx, vy) || 1;
      const ux = vx / largo, uy = vy / largo;
      const px = x - origen.x, py = y - origen.y;
      const proy = px * ux + py * uy;
      const perp = Math.abs(px * uy - py * ux);
      if (area.forma === 'cono') {
        if (proy > 0 && Math.hypot(px, py) <= area.tam + 0.5 && perp <= proy * 0.58 + 0.15) res.push({ x, y });
      } else if (proy > 0 && proy <= area.tam + 0.5 && perp <= 0.55) res.push({ x, y });
    }
  }
  return res;
}

// ─── Utilidades de entidades ───
function cmb() { return estado.combate; }
function heroeEnt() { return estado.combate.ents.heroe; }
function enemigos(c = cmb()) { return Object.values(c.ents).filter(e => e.id !== 'heroe'); }
function enemigosVivos(c = cmb()) { return enemigos(c).filter(e => e.pg > 0); }
function datosMonstruo(e) { return MONSTRUOS[e.mid]; }
function nombreEnt(e) { return e.id === 'heroe' ? estado.heroe.nombre : e.nombre; }
function incapacitado(e) { return ['paralizado', 'dormido', 'inconsciente'].some(id => tieneCondicion(e.id === 'heroe' ? estado.heroe : e, id)); }
function condicionesDe(e) { return e.id === 'heroe' ? estado.heroe : e; }

function log(html, clase = '') { const c = cmb(); if (c) { c.log.push({ html, clase }); if (c.log.length > 250) c.log.shift(); } Hooks.log(html, clase); }
function nombreHtml(e) { return `<b class="${e.id === 'heroe' ? 'n-heroe' : 'n-enemigo'}">${escaparHtml(nombreEnt(e))}</b>`; }
function textoTirada(t, bono) {
  const dados = t.dados.length > 1 ? `[${t.dados.join(' | ')}]` : t.valor;
  return `🎲${dados}${bono ? ' ' + signo(bono).replace('−', '− ') : ''}`;
}

// ─── Creación del combate ───
function siglas(nombre) {
  const p = nombre.split(/\s+/).filter(w => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w));
  return ((p[0] || nombre)[0] + (p[1] ? p[1][0] : '')).toUpperCase();
}

function prepararEnemigos(lista) {
  const dif = DIFICULTADES[estado.ajustes.dificultad] || DIFICULTADES.normal;
  const ents = [];
  const conteo = {};
  for (const grupo of lista) {
    const m = MONSTRUOS[grupo.id];
    if (!m) continue;
    const cant = limitar(parseInt(grupo.cantidad || 1, 10) || 1, 1, 8);
    for (let i = 0; i < cant; i++) {
      conteo[grupo.id] = (conteo[grupo.id] || 0) + 1;
      const jefe = !!grupo.jefe;
      let pgMax = Math.max(1, Math.round(promedioDados(m.pg) * dif.pgEnemigos * (jefe ? 1.5 : 1) * (grupo.factorPg || 1)));
      ents.push({
        id: 'e' + ents.length, mid: grupo.id, nombre: grupo.nombre && cant === 1 ? grupo.nombre : m.nombre,
        corto: siglas(grupo.nombre && cant === 1 ? grupo.nombre : m.nombre), num: 0, jefe,
        pg: pgMax, pgMax, ca: m.ca + (jefe ? 1 : 0), px: Math.round(m.px * (jefe ? 1.5 : 1)),
        condiciones: [], reaccion: true, recargas: {}, usos: {}, actuo: false, x: 0, y: 0,
      });
    }
  }
  // Numerar enemigos repetidos
  const porNombre = {};
  ents.forEach(e => { porNombre[e.nombre] = (porNombre[e.nombre] || 0) + 1; });
  const idx = {};
  ents.forEach(e => { if (porNombre[e.nombre] > 1) { idx[e.nombre] = (idx[e.nombre] || 0) + 1; e.num = idx[e.nombre]; e.nombre = e.nombre + ' ' + e.num; } });
  for (const e of ents) {
    const m = MONSTRUOS[e.mid];
    for (const esp of (m.especiales || [])) { if (esp.recarga) e.recargas[esp.id] = true; if (esp.usos) e.usos[esp.id] = esp.usos; }
  }
  return ents;
}

function generarMapa(terreno, enemigosList) {
  const t = TERRENOS[terreno] || TERRENOS.mazmorra;
  for (let intento = 0; intento < 40; intento++) {
    const celdas = Array.from({ length: ALTO_MAPA }, () => Array(ANCHO_MAPA).fill(0));
    const n = t.n[0] + azar(t.n[1] - t.n[0] + 1);
    let puestos = 0, guard = 0;
    while (puestos < n && guard++ < 400) {
      const x = 2 + azar(ANCHO_MAPA - 4), y = azar(ALTO_MAPA);
      if (celdas[y][x]) continue;
      celdas[y][x] = 1; puestos++;
      // Algunos obstáculos ocupan dos casillas
      if (azar(3) === 0) { const nx = x + (azar(2) ? 1 : 0), ny = y + (azar(2) ? 1 : 0); if (nx < ANCHO_MAPA - 2 && ny < ALTO_MAPA) { celdas[ny][nx] = 1; } }
    }
    const c = { celdas, ents: {} };
    const hx = 1, hy = Math.floor(ALTO_MAPA / 2) - (azar(2));
    celdas[hy][hx] = 0;
    c.ents.heroe = { id: 'heroe', x: hx, y: hy };
    // Colocar enemigos: los de distancia atrás
    const ordenados = enemigosList.slice().sort((a, b) => (MONSTRUOS[b.mid].comportamiento === 'distancia') - (MONSTRUOS[a.mid].comportamiento === 'distancia'));
    let ok = true;
    for (const e of ordenados) {
      const atras = ['distancia', 'lanzador'].includes(MONSTRUOS[e.mid].comportamiento);
      let colocado = false;
      for (let k = 0; k < 80 && !colocado; k++) {
        const x = atras ? 9 + azar(3) : 7 + azar(3), y = azar(ALTO_MAPA);
        if (celdas[y][x] || Object.values(c.ents).some(o => o.x === x && o.y === y)) continue;
        e.x = x; e.y = y; c.ents[e.id] = e; colocado = true;
      }
      if (!colocado) { ok = false; break; }
    }
    if (!ok) continue;
    // Comprobar que todos pueden alcanzar al héroe
    const { d } = mapaDistancias(c, c.ents.heroe, { bando: 'nadie' });
    if (enemigosList.every(e => d[e.y][e.x] < Infinity)) return { celdas, ents: c.ents };
  }
  // Mapa vacío de emergencia
  const celdas = Array.from({ length: ALTO_MAPA }, () => Array(ANCHO_MAPA).fill(0));
  const ents = { heroe: { id: 'heroe', x: 1, y: 3 } };
  enemigosList.forEach((e, i) => { e.x = 9 + (i % 3); e.y = (i * 2) % ALTO_MAPA; ents[e.id] = e; });
  return { celdas, ents };
}

// Ajusta un encuentro al presupuesto de la dificultad elegida
function ajustarEncuentro(lista, nivel, esJefe = false) {
  const dif = DIFICULTADES[estado.ajustes.dificultad] || DIFICULTADES.normal;
  const umbrales = PRESUPUESTO_ENCUENTRO[nivel];
  const tope = (esJefe ? Math.max(umbrales[3], umbrales[dif.tope] * 1.5) : umbrales[dif.tope]) * 1.25;
  const grupos = lista.filter(g => MONSTRUOS[g.id]).map(g => Object.assign({}, g, { cantidad: limitar(parseInt(g.cantidad || 1, 10) || 1, 1, 8) }));
  const coste = gs => { const n = gs.reduce((s, g) => s + g.cantidad, 0); return gs.reduce((s, g) => s + MONSTRUOS[g.id].px * (g.jefe ? 1.5 : 1) * g.cantidad, 0) * multiplicadorGrupo(n); };
  let ajustado = false;
  while (grupos.length && coste(grupos) > tope) {
    const total = grupos.reduce((s, g) => s + g.cantidad, 0);
    if (total <= 1) {
      // Un único monstruo demasiado fuerte: se le reduce la vida
      grupos[0].factorPg = Math.max(0.45, tope / coste(grupos));
      ajustado = true;
      break;
    }
    // Quitar uno del grupo más numeroso (o el más débil si empatan)
    grupos.sort((a, b) => b.cantidad - a.cantidad || MONSTRUOS[a.id].px - MONSTRUOS[b.id].px);
    grupos[0].cantidad--; ajustado = true;
    if (grupos[0].cantidad <= 0) grupos.shift();
  }
  return { grupos, ajustado };
}

function iniciarCombate(def, origen) {
  const h = estado.heroe;
  const { grupos, ajustado } = ajustarEncuentro(def.enemigos || [], h.nivel, !!def.jefe || (def.enemigos || []).some(g => g.jefe));
  if (!grupos.length) return null;
  const lista = prepararEnemigos(grupos);
  const terreno = TERRENOS[def.terreno] ? def.terreno : 'mazmorra';
  const mapa = generarMapa(terreno, lista);
  const c = {
    id: uid('c'), ronda: 1, turno: 0, orden: [], celdas: mapa.celdas, ents: mapa.ents, terreno,
    t: {}, log: [], resultado: null, origen, def, ajustado, sorpresa: def.sorpresa === 'heroe' || def.sorpresa === 'enemigos' ? def.sorpresa : null,
    pxGanados: 0, derrotados: [], aura: null, armaEspiritual: null, esperandoJugador: false, inicioPg: h.pg,
  };
  estado.combate = c;
  // Iniciativa
  const ini = [];
  const tH = tirarD20({ afortunado: !!RAZAS[h.raza].afortunado });
  const iniH = tH.valor + modCar(h, 'des');
  ini.push({ id: 'heroe', v: iniH + 0.5 });
  for (const e of lista) { const m = MONSTRUOS[e.mid]; e.iniciativa = dado(20) + modificador(m.car.des); ini.push({ id: e.id, v: e.iniciativa }); }
  ini.sort((a, b) => b.v - a.v);
  c.orden = ini.map(i => i.id);
  c.iniciativaHeroe = iniH;
  h.estadisticas.combates++;
  log(`<span class="l-titulo">¡Combate! ${escaparHtml(TERRENOS[terreno].nombre)}</span>`, 'titulo');
  if (ajustado) log('El motor ha reducido el número de enemigos para equilibrar el encuentro.', 'nota');
  log(`Iniciativa: tú ${textoTirada(tH, modCar(h, 'des'))} = <b>${iniH}</b>. Orden: ${c.orden.map(id => escaparHtml(nombreEnt(c.ents[id]))).join(' → ')}.`);
  if (c.sorpresa === 'heroe') log('¡Te han sorprendido! Pierdes tu primer turno.', 'malo');
  if (c.sorpresa === 'enemigos') log('¡Has sorprendido a tus enemigos! No actúan en el primer asalto.', 'bueno');
  return c;
}

// ─── Bucle de turnos ───
let _bucleActivo = false;
async function bucleCombate() {
  if (_bucleActivo) return;
  _bucleActivo = true;
  try {
    const c = cmb();
    while (c && !c.resultado && estado.combate === c) {
      const id = c.orden[c.turno];
      const e = c.ents[id];
      if (id === 'heroe') {
        const actua = await inicioTurnoHeroe();
        if (c.resultado) break;
        if (actua) { c.esperandoJugador = true; Hooks.render(); return; }
        await finTurnoHeroeInterno();
      } else if (e && e.pg > 0) {
        Hooks.render();
        await turnoEnemigo(e);
        e.actuo = true;
      }
      if (comprobarFin()) break;
      avanzarTurno();
    }
    if (c && c.resultado && estado.combate === c) await terminarCombate();
  } finally {
    _bucleActivo = false;
  }
}

function avanzarTurno() {
  const c = cmb();
  c.turno++;
  if (c.turno >= c.orden.length) {
    c.turno = 0; c.ronda++;
    log(`— Asalto ${c.ronda} —`, 'ronda');
  }
}

function comprobarFin() {
  const c = cmb(), h = estado.heroe;
  if (c.resultado) return true;
  if (h.muerto) { c.resultado = 'muerte'; return true; }
  if (!enemigosVivos(c).length) { c.resultado = 'victoria'; return true; }
  return false;
}

async function inicioTurnoHeroe() {
  const c = cmb(), h = estado.heroe;
  c.t = {
    accion: true, adicional: true, mov: velocidad(h), movMax: velocidad(h), ataquesRestantes: 0, furtivo: false, colosos: false,
    desenganchado: false, conjuroAdicional: false, conjuroAccionNivel: 0, movido: 0, oleadaUsada: false, temerarioListo: false,
  };
  h.reaccion = true;
  quitarCondicion(h, 'esquivando');
  quitarCondicion(h, 'temerario');
  h.efectos.escudoReaccion = false;
  // Duración de efectos con concentración
  if (h.efectos.concentracion && h.efectos.concentracion.rondas != null) {
    h.efectos.concentracion.rondas--;
    if (h.efectos.concentracion.rondas <= 0) { log(`Termina ${escaparHtml(CONJUROS[h.efectos.concentracion.conjuro].nombre)}.`, 'nota'); finConcentracion(); }
  }
  if (c.armaEspiritual) { c.armaEspiritual.rondas--; if (c.armaEspiritual.rondas <= 0) { c.armaEspiritual = null; log('El arma espiritual se desvanece.', 'nota'); } }
  // Caído: tiradas de salvación contra la muerte
  if (h.caido) {
    if (estado.ajustes.dificultad === 'facil') { c.resultado = 'derrota'; return false; }
    const t = tirarD20({ afortunado: !!RAZAS[h.raza].afortunado });
    await Hooks.dado(t, 'Salvación contra la muerte');
    if (t.valor === 20) {
      h.caido = false; h.pg = 1; quitarCondicion(h, 'inconsciente'); h.muerte = { exitos: 0, fallos: 0 };
      log(`Salvación contra la muerte: ${textoTirada(t)} — <b>¡20 natural!</b> Vuelves en ti con 1 PG.`, 'critico');
      Hooks.flotante('heroe', '¡En pie!', 'cura');
    } else {
      if (t.valor >= 10) h.muerte.exitos++; else h.muerte.fallos += t.valor === 1 ? 2 : 1;
      log(`Salvación contra la muerte: ${textoTirada(t)} → ${t.valor >= 10 ? 'éxito' : 'fallo'} (éxitos ${h.muerte.exitos}/3, fallos ${Math.min(3, h.muerte.fallos)}/3).`, t.valor >= 10 ? 'bueno' : 'malo');
      if (h.muerte.fallos >= 3) { h.muerto = true; c.resultado = 'muerte'; return false; }
      if (h.muerte.exitos >= 3) { log('Te estabilizas, inconsciente. Tus enemigos te dan por muerto.', 'nota'); c.resultado = 'derrota'; return false; }
      return false;
    }
  }
  if (c.sorpresa === 'heroe' && c.ronda === 1) { log('Sigues desconcertado por la emboscada.', 'nota'); return false; }
  if (incapacitado(c.ents.heroe)) { log('No puedes actuar este turno.', 'malo'); return false; }
  if (tieneCondicion(h, 'derribado')) {
    quitarCondicion(h, 'derribado');
    c.t.mov = Math.max(0, c.t.mov - Math.ceil(c.t.movMax / 2));
    log('Te levantas del suelo (gastas la mitad de tu movimiento).', 'nota');
  }
  if (tieneCondicion(h, 'apresado')) c.t.mov = 0;
  return true;
}

// Llamado por la interfaz tras cada acción del héroe: cierra el combate o el turno si hace falta
async function despuesAccionHeroe() {
  const c = cmb();
  if (!c || c.cerrado) return;
  if (!c.resultado) comprobarFin();
  if (c.resultado) { c.esperandoJugador = false; await terminarCombate(); return; }
  if (estado.heroe.caido && c.esperandoJugador) await terminarTurnoHeroe();
}

// Llamado por la interfaz al pulsar «Terminar turno»
async function terminarTurnoHeroe() {
  const c = cmb();
  if (!c || !c.esperandoJugador) return;
  c.esperandoJugador = false;
  await finTurnoHeroeInterno();
  if (comprobarFin()) { await terminarCombate(); return; }
  avanzarTurno();
  await bucleCombate();
}

async function finTurnoHeroeInterno() {
  const h = estado.heroe, c = cmb();
  // Salvaciones repetidas al final del turno (parálisis)
  for (const cond of (h.condiciones || []).slice()) {
    if (cond.repetir && cond.salv) {
      const r = await salvacionHeroe(cond.salv, cond.cd, { motivo: CONDICIONES[cond.id].nombre });
      if (r.exito) { quitarCondicion(h, cond.id); log(`Te libras de la condición ${CONDICIONES[cond.id].nombre.toLowerCase()}.`, 'bueno'); }
    }
  }
  if (c && c.ents) for (const e of enemigos(c)) if (e.marcaLuzTurno != null && e.marcaLuzTurno < c.ronda) quitarCondicion(e, 'iluminado');
}

// ─── Tiradas del héroe ───
async function salvacionHeroe(car, cd, opciones = {}) {
  const h = estado.heroe, raza = RAZAS[h.raza];
  if (['fue', 'des'].includes(car) && (tieneCondicion(h, 'paralizado') || h.caido)) {
    log(`Salvación de ${NOMBRE_CAR[car]}: fallo automático.`, 'malo');
    return { exito: false, total: 0 };
  }
  let vent = !!opciones.ventaja, desv = !!opciones.desventaja;
  if (car === 'des' && (tieneRasgo(h, 'sentido_peligro') || tieneCondicion(h, 'esquivando'))) vent = true;
  if (car === 'fue' && h.efectos.furia) vent = true;
  if (opciones.veneno && (raza.resist || []).includes('veneno')) vent = true;
  if (opciones.magia && raza.astuciaGnoma && ['int', 'sab', 'car'].includes(car)) vent = true;
  if (opciones.miedo && raza.valiente) vent = true;
  if (h.usarInspiracion && h.inspiracion) { vent = true; h.inspiracion = false; h.usarInspiracion = false; }
  const t = tirarD20({ ventaja: vent, desventaja: desv, afortunado: !!raza.afortunado });
  let bono = bonoSalvacion(h, car);
  let extra = 0;
  if (h.efectos.bendicion) extra = dado(4);
  await Hooks.dado(t, `Salvación de ${NOMBRE_CAR[car]}`);
  const total = t.valor + bono + extra;
  const exito = total >= cd;
  log(`Salvación de ${NOMBRE_CAR[car]}${opciones.motivo ? ' (' + escaparHtml(opciones.motivo) + ')' : ''}: ${textoTirada(t, bono)}${extra ? ' +' + extra + ' (bendición)' : ''} = <b>${total}</b> vs CD ${cd} → ${exito ? 'éxito' : 'fallo'}.`, exito ? 'bueno' : 'malo');
  return { exito, total };
}

function salvacionMonstruo(e, car, cd) {
  const m = datosMonstruo(e);
  if (['fue', 'des'].includes(car) && (tieneCondicion(e, 'paralizado') || tieneCondicion(e, 'dormido'))) return { exito: false, total: 0, auto: true };
  const bono = modificador(m.car[car]) + ((m.salvaciones || {})[car] || 0);
  const t = tirarD20({ ventaja: car === 'des' && tieneCondicion(e, 'esquivando') });
  const total = t.valor + bono;
  return { exito: total >= cd, total, t, bono };
}

// ─── Daño ───
function aplicarResistencias(tipo, cantidad, resist, inmune, vulnerable, magico) {
  if ((inmune || []).includes(tipo)) return 0;
  let n = cantidad;
  if ((resist || []).includes(tipo) || ((resist || []).includes('fisico_no_magico') && DANIO_FISICO.includes(tipo) && !magico)) n = Math.floor(n / 2);
  if ((vulnerable || []).includes(tipo)) n *= 2;
  return n;
}

async function danarEnemigo(e, cantidad, tipo, op = {}) {
  const c = cmb(), m = datosMonstruo(e), h = estado.heroe;
  if (e.pg <= 0) return 0;
  let n = aplicarResistencias(tipo, cantidad, m.resist, m.inmune, m.vulnerable, op.magico);
  if (n < cantidad && cantidad > 0) op.notaRes = n === 0 ? 'inmune' : 'resiste';
  if (n > cantidad) op.notaRes = 'vulnerable';
  if (['fuego', 'ácido'].includes(tipo) && (m.rasgos || []).includes('regeneracion')) e.regenBloqueada = true;
  if (tieneCondicion(e, 'dormido') && n > 0) { quitarCondicion(e, 'dormido'); log(`${nombreHtml(e)} se despierta.`, 'nota'); }
  if (tieneCondicion(e, 'expulsado') && n > 0) quitarCondicion(e, 'expulsado');
  // Fortaleza de no muerto
  if (n >= e.pg && (m.rasgos || []).includes('fortaleza_no_muerto') && tipo !== 'radiante' && !op.critico) {
    const s = salvacionMonstruo(e, 'con', 5 + n);
    if (s.exito) { e.pg = 1; log(`${nombreHtml(e)} se niega a caer (Fortaleza de no muerto) y queda a 1 PG.`, 'malo'); Hooks.flotante(e.id, '1 PG', 'dano'); return n; }
  }
  e.pg = Math.max(0, e.pg - n);
  h.estadisticas.danioHecho += n;
  Hooks.flotante(e.id, n === 0 ? 'Inmune' : '−' + n, op.critico ? 'critico' : 'dano');
  if (e.pg <= 0) await enemigoDerrotado(e);
  return n;
}

async function enemigoDerrotado(e) {
  const c = cmb(), h = estado.heroe;
  e.pg = 0; e.condiciones = [];
  c.pxGanados += e.px;
  c.derrotados.push(e.mid);
  h.estadisticas.enemigos++;
  log(`☠ ${nombreHtml(e)} cae derrotado.`, 'bueno');
  if (tieneRasgo(h, 'bendicion_oscuro')) {
    const temp = Math.max(1, modCar(h, 'car') + h.nivel);
    if (temp > h.pgTemp) { h.pgTemp = temp; log(`Bendición del oscuro: ganas ${temp} PG temporales.`, 'bueno'); }
  }
  if (h.efectos.marca && h.efectos.marca.objetivo === e.id) {
    h.efectos.marca.objetivo = null;
    log('Tu marca queda libre: puedes trasladarla con una acción adicional.', 'nota');
  }
  // Conjuros ligados a ese objetivo
  if (h.efectos.concentracion && h.efectos.concentracion.objetivos) h.efectos.concentracion.objetivos = h.efectos.concentracion.objetivos.filter(id => id !== e.id);
}

async function danarHeroe(cantidad, tipo, op = {}) {
  const h = estado.heroe, raza = RAZAS[h.raza], c = cmb();
  const resist = [...(raza.resist || [])];
  if (raza.aliento && h.linaje) resist.push(LINAJES_DRACONIDOS[h.linaje].danio);
  if (h.efectos.furia) resist.push(...DANIO_FISICO);
  if (h.efectos.resistFuego) resist.push('fuego');
  let n = aplicarResistencias(tipo, cantidad, resist, [], [], true);
  if (n <= 0) { Hooks.flotante('heroe', 'Resistes', 'nota'); return 0; }
  h.estadisticas.danioRecibido += n;
  if (h.caido) {
    h.muerte.fallos += op.critico ? 2 : 1;
    log(`Recibes daño estando inconsciente: ${op.critico ? 'dos fallos' : 'un fallo'} contra la muerte.`, 'malo');
    if (h.muerte.fallos >= 3) { h.muerto = true; if (c) c.resultado = 'muerte'; }
    return n;
  }
  if (h.pgTemp > 0) { const abs = Math.min(h.pgTemp, n); h.pgTemp -= abs; n -= abs; if (abs) log(`Tus PG temporales absorben ${abs}.`, 'nota'); }
  const antes = h.pg;
  h.pg -= n;
  Hooks.flotante('heroe', '−' + (antes - Math.max(0, h.pg)), op.critico ? 'critico' : 'dano');
  if (h.pg <= 0) {
    const dif = DIFICULTADES[estado.ajustes.dificultad] || DIFICULTADES.normal;
    if (dif.muerteMasiva && -h.pg >= h.pgMax) {
      h.pg = 0; h.muerto = true; log('El golpe es tan brutal que mueres en el acto.', 'malo');
      if (c) c.resultado = 'muerte';
      return n;
    }
    if (raza.aguante && h.recursos.aguante > 0) {
      h.recursos.aguante = 0; h.pg = 1;
      log('<b>Aguante incansable:</b> te niegas a caer y te quedas a 1 PG.', 'critico');
      Hooks.flotante('heroe', '¡Aguantas!', 'cura');
    } else {
      h.pg = 0; h.caido = true; h.muerte = { exitos: 0, fallos: 0 };
      ponerCondicion(h, 'inconsciente'); quitarCondicion(h, 'oculto'); quitarCondicion(h, 'invisible');
      h.efectos.furia = false;
      if (h.efectos.concentracion) finConcentracion();
      log('<b>Caes inconsciente.</b>', 'malo');
      if (estado.ajustes.dificultad === 'facil' && c) c.resultado = 'derrota';
      return n;
    }
  }
  // Concentración
  if (h.efectos.concentracion && n > 0) {
    const cd = Math.max(10, Math.floor(n / 2));
    const r = await salvacionHeroe('con', cd, { motivo: 'mantener la concentración' });
    if (!r.exito) { log(`Pierdes la concentración en ${escaparHtml(CONJUROS[h.efectos.concentracion.conjuro].nombre)}.`, 'malo'); finConcentracion(); }
  }
  return n;
}

function curarHeroe(cantidad, motivo) {
  const h = estado.heroe;
  const antes = h.pg;
  if (h.caido && cantidad > 0) { h.caido = false; h.pg = 0; quitarCondicion(h, 'inconsciente'); h.muerte = { exitos: 0, fallos: 0 }; }
  h.pg = Math.min(h.pgMax, h.pg + cantidad);
  const ganado = h.pg - antes;
  if (cmb()) Hooks.flotante('heroe', '+' + ganado, 'cura');
  return ganado;
}

function finConcentracion() {
  const h = estado.heroe, c = cmb();
  const conc = h.efectos.concentracion;
  if (!conc) return;
  h.efectos.concentracion = null;
  switch (conc.conjuro) {
    case 'bendicion': h.efectos.bendicion = false; break;
    case 'escudo_fe': h.efectos.escudoFe = false; break;
    case 'piel_robliza': h.efectos.pielRobliza = false; break;
    case 'invisibilidad': quitarCondicion(h, 'invisible'); break;
    case 'marca_cazador': case 'maleficio': h.efectos.marca = null; break;
    case 'castigo_atronador': case 'castigo_marcado': h.efectos.castigo = null; break;
    case 'espiritus_guardianes': if (c) c.aura = null; break;
    case 'toque_vampirico': h.efectos.toqueVampirico = null; break;
    case 'inmovilizar_persona': if (c) enemigos(c).forEach(e => { if (e.inmovilizadoPorHeroe) { quitarCondicion(e, 'paralizado'); e.inmovilizadoPorHeroe = false; } }); break;
    case 'miedo': if (c) enemigos(c).forEach(e => quitarCondicion(e, 'asustado')); break;
  }
}

function iniciarConcentracion(conjuroId, extra = {}) {
  const h = estado.heroe;
  if (h.efectos.concentracion) { log(`Dejas de concentrarte en ${escaparHtml(CONJUROS[h.efectos.concentracion.conjuro].nombre)}.`, 'nota'); finConcentracion(); }
  const dur = CONJUROS[conjuroId].duracion;
  h.efectos.concentracion = Object.assign({ conjuro: conjuroId, rondas: dur || 10 }, extra);
}

// ─── Ventaja y desventaja en ataques ───
function modificadoresAtaque(atacante, objetivo, aDistancia) {
  const c = cmb();
  const a = condicionesDe(atacante), o = condicionesDe(objetivo);
  const vent = [], desv = [];
  if (tieneCondicion(a, 'envenenado')) desv.push('envenenado');
  if (tieneCondicion(a, 'derribado')) desv.push('derribado');
  if (tieneCondicion(a, 'apresado')) desv.push('apresado');
  if (tieneCondicion(a, 'asustado')) desv.push('asustado');
  if (tieneCondicion(a, 'oculto')) vent.push('oculto');
  if (tieneCondicion(a, 'invisible')) vent.push('invisible');
  if (tieneCondicion(o, 'derribado')) (aDistancia ? desv : vent).push('objetivo derribado');
  if (tieneCondicion(o, 'paralizado') || tieneCondicion(o, 'dormido') || tieneCondicion(o, 'inconsciente')) vent.push('objetivo indefenso');
  if (tieneCondicion(o, 'apresado')) vent.push('objetivo apresado');
  if (tieneCondicion(o, 'esquivando')) desv.push('esquiva');
  if (tieneCondicion(o, 'oculto')) desv.push('objetivo oculto');
  if (tieneCondicion(o, 'invisible')) desv.push('objetivo invisible');
  if (tieneCondicion(o, 'temerario')) vent.push('temerario');
  if (tieneCondicion(o, 'iluminado')) vent.push('saeta guía');
  if (aDistancia && enemigosAdyacentes(atacante).length) desv.push('enemigo adyacente');
  return { vent, desv };
}
function enemigosAdyacentes(ent) {
  const c = cmb();
  if (ent.id === 'heroe') return enemigosVivos(c).filter(e => dist(e, ent) <= 1 && !incapacitado(e));
  const H = c.ents.heroe;
  return (!estado.heroe.caido && dist(ent, H) <= 1) ? [H] : [];
}

// ─── Acciones del héroe ───
function numAtaques(h) { return tieneRasgo(h, 'ataque_extra') ? 2 : 1; }
function puedeAtacar() { const t = cmb().t; return t.accion || t.ataquesRestantes > 0; }
function consumirAtaque() {
  const c = cmb(), h = estado.heroe;
  if (c.t.ataquesRestantes > 0) { c.t.ataquesRestantes--; return true; }
  if (c.t.accion) { c.t.accion = false; c.t.ataquesRestantes = numAtaques(h) - 1; return true; }
  return false;
}

function alcanceArma(perfil) {
  if (perfil.aDistancia) return perfil.distancia[1];
  if (perfil.arrojadiza && perfil.distancia) return perfil.distancia[1];
  return 1;
}
function objetivosValidosArma(perfil) {
  const H = heroeEnt();
  return enemigosVivos().filter(e => dist(H, e) <= alcanceArma(perfil));
}

async function heroeAtaca(armaUid, objetivoId, op = {}) {
  const c = cmb(), h = estado.heroe, H = heroeEnt();
  const e = c.ents[objetivoId];
  if (!e || e.pg <= 0) return;
  const perfil = (op.perfil) || ataquesDisponibles(h).find(a => a.uid === armaUid);
  if (!perfil) return;
  const d = dist(H, e);
  const cuerpo = !perfil.aDistancia && d <= 1;
  if (!cuerpo && !perfil.aDistancia && !perfil.arrojadiza) return;
  if (!op.adicional && !op.oportunidad && !consumirAtaque()) return;
  const aDistancia = !cuerpo;
  const { vent, desv } = modificadoresAtaque(H, e, aDistancia);
  if (aDistancia && perfil.distancia && d > perfil.distancia[0]) desv.push('largo alcance');
  if (h.efectos.furia && cuerpo && perfil.car === 'fue') { /* ventaja en pruebas de FUE, no en ataques */ }
  if (c.t.temerarioListo && cuerpo && perfil.car === 'fue') { vent.push('ataque temerario'); ponerCondicion(h, 'temerario'); c.t.temerarioListo = false; }
  if (tieneCondicion(h, 'temerario') && cuerpo && perfil.car === 'fue' && !vent.includes('ataque temerario')) vent.push('ataque temerario');
  if (tieneRasgo(h, 'asesinar') && c.ronda === 1 && !e.actuo) vent.push('asesinar');
  if (h.usarInspiracion && h.inspiracion) { vent.push('inspiración'); h.inspiracion = false; h.usarInspiracion = false; }
  const t = tirarD20({ ventaja: vent.length > 0, desventaja: desv.length > 0, afortunado: !!RAZAS[h.raza].afortunado });
  let bono = perfil.bono;
  let bendicion = h.efectos.bendicion ? dado(4) : 0;
  const cobertura = aDistancia && tieneCobertura(c, H, e) ? 2 : 0;
  const ca = e.ca + cobertura + (e.paradaActiva ? 2 : 0);
  await Hooks.dado(t, `Ataque con ${perfil.nombre}`);
  quitarCondicion(h, 'oculto'); quitarCondicion(h, 'invisible');
  if (h.efectos.concentracion && h.efectos.concentracion.conjuro === 'invisibilidad') finConcentracion();
  if (tieneCondicion(e, 'iluminado')) quitarCondicion(e, 'iluminado');
  const rangoCrit = tieneRasgo(h, 'critico_mejorado') ? 19 : 20;
  const total = t.valor + bono + bendicion;
  let critico = t.valor >= rangoCrit;
  let impacta = critico || (t.valor !== 1 && total >= ca);
  // Parada del capitán bandido
  if (impacta && !critico && cuerpo && (datosMonstruo(e).rasgos || []).includes('parada') && e.reaccion && total < ca + 2 && !incapacitado(e)) {
    e.reaccion = false; impacta = false;
    log(`${nombreHtml(e)} detiene el golpe con una parada.`, 'nota');
  }
  if (impacta && cuerpo && (tieneCondicion(e, 'paralizado') || tieneCondicion(e, 'dormido'))) critico = true;
  if (impacta && tieneRasgo(h, 'asesinar') && c.sorpresa === 'enemigos' && c.ronda === 1) critico = true;
  const extras = [];
  if (vent.length && !desv.length) extras.push('ventaja: ' + vent.join(', '));
  else if (desv.length && !vent.length) extras.push('desventaja: ' + desv.join(', '));
  else if (vent.length && desv.length) extras.push('ventaja y desventaja se anulan');
  const cabecera = `${nombreHtml(H)} ataca a ${nombreHtml(e)} con ${escaparHtml(perfil.nombre)}: ${textoTirada(t, bono)}${bendicion ? ' +' + bendicion + ' (bendición)' : ''}${cobertura ? ' (cobertura +2)' : ''} = <b>${total}</b> vs CA ${ca}${extras.length ? ' <i>(' + extras.join('; ') + ')</i>' : ''}`;
  if (!impacta) { log(cabecera + ' → <b>fallo</b>.', 'fallo'); Hooks.flotante(e.id, 'Fallo', 'nota'); Hooks.render(); return; }
  if (critico) h.estadisticas.criticos++;
  // Daño
  const gran = heroe => heroe.estilo === 'gran_arma' && perfil.dosManos && !perfil.aDistancia;
  const td = tirarDados(perfil.dados, { critico, rerollHasta: gran(h) ? 2 : 0 });
  let total2 = td.total + perfil.modDanio;
  const partes = [`${td.texto}${perfil.modDanio ? ' ' + signo(perfil.modDanio).replace('−', '− ') : ''}`];
  if (critico && cuerpo && RAZAS[h.raza].ataquesSalvajes) { const s = tirarDados(perfil.dados); total2 += s.total; partes.push(`+${s.total} salvaje`); }
  if (h.efectos.furia && cuerpo && perfil.car === 'fue') { total2 += 2; partes.push('+2 furia'); }
  if (h.enemigoPredilecto && datosMonstruo(e).tipo === h.enemigoPredilecto) { total2 += 2; partes.push('+2 predilecto'); }
  const danioPrincipal = Math.max(1, total2);
  const extraDanios = [];
  // Ataque furtivo
  const elegibleFurtivo = tieneRasgo(h, 'ataque_furtivo') && !c.t.furtivo && (perfil.sutil || perfil.aDistancia) && vent.length > 0 && desv.length === 0;
  if (elegibleFurtivo) {
    c.t.furtivo = true;
    const n = Math.ceil(h.nivel / 2);
    const s = sumarDados(n, 6, critico);
    extraDanios.push({ n: s, tipo: perfil.tipo, txt: `${s} furtivo` });
  }
  if (perfil.extra) { const s = tirarDados(perfil.extra, { critico }).total; extraDanios.push({ n: s, tipo: perfil.tipoExtra, txt: `${s} ${perfil.tipoExtra}` }); }
  if (h.efectos.marca && h.efectos.marca.objetivo === e.id) { const s = tirarDados(h.efectos.marca.danio, { critico }).total; extraDanios.push({ n: s, tipo: h.efectos.marca.tipo, txt: `${s} ${h.efectos.marca.conjuro === 'maleficio' ? 'maleficio' : 'marca'}` }); }
  if (tieneRasgo(h, 'asesino_colosos') && !c.t.colosos && e.pg < e.pgMax) { c.t.colosos = true; const s = sumarDados(1, 8, critico); extraDanios.push({ n: s, tipo: perfil.tipo, txt: `${s} asesino de colosos` }); }
  if (h.efectos.castigo && (cuerpo || h.efectos.castigo.conjuro === 'castigo_marcado')) {
    const cs = h.efectos.castigo;
    const s = tirarDados(cs.danio, { critico }).total;
    extraDanios.push({ n: s, tipo: cs.tipo, txt: `${s} ${cs.tipo} (castigo)` });
    c.t.castigoPendiente = cs;
    h.efectos.castigo = null;
    if (h.efectos.concentracion && ['castigo_atronador', 'castigo_marcado'].includes(h.efectos.concentracion.conjuro)) h.efectos.concentracion = null;
  }
  // Castigo divino (paladín)
  if (cuerpo && tieneRasgo(h, 'castigo_divino') && !op.oportunidad) {
    const libres = espaciosLibres(h);
    const ops = [];
    libres.forEach((n, i) => { if (n > 0) ops.push({ etiqueta: `Espacio de nivel ${i + 1} (+${2 + i}d8${['muerto_viviente', 'infernal'].includes(datosMonstruo(e).tipo) ? '+1d8' : ''})`, valor: i + 1 }); });
    if (ops.length) {
      ops.push({ etiqueta: 'No usar', valor: 0 });
      const nivel = await Hooks.preguntar('¿Castigo divino?', `Has impactado a ${nombreEnt(e)}${critico ? ' con un crítico (los dados se duplican)' : ''}. Puedes gastar un espacio de conjuro para añadir daño radiante.`, ops);
      if (nivel) {
        gastarEspacio(h, nivel);
        let nd = Math.min(5, 1 + nivel);
        if (['muerto_viviente', 'infernal'].includes(datosMonstruo(e).tipo)) nd++;
        const s = sumarDados(nd, 8, critico);
        extraDanios.push({ n: s, tipo: 'radiante', txt: `${s} castigo divino` });
      }
    }
  }
  log(`${cabecera} → <b>${critico ? '¡CRÍTICO!' : 'impacto'}</b>. Daño: ${partes.join(' ')} = ${danioPrincipal} ${perfil.tipo}${extraDanios.map(x => ' + ' + x.txt).join('')}.`, critico ? 'critico' : 'impacto');
  await danarEnemigo(e, danioPrincipal, perfil.tipo, { magico: perfil.magico, critico });
  for (const x of extraDanios) if (e.pg > 0) await danarEnemigo(e, x.n, x.tipo, { magico: true, critico });
  // Efectos del castigo atronador
  const cp = c.t.castigoPendiente;
  if (cp && e.pg > 0 && cp.salv) {
    const s = salvacionMonstruo(e, cp.salv, cdConjuro(h));
    if (!s.exito) { empujar(e, H, cp.empuje || 2); if (cp.derriba && !(datosMonstruo(e).inmuneCond || []).includes('derribado')) ponerCondicion(e, 'derribado'); log(`${nombreHtml(e)} sale despedido y cae al suelo.`, 'bueno'); }
  }
  c.t.castigoPendiente = null;
  Hooks.render();
}

function empujar(e, desde, casillas) {
  const c = cmb();
  const sx = Math.sign(e.x - desde.x), sy = Math.sign(e.y - desde.y);
  for (let i = 0; i < casillas; i++) {
    const nx = e.x + sx, ny = e.y + sy;
    if (!celdaLibre(c, nx, ny)) break;
    e.x = nx; e.y = ny;
  }
}

// Movimiento del héroe a (x, y); devuelve false si no es posible
function rutaHeroe(x, y) {
  const c = cmb(), H = heroeEnt();
  if (!celdaLibre(c, x, y)) return null;
  const { d, previo } = mapaDistancias(c, H, { bando: 'heroe' });
  if (d[y][x] > c.t.mov) return null;
  const ruta = reconstruirRuta(previo, H, { x, y });
  // ¿Provoca ataques de oportunidad?
  const provocan = new Set();
  if (!c.t.desenganchado) {
    let prev = { x: H.x, y: H.y };
    for (const paso of ruta) {
      for (const e of enemigosVivos(c)) if (dist(e, prev) <= 1 && dist(e, paso) > 1 && e.reaccion && !incapacitado(e) && !tieneCondicion(e, 'sin_reacciones') && ataquesCuerpo(e).length) provocan.add(e.id);
      prev = paso;
    }
  }
  return { ruta, coste: d[y][x], provocan: Array.from(provocan) };
}

async function moverHeroe(x, y) {
  const c = cmb(), H = heroeEnt(), h = estado.heroe;
  const r = rutaHeroe(x, y);
  if (!r) return false;
  let prev = { x: H.x, y: H.y };
  for (const paso of r.ruta) {
    // Ataques de oportunidad al salir del alcance
    if (!c.t.desenganchado) {
      for (const e of enemigosVivos(c)) {
        if (dist(e, prev) <= 1 && dist(e, paso) > 1 && e.reaccion && !incapacitado(e) && !tieneCondicion(e, 'sin_reacciones')) {
          const atq = ataquesCuerpo(e)[0];
          if (!atq) continue;
          e.reaccion = false;
          log(`${nombreHtml(e)} aprovecha tu retirada: <b>ataque de oportunidad</b>.`, 'nota');
          await enemigoAtaca(e, atq, { oportunidad: true });
          if (h.caido || c.resultado) { Hooks.render(); return true; }
        }
      }
    }
    H.x = paso.x; H.y = paso.y;
    c.t.mov--; c.t.movido++;
    prev = paso;
    Hooks.render();
    await Hooks.pausa(70);
  }
  return true;
}

function puedeHuir() { const H = heroeEnt(); return H.x === 0 && cmb().t.accion; }
async function huir() {
  const c = cmb();
  if (!puedeHuir()) return;
  c.t.accion = false;
  log('Te escabulles por el borde del campo de batalla y <b>huyes</b>.', 'nota');
  c.resultado = 'huida';
  c.esperandoJugador = false;
  await terminarCombate();
}

// Acciones genéricas
async function accionBasica(tipo) {
  const c = cmb(), h = estado.heroe, H = heroeEnt();
  const usarAdicional = tipo.endsWith('_adicional');
  const base = tipo.replace('_adicional', '');
  if (usarAdicional) { if (!c.t.adicional) return; c.t.adicional = false; } else { if (!c.t.accion) return; c.t.accion = false; }
  switch (base) {
    case 'esquivar': ponerCondicion(h, 'esquivando'); log('Adoptas una postura defensiva: <b>Esquivar</b>.', 'nota'); break;
    case 'correr': c.t.mov += velocidad(h); c.t.movMax += velocidad(h); log(`<b>Corres</b>: +${metros(velocidad(h))} de movimiento.`, 'nota'); break;
    case 'desenganchar': c.t.desenganchado = true; log('Te <b>desenganchas</b>: tu movimiento no provoca ataques de oportunidad.', 'nota'); break;
    case 'esconderse': {
      if (enemigosAdyacentes(H).length) { log('No puedes esconderte con un enemigo encima.', 'malo'); break; }
      const cubierto = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].some(([dx, dy]) => enMapa(H.x + dx, H.y + dy) && esObstaculo(c, H.x + dx, H.y + dy));
      if (!cubierto) { log('Necesitas un obstáculo junto a ti para esconderte.', 'malo'); break; }
      const r = await pruebaHabilidadCombate('sigilo');
      const pp = Math.max(...enemigosVivos(c).map(e => datosMonstruo(e).pp || 10));
      if (r.total >= pp) { ponerCondicion(h, 'oculto'); log(`Te ocultas entre las sombras (Sigilo ${r.total} vs percepción ${pp}).`, 'bueno'); }
      else log(`Te ven (Sigilo ${r.total} vs percepción ${pp}).`, 'malo');
      break;
    }
    case 'escapar': {
      const cond = (h.condiciones || []).find(x => x.id === 'apresado');
      if (!cond) break;
      const hab = bonoHabilidad(h, 'atletismo') >= bonoHabilidad(h, 'acrobacias') ? 'atletismo' : 'acrobacias';
      const r = await pruebaHabilidadCombate(hab);
      if (r.total >= (cond.escape || 12)) { quitarCondicion(h, 'apresado'); log(`Te liberas (${HABILIDADES[hab].nombre} ${r.total} vs CD ${cond.escape || 12}).`, 'bueno'); }
      else log(`Sigues atrapado (${HABILIDADES[hab].nombre} ${r.total} vs CD ${cond.escape || 12}).`, 'malo');
      break;
    }
  }
  Hooks.render();
}

async function pruebaHabilidadCombate(hab) {
  const h = estado.heroe;
  let vent = false, desv = tieneCondicion(h, 'envenenado');
  if (hab === 'sigilo') {
    const arm = armaduraEquipada(h);
    if (arm && arm.sigiloDesv) desv = true;
    if (objetosEquipados(h).some(it => OBJETOS[it.id].ventajaHab === 'sigilo')) vent = true;
  }
  if (hab === 'atletismo' && h.efectos.furia) vent = true;
  const t = tirarD20({ ventaja: vent, desventaja: desv, afortunado: !!RAZAS[h.raza].afortunado });
  await Hooks.dado(t, HABILIDADES[hab].nombre);
  return { total: t.valor + bonoHabilidad(h, hab), t };
}

// ─── Rasgos de clase en combate ───
function rasgosUsables() {
  const c = cmb(), h = estado.heroe, r = h.recursos, t = c.t;
  const lista = [];
  if (tieneRasgo(h, 'tomar_aliento')) lista.push({ id: 'tomar_aliento', nombre: 'Tomar aliento', coste: 'adicional', usable: t.adicional && r.tomarAliento > 0, nota: r.tomarAliento > 0 ? '1d10 + ' + h.nivel + ' PG' : 'Gastado' });
  if (tieneRasgo(h, 'oleada_accion')) lista.push({ id: 'oleada', nombre: 'Oleada de acción', coste: 'gratis', usable: r.oleada > 0 && !t.accion && t.ataquesRestantes === 0, nota: r.oleada > 0 ? 'Una acción más' : 'Gastada' });
  if (tieneRasgo(h, 'furia')) lista.push({ id: 'furia', nombre: h.efectos.furia ? 'En furia' : 'Entrar en furia', coste: 'adicional', usable: t.adicional && !h.efectos.furia && r.furia > 0, nota: `${r.furia} usos` });
  if (tieneRasgo(h, 'ataque_temerario')) lista.push({ id: 'temerario', nombre: 'Ataque temerario', coste: 'gratis', usable: !t.temerarioListo && !tieneCondicion(h, 'temerario') && (t.accion || t.ataquesRestantes > 0), nota: t.temerarioListo || tieneCondicion(h, 'temerario') ? 'Activo' : 'Ventaja, pero te exponen' });
  if (tieneRasgo(h, 'frenesi') && h.efectos.furia) lista.push({ id: 'frenesi', nombre: 'Frenesí', coste: 'adicional', usable: t.adicional, nota: 'Ataque cuerpo a cuerpo extra', objetivo: 'arma_cuerpo' });
  if (tieneRasgo(h, 'accion_astuta')) {
    lista.push({ id: 'correr_adicional', nombre: 'Astucia: Correr', coste: 'adicional', usable: t.adicional });
    lista.push({ id: 'desenganchar_adicional', nombre: 'Astucia: Desengancharse', coste: 'adicional', usable: t.adicional });
    lista.push({ id: 'esconderse_adicional', nombre: 'Astucia: Esconderse', coste: 'adicional', usable: t.adicional });
  }
  if (tieneRasgo(h, 'imposicion_manos')) lista.push({ id: 'imposicion', nombre: 'Imposición de manos', coste: 'accion', usable: t.accion && r.imposicion > 0 && (h.pg < h.pgMax || tieneCondicion(h, 'envenenado')), nota: `${r.imposicion} PG en reserva` });
  if (tieneRasgo(h, 'canalizar_divinidad')) {
    lista.push({ id: 'expulsar', nombre: 'Expulsar muertos vivientes', coste: 'accion', usable: t.accion && r.canalizar > 0, nota: r.canalizar > 0 ? 'Canalizar divinidad' : 'Gastado' });
    lista.push({ id: 'preservar', nombre: 'Preservar la vida', coste: 'accion', usable: t.accion && r.canalizar > 0 && h.pg < Math.floor(h.pgMax / 2), nota: `Hasta ${5 * h.nivel} PG (máx. mitad)` });
  }
  if (tieneRasgo(h, 'arma_sagrada')) lista.push({ id: 'arma_sagrada', nombre: 'Arma sagrada', coste: 'accion', usable: t.accion && r.canalizar > 0 && !h.efectos.armaSagrada, nota: '+CAR a los ataques' });
  if (RAZAS[h.raza].aliento && h.linaje) {
    const lin = LINAJES_DRACONIDOS[h.linaje];
    lista.push({ id: 'aliento', nombre: 'Arma de aliento', coste: 'accion', usable: t.accion && r.aliento > 0, nota: `2d6 ${lin.danio}`, objetivo: 'direccion', area: lin.forma === 'cono' ? { forma: 'cono', tam: 3 } : { forma: 'linea', tam: 6 } });
  }
  if (h.efectos.marca && !h.efectos.marca.objetivo) lista.push({ id: 'trasladar_marca', nombre: 'Trasladar marca', coste: 'adicional', usable: t.adicional, objetivo: 'enemigo' });
  if (c.armaEspiritual && !c.armaEspiritual.recienLanzada) lista.push({ id: 'arma_espiritual', nombre: 'Arma espiritual', coste: 'adicional', usable: t.adicional, nota: `1d8 + ${modCar(h, 'sab')} fuerza`, objetivo: 'enemigo' });
  if (h.efectos.toqueVampirico) lista.push({ id: 'toque_vampirico', nombre: 'Toque vampírico', coste: 'accion', usable: t.accion, nota: 'Repetir drenaje', objetivo: 'enemigo_adyacente' });
  if (tieneCondicion(h, 'apresado')) lista.push({ id: 'escapar', nombre: 'Escapar del apresamiento', coste: 'accion', usable: t.accion });
  return lista;
}

async function usarRasgo(id, objetivo) {
  const c = cmb(), h = estado.heroe, r = h.recursos, H = heroeEnt();
  switch (id) {
    case 'tomar_aliento': {
      if (!c.t.adicional || r.tomarAliento <= 0) return;
      c.t.adicional = false; r.tomarAliento--;
      const t = tirarDados('1d10'); const cura = curarHeroe(t.total + h.nivel);
      log(`<b>Tomas aliento</b>: ${t.texto} + ${h.nivel} → recuperas ${cura} PG.`, 'bueno');
      break;
    }
    case 'oleada': {
      if (r.oleada <= 0) return;
      r.oleada--; c.t.accion = true; c.t.ataquesRestantes = 0;
      log('<b>Oleada de acción</b>: ¡obtienes otra acción!', 'critico');
      break;
    }
    case 'furia': {
      if (!c.t.adicional || r.furia <= 0 || h.efectos.furia) return;
      c.t.adicional = false; r.furia--; h.efectos.furia = true;
      if (h.efectos.concentracion) finConcentracion();
      log('<b>¡Entras en furia!</b> +2 al daño cuerpo a cuerpo y resistencia al daño físico.', 'critico');
      break;
    }
    case 'temerario': c.t.temerarioListo = true; log('Atacarás de forma <b>temeraria</b>: ventaja en tus ataques cuerpo a cuerpo, pero te expones.', 'nota'); break;
    case 'frenesi': {
      if (!c.t.adicional || !objetivo) return;
      const perfil = ataquesDisponibles(h).find(a => !a.aDistancia);
      if (!perfil) return;
      c.t.adicional = false;
      await heroeAtaca(perfil.uid, objetivo, { adicional: true });
      break;
    }
    case 'correr_adicional': case 'desenganchar_adicional': case 'esconderse_adicional': await accionBasica(id); break;
    case 'escapar': await accionBasica('escapar'); break;
    case 'imposicion': {
      if (!c.t.accion || r.imposicion <= 0) return;
      const falta = h.pgMax - h.pg;
      const ops = [];
      if (tieneCondicion(h, 'envenenado') && r.imposicion >= 5) ops.push({ etiqueta: 'Curar veneno (5 puntos)', valor: 'veneno' });
      [5, 10, 20].forEach(v => { if (v < Math.min(falta, r.imposicion)) ops.push({ etiqueta: `Curar ${v} PG`, valor: v }); });
      if (falta > 0) ops.push({ etiqueta: `Curar ${Math.min(falta, r.imposicion)} PG`, valor: Math.min(falta, r.imposicion) });
      ops.push({ etiqueta: 'Cancelar', valor: 0 });
      const v = await Hooks.preguntar('Imposición de manos', `Reserva: ${r.imposicion} PG.`, ops);
      if (!v) return;
      c.t.accion = false;
      if (v === 'veneno') { r.imposicion -= 5; quitarCondicion(h, 'envenenado'); log('Tus manos purgan el veneno.', 'bueno'); }
      else { r.imposicion -= v; const cura = curarHeroe(v); log(`<b>Imposición de manos</b>: recuperas ${cura} PG.`, 'bueno'); }
      break;
    }
    case 'expulsar': {
      if (!c.t.accion || r.canalizar <= 0) return;
      c.t.accion = false; r.canalizar--;
      const cd = cdConjuro(h);
      log(`Alzas tu símbolo sagrado: <b>¡Expulsar muertos vivientes!</b> (CD ${cd})`, 'critico');
      for (const e of enemigosVivos(c)) {
        if (datosMonstruo(e).tipo !== 'muerto_viviente' || dist(e, H) > 6) continue;
        const s = salvacionMonstruo(e, 'sab', cd);
        if (!s.exito) {
          if (tieneRasgo(h, 'destruir_muertos') && vdNumerico(datosMonstruo(e).vd) <= 0.5) { log(`${nombreHtml(e)} se deshace en polvo.`, 'bueno'); await danarEnemigo(e, e.pg, 'radiante', { magico: true }); }
          else { ponerCondicion(e, 'expulsado'); log(`${nombreHtml(e)} huye aterrado (salvación ${s.total}).`, 'bueno'); }
        } else log(`${nombreHtml(e)} resiste (salvación ${s.total}).`, 'malo');
      }
      break;
    }
    case 'preservar': {
      if (!c.t.accion || r.canalizar <= 0) return;
      c.t.accion = false; r.canalizar--;
      const cura = curarHeroe(Math.min(5 * h.nivel, Math.max(0, Math.floor(h.pgMax / 2) - h.pg)));
      log(`<b>Preservar la vida</b>: recuperas ${cura} PG.`, 'bueno');
      break;
    }
    case 'arma_sagrada': {
      if (!c.t.accion || r.canalizar <= 0) return;
      c.t.accion = false; r.canalizar--; h.efectos.armaSagrada = true;
      log(`<b>Arma sagrada</b>: tu arma brilla; +${Math.max(1, modCar(h, 'car'))} a tus ataques con arma.`, 'critico');
      break;
    }
    case 'aliento': {
      if (!c.t.accion || r.aliento <= 0 || !objetivo) return;
      c.t.accion = false; r.aliento--;
      const lin = LINAJES_DRACONIDOS[h.linaje];
      const area = lin.forma === 'cono' ? { forma: 'cono', tam: 3 } : { forma: 'linea', tam: 6 };
      const cd = 8 + modCar(h, 'con') + competencia(h);
      log(`Exhalas tu <b>aliento de ${lin.danio}</b> (CD ${cd}).`, 'critico');
      await resolverArea(celdasArea(c, area, H, objetivo), { salv: lin.salv, cd, danio: '2d6', tipo: lin.danio, mitad: true, magico: true, propio: false });
      break;
    }
    case 'trasladar_marca': {
      if (!c.t.adicional || !objetivo || !h.efectos.marca) return;
      c.t.adicional = false; h.efectos.marca.objetivo = objetivo;
      log(`Trasladas tu marca a ${nombreHtml(c.ents[objetivo])}.`, 'nota');
      break;
    }
    case 'arma_espiritual': {
      if (!c.t.adicional || !objetivo || !c.armaEspiritual) return;
      c.t.adicional = false;
      await ataqueConjuro(c.ents[objetivo], { nombre: 'Arma espiritual', danio: c.armaEspiritual.danio, tipo: 'fuerza', sumaMod: true });
      break;
    }
    case 'toque_vampirico': {
      if (!c.t.accion || !objetivo || !h.efectos.toqueVampirico) return;
      c.t.accion = false;
      const tv = h.efectos.toqueVampirico;
      const hecho = await ataqueConjuro(c.ents[objetivo], { nombre: 'Toque vampírico', danio: tv.danio, tipo: 'necrótico' });
      if (hecho > 0) { const cura = curarHeroe(Math.floor(hecho / 2)); log(`Absorbes ${cura} PG.`, 'bueno'); }
      break;
    }
  }
  Hooks.render();
}

// ─── Conjuros ───
function conjuroBase(idConjuro) { return idConjuro.split('@')[0]; }

// Comprueba si un conjuro se puede lanzar ahora y con qué espacios
function infoLanzamiento(idConjuro, enCombate = true) {
  const h = estado.heroe, c = cmb();
  const id = conjuroBase(idConjuro);
  const cj = CONJUROS[id];
  const racial = idConjuro.endsWith('@raza');
  const res = { id, idConjuro, cj, niveles: [], motivo: null, racial };
  if (!cj) { res.motivo = 'Conjuro desconocido'; return res; }
  if (cj.pasivo) { res.motivo = 'Se aplica solo'; return res; }
  if (racial) {
    if (h.recursos.reprension <= 0) res.motivo = 'Ya usado hoy'; else res.niveles = [2];
    if (cj.tiempo !== 'reaccion') res.motivo = res.motivo || null;
  } else if (cj.nivel === 0) res.niveles = [0];
  else {
    const libres = espaciosLibres(h);
    for (let n = cj.nivel; n <= 3; n++) if (libres[n - 1] > 0) res.niveles.push(n);
    if (cj.ritual && !enCombate && ['mago', 'clerigo'].includes(h.clase)) res.niveles = [cj.nivel];
    if (!res.niveles.length) res.motivo = 'Sin espacios libres';
  }
  if (cj.tiempo === 'reaccion') res.motivo = res.motivo || 'Se usa como reacción';
  if (enCombate && c) {
    if (cj.modo === 'narrativo') res.motivo = res.motivo || 'Fuera de combate';
    if (cj.fueraCombate) res.motivo = res.motivo || 'Fuera de combate';
    if (cj.tiempo === 'accion' && !c.t.accion) res.motivo = res.motivo || 'Sin acción';
    if (cj.tiempo === 'adicional' && !c.t.adicional) res.motivo = res.motivo || 'Sin acción adicional';
    if (cj.tiempo === 'adicional' && c.t.conjuroAccionNivel > 0) res.motivo = res.motivo || 'Ya lanzaste un conjuro con tu acción';
    if (cj.tiempo === 'accion' && c.t.conjuroAdicional && cj.nivel > 0) res.motivo = res.motivo || 'Tras un conjuro adicional solo puedes lanzar trucos';
    if (h.efectos.furia) res.motivo = 'No puedes lanzar conjuros en furia';
    if (cj.efecto === 'armadura_mago' && armaduraEquipada(h)) res.motivo = 'Llevas armadura';
  } else {
    const fuera = ['armadura_mago', 'bayas', 'restablecimiento', 'auxilio'];
    if (!(cj.modo === 'curacion' || cj.modo === 'narrativo' || (cj.modo === 'efecto' && fuera.includes(cj.efecto)))) res.motivo = res.motivo || 'Solo en combate';
    if (cj.efecto === 'armadura_mago' && armaduraEquipada(h)) res.motivo = 'Llevas armadura';
    if (cj.efecto === 'armadura_mago' && h.efectos.armaduraMago) res.motivo = 'Ya activa';
  }
  return res;
}

function danioConjuro(cj, nivelEspacio) {
  const h = estado.heroe;
  let { n, caras, mod } = analizarDados(cj.danio);
  if (cj.trucoEscala && h.nivel >= 5) n *= 2;
  if (cj.escala && nivelEspacio > cj.nivel) { const e = analizarDados(cj.escala); n += e.n * (nivelEspacio - cj.nivel); }
  return `${n}d${caras}${mod ? (mod > 0 ? '+' + mod : mod) : ''}`;
}

function gastarRecursoConjuro(info, nivel, op) {
  const h = estado.heroe;
  if (op && op.gratis) return true;
  if (info.racial) { if (h.recursos.reprension <= 0) return false; h.recursos.reprension--; return true; }
  if (info.cj.nivel === 0) return true;
  if (info.cj.ritual && !cmb() && ['mago', 'clerigo'].includes(h.clase)) return true;
  return gastarEspacio(h, nivel);
}

// Ataque de conjuro genérico; devuelve el daño hecho
async function ataqueConjuro(e, op) {
  const c = cmb(), h = estado.heroe, H = heroeEnt();
  const aDistancia = dist(H, e) > 1;
  const { vent, desv } = modificadoresAtaque(H, e, aDistancia);
  if (h.usarInspiracion && h.inspiracion) { vent.push('inspiración'); h.inspiracion = false; h.usarInspiracion = false; }
  const t = tirarD20({ ventaja: vent.length > 0, desventaja: desv.length > 0, afortunado: !!RAZAS[h.raza].afortunado });
  const bono = op.bono != null ? op.bono : bonoAtaqueConjuro(h);
  const bend = h.efectos.bendicion ? dado(4) : 0;
  const cob = !op.ignoraCobertura && aDistancia && tieneCobertura(c, H, e) ? 2 : 0;
  await Hooks.dado(t, op.nombre);
  quitarCondicion(h, 'oculto');
  if (tieneCondicion(e, 'iluminado')) quitarCondicion(e, 'iluminado');
  const total = t.valor + bono + bend;
  const critico = t.valor === 20;
  const impacta = critico || (t.valor !== 1 && total >= e.ca + cob);
  const cab = `${escaparHtml(op.nombre)} contra ${nombreHtml(e)}: ${textoTirada(t, bono)}${bend ? ' +' + bend : ''}${cob ? ' (cobertura +2)' : ''} = <b>${total}</b> vs CA ${e.ca + cob}`;
  if (!impacta) { log(cab + ' → <b>fallo</b>.', 'fallo'); Hooks.flotante(e.id, 'Fallo', 'nota'); return 0; }
  if (critico) h.estadisticas.criticos++;
  const td = tirarDados(op.danio, { critico });
  let total2 = td.total + (op.sumaMod ? modCar(h, carLanzamiento(h) || 'sab') : 0) + (op.extraPlano || 0);
  let extra = 0;
  if (h.efectos.marca && h.efectos.marca.objetivo === e.id && h.efectos.marca.conjuro === 'maleficio') extra = tirarDados(h.efectos.marca.danio, { critico }).total;
  log(`${cab} → <b>${critico ? '¡CRÍTICO!' : 'impacto'}</b>: ${td.texto}${op.sumaMod || op.extraPlano ? ' + mod' : ''} = ${total2} ${op.tipo}${extra ? ' + ' + extra + ' maleficio' : ''}.`, critico ? 'critico' : 'impacto');
  const hecho = await danarEnemigo(e, total2, op.tipo, { magico: true, critico });
  if (extra && e.pg > 0) await danarEnemigo(e, extra, 'necrótico', { magico: true });
  return hecho;
}

async function resolverArea(celdas, op) {
  const c = cmb(), h = estado.heroe, H = heroeEnt();
  const afectados = enemigosVivos(c).filter(e => celdas.some(p => p.x === e.x && p.y === e.y));
  const incluyeHeroe = celdas.some(p => p.x === H.x && p.y === H.y) && !op.excluirHeroe;
  const danioTirada = op.danio ? tirarDados(op.danio) : null;
  if (danioTirada) log(`Daño: ${danioTirada.texto} = <b>${danioTirada.total}</b> ${op.tipo}.`, 'impacto');
  if (!afectados.length && !incluyeHeroe) log('No alcanzas a ningún enemigo.', 'fallo');
  for (const e of afectados) {
    const s = salvacionMonstruo(e, op.salv, op.cd);
    const txtS = s.auto ? 'falla automáticamente' : `salvación ${s.total} ${s.exito ? 'superada' : 'fallida'}`;
    if (danioTirada) {
      const n = s.exito ? (op.mitad ? Math.floor(danioTirada.total / 2) : 0) : danioTirada.total;
      log(`${nombreHtml(e)}: ${txtS}.`, s.exito ? 'nota' : 'bueno');
      if (n > 0) await danarEnemigo(e, n, op.tipo, { magico: true });
    } else log(`${nombreHtml(e)}: ${txtS}.`, s.exito ? 'nota' : 'bueno');
    if (!s.exito && e.pg > 0) {
      if (op.empuje) empujar(e, H, op.empuje);
      if (op.sinReacciones) { ponerCondicion(e, 'sin_reacciones'); e.reaccion = false; }
      if (op.condicion && !(datosMonstruo(e).inmuneCond || []).includes(op.condicion)) { ponerCondicion(e, op.condicion); log(`${nombreHtml(e)} queda ${CONDICIONES[op.condicion].nombre.toLowerCase()}.`, 'bueno'); }
    }
  }
  if (incluyeHeroe && danioTirada) {
    log('¡Quedas dentro del área!', 'malo');
    const s = await salvacionHeroe(op.salv, op.cd, { motivo: 'tu propio conjuro' });
    const n = s.exito ? (op.mitad ? Math.floor(danioTirada.total / 2) : 0) : danioTirada.total;
    if (n > 0) await danarHeroe(n, op.tipo);
  }
  return afectados;
}

// Lanza un conjuro. objetivo: id de enemigo o {x,y}
async function lanzarConjuro(idConjuro, nivel, objetivo, op = {}) {
  const c = cmb(), h = estado.heroe;
  const info = infoLanzamiento(idConjuro, !!c);
  if (!op.gratis && !op.ignorarMotivo && info.motivo && !(op.reaccion && info.motivo === 'Se usa como reacción')) return { error: info.motivo };
  const cj = info.cj, id = info.id;
  nivel = nivel || (info.niveles[0] != null ? info.niveles[0] : cj.nivel);
  if (!gastarRecursoConjuro(info, nivel, op)) return { error: 'Sin espacios libres' };
  if (c && !op.reaccion) {
    if (cj.tiempo === 'accion' && !op.sinCoste) c.t.accion = false;
    if (cj.tiempo === 'adicional' && !op.sinCoste) { c.t.adicional = false; c.t.conjuroAdicional = true; }
    if (cj.tiempo === 'accion' && cj.nivel > 0) c.t.conjuroAccionNivel = cj.nivel;
  }
  if (c) { quitarCondicion(h, 'invisible'); if (h.efectos.concentracion && h.efectos.concentracion.conjuro === 'invisibilidad' && id !== 'invisibilidad') finConcentracion(); }
  const H = c ? heroeEnt() : null;
  const cd = op.cd || cdConjuro(h);
  const nombreTxt = `<b>${escaparHtml(cj.nombre)}</b>${nivel > cj.nivel && cj.nivel > 0 ? ` (nivel ${nivel})` : ''}`;
  if (c) log(`Lanzas ${nombreTxt}.`, 'conjuro');
  if (cj.concentracion) iniciarConcentracion(id);
  const objEnt = c && typeof objetivo === 'string' ? c.ents[objetivo] : null;

  switch (cj.modo) {
    case 'ataque': {
      let rayos = cj.rayos || 1;
      if (cj.rayosTruco && h.nivel >= 5) rayos = 2;
      if (cj.escalaRayos && nivel > cj.nivel) rayos += (nivel - cj.nivel) * cj.escalaRayos;
      const danio = danioConjuro(cj, nivel);
      for (let i = 0; i < rayos; i++) {
        const e = objEnt && objEnt.pg > 0 ? objEnt : null;
        if (!e) break;
        let extraPlano = 0;
        if (id === 'descarga_sobrenatural' && (h.invocaciones || []).includes('descarga_agonizante')) extraPlano = modCar(h, 'car');
        const hecho = await ataqueConjuro(e, { nombre: cj.nombre + (rayos > 1 ? ` (rayo ${i + 1})` : ''), danio, tipo: cj.tipo, extraPlano, ignoraCobertura: cj.ignoraCobertura });
        if (hecho > 0 || hecho === 0 && e.pg >= 0) {
          if (hecho > 0 && cj.ralentiza) { ponerCondicion(e, 'ralentizado', { cant: cj.ralentiza }); }
          if (hecho > 0 && cj.sinCuracion) e.sinCuracion = true;
          if (hecho > 0 && cj.sinReacciones) { e.reaccion = false; ponerCondicion(e, 'sin_reacciones'); }
          if (hecho > 0 && cj.marcaVentaja && e.pg > 0) { ponerCondicion(e, 'iluminado'); e.marcaLuzTurno = c.ronda; }
          if (hecho > 0 && id === 'descarga_sobrenatural' && (h.invocaciones || []).includes('descarga_repulsora') && e.pg > 0) empujar(e, H, 2);
        }
      }
      break;
    }
    case 'salvacion': {
      const e = objEnt; if (!e) break;
      const s = salvacionMonstruo(e, cj.salv, cd);
      const td = tirarDados(danioConjuro(cj, nivel));
      log(`${nombreHtml(e)} hace una salvación de ${NOMBRE_CAR[cj.salv]}: ${s.auto ? 'fallo automático' : s.total + ' vs CD ' + cd} → ${s.exito ? 'la supera' : 'la falla'}.`, s.exito ? 'fallo' : 'impacto');
      if (!s.exito || cj.mitad) {
        const n = s.exito ? Math.floor(td.total / 2) : td.total;
        log(`Daño: ${td.texto} = <b>${n}</b> ${cj.tipo}.`, 'impacto');
        await danarEnemigo(e, n, cj.tipo, { magico: true });
      }
      break;
    }
    case 'auto': {
      const e = objEnt; if (!e) break;
      const dardos = (cj.dardos || 1) + Math.max(0, nivel - cj.nivel);
      let total = 0; const tiradas = [];
      for (let i = 0; i < dardos; i++) { const t = tirarDados(cj.danio); tiradas.push(t.total); total += t.total; }
      log(`${dardos} dardos impactan a ${nombreHtml(e)}: [${tiradas.join(', ')}] = <b>${total}</b> de fuerza.`, 'impacto');
      await danarEnemigo(e, total, cj.tipo, { magico: true });
      break;
    }
    case 'area': {
      const origen = H;
      const destino = objetivo && objetivo.x != null ? objetivo : origen;
      const celdas = celdasArea(c, cj.area, origen, destino);
      const esculpe = tieneRasgo(h, 'esculpir_conjuros');
      await resolverArea(celdas, { salv: cj.salv, cd, danio: cj.danio ? danioConjuro(cj, nivel) : null, tipo: cj.tipo, mitad: cj.mitad, empuje: cj.empuje, sinReacciones: cj.sinReacciones, condicion: cj.efectoArea, excluirHeroe: esculpe || cj.area.forma !== 'esfera' });
      if (id === 'miedo') { /* asustados: huyen mientras dure la concentración */ }
      break;
    }
    case 'curacion': {
      let dados = danioConjuro(cj, nivel);
      const t = tirarDados(dados);
      let cura = t.total + modCar(h, carLanzamiento(h) || 'sab');
      if (tieneRasgo(h, 'discipulo_vida') && nivel > 0) cura += 2 + nivel;
      cura = Math.max(1, cura);
      const ganado = curarHeroe(cura);
      if (c) log(`Recuperas <b>${ganado}</b> PG (${t.texto} + mod${tieneRasgo(h, 'discipulo_vida') ? ' + discípulo de la vida' : ''}).`, 'bueno');
      return { ok: true, texto: `Recuperas ${ganado} PG.` };
    }
    case 'efecto': return await efectoConjuro(id, cj, nivel, objetivo, cd, op);
    case 'narrativo': return { ok: true, narrativo: true, texto: `Lanzas ${cj.nombre}.` };
  }
  if (c) Hooks.render();
  return { ok: true };
}

async function efectoConjuro(id, cj, nivel, objetivo, cd, op) {
  const c = cmb(), h = estado.heroe, H = c ? heroeEnt() : null;
  const objEnt = c && typeof objetivo === 'string' ? c.ents[objetivo] : null;
  switch (cj.efecto) {
    case 'armadura_mago': h.efectos.armaduraMago = true; return { ok: true, texto: `Una fuerza protectora te envuelve: tu CA es ahora ${claseArmadura(h)}.` };
    case 'escudo': h.efectos.escudoReaccion = true; return { ok: true };
    case 'bendicion': h.efectos.bendicion = true; log('Una gracia divina guía tus golpes: +1d4 a ataques y salvaciones.', 'bueno'); break;
    case 'escudo_fe': h.efectos.escudoFe = true; log(`Un campo reluciente te protege: CA ${claseArmadura(h)}.`, 'bueno'); break;
    case 'piel_robliza': h.efectos.pielRobliza = true; log(`Tu piel se vuelve corteza: CA ${claseArmadura(h)}.`, 'bueno'); break;
    case 'invisibilidad': ponerCondicion(h, 'invisible'); log('Te desvaneces de la vista.', 'bueno'); break;
    case 'marca': {
      if (!objEnt) break;
      h.efectos.marca = { objetivo: objEnt.id, danio: cj.danio, tipo: cj.tipo, conjuro: id };
      log(`Marcas a ${nombreHtml(objEnt)}: +${cj.danio} de daño en cada impacto.`, 'bueno');
      break;
    }
    case 'castigo': h.efectos.castigo = { conjuro: id, danio: cj.danio, tipo: cj.tipo, empuje: cj.empuje, derriba: cj.derriba, salv: cj.salv }; log('Tu arma vibra con poder divino.', 'bueno'); break;
    case 'dormir': {
      let reserva = tirarDados(`${5 + 2 * (nivel - 1)}d8`).total;
      log(`Reserva de sueño: <b>${reserva}</b> PG.`, 'nota');
      const celdas = celdasArea(c, cj.area, H, objetivo);
      const afect = enemigosVivos(c).filter(e => celdas.some(p => p.x === e.x && p.y === e.y)).sort((a, b) => a.pg - b.pg);
      for (const e of afect) {
        if (datosMonstruo(e).tipo === 'muerto_viviente' || (datosMonstruo(e).inmuneCond || []).includes('dormido') || tieneCondicion(e, 'dormido')) continue;
        if (e.pg > reserva) break;
        reserva -= e.pg;
        ponerCondicion(e, 'dormido', { rondas: 10 });
        log(`${nombreHtml(e)} cae dormido.`, 'bueno');
      }
      break;
    }
    case 'inmovilizar': {
      if (!objEnt) break;
      if (datosMonstruo(objEnt).tipo !== 'humanoide') { log(`${nombreHtml(objEnt)} no es humanoide: el conjuro no le afecta.`, 'fallo'); finConcentracion(); break; }
      const s = salvacionMonstruo(objEnt, 'sab', cd);
      if (s.exito) { log(`${nombreHtml(objEnt)} resiste (salvación ${s.total}).`, 'fallo'); finConcentracion(); }
      else { ponerCondicion(objEnt, 'paralizado', { repetir: true, salv: 'sab', cd }); objEnt.inmovilizadoPorHeroe = true; log(`${nombreHtml(objEnt)} queda <b>paralizado</b> (salvación ${s.total}).`, 'bueno'); }
      break;
    }
    case 'paso_brumoso': {
      if (!objetivo || objetivo.x == null || !celdaLibre(c, objetivo.x, objetivo.y)) break;
      H.x = objetivo.x; H.y = objetivo.y;
      log('Te desvaneces en una bruma plateada y reapareces a unos metros.', 'bueno');
      break;
    }
    case 'arma_espiritual': {
      c.armaEspiritual = { danio: '1d8', rondas: 10, recienLanzada: true };
      if (objEnt) await ataqueConjuro(objEnt, { nombre: 'Arma espiritual', danio: '1d8', tipo: 'fuerza', sumaMod: true });
      c.armaEspiritual.recienLanzada = false;
      c.t.armaEspiritualUsada = true;
      break;
    }
    case 'toque_vampirico': {
      const danio = danioConjuro(cj, nivel);
      h.efectos.toqueVampirico = { danio };
      h.efectos.concentracion.conjuro = 'toque_vampirico';
      if (objEnt) { const hecho = await ataqueConjuro(objEnt, { nombre: 'Toque vampírico', danio, tipo: 'necrótico' }); if (hecho > 0) { const cura = curarHeroe(Math.floor(hecho / 2)); log(`Absorbes ${cura} PG.`, 'bueno'); } }
      break;
    }
    case 'espiritus': {
      c.aura = { radio: cj.area.tam, danio: danioConjuro(cj, nivel), salv: cj.salv, cd, tipo: cj.tipo };
      log('Espíritus radiantes giran a tu alrededor.', 'bueno');
      break;
    }
    case 'reprension': {
      if (!objEnt) break;
      const s = salvacionMonstruo(objEnt, 'des', cd);
      const td = tirarDados(danioConjuro(cj, nivel));
      const n = s.exito ? Math.floor(td.total / 2) : td.total;
      log(`Las llamas infernales envuelven a ${nombreHtml(objEnt)} (salvación ${s.total}): <b>${n}</b> de fuego.`, 'impacto');
      await danarEnemigo(objEnt, n, 'fuego', { magico: true });
      break;
    }
    case 'restablecimiento': {
      const quitables = ['envenenado', 'paralizado', 'asustado'];
      const tenia = (h.condiciones || []).filter(x => quitables.includes(x.id));
      tenia.forEach(x => quitarCondicion(h, x.id));
      const t = tenia.length ? `Te libras de: ${tenia.map(x => CONDICIONES[x.id].nombre.toLowerCase()).join(', ')}.` : 'No tenías ninguna condición que eliminar.';
      if (c) log(t, 'bueno');
      return { ok: true, texto: t };
    }
    case 'auxilio': {
      const extra = 5 * (1 + nivel - 2);
      h.efectos.auxilio = Math.max(h.efectos.auxilio || 0, extra);
      recalcularPg(h);
      const t = `Tu vitalidad aumenta: PG máximos ${h.pgMax}.`;
      if (c) log(t, 'bueno');
      return { ok: true, texto: t };
    }
    case 'bayas': anadirObjeto(h, 'baya', 10); return { ok: true, texto: 'Creas diez bayas nutritivas.' };
  }
  if (c) Hooks.render();
  return { ok: true };
}

// ─── IA de los enemigos ───
function ataquesCuerpo(e) { return datosMonstruo(e).ataques.filter(a => !a.distancia); }
function ataquesDistancia(e) { return datosMonstruo(e).ataques.filter(a => a.distancia); }
function velEnemigo(e) {
  let v = datosMonstruo(e).vel;
  const r = (e.condiciones || []).find(x => x.id === 'ralentizado');
  if (r) v = Math.max(0, v - (r.cant || 2));
  if (tieneCondicion(e, 'apresado') || tieneCondicion(e, 'paralizado') || tieneCondicion(e, 'dormido')) v = 0;
  const c = cmb();
  if (c.aura && dist(e, c.ents.heroe) <= c.aura.radio) v = Math.ceil(v / 2);
  return v;
}

async function moverEnemigo(e, destino, maxPasos) {
  const c = cmb(), H = c.ents.heroe, h = estado.heroe;
  const { previo } = mapaDistancias(c, e, { bando: 'enemigo', vuela: datosMonstruo(e).vuela });
  const ruta = reconstruirRuta(previo, e, destino).slice(0, maxPasos);
  let prev = { x: e.x, y: e.y };
  let movidos = 0;
  for (const paso of ruta) {
    if (entEn(c, paso.x, paso.y) || (esObstaculo(c, paso.x, paso.y) && paso === ruta[ruta.length - 1])) break;
    // Ataque de oportunidad del héroe
    if (!e.desenganchado && dist(H, prev) <= 1 && dist(H, paso) > 1 && h.reaccion !== false && !h.caido && !incapacitado(H)) {
      const perfil = ataquesDisponibles(h).find(a => !a.aDistancia);
      if (perfil) {
        h.reaccion = false;
        log(`${nombreHtml(e)} se aleja de ti: <b>ataque de oportunidad</b>.`, 'nota');
        await heroeAtaca(perfil.uid, e.id, { oportunidad: true });
        if (e.pg <= 0) return movidos;
      }
    }
    e.x = paso.x; e.y = paso.y; movidos++;
    prev = paso;
    Hooks.render();
    await Hooks.pausa(110);
  }
  return movidos;
}

// Celda libre adyacente al héroe más cercana (en pasos) para el enemigo
function destinoHaciaHeroe(e) {
  const c = cmb(), H = c.ents.heroe;
  const { d } = mapaDistancias(c, e, { bando: 'enemigo', vuela: datosMonstruo(e).vuela });
  let mejor = null;
  for (let y = 0; y < ALTO_MAPA; y++) for (let x = 0; x < ANCHO_MAPA; x++) {
    if (d[y][x] === Infinity || !celdaLibre(c, x, y) && !(x === e.x && y === e.y)) continue;
    if (dist({ x, y }, H) !== 1) continue;
    if (!mejor || d[y][x] < mejor.d) mejor = { x, y, d: d[y][x] };
  }
  if (mejor) return mejor;
  // Si no hay hueco junto al héroe, acercarse lo máximo posible
  for (let y = 0; y < ALTO_MAPA; y++) for (let x = 0; x < ANCHO_MAPA; x++) {
    if (d[y][x] === Infinity || !celdaLibre(c, x, y)) continue;
    const dd = dist({ x, y }, H);
    if (!mejor || dd < mejor.dh || (dd === mejor.dh && d[y][x] < mejor.d)) mejor = { x, y, d: d[y][x], dh: dd };
  }
  return mejor;
}
// Celda para alejarse del héroe (a distancia entre minD y maxD)
function destinoAlejarse(e, minD = 3, maxPasos = 6) {
  const c = cmb(), H = c.ents.heroe;
  const { d } = mapaDistancias(c, e, { bando: 'enemigo', vuela: datosMonstruo(e).vuela });
  let mejor = null;
  for (let y = 0; y < ALTO_MAPA; y++) for (let x = 0; x < ANCHO_MAPA; x++) {
    if (d[y][x] === Infinity || d[y][x] > maxPasos || !celdaLibre(c, x, y)) continue;
    const dh = dist({ x, y }, H);
    const puntos = (dh >= minD ? 100 : dh * 10) - d[y][x] + (tieneCobertura(c, { x, y }, H) ? -5 : 0);
    if (!mejor || puntos > mejor.p) mejor = { x, y, p: puntos };
  }
  return mejor;
}

async function turnoEnemigo(e) {
  const c = cmb(), h = estado.heroe, H = c.ents.heroe, m = datosMonstruo(e);
  e.reaccion = true; e.desenganchado = false; e.movidoTurno = 0; e.paradaActiva = false;
  quitarCondicion(e, 'sin_reacciones');
  // Inicio de turno: regeneración, aura, recargas, sueño
  if ((m.rasgos || []).includes('regeneracion') && e.pg > 0 && e.pg < e.pgMax) {
    if (e.regenBloqueada || e.sinCuracion) log(`${nombreHtml(e)} no se regenera.`, 'bueno');
    else { const antes = e.pg; e.pg = Math.min(e.pgMax, e.pg + 10); log(`${nombreHtml(e)} se regenera ${e.pg - antes} PG.`, 'malo'); Hooks.flotante(e.id, '+' + (e.pg - antes), 'cura'); }
  }
  e.regenBloqueada = false; e.sinCuracion = false;
  if (c.aura && dist(e, H) <= c.aura.radio) {
    const s = salvacionMonstruo(e, c.aura.salv, c.aura.cd);
    const n = tirarDados(c.aura.danio).total;
    const d = s.exito ? Math.floor(n / 2) : n;
    log(`Los espíritus guardianes golpean a ${nombreHtml(e)} (salvación ${s.total}): ${d} radiante.`, 'impacto');
    await danarEnemigo(e, d, c.aura.tipo, { magico: true });
    if (e.pg <= 0) return;
  }
  for (const esp of (m.especiales || [])) if (esp.recarga && !e.recargas[esp.id]) { const r = dado(6); if (r >= esp.recarga) { e.recargas[esp.id] = true; } }
  const dormido = (e.condiciones || []).find(x => x.id === 'dormido');
  if (dormido) { dormido.rondas = (dormido.rondas || 10) - 1; if (dormido.rondas <= 0) quitarCondicion(e, 'dormido'); else { log(`${nombreHtml(e)} sigue dormido.`, 'nota'); return; } }
  if (c.sorpresa === 'enemigos' && c.ronda === 1) { log(`${nombreHtml(e)} aún no reacciona.`, 'nota'); return; }
  if (tieneCondicion(e, 'paralizado')) {
    log(`${nombreHtml(e)} está paralizado.`, 'nota');
    await finTurnoEnemigo(e);
    return;
  }
  if (h.caido && estado.ajustes.dificultad !== 'dificil') { log(`${nombreHtml(e)} te da por muerto.`, 'nota'); return; }
  // Levantarse
  let mov = velEnemigo(e);
  if (tieneCondicion(e, 'derribado')) { quitarCondicion(e, 'derribado'); mov = Math.floor(mov / 2); }
  // Huir si está expulsado o asustado por Miedo
  if (tieneCondicion(e, 'expulsado') || tieneCondicion(e, 'asustado')) {
    const dest = destinoAlejarse(e, 8, mov);
    if (dest) { e.desenganchado = false; await moverEnemigo(e, dest, mov); }
    log(`${nombreHtml(e)} huye despavorido.`, 'nota');
    await finTurnoEnemigo(e);
    return;
  }
  await decidirAccionEnemigo(e, mov);
  await finTurnoEnemigo(e);
}

async function finTurnoEnemigo(e) {
  for (const cond of (e.condiciones || []).slice()) {
    if (cond.repetir && cond.salv) {
      const s = salvacionMonstruo(e, cond.salv, cond.cd);
      if (s.exito) { quitarCondicion(e, cond.id); if (e.inmovilizadoPorHeroe) e.inmovilizadoPorHeroe = false; log(`${nombreHtml(e)} se libra de la parálisis (salvación ${s.total}).`, 'malo'); }
    }
  }
  quitarCondicion(e, 'ralentizado');
  Hooks.render();
}

async function decidirAccionEnemigo(e, mov) {
  const c = cmb(), h = estado.heroe, H = c.ents.heroe, m = datosMonstruo(e);
  const melee = ataquesCuerpo(e), ranged = ataquesDistancia(e);
  const rasgos = m.rasgos || [];
  // Habilidades especiales con recarga o usos
  const especial = (m.especiales || []).find(esp => (esp.recarga ? e.recargas[esp.id] : (esp.usos ? (e.usos[esp.id] || 0) > 0 : false)));
  if (especial && m.comportamiento !== 'lanzador') {
    const alcanceEsp = especial.tipo === 'area' ? especial.area.tam : (especial.distancia || 1);
    if (dist(e, H) > alcanceEsp && mov > 0) {
      const dest = especial.tipo === 'area' || alcanceEsp <= 1 ? destinoHaciaHeroe(e) : destinoHaciaHeroe(e);
      if (dest) { e.movidoTurno += await moverEnemigo(e, dest, Math.min(mov, Math.max(0, dist(e, H) - alcanceEsp + 1))); if (e.pg <= 0) return; }
    }
    if (dist(e, H) <= alcanceEsp) { await usarEspecial(e, especial); return; }
  }
  if (m.comportamiento === 'lanzador') { await turnoLanzador(e, mov); return; }

  const adyacente = dist(e, H) <= 1;
  const prefiereDistancia = m.comportamiento === 'distancia' || (m.comportamiento === 'mixto' && !adyacente && dist(e, H) - 1 > mov);
  if (adyacente && melee.length && !(m.comportamiento === 'distancia' && rasgos.includes('huida_agil'))) {
    await multiataque(e, 'cuerpo');
    // Huida ágil: tras atacar, los goblins se retiran
    if (rasgos.includes('huida_agil') && ranged.length && e.pg > 0 && !h.caido && azar(2) === 0) {
      e.desenganchado = true;
      const dest = destinoAlejarse(e, 3, mov);
      if (dest) { await moverEnemigo(e, dest, mov); log(`${nombreHtml(e)} se retira con agilidad.`, 'nota'); }
    }
    return;
  }
  if (ranged.length && (prefiereDistancia || !melee.length)) {
    const atq = ranged[0];
    if (adyacente) {
      // Alejarse antes de disparar
      if (rasgos.includes('huida_agil')) e.desenganchado = true;
      const dest = destinoAlejarse(e, 3, mov);
      if (dest) { await moverEnemigo(e, dest, mov); if (e.pg <= 0) return; }
    } else if (dist(e, H) > atq.distancia[0] || tieneCobertura(c, e, H)) {
      // Buscar mejor posición de tiro
      const dest = destinoAlejarse(e, 3, Math.min(mov, 3));
      if (dest && !tieneCobertura(c, dest, H) && dist(dest, H) <= atq.distancia[0]) await moverEnemigo(e, dest, mov);
    }
    if (e.pg > 0 && dist(e, H) <= atq.distancia[1]) { await multiataque(e, 'distancia'); return; }
  }
  // Acercarse
  if (!adyacente && mov > 0) {
    const dest = destinoHaciaHeroe(e);
    if (dest) e.movidoTurno += await moverEnemigo(e, dest, mov);
    if (e.pg <= 0) return;
    // Agresivo (orcos): movimiento adicional
    if (dist(e, H) > 1 && rasgos.includes('agresivo')) {
      const d2 = destinoHaciaHeroe(e);
      if (d2) { log(`${nombreHtml(e)} carga con agresividad.`, 'nota'); e.movidoTurno += await moverEnemigo(e, d2, velEnemigo(e)); }
    }
  }
  if (e.pg <= 0 || h.caido && estado.ajustes.dificultad !== 'dificil') return;
  if (dist(e, H) <= 1 && melee.length) { await multiataque(e, 'cuerpo'); return; }
  if (ranged.length) { const atq = ranged[0]; if (dist(e, H) <= atq.distancia[1]) await multiataque(e, 'distancia'); }
}

async function turnoLanzador(e, mov) {
  const c = cmb(), h = estado.heroe, H = c.ents.heroe, m = datosMonstruo(e);
  const esp = id => (m.especiales || []).find(s => s.id === id);
  const inm = esp('inmovilizar'), inf = esp('infligir'), llama = esp('llama');
  if (inm && (e.usos.inmovilizar || 0) > 0 && !tieneCondicion(h, 'paralizado') && dist(e, H) <= inm.distancia) { await usarEspecial(e, inm); return; }
  if (dist(e, H) > 1 && mov >= dist(e, H) - 1) {
    const dest = destinoHaciaHeroe(e);
    if (dest) await moverEnemigo(e, dest, mov);
    if (e.pg <= 0) return;
  }
  if (dist(e, H) <= 1) {
    if (inf && (e.usos.infligir || 0) > 0) { await usarEspecial(e, inf); return; }
    await multiataque(e, 'cuerpo'); return;
  }
  if (llama && dist(e, H) <= llama.distancia) { await usarEspecial(e, llama); return; }
  const dest = destinoHaciaHeroe(e);
  if (dest) await moverEnemigo(e, dest, mov);
}

async function multiataque(e, modo) {
  const m = datosMonstruo(e), h = estado.heroe;
  const lista = (m.multi && m.multi[modo]) ? m.multi[modo].map(id => m.ataques.find(a => a.id === id)) : [modo === 'cuerpo' ? ataquesCuerpo(e)[0] : ataquesDistancia(e)[0]];
  for (const atq of lista) {
    if (!atq || e.pg <= 0 || cmb().resultado) break;
    if (h.caido && estado.ajustes.dificultad !== 'dificil') break;
    if (modo === 'cuerpo' && dist(e, cmb().ents.heroe) > 1) break;
    await enemigoAtaca(e, atq);
    await Hooks.pausa(180);
  }
}

async function enemigoAtaca(e, atq, op = {}) {
  const c = cmb(), h = estado.heroe, H = c.ents.heroe, m = datosMonstruo(e);
  const aDistancia = !!atq.distancia;
  const { vent, desv } = modificadoresAtaque(e, H, aDistancia);
  if ((m.rasgos || []).includes('tactica_manada') && enemigosVivos(c).some(o => o !== e && dist(o, H) <= 1 && !incapacitado(o))) vent.push('táctica de manada');
  if (aDistancia && dist(e, H) > atq.distancia[0]) desv.push('largo alcance');
  const t = tirarD20({ ventaja: vent.length > 0, desventaja: desv.length > 0 });
  const cob = aDistancia && tieneCobertura(c, e, H) ? 2 : 0;
  let ca = claseArmadura(h) + cob;
  const total = t.valor + atq.bono;
  let critico = t.valor === 20;
  let impacta = critico || (t.valor !== 1 && total >= ca);
  if (impacta && !aDistancia && (tieneCondicion(h, 'paralizado') || h.caido)) critico = true;
  const cab = `${nombreHtml(e)} ${op.oportunidad ? '' : 'ataca '}con ${escaparHtml(atq.nombre)}: ${textoTirada(t, atq.bono)} = <b>${total}</b> vs CA ${ca}`;
  if (impacta && !critico && !h.caido) {
    // Reacción: Escudo
    const sabeEscudo = conjurosDisponibles(h).includes('escudo') && espaciosLibres(h).some(n => n > 0) && h.reaccion !== false && !h.efectos.escudoReaccion;
    if (sabeEscudo && total < ca + 5) {
      const usar = await Hooks.preguntar('Reacción: Escudo', `${nombreEnt(e)} te impacta con un ${total} (tu CA es ${ca}). Con Escudo (+5 CA) fallaría. ¿Gastas un espacio de nivel 1?`, [{ etiqueta: 'Lanzar Escudo', valor: true }, { etiqueta: 'No', valor: false }]);
      if (usar) {
        const nivel = espaciosLibres(h).findIndex(n => n > 0) + 1;
        gastarEspacio(h, nivel); h.reaccion = false; h.efectos.escudoReaccion = true;
        ca = claseArmadura(h) + cob;
        impacta = total >= ca;
        log('Una barrera invisible se alza: <b>Escudo</b> (+5 CA).', 'conjuro');
      }
    }
  }
  if (!impacta) { log(cab + ' → <b>falla</b>.', 'fallo'); Hooks.flotante('heroe', 'Fallo', 'nota'); return; }
  let td = tirarDados(atq.danio, { critico });
  let n = td.total;
  const extraTxt = [];
  if ((m.rasgos || []).includes('ventaja_marcial') && e.ventajaMarcialUsada !== c.ronda && enemigosVivos(c).some(o => o !== e && dist(o, H) <= 1)) { const s = sumarDados(2, 6, critico); n += s; e.ventajaMarcialUsada = c.ronda; extraTxt.push(`+${s} ventaja marcial`); }
  if ((m.rasgos || []).includes('ataque_sorpresa') && c.ronda === 1 && c.sorpresa === 'heroe') { const s = sumarDados(2, 6, critico); n += s; extraTxt.push(`+${s} sorpresa`); }
  if ((m.rasgos || []).includes('carga') && atq.id === 'cornada' && e.movidoTurno >= 2) { const s = sumarDados(2, 8, critico); n += s; extraTxt.push(`+${s} carga`); }
  log(`${cab} → <b>${critico ? '¡CRÍTICO!' : 'impacta'}</b>: ${td.texto}${extraTxt.length ? ' ' + extraTxt.join(' ') : ''} = ${n} ${atq.tipo}.`, critico ? 'critico-malo' : 'golpe');
  // Reacción: Esquiva asombrosa
  if (tieneRasgo(h, 'esquiva_asombrosa') && h.reaccion !== false && !h.caido && n >= 6) {
    const usar = await Hooks.preguntar('Reacción: Esquiva asombrosa', `Vas a recibir ${n} de daño de ${nombreEnt(e)}. ¿Usas tu reacción para reducirlo a la mitad?`, [{ etiqueta: 'Esquivar (mitad de daño)', valor: true }, { etiqueta: 'No', valor: false }]);
    if (usar) { h.reaccion = false; n = Math.floor(n / 2); log(`Esquivas en el último momento: recibes ${n}.`, 'bueno'); }
  }
  await danarHeroe(n, atq.tipo, { critico, fuente: e.id });
  if (atq.alImpactar && !h.caido) await efectosAlImpactar(e, atq.alImpactar, critico);
  // Parada del capitán: preparada para el próximo golpe del héroe
  if ((m.rasgos || []).includes('parada')) e.paradaActiva = false;
  if (!h.caido && h.reaccion !== false) await ofrecerReprension(e);
}

async function efectosAlImpactar(e, ef, critico) {
  const h = estado.heroe;
  if (ef.extra) { const s = tirarDados(ef.extra, { critico }).total; log(`+${s} de ${ef.tipoExtra}.`, 'golpe'); await danarHeroe(s, ef.tipoExtra); }
  if (h.caido) return;
  if (ef.noElfos && h.raza === 'elfo' && ef.condicion === 'paralizado') { log('Tu sangre élfica resiste la parálisis.', 'bueno'); return; }
  if (ef.salv) {
    const r = await salvacionHeroe(ef.salv, ef.cd, { veneno: ef.tipo === 'veneno', motivo: ef.condicion ? CONDICIONES[ef.condicion].nombre : 'veneno' });
    if (ef.danio) {
      const td = tirarDados(ef.danio);
      const n = r.exito ? (ef.mitad ? Math.floor(td.total / 2) : 0) : td.total;
      if (n > 0) { log(`Sufres ${n} de ${ef.tipo}.`, 'golpe'); await danarHeroe(n, ef.tipo); }
    }
    if (!r.exito && ef.condicion) {
      ponerCondicion(h, ef.condicion, ef.repetir ? { repetir: true, salv: ef.salv, cd: ef.cd } : {});
      log(`Quedas <b>${CONDICIONES[ef.condicion].nombre.toLowerCase()}</b>.`, 'malo');
    }
  } else if (ef.condicion) {
    ponerCondicion(h, ef.condicion, { escape: ef.escape });
    log(`Quedas <b>${CONDICIONES[ef.condicion].nombre.toLowerCase()}</b>${ef.escape ? ` (CD ${ef.escape} para escapar)` : ''}.`, 'malo');
  }
}

async function ofrecerReprension(e) {
  const h = estado.heroe, c = cmb();
  if (e.pg <= 0 || dist(e, c.ents.heroe) > 12) return;
  const disp = conjurosDisponibles(h);
  const opciones = [];
  if (disp.includes('reprension_infernal') && espaciosLibres(h).some((n, i) => n > 0)) opciones.push({ etiqueta: 'Reprensión infernal (espacio)', valor: 'espacio' });
  if (disp.includes('reprension_infernal@raza') && h.recursos.reprension > 0) opciones.push({ etiqueta: 'Reprensión infernal (legado tiefling)', valor: 'raza' });
  if (!opciones.length) return;
  opciones.push({ etiqueta: 'No', valor: null });
  const v = await Hooks.preguntar('Reacción: Reprensión infernal', `${nombreEnt(e)} te ha herido. ¿Respondes con llamas infernales?`, opciones);
  if (!v) return;
  h.reaccion = false;
  if (v === 'raza') await lanzarConjuro('reprension_infernal@raza', 2, e.id, { reaccion: true, cd: 8 + competencia(h) + modCar(h, 'car') });
  else { const nivel = espaciosLibres(h).findIndex(n => n > 0) + 1; await lanzarConjuro('reprension_infernal', nivel, e.id, { reaccion: true, ignorarMotivo: true }); }
}

async function usarEspecial(e, esp) {
  const c = cmb(), h = estado.heroe, H = c.ents.heroe;
  if (esp.recarga) e.recargas[esp.id] = false;
  if (esp.usos) e.usos[esp.id] = (e.usos[esp.id] || 0) - 1;
  log(`${nombreHtml(e)} usa <b>${escaparHtml(esp.nombre)}</b>.`, 'especial');
  if (esp.tipo === 'area') {
    const celdas = celdasArea(c, esp.area, e, H);
    if (!celdas.some(p => p.x === H.x && p.y === H.y)) { log('No te alcanza.', 'bueno'); return; }
    const td = tirarDados(esp.danio);
    const r = await salvacionHeroe(esp.salv, esp.cd, { motivo: esp.nombre });
    const n = r.exito ? (esp.mitad ? Math.floor(td.total / 2) : 0) : td.total;
    log(`Daño: ${td.texto} = ${td.total}${r.exito ? ', la mitad: ' + n : ''} de ${esp.tipoDanio}.`, 'golpe');
    if (n > 0) await danarHeroe(n, esp.tipoDanio);
    return;
  }
  if (esp.tipo === 'ataque') {
    const { vent, desv } = modificadoresAtaque(e, H, esp.distancia > 1);
    const t = tirarD20({ ventaja: vent.length > 0, desventaja: desv.length > 0 });
    const ca = claseArmadura(h);
    const total = t.valor + esp.bono;
    const impacta = t.valor === 20 || (t.valor !== 1 && total >= ca);
    log(`${textoTirada(t, esp.bono)} = <b>${total}</b> vs CA ${ca} → ${impacta ? 'impacta' : 'falla'}.`, impacta ? 'golpe' : 'fallo');
    if (!impacta) return;
    if (esp.danio) { const td = tirarDados(esp.danio, { critico: t.valor === 20 }); log(`Daño: ${td.texto} = ${td.total} ${esp.tipoDanio}.`, 'golpe'); await danarHeroe(td.total, esp.tipoDanio, { critico: t.valor === 20 }); }
    if (esp.condicion && !h.caido) { ponerCondicion(h, esp.condicion, { escape: esp.escape }); log(`Quedas <b>${CONDICIONES[esp.condicion].nombre.toLowerCase()}</b> (CD ${esp.escape} para escapar).`, 'malo'); }
    return;
  }
  if (esp.tipo === 'salvacion') {
    const r = await salvacionHeroe(esp.salv, esp.cd, { magia: true, motivo: esp.nombre });
    if (esp.danio) {
      const td = tirarDados(esp.danio);
      const n = r.exito ? (esp.mitad ? Math.floor(td.total / 2) : 0) : td.total;
      if (n > 0) { log(`Daño: ${td.texto} = ${n} ${esp.tipoDanio}.`, 'golpe'); await danarHeroe(n, esp.tipoDanio); }
    }
    if (!r.exito && esp.condicion && !h.caido) {
      ponerCondicion(h, esp.condicion, esp.repetir ? { repetir: true, salv: esp.salv, cd: esp.cd } : { escape: esp.escape });
      log(`Quedas <b>${CONDICIONES[esp.condicion].nombre.toLowerCase()}</b>.`, 'malo');
    }
  }
}

// ─── Uso de objetos en combate ───
async function usarObjetoCombate(uidObj, objetivoId) {
  const c = cmb(), h = estado.heroe;
  const it = h.inventario.find(x => x.uid === uidObj);
  if (!it) return;
  const o = OBJETOS[it.id];
  if (o.tipo === 'pergamino' || o.tipo === 'varita') {
    if (o.tipo === 'varita' && (it.cargas || 0) <= 0) return;
    const cj = CONJUROS[o.conjuro];
    if (c && !c.t[cj.tiempo === 'adicional' ? 'adicional' : 'accion']) return;
    const r = await lanzarConjuro(o.conjuro, o.nivelConjuro || cj.nivel, objetivoId, { gratis: true, cd: 13 });
    if (r && r.error) return r;
    if (o.tipo === 'pergamino') quitarObjeto(h, uidObj, 1); else it.cargas--;
    Hooks.render();
    return r;
  }
  const coste = o.uso === 'adicional' ? 'adicional' : 'accion';
  if (c && !c.t[coste]) return;
  const r = aplicarConsumible(it, objetivoId);
  if (c) { c.t[coste] = false; if (r && r.texto) log(r.texto, r.clase || 'bueno'); }
  if (r && r.arrojar && c) {
    const e = c.ents[objetivoId];
    if (e) {
      if (o.soloContra && !o.soloContra.includes(datosMonstruo(e).tipo)) log(`${escaparHtml(o.nombre)} no afecta a ${nombreHtml(e)}.`, 'fallo');
      else {
        const H = heroeEnt();
        const t = tirarD20({ desventaja: enemigosAdyacentes(H).length > 0 });
        const bono = modCar(h, 'des') + competencia(h);
        await Hooks.dado(t, o.nombre);
        const total = t.valor + bono;
        if (t.valor === 20 || (t.valor !== 1 && total >= e.ca)) { const n = tirarDados(o.dados).total; log(`El frasco estalla sobre ${nombreHtml(e)} (${total} vs CA ${e.ca}): ${n} de ${o.tipoDanio}.`, 'impacto'); await danarEnemigo(e, n, o.tipoDanio, { magico: true }); }
        else log(`Fallas el lanzamiento (${total} vs CA ${e.ca}).`, 'fallo');
      }
    }
  }
  Hooks.render();
  return r;
}

// Aplica un consumible (dentro o fuera de combate); devuelve {texto}
function aplicarConsumible(it, objetivoId) {
  const h = estado.heroe, o = OBJETOS[it.id];
  quitarObjeto(h, it.uid, 1);
  switch (o.efecto) {
    case 'curar': { const t = tirarDados(o.dados); const g = curarHeroe(t.total); return { texto: `Usas ${o.nombre}: recuperas ${g} PG.` }; }
    case 'antidoto': quitarCondicion(h, 'envenenado'); return { texto: 'El antídoto limpia tu sangre.' };
    case 'fuerza_gigante': h.efectos.fuerzaGigante = true; return { texto: 'Tus músculos se hinchan: FUE 21 durante el próximo combate.' };
    case 'heroismo': h.pgTemp = Math.max(h.pgTemp, 10); h.efectos.bendicion = true; h.efectos.heroismo = true; return { texto: 'Te sientes invencible: 10 PG temporales y bendecido.' };
    case 'resist_fuego': h.efectos.resistFuego = true; return { texto: 'Tu piel se enfría: resistencia al fuego hasta el próximo descanso largo.' };
    case 'arrojar': return { arrojar: true, texto: `Arrojas ${o.nombre}.`, clase: 'nota' };
  }
  return { texto: `Usas ${o.nombre}.` };
}

// ─── Fin del combate ───
async function terminarCombate() {
  const c = cmb(), h = estado.heroe;
  if (!c || c.cerrado) return;
  c.cerrado = true;
  c.esperandoJugador = false;
  // Limpieza de efectos de combate
  if (h.efectos.concentracion) finConcentracion();
  h.efectos.furia = false; h.efectos.armaSagrada = false; h.efectos.escudoReaccion = false; h.efectos.fuerzaGigante = false;
  if (h.efectos.heroismo) { h.efectos.heroismo = false; h.efectos.bendicion = false; }
  h.efectos.toqueVampirico = null; h.efectos.marca = null; h.efectos.castigo = null;
  h.condiciones = (h.condiciones || []).filter(x => ['envenenado'].includes(x.id));
  h.reaccion = true;
  const res = { resultado: c.resultado, px: 0, oro: 0, objetos: [], derrotados: c.derrotados.slice(), ronda: c.ronda };
  if (c.resultado === 'victoria') {
    res.px = c.pxGanados;
    // Botín: oro según los humanoides y su peligrosidad
    let oro = 0;
    for (const e of enemigos(c)) {
      const m = datosMonstruo(e);
      if (['humanoide', 'gigante', 'dragon'].includes(m.tipo)) oro += Math.round(e.px / 10 * (0.5 + Math.random()));
      if (m.tipo === 'dragon') oro += 150 + azar(150);
      if (e.jefe) oro += 20 + azar(40);
    }
    res.oro = oro;
    const tiradaBotin = azar(100);
    const hayJefe = enemigos(c).some(e => e.jefe || MONSTRUOS[e.mid].px >= 700);
    if (hayJefe) res.objetos.push(elegir(h.nivel >= 3 ? BOTIN_RARO : BOTIN_MEDIO));
    else if (tiradaBotin < 30) res.objetos.push(elegir(BOTIN_COMUN));
    else if (tiradaBotin < 38) res.objetos.push(elegir(BOTIN_MEDIO));
    h.oro += res.oro;
    for (const id of res.objetos) anadirObjeto(h, id, 1);
    ganarPx(h, res.px);
    log(`<span class="l-titulo">¡Victoria!</span> +${res.px} PX${res.oro ? `, +${res.oro} po` : ''}${res.objetos.length ? ', ' + res.objetos.map(id => OBJETOS[id].nombre).join(', ') : ''}.`, 'critico');
  } else if (c.resultado === 'derrota') {
    h.caido = false; h.pg = Math.max(1, h.pg); h.muerte = { exitos: 0, fallos: 0 };
    quitarCondicion(h, 'inconsciente');
    ganarPx(h, Math.floor(c.pxGanados));
    res.px = c.pxGanados;
    log('Caes derrotado...', 'malo');
  } else if (c.resultado === 'huida') {
    ganarPx(h, c.pxGanados); res.px = c.pxGanados;
  } else if (c.resultado === 'muerte') {
    h.muerto = true;
    log('<span class="l-titulo">Has muerto.</span>', 'malo');
  }
  c.resumen = res;
  Hooks.render();
  Hooks.finCombate(c);
}

// Resumen del combate para el DM
function textoResultadoCombate(c) {
  const r = c.resumen, h = estado.heroe;
  const nombres = {};
  enemigos(c).forEach(e => { nombres[e.nombre] = e.pg > 0 ? 'vivo' : 'derrotado'; });
  const lista = Object.entries(nombres).map(([n, s]) => `${n} (${s})`).join(', ');
  const base = `Enemigos: ${lista}. Duró ${r.ronda} asaltos. El héroe queda con ${h.pg}/${h.pgMax} PG.`;
  switch (r.resultado) {
    case 'victoria': return `[COMBATE TERMINADO: VICTORIA] ${base} El motor ya entregó ${r.px} PX${r.oro ? ', ' + r.oro + ' po' : ''}${r.objetos.length ? ' y ' + r.objetos.map(id => OBJETOS[id].nombre).join(', ') : ''}. Narra brevemente el final del combate y lo que el héroe encuentra o ve después.`;
    case 'derrota': return `[COMBATE TERMINADO: DERROTA] ${base} El héroe cayó inconsciente y se ha estabilizado. Decide qué hacen los enemigos con él (capturarlo, robarle, abandonarlo...). Consecuencias duras pero no mortales; el héroe despierta con 1 PG.`;
    case 'huida': return `[COMBATE TERMINADO: HUIDA] ${base} El héroe ha escapado del combate. Los enemigos supervivientes siguen ahí y pueden perseguirlo.`;
    case 'muerte': return '[EL HÉROE HA MUERTO]';
  }
  return base;
}
