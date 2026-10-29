// ─── Interfaz del combate táctico ───

Hooks.render = () => { if (estado && estado.combate) renderJuego(); };
Hooks.log = () => {};
Hooks.pausa = (ms) => esperar(movimientoReducido() ? Math.min(ms, 20) : ms);
Hooks.flotante = (entId, texto, clase) => {
  const capa = $('#capa-flotantes');
  const ficha = document.querySelector(`[data-ent="${entId}"]`);
  if (!capa || !ficha) return;
  const r = ficha.getBoundingClientRect();
  const el = h('span', { class: 'flotante ' + (clase || '') }, texto);
  el.style.left = (r.left + r.width / 2) + 'px';
  el.style.top = (r.top + 4) + 'px';
  capa.append(el);
  setTimeout(() => el.remove(), 1300);
};

function turnoDelHeroe() { const c = estado.combate; return c && c.esperandoJugador && c.orden[c.turno] === 'heroe' && !c.resultado; }

function cancelarModo() { UI.modoCombate = null; UI.previa = null; UI.destino = null; UI.menuAbierto = null; }

// Celdas iluminadas según el modo
function calcularResaltado() {
  const c = estado.combate, h = estado.heroe, H = c.ents.heroe;
  const res = { alcanzable: new Set(), objetivo: new Set(), area: new Set(), ruta: new Set(), libre: new Set() };
  if (!turnoDelHeroe()) return res;
  const k = (x, y) => x + ',' + y;
  const m = UI.modoCombate;
  if (!m) {
    if (c.t.mov > 0) {
      const { d } = mapaDistancias(c, H, { bando: 'heroe' });
      for (let y = 0; y < ALTO_MAPA; y++) for (let x = 0; x < ANCHO_MAPA; x++) if (d[y][x] > 0 && d[y][x] <= c.t.mov && celdaLibre(c, x, y)) res.alcanzable.add(k(x, y));
    }
    const dest = UI.destino || UI.previa;
    if (dest && res.alcanzable.has(k(dest.x, dest.y))) { const r = rutaHeroe(dest.x, dest.y); if (r) r.ruta.forEach(p => res.ruta.add(k(p.x, p.y))); }
    return res;
  }
  const objetivos = objetivosModo(m);
  objetivos.forEach(e => res.objetivo.add(k(e.x, e.y)));
  const area = areaModo(m);
  if (area) {
    if (area.objetivo === 'punto' || area.objetivo === 'casilla_libre') {
      for (let y = 0; y < ALTO_MAPA; y++) for (let x = 0; x < ANCHO_MAPA; x++) if (dist(H, { x, y }) <= area.alcance && (area.objetivo === 'punto' || celdaLibre(c, x, y))) res.libre.add(k(x, y));
    }
    const p = UI.previa;
    if (area.forma && (area.objetivo === 'yo' || (p && (area.objetivo === 'direccion' || res.libre.has(k(p.x, p.y)))))) {
      celdasArea(c, area.forma, H, area.objetivo === 'yo' ? H : p).forEach(q => res.area.add(k(q.x, q.y)));
    }
  }
  return res;
}

// Enemigos válidos como objetivo del modo actual
function objetivosModo(m) {
  const c = estado.combate, H = c.ents.heroe;
  if (m.tipo === 'ataque') { const perfil = ataquesDisponibles(estado.heroe).find(a => a.uid === m.uid); return perfil ? objetivosValidosArma(perfil) : []; }
  const alcance = m.alcance != null ? m.alcance : 1;
  if (m.objetivoTipo === 'enemigo') return enemigosVivos().filter(e => dist(H, e) <= alcance);
  if (m.objetivoTipo === 'enemigo_adyacente' || m.objetivoTipo === 'arma_cuerpo') return enemigosVivos().filter(e => dist(H, e) <= 1);
  return [];
}
function areaModo(m) {
  if (!m.objetivoTipo || !['punto', 'direccion', 'yo', 'casilla_libre'].includes(m.objetivoTipo)) return null;
  return { forma: m.area || null, objetivo: m.objetivoTipo, alcance: m.alcance || 0 };
}

function aplicarPrevia() {
  if (!estado || !estado.combate) return;
  const res = calcularResaltado();
  $$('.cmb-celda').forEach(el => {
    const kk = el.dataset.k;
    el.classList.toggle('en-area', res.area.has(kk));
    el.classList.toggle('en-ruta', res.ruta.has(kk));
  });
}

async function trasAccion() {
  UI.modoCombate = null; UI.previa = null; UI.destino = null; UI.menuAbierto = null;
  await despuesAccionHeroe();
  renderJuego();
}

async function clicCelda(x, y) {
  const c = estado.combate;
  if (!turnoDelHeroe() || UI.ocupado) return;
  const ent = entEn(c, x, y);
  const m = UI.modoCombate;
  const kk = x + ',' + y;
  const res = calcularResaltado();
  if (!m) {
    if (ent && ent.id !== 'heroe') { UI.seleccion = ent.id; UI.destino = null; renderJuego(); return; }
    if (res.alcanzable.has(kk)) {
      if (UI.destino && UI.destino.x === x && UI.destino.y === y) { await ejecutar(() => moverHeroe(x, y)); return; }
      UI.destino = { x, y }; UI.previa = null; renderJuego(); return;
    }
    UI.destino = null; renderJuego();
    return;
  }
  if (m.tipo === 'ataque') { if (ent && res.objetivo.has(kk)) await ejecutar(() => heroeAtaca(m.uid, ent.id)); return; }
  if (['enemigo', 'enemigo_adyacente', 'arma_cuerpo'].includes(m.objetivoTipo)) { if (ent && res.objetivo.has(kk)) await ejecutar(() => m.ejecutar(ent.id)); return; }
  if (m.objetivoTipo === 'punto' || m.objetivoTipo === 'casilla_libre' || m.objetivoTipo === 'direccion') {
    if (m.objetivoTipo !== 'direccion' && !res.libre.has(kk)) return;
    if (m.objetivoTipo === 'direccion' && x === c.ents.heroe.x && y === c.ents.heroe.y) return;
    const confirmado = UI.previa && UI.previa.x === x && UI.previa.y === y && UI.previaConfirmable;
    if (!confirmado) { UI.previa = { x, y }; UI.previaConfirmable = true; aplicarPrevia(); actualizarAyudaModo(); return; }
    await ejecutar(() => m.ejecutar({ x, y }));
  }
}

async function ejecutar(fn) {
  if (UI.ocupado) return;
  UI.ocupado = true;
  try { await fn(); } finally { UI.ocupado = false; }
  await trasAccion();
}

function vistaCombate() {
  const c = estado.combate, hr = estado.heroe;
  const res = calcularResaltado();
  const celdas = [];
  for (let y = 0; y < ALTO_MAPA; y++) for (let x = 0; x < ANCHO_MAPA; x++) {
    const kk = x + ',' + y;
    const ent = entEn(c, x, y);
    const muerto = Object.values(c.ents).find(e => e.id !== 'heroe' && e.pg <= 0 && e.x === x && e.y === y);
    const clases = ['cmb-celda'];
    if (esObstaculo(c, x, y)) clases.push('obst');
    if (res.alcanzable.has(kk)) clases.push('alcanzable');
    if (res.objetivo.has(kk)) clases.push('objetivo');
    if (res.libre.has(kk)) clases.push('libre');
    if (res.area.has(kk)) clases.push('en-area');
    if (res.ruta.has(kk)) clases.push('en-ruta');
    if (UI.destino && UI.destino.x === x && UI.destino.y === y) clases.push('destino');
    if (c.aura && dist(c.ents.heroe, { x, y }) <= c.aura.radio && !esObstaculo(c, x, y)) clases.push('aura');
    if (x === 0 && !esObstaculo(c, x, y)) clases.push('borde-huida');
    const contenido = ent ? fichaEntidad(ent) : muerto ? h('span', { class: 'resto', 'aria-hidden': 'true' }, '✕') : null;
    celdas.push(h('button', {
      class: clases.join(' '), 'data-k': kk, 'aria-label': etiquetaCelda(c, x, y, ent),
      title: esObstaculo(c, x, y) ? TERRENOS[c.terreno].obstaculo : ent ? nombreEnt(ent) : '',
      onclick: () => clicCelda(x, y),
      onpointerenter: (ev) => { if (ev.pointerType !== 'mouse') return; if (UI.modoCombate && areaModo(UI.modoCombate) || (!UI.modoCombate && res.alcanzable.has(kk) && !UI.destino)) { UI.previa = { x, y }; UI.previaConfirmable = true; aplicarPrevia(); } },
    }, contenido));
  }
  setTimeout(() => { const l = $('#cmb-log'); if (l) l.scrollTop = l.scrollHeight; }, 0);
  return h('div', { class: 'vista-combate' },
    barraIniciativa(c),
    h('div', { class: 'cmb-principal' },
      h('div', { class: 'cmb-tablero-caja' },
        h('div', { class: 'cmb-tablero terreno-' + c.terreno, style: { gridTemplateColumns: `repeat(${ANCHO_MAPA}, minmax(0, 1fr))` }, onmouseleave: () => { if (UI.previa && !UI.destino) { UI.previa = null; aplicarPrevia(); } } }, celdas),
        h('div', { class: 'cmb-leyenda' }, h('span', null, `Asalto ${c.ronda}`), h('span', null, TERRENOS[c.terreno].nombre), h('span', null, '1 casilla = 1,5 m'))),
      panelInfoCombate(c)),
    barraAccionesCombate(c),
    h('div', { class: 'cmb-log', id: 'cmb-log', 'aria-live': 'polite' }, c.log.slice(-60).map(l => h('p', { class: 'l ' + l.clase, html: l.html }))));
}

function etiquetaCelda(c, x, y, ent) {
  const col = 'ABCDEFGHIJKL'[x] + (y + 1);
  if (esObstaculo(c, x, y)) return `${col}: ${TERRENOS[c.terreno].obstaculo}`;
  if (ent) return `${col}: ${nombreEnt(ent)}${ent.id !== 'heroe' ? `, ${ent.pg} de ${ent.pgMax} PG` : ''}`;
  return `${col}: libre`;
}

function fichaEntidad(e) {
  const hr = estado.heroe;
  if (e.id === 'heroe') {
    const conds = (hr.condiciones || []).map(x => x.id);
    return h('span', { class: 'ficha-ent heroe' + (hr.caido ? ' caido' : '') + conds.map(x => ' c-' + x).join(''), 'data-ent': 'heroe' },
      h('span', { class: 'ficha-sig' }, hr.nombre[0].toUpperCase()),
      h('i', { class: 'ficha-pg', style: { '--pg': (hr.pg / hr.pgMax * 100) + '%' } }));
  }
  const m = MONSTRUOS[e.mid];
  const conds = (e.condiciones || []).map(x => x.id);
  return h('span', { class: 'ficha-ent enemigo tipo-' + m.tipo + (e.jefe ? ' jefe' : '') + (m.grande ? ' grande' : '') + (estado.combate.orden[estado.combate.turno] === e.id ? ' activo' : '') + (UI.seleccion === e.id ? ' seleccionado' : '') + conds.map(x => ' c-' + x).join(''), 'data-ent': e.id },
    h('span', { class: 'ficha-sig' }, e.corto, e.num ? h('sub', null, e.num) : null),
    h('i', { class: 'ficha-pg', style: { '--pg': (e.pg / e.pgMax * 100) + '%' } }));
}

function barraIniciativa(c) {
  return h('ol', { class: 'cmb-iniciativa', 'aria-label': 'Orden de iniciativa' }, c.orden.map((id, i) => {
    const e = c.ents[id];
    const esH = id === 'heroe';
    const muerto = !esH && e.pg <= 0;
    const pg = esH ? estado.heroe.pg : e.pg, max = esH ? estado.heroe.pgMax : e.pgMax;
    return h('li', { class: (i === c.turno ? 'actual ' : '') + (esH ? 'es-heroe ' : '') + (muerto ? 'muerto' : '') },
      h('button', { disabled: esH || muerto, onclick: () => { UI.seleccion = id; renderJuego(); } },
        h('span', { class: 'ini-sig' }, esH ? estado.heroe.nombre[0].toUpperCase() : e.corto, !esH && e.num ? h('sub', null, e.num) : null),
        h('span', { class: 'ini-nombre' }, nombreEnt(e)),
        barra(pg, max, 'barra-pg mini', 'PG')));
  }));
}

function panelInfoCombate(c) {
  const hr = estado.heroe;
  const actual = c.ents[c.orden[c.turno]];
  const cont = [];
  if (c.resultado) cont.push(h('p', { class: 'cmb-ayuda' }, 'El combate ha terminado.'));
  else if (!turnoDelHeroe()) cont.push(h('p', { class: 'cmb-turno-enemigo' }, h('span', { class: 'puntos' }, h('i'), h('i'), h('i')), ` Turno de ${nombreEnt(actual)}`));
  else if (hr.caido) cont.push(h('p', null, 'Estás inconsciente.'));
  else if (UI.modoCombate) cont.push(h('div', { id: 'ayuda-modo' }, ayudaModo()));
  else if (UI.destino) {
    const r = rutaHeroe(UI.destino.x, UI.destino.y);
    cont.push(h('div', { class: 'cmb-destino' },
      h('p', null, `Moverte ${metros(r ? r.coste : 0)} (te quedan ${metros(c.t.mov)}).`),
      r && r.provocan.length ? h('p', { class: 'aviso-oa' }, `⚠ Provocarás ${r.provocan.length > 1 ? r.provocan.length + ' ataques' : 'un ataque'} de oportunidad de ${r.provocan.map(id => nombreEnt(c.ents[id])).join(', ')}. Desengancharte lo evita.`) : null,
      h('div', { class: 'fila-botones' }, h('button', { class: 'btn btn-primario', onclick: () => ejecutar(() => moverHeroe(UI.destino.x, UI.destino.y)) }, 'Mover aquí'), h('button', { class: 'btn', onclick: () => { UI.destino = null; renderJuego(); } }, 'Cancelar'))));
  } else cont.push(h('p', { class: 'cmb-ayuda' }, c.t.mov > 0 ? 'Toca una casilla iluminada para moverte, o un enemigo para ver sus datos y atacarlo.' : 'Elige una acción o termina tu turno.'));
  // Ficha del enemigo seleccionado
  const sel = UI.seleccion && c.ents[UI.seleccion];
  if (sel && sel.pg > 0) cont.push(fichaEnemigo(sel));
  if (hr.caido && !c.resultado) cont.push(h('div', { class: 'salvaciones-muerte' }, h('span', null, 'Éxitos ', Array.from({ length: 3 }, (_, i) => h('i', { class: i < hr.muerte.exitos ? 'lleno' : '' }))), h('span', null, 'Fallos ', Array.from({ length: 3 }, (_, i) => h('i', { class: 'f ' + (i < hr.muerte.fallos ? 'lleno' : '') })))));
  return h('div', { class: 'cmb-info' }, cont);
}

function fichaEnemigo(e) {
  const m = MONSTRUOS[e.mid], H = estado.combate.ents.heroe;
  const armas = turnoDelHeroe() && puedeAtacar() ? ataquesDisponibles(estado.heroe).filter(a => objetivosValidosArma(a).includes(e)) : [];
  return h('div', { class: 'ficha-enemigo' },
    h('div', { class: 'fe-cab' }, h('b', null, e.nombre), h('small', null, `${TIPOS_CRIATURA[m.tipo]} · VD ${m.vd}${e.jefe ? ' · jefe' : ''}`), h('button', { class: 'btn-icono', 'aria-label': 'Cerrar ficha', onclick: () => { UI.seleccion = null; renderJuego(); } }, '✕')),
    h('div', { class: 'fe-datos' }, h('span', null, 'CA ', h('b', null, e.ca)), h('span', null, 'PG ', h('b', null, `${e.pg}/${e.pgMax}`)), h('span', null, 'Distancia ', h('b', null, metros(dist(H, e))))),
    barra(e.pg, e.pgMax, 'barra-pg', 'PG del enemigo'),
    (e.condiciones || []).length ? h('div', { class: 'fe-conds' }, e.condiciones.map(cn => pastilla((CONDICIONES[cn.id] || { nombre: cn.id }).nombre, 'buena'))) : null,
    h('p', { class: 'fe-desc' }, m.desc),
    h('p', { class: 'fe-ataques' }, m.ataques.map(a => `${a.nombre} ${signo(a.bono)} (${a.danio} ${a.tipo})`).join(' · ')),
    [m.resist && m.resist.length ? 'Resiste: ' + m.resist.map(r => r === 'fisico_no_magico' ? 'físico no mágico' : r).join(', ') : null, m.inmune && m.inmune.length ? 'Inmune: ' + m.inmune.join(', ') : null, m.vulnerable && m.vulnerable.length ? 'Vulnerable: ' + m.vulnerable.join(', ') : null].filter(Boolean).map(t => h('p', { class: 'fe-res' }, t)),
    armas.length ? h('div', { class: 'fila-botones' }, armas.map(a => h('button', { class: 'btn btn-primario btn-mini', onclick: () => ejecutar(() => heroeAtaca(a.uid, e.id)) }, `Atacar: ${a.nombre}`))) : null);
}

function ayudaModo() {
  const m = UI.modoCombate;
  let texto = 'Elige un objetivo iluminado.';
  if (m.objetivoTipo === 'punto') texto = 'Elige el punto central del área. Toca dos veces para confirmar.';
  if (m.objetivoTipo === 'direccion') texto = 'Elige la dirección. Toca dos veces para confirmar.';
  if (m.objetivoTipo === 'casilla_libre') texto = 'Elige una casilla libre. Toca dos veces para confirmar.';
  const previa = UI.previa && ['punto', 'direccion'].includes(m.objetivoTipo) ? contarAfectados() : null;
  return h('div', { class: 'cmb-modo' },
    h('p', null, h('b', null, m.nombre), ' · ', texto),
    previa ? h('p', { class: 'nota' }, previa) : null,
    h('div', { class: 'fila-botones' },
      UI.previa && UI.previaConfirmable && ['punto', 'direccion', 'casilla_libre'].includes(m.objetivoTipo) ? h('button', { class: 'btn btn-primario', onclick: () => ejecutar(() => m.ejecutar(UI.previa)) }, 'Confirmar') : null,
      h('button', { class: 'btn', onclick: () => { cancelarModo(); renderJuego(); } }, 'Cancelar')));
}
function contarAfectados() {
  const c = estado.combate, m = UI.modoCombate;
  if (!m.area || !UI.previa) return null;
  const celdas = celdasArea(c, m.area, c.ents.heroe, UI.previa);
  const n = enemigosVivos().filter(e => celdas.some(p => p.x === e.x && p.y === e.y)).length;
  const yo = celdas.some(p => p.x === c.ents.heroe.x && p.y === c.ents.heroe.y);
  return `Alcanza a ${n} enemigo${n === 1 ? '' : 's'}${yo ? ' ¡y a ti!' : ''}.`;
}
function actualizarAyudaModo() { const a = $('#ayuda-modo'); if (a && UI.modoCombate) vaciar(a).append(ayudaModo()); }

function pildoraRecurso(nombre, disponible, valor) {
  return h('span', { class: 'recurso' + (disponible ? ' disp' : ' gastado') }, h('i'), nombre, valor ? h('b', null, ' ' + valor) : null);
}

function barraAccionesCombate(c) {
  const hr = estado.heroe;
  const activo = turnoDelHeroe() && !hr.caido;
  const t = c.t || {};
  const menu = UI.menuAbierto;
  const armas = ataquesDisponibles(hr);
  const ataquesTxt = t.ataquesRestantes > 0 ? `Ataque ${numAtaques(hr) - t.ataquesRestantes + 1}/${numAtaques(hr)}` : 'Atacar';
  const conjuros = conjurosDisponibles(hr).filter(id => !CONJUROS[conjuroBase(id)].pasivo);
  const rasgos = rasgosUsables();
  const objetos = hr.inventario.filter(it => { const o = OBJETOS[it.id]; return o && (o.tipo === 'consumible' || o.tipo === 'pergamino' || (o.tipo === 'varita' && it.cargas > 0)); });
  const boton = (id, texto, habilitado, onClick, clase = '') => h('button', { class: 'btn ' + clase + (menu === id ? ' abierto' : ''), disabled: !activo || !habilitado, 'aria-expanded': onClick ? null : (menu === id ? 'true' : 'false'), onclick: onClick || (() => { UI.menuAbierto = menu === id ? null : id; UI.modoCombate = null; UI.destino = null; renderJuego(); }) }, texto);
  return h('div', { class: 'cmb-acciones' },
    h('div', { class: 'recursos' },
      pildoraRecurso('Acción', t.accion || t.ataquesRestantes > 0),
      pildoraRecurso('Adicional', t.adicional),
      pildoraRecurso('Movimiento', t.mov > 0, metros(Math.max(0, t.mov || 0))),
      pildoraRecurso('Reacción', hr.reaccion !== false),
      hr.efectos.concentracion ? h('span', { class: 'recurso conc' }, 'Concentración: ' + CONJUROS[hr.efectos.concentracion.conjuro].nombre) : null,
      hr.efectos.furia ? h('span', { class: 'recurso furia' }, 'Furia') : null),
    h('div', { class: 'botonera' },
      armas.length === 1
        ? boton('atacar', ataquesTxt, puedeAtacar(), () => { cancelarModo(); UI.modoCombate = { tipo: 'ataque', uid: armas[0].uid, nombre: armas[0].nombre }; renderJuego(); })
        : boton('atacar', ataquesTxt, puedeAtacar()),
      conjuros.length ? boton('conjuros', 'Conjuros', true) : null,
      rasgos.length ? boton('rasgos', 'Rasgos', true) : null,
      objetos.length ? boton('objetos', 'Objetos', true) : null,
      boton('mas', 'Más acciones', true),
      h('button', { class: 'btn btn-primario btn-fin-turno', disabled: !activo || UI.ocupado, onclick: async () => { cancelarModo(); UI.seleccion = UI.seleccion && estado.combate.ents[UI.seleccion] && estado.combate.ents[UI.seleccion].pg > 0 ? UI.seleccion : null; renderJuego(); await terminarTurnoHeroe(); renderJuego(); } }, 'Terminar turno')),
    activo && menu ? submenuCombate(menu, { armas, conjuros, rasgos, objetos }) : null);
}

function itemMenu(titulo, detalle, habilitado, onClick, motivo) {
  return h('button', { class: 'item-menu', disabled: !habilitado, onclick: onClick }, h('b', null, titulo), detalle ? h('small', null, detalle) : null, !habilitado && motivo ? h('em', null, motivo) : null);
}

function submenuCombate(menu, { armas, conjuros, rasgos, objetos }) {
  const c = estado.combate, hr = estado.heroe, t = c.t;
  let items = [];
  if (menu === 'atacar') {
    items = armas.map(a => itemMenu(a.nombre, `${signo(a.bono)} · ${a.dados}${a.modDanio ? signo(a.modDanio) : ''} ${a.tipo}${a.aDistancia ? ' · ' + metros(a.distancia[0]) : a.arrojadiza ? ' · arrojadiza ' + metros(a.distancia[0]) : ''}`, puedeAtacar() && objetivosValidosArma(a).length > 0,
      () => { cancelarModo(); UI.modoCombate = { tipo: 'ataque', uid: a.uid, nombre: a.nombre }; renderJuego(); }, objetivosValidosArma(a).length ? 'Sin acción' : 'Nadie a tu alcance'));
  }
  if (menu === 'conjuros') {
    items = conjuros.map(id => {
      const info = infoLanzamiento(id, true);
      const cj = info.cj;
      const detalle = [cj.nivel === 0 ? 'Truco' : 'Nv ' + cj.nivel, { accion: 'acción', adicional: 'adicional', reaccion: 'reacción' }[cj.tiempo], cj.alcance > 1 ? metros(cj.alcance) : cj.alcance === 1 ? 'toque' : 'tú', cj.concentracion ? 'conc.' : null].filter(Boolean).join(' · ');
      const ok = !info.motivo && info.niveles.length > 0;
      const elegirNivel = (nivel) => prepararConjuro(id, nivel);
      if (ok && cj.nivel > 0 && info.niveles.length > 1 && !info.racial) {
        return h('div', { class: 'item-menu con-niveles' }, h('b', null, cj.nombre), h('small', null, detalle), h('span', { class: 'niveles' }, info.niveles.map(n => h('button', { class: 'btn btn-mini', onclick: () => elegirNivel(n) }, 'Nv ' + n))));
      }
      return itemMenu(cj.nombre, detalle, ok, () => elegirNivel(info.niveles[0]), info.motivo);
    });
  }
  if (menu === 'rasgos') {
    items = rasgos.map(r => itemMenu(r.nombre, [{ accion: 'Acción', adicional: 'Adicional', gratis: 'Gratis' }[r.coste], r.nota].filter(Boolean).join(' · '), r.usable, () => prepararRasgo(r), 'No disponible ahora'));
  }
  if (menu === 'objetos') {
    items = objetos.map(it => {
      const o = OBJETOS[it.id];
      if (o.tipo === 'pergamino' || o.tipo === 'varita') {
        const cj = CONJUROS[o.conjuro];
        const coste = cj.tiempo === 'adicional' ? 'adicional' : 'accion';
        return itemMenu(nombreObjeto(it) + (it.cantidad > 1 ? ' ×' + it.cantidad : ''), (o.tipo === 'varita' ? `${it.cargas} cargas · ` : '') + cj.desc.slice(0, 60) + '…', !!t[coste], () => prepararConjuro(o.conjuro, o.nivelConjuro || cj.nivel, it.uid), 'Sin ' + (coste === 'accion' ? 'acción' : 'acción adicional'));
      }
      const coste = o.uso === 'adicional' ? 'adicional' : 'accion';
      return itemMenu(nombreObjeto(it) + (it.cantidad > 1 ? ' ×' + it.cantidad : ''), `${coste === 'adicional' ? 'Acción adicional' : 'Acción'} · ${o.desc || ''}`, !!t[coste], () => {
        if (o.efecto === 'arrojar') { cancelarModo(); UI.modoCombate = { nombre: o.nombre, objetivoTipo: 'enemigo', alcance: o.alcance || 4, ejecutar: (id) => usarObjetoCombate(it.uid, id) }; renderJuego(); }
        else ejecutar(() => usarObjetoCombate(it.uid));
      }, 'Sin ' + (coste === 'accion' ? 'acción' : 'acción adicional'));
    });
  }
  if (menu === 'mas') {
    const astuto = tieneRasgo(hr, 'accion_astuta');
    items = [
      itemMenu('Esquivar', 'Acción · los ataques contra ti tienen desventaja', t.accion, () => ejecutar(() => accionBasica('esquivar'))),
      itemMenu('Correr', `Acción · +${metros(velocidad(hr))} de movimiento`, t.accion, () => ejecutar(() => accionBasica('correr'))),
      itemMenu('Desengancharse', 'Acción · moverte no provoca ataques de oportunidad', t.accion, () => ejecutar(() => accionBasica('desenganchar'))),
      itemMenu('Esconderse', 'Acción · Sigilo contra su percepción; necesitas un obstáculo al lado' + (astuto ? ' (también en Rasgos como adicional)' : ''), t.accion, () => ejecutar(() => accionBasica('esconderse'))),
      tieneCondicion(hr, 'apresado') ? itemMenu('Escapar', 'Acción · Atletismo o Acrobacias', t.accion, () => ejecutar(() => accionBasica('escapar'))) : null,
      itemMenu('Huir del combate', 'Acción · desde el borde izquierdo del tablero', puedeHuir(), async () => { cancelarModo(); UI.ocupado = true; try { await huir(); } finally { UI.ocupado = false; } renderJuego(); }, 'Ve al borde izquierdo'),
    ].filter(Boolean);
  }
  return h('div', { class: 'submenu', role: 'menu' }, items.length ? items : h('p', { class: 'nota' }, 'Nada disponible.'));
}

function prepararConjuro(idConjuro, nivel, uidObjeto) {
  const c = estado.combate;
  const cj = CONJUROS[conjuroBase(idConjuro)];
  cancelarModo();
  const lanzar = (objetivo) => uidObjeto ? usarObjetoCombate(uidObjeto, objetivo) : lanzarConjuro(idConjuro, nivel, objetivo);
  const lanzarComprobando = async (objetivo) => { const r = await lanzar(objetivo); if (r && r.error) aviso(r.error, 'malo'); };
  if (cj.objetivo === 'yo' && !cj.area || cj.objetivo === 'yo' && cj.area && cj.area.forma === 'radio_yo' && cj.modo === 'efecto') { ejecutar(() => lanzarComprobando(null)); return; }
  const alcance = cj.objetivo === 'casilla_libre' || cj.objetivo === 'punto' || cj.objetivo === 'enemigo' ? cj.alcance : 0;
  UI.modoCombate = { nombre: cj.nombre + (nivel > cj.nivel && cj.nivel > 0 ? ` (nivel ${nivel})` : ''), objetivoTipo: cj.objetivo, alcance, area: cj.area || null, ejecutar: lanzarComprobando };
  if (cj.objetivo === 'yo') { UI.previa = { x: c.ents.heroe.x, y: c.ents.heroe.y }; UI.previaConfirmable = true; UI.modoCombate.objetivoTipo = 'yo'; UI.modoCombate.confirmarYo = true; }
  renderJuego();
  if (cj.objetivo === 'yo') {
    // Área a tu alrededor: confirmar con un botón
    const a = $('#ayuda-modo');
    if (a) a.append(h('div', { class: 'fila-botones' }, h('button', { class: 'btn btn-primario', onclick: () => ejecutar(() => lanzarComprobando(null)) }, 'Lanzar')));
  }
}

function prepararRasgo(r) {
  cancelarModo();
  if (!r.objetivo) { ejecutar(() => usarRasgo(r.id)); return; }
  if (r.objetivo === 'direccion') { UI.modoCombate = { nombre: r.nombre, objetivoTipo: 'direccion', area: r.area, alcance: 0, ejecutar: (p) => usarRasgo(r.id, p) }; renderJuego(); return; }
  const alcance = r.objetivo === 'enemigo' ? (r.id === 'arma_espiritual' ? 12 : 24) : 1;
  UI.modoCombate = { nombre: r.nombre, objetivoTipo: r.objetivo === 'enemigo' ? 'enemigo' : 'enemigo_adyacente', alcance, ejecutar: (id) => usarRasgo(r.id, id) };
  renderJuego();
}
