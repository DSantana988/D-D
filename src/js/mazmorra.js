// ─── Mazmorra clásica: generación de pisos, salas y eventos ───

const MAPA_W = 5, MAPA_H = 4;
const DIRECCIONES = [{ dx: 0, dy: -1, nombre: 'norte' }, { dx: 1, dy: 0, nombre: 'este' }, { dx: 0, dy: 1, nombre: 'sur' }, { dx: -1, dy: 0, nombre: 'oeste' }];

function nuevaMazmorra() {
  estado.mazmorra = { piso: 0, salas: {}, actual: null, anterior: null, mapaRevelado: false, descansoCortoUsado: false, pendiente: null, completada: false, narracion: [] };
  generarPiso(0);
}

function generarPiso(indice) {
  const mz = estado.mazmorra, piso = PISOS[indice];
  mz.piso = indice; mz.salas = {}; mz.mapaRevelado = false; mz.descansoCortoUsado = false; mz.pendiente = null; mz.narracion = [];
  const objetivo = 8 + azar(3);
  const clave = (x, y) => x + ',' + y;
  const inicio = { x: 0, y: azar(MAPA_H) };
  const salas = {};
  const crear = (x, y) => { const id = 's' + Object.keys(salas).length; salas[clave(x, y)] = { id, x, y, tipo: 'vacia', conexiones: [], visitada: false, resuelta: false }; return salas[clave(x, y)]; };
  const conectar = (a, b) => { if (!a.conexiones.includes(b.id)) a.conexiones.push(b.id); if (!b.conexiones.includes(a.id)) b.conexiones.push(a.id); };
  crear(inicio.x, inicio.y);
  let guard = 0;
  while (Object.keys(salas).length < objetivo && guard++ < 500) {
    const base = elegir(Object.values(salas));
    const d = elegir(DIRECCIONES);
    const nx = base.x + d.dx, ny = base.y + d.dy;
    if (nx < 0 || ny < 0 || nx >= MAPA_W || ny >= MAPA_H) continue;
    if (salas[clave(nx, ny)]) { if (azar(6) === 0) conectar(base, salas[clave(nx, ny)]); continue; }
    conectar(base, crear(nx, ny));
  }
  const lista = Object.values(salas);
  const porId = Object.fromEntries(lista.map(s => [s.id, s]));
  // Distancias desde la entrada para colocar al jefe en la sala más lejana
  const distancia = { [lista[0].id]: 0 }; const cola = [lista[0].id];
  while (cola.length) { const id = cola.shift(); for (const v of porId[id].conexiones) if (distancia[v] == null) { distancia[v] = distancia[id] + 1; cola.push(v); } }
  const entrada = lista[0];
  const jefe = lista.slice(1).sort((a, b) => distancia[b.id] - distancia[a.id] || b.x - a.x)[0];
  entrada.tipo = 'entrada'; entrada.resuelta = true; entrada.visitada = true;
  jefe.tipo = 'jefe';
  const resto = barajar(lista.filter(s => s !== entrada && s !== jefe));
  const tipos = ['combate', 'combate', 'evento', 'combate', 'tesoro', 'trampa', 'evento', 'santuario', 'mercader', 'combate', 'evento', 'vacia'];
  const eventos = barajar(EVENTOS.map(e => e.id));
  resto.forEach((s, i) => {
    s.tipo = tipos[i] || 'vacia';
    if (s.tipo === 'evento') s.evento = eventos.pop();
    if (s.tipo === 'trampa') s.trampa = azar(TRAMPAS.length);
  });
  // El santuario nunca justo antes del jefe: si es vecino, se intercambia con un combate
  for (const s of lista) s.desc = elegir(DESCRIPCIONES_SALA[piso.terreno] || DESCRIPCIONES_SALA.cripta);
  mz.salas = porId;
  mz.actual = entrada.id; mz.anterior = null;
  narrar(`<b>${escaparHtml(piso.nombre)}</b> ${escaparHtml(piso.intro)}`, 'titulo');
}

function salaActual() { const mz = estado.mazmorra; return mz.salas[mz.actual]; }
function pisoActual() { return PISOS[estado.mazmorra.piso]; }
function narrar(html, clase = '') { const mz = estado.mazmorra; mz.narracion.push({ html, clase }); if (mz.narracion.length > 80) mz.narracion.shift(); }

function salasVecinas() {
  const s = salaActual();
  return s.conexiones.map(id => estado.mazmorra.salas[id]);
}
function direccionHacia(a, b) {
  const d = DIRECCIONES.find(d => a.x + d.dx === b.x && a.y + d.dy === b.y);
  return d ? d.nombre : 'adelante';
}
function puedeMoverse() {
  const mz = estado.mazmorra, s = salaActual();
  return !mz.pendiente && (s.resuelta || s.tipo === 'vacia' || s.tipo === 'entrada');
}

function indiceDificultad() {
  const d = estado.ajustes.dificultad;
  if (d === 'facil') return 1;
  if (d === 'dificil') return azar(4) === 0 ? 3 : 2;
  return azar(3) === 0 ? 2 : 1;
}

function generarEncuentro(pool, nivel, indice) {
  const objetivo = PRESUPUESTO_ENCUENTRO[nivel][indice];
  const coste = gs => { const n = gs.reduce((s, g) => s + g.cantidad, 0); return gs.reduce((s, g) => s + MONSTRUOS[g.id].px * g.cantidad, 0) * multiplicadorGrupo(n); };
  let mejor = null;
  for (let intento = 0; intento < 80; intento++) {
    const primero = elegir(pool);
    if (MONSTRUOS[primero].px > objetivo) continue;
    let grupos = [{ id: primero, cantidad: 1 }];
    for (let k = 0; k < 7; k++) {
      const cand = azar(3) === 0 ? elegir(pool) : grupos[0].id;
      const prueba = grupos.map(g => Object.assign({}, g));
      const ex = prueba.find(g => g.id === cand);
      if (ex) ex.cantidad++; else prueba.push({ id: cand, cantidad: 1 });
      if (coste(prueba) <= objetivo * 1.1) grupos = prueba; else break;
    }
    const cst = coste(grupos);
    if (!mejor || Math.abs(objetivo - cst) < Math.abs(objetivo - mejor.c)) mejor = { grupos, c: cst };
  }
  if (!mejor) {
    const debil = pool.slice().sort((a, b) => MONSTRUOS[a].px - MONSTRUOS[b].px)[0];
    mejor = { grupos: [{ id: debil, cantidad: 1 }] };
  }
  return mejor.grupos;
}

// Entrar en una sala: devuelve una acción para la interfaz ({tipo:'combate', def} o null)
function entrarSala(id) {
  const mz = estado.mazmorra, h = estado.heroe;
  const destino = mz.salas[id];
  if (!destino || !salaActual().conexiones.includes(id) || !puedeMoverse()) return null;
  mz.anterior = mz.actual;
  mz.actual = id;
  const piso = pisoActual();
  const primeraVez = !destino.visitada;
  destino.visitada = true;
  narrar(`Avanzas hacia el ${direccionHacia(mz.salas[mz.anterior], destino)}. ${escaparHtml(destino.desc)}`);
  if (destino.resuelta) return null;
  switch (destino.tipo) {
    case 'combate': {
      const grupos = destino.grupos || generarEncuentro(piso.monstruos, h.nivel, indiceDificultad());
      destino.grupos = grupos;
      narrar(escaparHtml(elegir(INTROS_COMBATE)), 'peligro');
      return { tipo: 'combate', def: { enemigos: grupos, terreno: piso.terreno, sorpresa: primeraVez && azar(8) === 0 ? 'heroe' : null } };
    }
    case 'jefe': {
      narrar(escaparHtml(piso.jefe.texto), 'peligro');
      return { tipo: 'combate', def: { enemigos: piso.jefe.grupos, terreno: piso.terreno, jefe: true } };
    }
    case 'evento': {
      const ev = EVENTOS.find(e => e.id === destino.evento);
      narrar(`<b>${escaparHtml(ev.titulo)}</b>. ${escaparHtml(ev.texto)}`, 'evento');
      mz.pendiente = { tipo: 'evento', evento: ev.id };
      return null;
    }
    case 'trampa': {
      const tr = TRAMPAS[destino.trampa];
      const cd = 12 + mz.piso;
      narrar(`<b>${escaparHtml(tr.titulo)}</b>. ${escaparHtml(tr.texto)}`, 'evento');
      if (percepcionPasiva(h) >= cd + 2) {
        narrar('Tu instinto te alerta: aquí hay una trampa.', 'bueno');
        mz.pendiente = { tipo: 'trampa', fase: 'detectada', cd };
      } else mz.pendiente = { tipo: 'trampa', fase: 'inicio', cd };
      return null;
    }
    case 'tesoro': {
      const oro = (mz.piso + 1) * 20 + tirarDados('2d20').total;
      const ef = [{ tipo: 'oro', cantidad: oro }];
      const r = azar(100);
      const obj = r < 45 ? elegir(BOTIN_COMUN) : r < 75 ? elegir(BOTIN_MEDIO) : (mz.piso >= 2 ? elegir(BOTIN_RARO) : elegir(BOTIN_MEDIO));
      ef.push({ tipo: 'objeto', id: obj });
      if (mz.piso === 4 && azar(3) === 0) ef.push({ tipo: 'objeto', id: elegir(BOTIN_LEGENDARIO) });
      const res = aplicarEfectos(ef, 'mazmorra');
      narrar(`Un cofre olvidado entre los escombros. ${res.lineas.join('. ')}.`, 'bueno');
      destino.resuelta = true;
      return { tipo: 'subida', subida: res.subida };
    }
    case 'santuario': {
      narrar('Una pequeña capilla intacta. Una llama blanca arde en el altar y el aire es limpio. Aquí estás a salvo.', 'bueno');
      mz.pendiente = { tipo: 'santuario', usado: false };
      return null;
    }
    case 'mercader': {
      const stock = barajar(INVENTARIO_TIENDA).slice(0, 8);
      if (mz.piso >= 1) stock.push(...barajar(BOTIN_MEDIO).slice(0, 2));
      if (mz.piso >= 2) stock.push(...barajar(BOTIN_RARO).slice(0, 2));
      if (!stock.includes('pocion_curacion')) stock.unshift('pocion_curacion');
      narrar('Un mercader encorvado ha montado un puesto entre las sombras, protegido por un círculo de sal. «Todo tiene un precio, viajero.»', 'evento');
      mz.pendiente = { tipo: 'mercader', stock: Array.from(new Set(stock)) };
      return null;
    }
    default: {
      if (azar(3) === 0) { const oro = tirarDados('2d6').total * (mz.piso + 1); estado.heroe.oro += oro; narrar(`Entre el polvo encuentras ${oro} po.`, 'bueno'); }
      destino.resuelta = true;
      return null;
    }
  }
}

// El daño de trampas y eventos crece con la profundidad: un dado menos en el primer piso, uno más en el último
function escalarDados(expr, piso) {
  return String(expr).replace(/^(\d+)d(\d+)/, (m, n, c) => `${Math.max(1, parseInt(n, 10) - 1 + Math.floor(piso / 2))}d${c}`);
}

// Convierte los efectos de los eventos al formato común
function convertirEfectosEvento(lista) {
  const mz = estado.mazmorra;
  const res = []; let combate = null;
  for (const e of lista || []) {
    if (e.oro) res.push({ tipo: 'oro', cantidad: tirarDados(String(e.oro)).total });
    if (e.objeto) {
      let id = e.objeto;
      if (id === 'comun') id = elegir(BOTIN_COMUN);
      else if (id === 'medio') id = elegir(BOTIN_MEDIO);
      else if (id === 'raro') id = elegir(BOTIN_RARO);
      else if (id === 'pergamino') id = elegir(['pergamino_proyectil', 'pergamino_curar', 'pergamino_rayo', 'pergamino_paso', mz.piso >= 2 ? 'pergamino_bola_fuego' : 'pergamino_proyectil']);
      res.push({ tipo: 'objeto', id, cantidad: e.cantidad || 1 });
    }
    if (e.danio) res.push({ tipo: 'danio', dados: escalarDados(e.danio, mz.piso), danio: e.tipo });
    if (e.curar) res.push({ tipo: 'curacion', dados: e.curar });
    if (e.px) res.push({ tipo: 'px', cantidad: e.px * (mz.piso + 1) });
    if (e.condicion) res.push({ tipo: 'condicion', condicion: e.condicion });
    if (e.inspiracion) res.push({ tipo: 'inspiracion' });
    if (e.mapa) mz.mapaRevelado = true;
    if (e.combate) combate = e.combate === 'aleatorio' ? generarEncuentro(pisoActual().monstruos, estado.heroe.nivel, 1) : e.combate;
  }
  return { efectos: res, combate };
}

// Resuelve una opción de evento. animar(t, etiqueta) muestra el dado.
async function resolverOpcionEvento(indice, animar) {
  const mz = estado.mazmorra, h = estado.heroe;
  const p = mz.pendiente;
  if (!p || p.tipo !== 'evento') return null;
  const ev = EVENTOS.find(e => e.id === p.evento);
  const op = ev.opciones[indice];
  if (!op) return null;
  if (op.coste) { if (h.oro < op.coste) return { error: 'No tienes suficiente oro.' }; h.oro -= op.coste; }
  let rama = op.exito, tiradaTxt = '';
  // Los cofres de pisos profundos pueden ser mimetos
  if (op.mimeto && mz.piso >= 2 && azar(5) === 0) {
    narrar(`<i>${escaparHtml(op.texto)}.</i> En cuanto tocas el cofre, ¡le salen dientes!`, 'peligro');
    mz.pendiente = null; salaActual().resuelta = true;
    return { combate: { enemigos: [{ id: 'mimeto' }], terreno: pisoActual().terreno } };
  }
  if (op.prueba) {
    const pr = Object.assign({}, op.prueba, { cd: op.prueba.cd + mz.piso });
    const r = await realizarPrueba(pr, animar);
    tiradaTxt = r.texto;
    rama = r.exito ? op.exito : op.fallo;
  } else if (op.azar) {
    rama = elegirPonderado(op.azar.map(a => [a, a.peso]));
  }
  const conv = convertirEfectosEvento(rama.efectos);
  const res = aplicarEfectos(conv.efectos, 'mazmorra');
  narrar(`<i>${escaparHtml(op.texto)}.</i> ${tiradaTxt ? '<span class="tirada-txt">' + escaparHtml(tiradaTxt) + '</span> ' : ''}${escaparHtml(rama.texto)}${res.lineas.length ? ' <b>' + escaparHtml(res.lineas.join('. ')) + '.</b>' : ''}`, 'evento');
  mz.pendiente = null;
  salaActual().resuelta = true;
  if (conv.combate) return { combate: { enemigos: conv.combate, terreno: pisoActual().terreno }, subida: res.subida };
  return { subida: res.subida };
}

async function resolverTrampa(accion, animar) {
  const mz = estado.mazmorra, h = estado.heroe;
  const p = mz.pendiente;
  if (!p || p.tipo !== 'trampa') return null;
  const tr = TRAMPAS[salaActual().trampa];
  const disparar = async () => {
    narrar(escaparHtml(tr.resultado), 'peligro');
    const r = await realizarPrueba({ tipo: 'salvacion', id: tr.salv, cd: p.cd }, animar);
    const dados = escalarDados(tr.danio, mz.piso);
    const t = tirarDados(dados);
    const n = r.exito ? Math.floor(t.total / 2) : t.total;
    const txt = danioFueraCombate(n, tr.tipo);
    if (!r.exito && tr.condicion) ponerCondicion(h, tr.condicion);
    narrar(`<span class="tirada-txt">${escaparHtml(r.texto)}</span> ${escaparHtml(txt)}${!r.exito && tr.condicion ? ' Quedas envenenado.' : ''}`, r.exito ? 'nota' : 'malo');
    mz.pendiente = null; salaActual().resuelta = true;
  };
  if (accion === 'buscar') {
    const hab = bonoHabilidad(h, 'investigacion') > bonoHabilidad(h, 'percepcion') ? 'investigacion' : 'percepcion';
    const r = await realizarPrueba({ tipo: 'habilidad', id: hab, cd: p.cd }, animar);
    if (r.exito) { narrar(`<span class="tirada-txt">${escaparHtml(r.texto)}</span> Descubres el mecanismo de la trampa.`, 'bueno'); p.fase = 'detectada'; return {}; }
    narrar(`<span class="tirada-txt">${escaparHtml(r.texto)}</span> No ves nada raro y avanzas...`, 'nota');
    await disparar(); return {};
  }
  if (accion === 'avanzar') { await disparar(); return {}; }
  if (accion === 'desactivar') {
    const r = await realizarPrueba({ tipo: 'habilidad', id: 'juego_manos', cd: p.cd }, animar);
    if (r.exito) {
      const res = aplicarEfectos([{ tipo: 'px', cantidad: 25 * (mz.piso + 1) }], 'mazmorra');
      narrar(`<span class="tirada-txt">${escaparHtml(r.texto)}</span> Desactivas la trampa. <b>${escaparHtml(res.lineas.join('. '))}.</b>`, 'bueno');
      mz.pendiente = null; salaActual().resuelta = true; return { subida: res.subida };
    }
    narrar(`<span class="tirada-txt">${escaparHtml(r.texto)}</span> Algo hace clic bajo tus dedos...`, 'malo');
    await disparar(); return {};
  }
  if (accion === 'rodear') {
    const r = await realizarPrueba({ tipo: 'habilidad', id: 'acrobacias', cd: p.cd - 2 }, animar);
    if (r.exito) { narrar(`<span class="tirada-txt">${escaparHtml(r.texto)}</span> Rodeas la trampa sin tocarla.`, 'bueno'); mz.pendiente = null; salaActual().resuelta = true; return {}; }
    narrar(`<span class="tirada-txt">${escaparHtml(r.texto)}</span> Pierdes el equilibrio...`, 'malo');
    await disparar(); return {};
  }
  return null;
}

function usarSantuario(accion) {
  const mz = estado.mazmorra, h = estado.heroe;
  const p = mz.pendiente;
  if (!p || p.tipo !== 'santuario') return;
  if (accion === 'descansar' && !p.usado) {
    descansoLargo(h); p.usado = true;
    narrar('Duermes bajo la llama blanca. Despiertas descansado: recuperas todos tus PG, espacios y recursos.', 'bueno');
  }
  if (accion === 'rezar') {
    h.condiciones = []; narrar('Rezas ante la llama. Tus males se disipan.', 'bueno');
  }
  if (accion === 'salir') { mz.pendiente = null; salaActual().resuelta = true; }
}

function cerrarMercader() { const mz = estado.mazmorra; mz.pendiente = null; salaActual().resuelta = true; }

// Descanso corto de la mazmorra: una vez por piso y con riesgo de ser interrumpido
function intentarDescansoCorto() {
  const mz = estado.mazmorra, h = estado.heroe;
  if (mz.descansoCortoUsado || !puedeMoverse()) return { error: 'No puedes descansar ahora.' };
  mz.descansoCortoUsado = true;
  if (azar(4) === 0) {
    narrar('Apenas cierras los ojos, oyes pasos. ¡Te han encontrado!', 'peligro');
    return { combate: { enemigos: generarEncuentro(pisoActual().monstruos, h.nivel, 1), terreno: pisoActual().terreno, sorpresa: 'heroe' } };
  }
  descansoCorto(h);
  narrar('Descansas una hora en silencio. Recuperas tus recursos de descanso corto.', 'bueno');
  return { descanso: true };
}

// Tras un combate en la mazmorra
function resolverCombateMazmorra(resumen) {
  const mz = estado.mazmorra, h = estado.heroe;
  const sala = salaActual();
  if (resumen.resultado === 'victoria') {
    sala.resuelta = true; sala.grupos = null;
    narrar(`Victoria. ${resumen.px ? '+' + resumen.px + ' PX. ' : ''}${resumen.oro ? '+' + resumen.oro + ' po. ' : ''}${resumen.objetos.length ? 'Botín: ' + resumen.objetos.map(id => OBJETOS[id].nombre).join(', ') + '.' : ''}`, 'bueno');
    if (sala.tipo === 'jefe') {
      if (mz.piso >= PISOS.length - 1) { mz.completada = true; narrar('¡Has conquistado la mazmorra entera!', 'titulo'); }
      else narrar('Tras la batalla descubres unas escaleras que descienden aún más.', 'bueno');
    }
  } else if (resumen.resultado === 'derrota') {
    const perdido = Math.floor(h.oro * 0.25);
    h.oro -= perdido;
    const entrada = Object.values(mz.salas).find(s => s.tipo === 'entrada');
    mz.actual = entrada.id; mz.pendiente = null;
    narrar(`Despiertas horas después junto a la entrada del nivel, magullado y con ${perdido} po menos. Tus enemigos siguen ahí.`, 'malo');
  } else if (resumen.resultado === 'huida') {
    if (mz.anterior) mz.actual = mz.anterior;
    narrar('Escapas por donde viniste. Tus enemigos siguen en esa sala.', 'nota');
  }
}

function descenderPiso() {
  const mz = estado.mazmorra;
  if (salaActual().tipo !== 'jefe' || !salaActual().resuelta || mz.piso >= PISOS.length - 1) return false;
  descansoLargo(estado.heroe);
  generarPiso(mz.piso + 1);
  narrar('Acampas en la escalera antes de bajar y descansas toda la noche.', 'nota');
  return true;
}
