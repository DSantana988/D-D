// ─── Pantalla de título y creación de personaje ───

const COSTE_PUNTOS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const PASOS_CREACION = [
  { id: 'raza', nombre: 'Raza' },
  { id: 'clase', nombre: 'Clase' },
  { id: 'caracteristicas', nombre: 'Características' },
  { id: 'trasfondo', nombre: 'Trasfondo' },
  { id: 'magia', nombre: 'Magia' },
  { id: 'final', nombre: 'Aventura' },
];

function pantallaTitulo() {
  const guardada = partidaGuardada() || UI.partidaEnMemoria || null;
  const continuar = guardada ? h('button', { class: 'btn btn-primario btn-grande', onclick: () => { estado = guardada; restaurarPartida(); } },
    h('span', null, 'Continuar partida'),
    h('small', null, `${guardada.heroe.nombre} · ${RAZAS[guardada.heroe.raza].nombre} ${CLASES[guardada.heroe.clase].nombre.toLowerCase()} de nivel ${guardada.heroe.nivel} · ${guardada.modo === 'dm' ? (CAMPANAS[guardada.dm && guardada.dm.campana] || CAMPANAS.libre).titulo : 'Mazmorra clásica'}`)) : null;
  return h('div', { class: 'portada' },
    h('div', { class: 'portada-emblema', html: svgD20('emblema-d20') + '<span class="emblema-num">20</span>' }),
    h('h1', { class: 'portada-nombre' }, 'Dados y Dragones'),
    h('p', { class: 'portada-lema' }, 'Rol de fantasía en solitario. Tú decides, Claude narra y los dados juzgan.'),
    h('div', { class: 'portada-acciones' },
      continuar,
      h('button', { class: 'btn ' + (guardada ? '' : 'btn-primario ') + 'btn-grande', onclick: () => {
        const nueva = () => { const aj = estado && estado.ajustes; estado = estadoBase(); if (aj) estado.ajustes = aj; UI.creacion = nuevaCreacion(); estado.pantalla = 'creacion'; render(); };
        if (guardada) confirmar('Nueva partida', 'Empezar una partida nueva sustituirá la que tienes guardada en este navegador. Si quieres conservarla, exporta su código desde el menú.', 'Empezar de cero').then(ok => { if (ok) { Almacen.borrar(CLAVE_PARTIDA); Almacen.borrar(CLAVE_CONTROL); UI.partidaEnMemoria = null; nueva(); } });
        else nueva();
      } }, h('span', null, 'Nueva partida'), h('small', null, 'Crea a tu héroe')),
      h('button', { class: 'btn btn-fantasma', onclick: abrirImportar }, 'Importar partida')),
    h('ul', { class: 'portada-claves' },
      h('li', null, h('b', null, 'Claude como Dungeon Master'), ' improvisa la historia, da voz a los personajes y reacciona a cualquier cosa que escribas.'),
      h('li', null, h('b', null, 'Combate táctico por turnos'), ' en cuadrícula, con iniciativa, cobertura, ataques de oportunidad y reglas de 5.ª edición.'),
      h('li', null, h('b', null, '8 razas, 8 clases, más de 50 conjuros y 31 monstruos'), ', del nivel 1 al 5. Y una mazmorra de cinco pisos que se juega sin IA.')),
    h('p', { class: 'portada-pie' }, 'Reglas basadas en el SRD 5.1 de Wizards of the Coast, publicado bajo licencia CC-BY-4.0.'));
}

function abrirImportar() {
  const campo = h('textarea', { id: 'campo-importar', class: 'campo codigo', rows: 5, placeholder: 'Pega aquí el código que empieza por DYD1:' });
  const error = h('p', { class: 'error', hidden: true });
  abrirModal({
    titulo: 'Importar partida',
    cuerpo: h('div', null, h('p', null, 'Pega el código que copiaste desde el menú de otra partida.'), campo, error),
    acciones: [{ texto: 'Cancelar' }, { texto: 'Cargar partida', clase: 'btn-primario', onClick: () => {
      try { estado = importarPartida(campo.value); restaurarPartida(); return true; } catch (e) { error.hidden = false; error.textContent = 'Ese código no es válido. Comprueba que lo has copiado entero.'; return false; }
    } }],
  });
}

function nuevaCreacion() {
  return { paso: 0, raza: null, clase: null, linaje: 'rojo', metodo: 'estandar', pool: [15, 14, 13, 12, 10, 8], tirado: false, asign: null, puntos: { fue: 8, des: 8, con: 8, int: 8, sab: 8, car: 8 }, trasfondo: null, habilidades: [], pericia: [], estilo: null, enemigo: null, trucos: [], conjuros: [], nombre: '', modo: null, campana: 'valdren', premisa: '', tono: 'epico', modeloDM: 'quick', dificultad: 'normal' };
}

function asignacionPorClase(claseId, pool) {
  const reparto = CLASES[claseId] ? CLASES[claseId].reparto : { fue: 15, des: 14, con: 13, int: 12, sab: 10, car: 8 };
  const orden = Object.keys(reparto).sort((a, b) => reparto[b] - reparto[a]);
  const indices = pool.map((v, i) => i).sort((a, b) => pool[b] - pool[a]);
  const asign = {};
  orden.forEach((car, k) => { asign[car] = indices[k]; });
  return asign;
}

function valoresBase(cr) {
  const r = {};
  for (const c of CARACTERISTICAS) r[c.id] = cr.metodo === 'puntos' ? cr.puntos[c.id] : cr.pool[cr.asign[c.id]];
  return r;
}
function puntosRestantes(cr) { return 27 - Object.values(cr.puntos).reduce((s, v) => s + COSTE_PUNTOS[v], 0); }

function necesitaMagia(cr) {
  if (!cr.clase) return false;
  const l = CLASES[cr.clase].lanzamiento;
  return !!(l && ((l.trucos[0] || 0) > 0 || (l.tipo === 'conocidos' && (l.conocidos[0] || 0) > 0)));
}
function pasosVisibles(cr) { return PASOS_CREACION.filter(p => p.id !== 'magia' || necesitaMagia(cr)); }

function opcionesCreacion(cr) {
  return { nombre: cr.nombre.trim() || 'Sin nombre', raza: cr.raza, clase: cr.clase, trasfondo: cr.trasfondo || 'forastero', base: valoresBase(cr), habilidades: cr.habilidades, pericia: cr.pericia, estilo: cr.estilo, enemigoPredilecto: cr.enemigo, linaje: cr.raza === 'draconido' ? cr.linaje : null, trucos: cr.trucos, conjuros: cr.conjuros };
}

function validarPaso(cr, id) {
  const c = cr.clase && CLASES[cr.clase];
  switch (id) {
    case 'raza': return cr.raza ? null : 'Elige una raza.';
    case 'clase': return cr.clase ? null : 'Elige una clase.';
    case 'caracteristicas': if (cr.metodo === 'tirada' && !cr.tirado) return 'Tira los dados primero.'; if (cr.metodo === 'puntos' && puntosRestantes(cr) < 0) return 'Te has pasado de puntos.'; return null;
    case 'trasfondo': {
      if (!cr.trasfondo) return 'Elige un trasfondo.';
      if (cr.habilidades.length !== c.habilidades.elegir) return `Elige ${c.habilidades.elegir} habilidades de clase.`;
      if (c.pericia && cr.pericia.length !== c.pericia) return `Elige ${c.pericia} habilidades para tu pericia.`;
      if (c.estilos && c.estiloNivel === 1 && !cr.estilo) return 'Elige un estilo de combate.';
      if (cr.clase === 'explorador' && !cr.enemigo) return 'Elige tu enemigo predilecto.';
      return null;
    }
    case 'magia': {
      const l = c.lanzamiento;
      if (cr.trucos.length !== (l.trucos[0] || 0)) return `Elige ${l.trucos[0]} trucos.`;
      if (l.tipo === 'conocidos' && cr.conjuros.length !== (l.conocidos[0] || 0)) return `Elige ${l.conocidos[0]} conjuros.`;
      return null;
    }
    case 'final': {
      if (!cr.nombre.trim()) return 'Ponle nombre a tu héroe.';
      if (!cr.modo) return 'Elige cómo quieres jugar.';
      if (cr.modo === 'dm' && !DM.sample) return 'El DM con IA no está disponible aquí.';
      if (cr.modo === 'dm' && cr.campana === 'libre' && cr.premisa.trim().length < 10) return 'Escribe una premisa para tu aventura.';
      return null;
    }
  }
  return null;
}

function heroeAleatorio() {
  const cr = nuevaCreacion();
  cr.raza = elegir(Object.keys(RAZAS));
  cr.clase = elegir(Object.keys(CLASES));
  cr.asign = asignacionPorClase(cr.clase, cr.pool);
  cr.trasfondo = elegir(Object.keys(TRASFONDOS));
  cr.linaje = elegir(Object.keys(LINAJES_DRACONIDOS));
  const c = CLASES[cr.clase];
  const yaTiene = new Set([...TRASFONDOS[cr.trasfondo].habilidades, ...(RAZAS[cr.raza].habilidades || [])]);
  cr.habilidades = barajar(c.habilidades.de.filter(x => !yaTiene.has(x))).slice(0, c.habilidades.elegir);
  if (c.pericia) cr.pericia = barajar([...cr.habilidades, ...yaTiene]).slice(0, c.pericia);
  if (c.estilos && c.estiloNivel === 1) cr.estilo = elegir(c.estilos);
  if (cr.clase === 'explorador') cr.enemigo = elegir(Object.keys(TIPOS_ENEMIGO_PREDILECTO));
  if (necesitaMagia(cr)) {
    const l = c.lanzamiento;
    const trucosOp = Object.keys(CONJUROS).filter(id => CONJUROS[id].nivel === 0 && CONJUROS[id].clases.includes(cr.clase));
    const conDanio = trucosOp.filter(id => CONJUROS[id].modo !== 'narrativo');
    cr.trucos = barajar(conDanio).slice(0, Math.min(1, conDanio.length));
    cr.trucos = cr.trucos.concat(barajar(trucosOp.filter(id => !cr.trucos.includes(id))).slice(0, (l.trucos[0] || 0) - cr.trucos.length));
    if (l.tipo === 'conocidos') {
      const op = Object.keys(CONJUROS).filter(id => CONJUROS[id].nivel === 1 && CONJUROS[id].clases.includes(cr.clase));
      const utiles = op.filter(id => CONJUROS[id].modo !== 'narrativo');
      cr.conjuros = barajar(utiles).slice(0, l.conocidos[0] || 0);
    }
  }
  cr.nombre = elegir(NOMBRES_SUGERIDOS);
  cr.paso = pasosVisibles(cr).length - 1;
  return cr;
}

function pantallaCreacion() {
  const cr = UI.creacion || (UI.creacion = nuevaCreacion());
  const pasos = pasosVisibles(cr);
  cr.paso = limitar(cr.paso, 0, pasos.length - 1);
  const paso = pasos[cr.paso];
  const error = validarPaso(cr, paso.id);
  const cuerpo = { raza: pasoRaza, clase: pasoClase, caracteristicas: pasoCaracteristicas, trasfondo: pasoTrasfondo, magia: pasoMagia, final: pasoFinal }[paso.id](cr);
  const repintar = () => render();
  return h('div', { class: 'creacion' },
    h('header', { class: 'creacion-cab' },
      h('button', { class: 'btn btn-fantasma', onclick: () => { estado.pantalla = 'titulo'; render(); } }, '← Título'),
      h('h1', null, 'Crea a tu héroe'),
      h('button', { class: 'btn', onclick: () => { UI.creacion = heroeAleatorio(); repintar(); } }, 'Héroe aleatorio')),
    h('ol', { class: 'pasos' }, pasos.map((p, i) => h('li', { class: (i === cr.paso ? 'actual' : '') + (i < cr.paso ? ' hecho' : '') },
      h('button', { disabled: i > cr.paso && pasos.slice(0, i).some(pp => validarPaso(cr, pp.id)), onclick: () => { cr.paso = i; repintar(); } }, h('span', { class: 'paso-num' }, i + 1), h('span', { class: 'paso-nombre' }, p.nombre))))),
    h('div', { class: 'creacion-cuerpo' },
      h('section', { class: 'creacion-paso' }, cuerpo),
      resumenCreacion(cr)),
    h('footer', { class: 'creacion-pie' },
      h('button', { class: 'btn', disabled: cr.paso === 0, onclick: () => { cr.paso--; repintar(); window.scrollTo(0, 0); } }, 'Anterior'),
      h('span', { class: 'creacion-error', role: 'status' }, error || ''),
      paso.id === 'final'
        ? h('button', { class: 'btn btn-primario', disabled: !!error, onclick: () => comenzarPartida(cr) }, 'Comenzar la aventura')
        : h('button', { class: 'btn btn-primario', disabled: !!error, onclick: () => { cr.paso++; repintar(); window.scrollTo(0, 0); } }, 'Siguiente')));
}

function tarjetaSeleccion(activa, onClick, ...hijos) {
  return h('button', { class: 'tarjeta' + (activa ? ' activa' : ''), 'aria-pressed': activa ? 'true' : 'false', onclick: onClick }, ...hijos);
}

function textoBonos(bonos) { return Object.entries(bonos).map(([k, v]) => `${ABREV_CAR[k]} +${v}`).join(' · '); }

function pasoRaza(cr) {
  return h('div', null,
    h('p', { class: 'intro-paso' }, 'Tu raza define tus rasgos innatos y mejora algunas características.'),
    h('div', { class: 'rejilla-tarjetas' }, Object.entries(RAZAS).map(([id, r]) => tarjetaSeleccion(cr.raza === id, () => { cr.raza = id; render(); },
      h('span', { class: 'tarjeta-titulo' }, r.nombre),
      h('span', { class: 'tarjeta-dato' }, textoBonos(r.bonos), ' · ', metros(r.vel)),
      h('span', { class: 'tarjeta-desc' }, r.desc)))),
    cr.raza ? h('div', { class: 'detalle' },
      h('h3', null, 'Rasgos de ' + RAZAS[cr.raza].plural),
      h('ul', { class: 'lista-rasgos' }, RAZAS[cr.raza].rasgos.map(t => h('li', null, h('b', null, t.nombre + '. '), t.desc))),
      cr.raza === 'draconido' ? h('label', { class: 'fila-campo' }, h('span', null, 'Linaje dracónico'), selector('cr-linaje', Object.entries(LINAJES_DRACONIDOS).map(([id, l]) => [id, `${l.nombre} — ${l.danio}, ${l.forma === 'cono' ? 'cono de 4,5 m' : 'línea de 9 m'}`]), cr.linaje, v => { cr.linaje = v; render(); })) : null) : null);
}

const COMPLEJIDAD = { guerrero: 'Sencilla', barbaro: 'Sencilla', picaro: 'Media', explorador: 'Media', paladin: 'Media', clerigo: 'Media', mago: 'Compleja', brujo: 'Compleja' };

function pasoClase(cr) {
  return h('div', null,
    h('p', { class: 'intro-paso' }, 'Tu clase es tu oficio de aventurero: cómo luchas, qué magia dominas y cuánto aguantas.'),
    h('div', { class: 'rejilla-tarjetas' }, Object.entries(CLASES).map(([id, c]) => tarjetaSeleccion(cr.clase === id, () => {
      if (cr.clase !== id) { cr.clase = id; cr.habilidades = []; cr.pericia = []; cr.estilo = null; cr.trucos = []; cr.conjuros = []; cr.asign = asignacionPorClase(id, cr.pool); if (cr.metodo === 'puntos') cr.puntos = puntosPorClase(id); }
      render();
    },
      h('span', { class: 'tarjeta-titulo' }, c.nombre),
      h('span', { class: 'tarjeta-dato' }, `d${c.dado} · ${c.principal} · ${COMPLEJIDAD[id]}`),
      h('span', { class: 'tarjeta-desc' }, c.desc)))),
    cr.clase ? h('div', { class: 'detalle' },
      h('h3', null, 'Rasgos del ' + CLASES[cr.clase].nombre.toLowerCase() + ' (niveles 1-5)'),
      h('ul', { class: 'lista-rasgos' }, CLASES[cr.clase].rasgos.map(t => h('li', null, h('span', { class: 'nivel-chip' }, 'Nv ' + t.nivel), h('b', null, t.nombre + '. '), t.desc))),
      h('p', { class: 'nota' }, `Salvaciones: ${CLASES[cr.clase].salvaciones.map(s => NOMBRE_CAR[s]).join(' y ')}. Armaduras: ${CLASES[cr.clase].armaduras.length ? CLASES[cr.clase].armaduras.join(', ') : 'ninguna'}.`)) : null);
}

function puntosPorClase(claseId) {
  const reparto = CLASES[claseId].reparto;
  const orden = Object.keys(reparto).sort((a, b) => reparto[b] - reparto[a]);
  const valores = [15, 15, 13, 10, 8, 8];
  const p = {}; orden.forEach((car, i) => { p[car] = valores[i]; });
  return p;
}

function pasoCaracteristicas(cr) {
  if (!cr.asign) cr.asign = asignacionPorClase(cr.clase, cr.pool);
  const raza = RAZAS[cr.raza];
  const base = valoresBase(cr);
  const metodos = [['estandar', 'Conjunto estándar'], ['tirada', 'Tirar 4d6'], ['puntos', 'Compra de puntos']];
  const cambiarMetodo = (m) => {
    cr.metodo = m;
    if (m === 'estandar') { cr.pool = [15, 14, 13, 12, 10, 8]; cr.tirado = false; cr.asign = asignacionPorClase(cr.clase, cr.pool); }
    if (m === 'tirada') { cr.tirado = false; }
    if (m === 'puntos') cr.puntos = puntosPorClase(cr.clase);
    render();
  };
  const tirar = () => {
    cr.pool = Array.from({ length: 6 }, () => { const d = [dado(6), dado(6), dado(6), dado(6)].sort((a, b) => b - a); return d[0] + d[1] + d[2]; });
    cr.tirado = true; cr.asign = asignacionPorClase(cr.clase, cr.pool);
    render();
  };
  const filas = CARACTERISTICAS.map(c => {
    const bono = (raza.bonos || {})[c.id] || 0;
    const final = base[c.id] + bono;
    let control;
    if (cr.metodo === 'puntos') {
      const v = cr.puntos[c.id];
      control = h('div', { class: 'paso-puntos' },
        h('button', { class: 'btn-icono', 'aria-label': 'Bajar ' + c.nombre, disabled: v <= 8, onclick: () => { cr.puntos[c.id]--; render(); } }, '−'),
        h('b', null, v),
        h('button', { class: 'btn-icono', 'aria-label': 'Subir ' + c.nombre, disabled: v >= 15 || puntosRestantes(cr) < COSTE_PUNTOS[v + 1] - COSTE_PUNTOS[v], onclick: () => { cr.puntos[c.id]++; render(); } }, '+'));
    } else {
      control = h('select', { class: 'campo', id: 'asig-' + c.id, disabled: cr.metodo === 'tirada' && !cr.tirado, onchange: e => {
        const nuevo = parseInt(e.target.value, 10);
        const otro = Object.keys(cr.asign).find(k => cr.asign[k] === nuevo);
        if (otro) cr.asign[otro] = cr.asign[c.id];
        cr.asign[c.id] = nuevo; render();
      } }, cr.pool.map((v, i) => h('option', { value: i, selected: cr.asign[c.id] === i }, v)));
    }
    return h('div', { class: 'fila-car' },
      h('span', { class: 'car-nombre' }, h('b', null, c.abrev), ' ', c.nombre),
      control,
      h('span', { class: 'car-bono' }, bono ? '+' + bono + ' racial' : ''),
      h('span', { class: 'car-final' }, h('b', null, final), h('small', null, signo(modificador(final)))));
  });
  return h('div', null,
    h('p', { class: 'intro-paso' }, `Reparte tus seis características. Para un ${CLASES[cr.clase].nombre.toLowerCase()}, lo más importante es ${CLASES[cr.clase].principal}.`),
    h('div', { class: 'segmentado', role: 'tablist' }, metodos.map(([id, t]) => h('button', { role: 'tab', 'aria-selected': cr.metodo === id ? 'true' : 'false', class: cr.metodo === id ? 'activa' : '', onclick: () => cambiarMetodo(id) }, t))),
    cr.metodo === 'tirada' ? h('div', { class: 'fila-botones' }, h('button', { class: 'btn btn-primario', onclick: tirar }, cr.tirado ? 'Volver a tirar' : 'Tirar 4d6 seis veces'), cr.tirado ? h('span', { class: 'nota' }, 'Resultados: ' + cr.pool.join(', ') + ` (total ${cr.pool.reduce((s, v) => s + v, 0)})`) : h('span', { class: 'nota' }, 'Se tiran 4d6 y se descarta el dado más bajo.')) : null,
    cr.metodo === 'puntos' ? h('p', { class: 'nota' }, `Puntos restantes: `, h('b', null, puntosRestantes(cr)), ' de 27. Cada valor va de 8 a 15.') : null,
    h('div', { class: 'tabla-car' }, filas));
}

function pasoTrasfondo(cr) {
  const c = CLASES[cr.clase];
  const delTrasfondo = new Set([...(cr.trasfondo ? TRASFONDOS[cr.trasfondo].habilidades : []), ...(RAZAS[cr.raza].habilidades || [])]);
  cr.habilidades = cr.habilidades.filter(x => !delTrasfondo.has(x));
  const todas = new Set([...cr.habilidades, ...delTrasfondo]);
  cr.pericia = cr.pericia.filter(x => todas.has(x));
  return h('div', null,
    h('p', { class: 'intro-paso' }, 'Tu pasado te da habilidades y contactos. El DM lo tendrá en cuenta en la historia.'),
    h('div', { class: 'rejilla-tarjetas compacta' }, Object.entries(TRASFONDOS).map(([id, t]) => tarjetaSeleccion(cr.trasfondo === id, () => { cr.trasfondo = id; render(); },
      h('span', { class: 'tarjeta-titulo' }, t.nombre),
      h('span', { class: 'tarjeta-dato' }, t.habilidades.map(x => HABILIDADES[x].nombre).join(' · ')),
      h('span', { class: 'tarjeta-desc' }, t.desc)))),
    h('div', { class: 'detalle' },
      h('h3', null, `Habilidades de clase (elige ${c.habilidades.elegir})`),
      h('div', { class: 'rejilla-casillas' }, c.habilidades.de.map(hb => {
        const fija = delTrasfondo.has(hb);
        const marcada = fija || cr.habilidades.includes(hb);
        return h('label', { class: 'casilla' + (fija ? ' fija' : '') },
          h('input', { type: 'checkbox', checked: marcada, disabled: fija || (!marcada && cr.habilidades.length >= c.habilidades.elegir), onchange: e => { if (e.target.checked) cr.habilidades.push(hb); else cr.habilidades = cr.habilidades.filter(x => x !== hb); render(); } }),
          h('span', null, HABILIDADES[hb].nombre, h('small', null, ` (${ABREV_CAR[HABILIDADES[hb].car]})${fija ? ' · ya la tienes' : ''}`)));
      })),
      c.pericia ? h('div', null,
        h('h3', null, `Pericia (elige ${c.pericia}): duplica tu competencia`),
        h('div', { class: 'rejilla-casillas' }, Array.from(todas).map(hb => h('label', { class: 'casilla' },
          h('input', { type: 'checkbox', checked: cr.pericia.includes(hb), disabled: !cr.pericia.includes(hb) && cr.pericia.length >= c.pericia, onchange: e => { if (e.target.checked) cr.pericia.push(hb); else cr.pericia = cr.pericia.filter(x => x !== hb); render(); } }),
          h('span', null, HABILIDADES[hb].nombre))))) : null,
      c.estilos && c.estiloNivel === 1 ? h('div', null,
        h('h3', null, 'Estilo de combate'),
        h('div', { class: 'rejilla-tarjetas compacta' }, c.estilos.map(id => tarjetaSeleccion(cr.estilo === id, () => { cr.estilo = id; render(); }, h('span', { class: 'tarjeta-titulo' }, ESTILOS_COMBATE[id].nombre), h('span', { class: 'tarjeta-desc' }, ESTILOS_COMBATE[id].desc))))) : null,
      cr.clase === 'explorador' ? h('label', { class: 'fila-campo' }, h('span', null, 'Enemigo predilecto'), selector('cr-enemigo', [['', 'Elige…'], ...Object.entries(TIPOS_ENEMIGO_PREDILECTO)], cr.enemigo || '', v => { cr.enemigo = v || null; render(); })) : null));
}

function listaConjurosElegibles(cr, nivel) {
  return Object.keys(CONJUROS).filter(id => CONJUROS[id].nivel === nivel && CONJUROS[id].clases.includes(cr.clase));
}

function tarjetaConjuro(id, activa, deshabilitada, onClick) {
  const cj = CONJUROS[id];
  return h('button', { class: 'tarjeta tarjeta-conjuro' + (activa ? ' activa' : ''), disabled: deshabilitada && !activa, 'aria-pressed': activa ? 'true' : 'false', onclick: onClick },
    h('span', { class: 'tarjeta-titulo' }, cj.nombre),
    h('span', { class: 'tarjeta-dato' }, [cj.nivel === 0 ? 'Truco' : 'Nivel ' + cj.nivel, { accion: 'Acción', adicional: 'Acción adicional', reaccion: 'Reacción' }[cj.tiempo], cj.concentracion ? 'Concentración' : null, cj.modo === 'narrativo' ? 'Utilidad' : null].filter(Boolean).join(' · ')),
    h('span', { class: 'tarjeta-desc' }, cj.desc));
}

function pasoMagia(cr) {
  const l = CLASES[cr.clase].lanzamiento;
  const nTrucos = l.trucos[0] || 0, nConj = l.tipo === 'conocidos' ? (l.conocidos[0] || 0) : 0;
  const alternar = (lista, id, max) => { const i = lista.indexOf(id); if (i >= 0) lista.splice(i, 1); else if (lista.length < max) lista.push(id); render(); };
  return h('div', null,
    h('p', { class: 'intro-paso' }, l.tipo === 'preparados' ? 'Como clérigo, conoces todos los conjuros de tu lista; solo eliges los trucos.' : 'Elige los conjuros que tu héroe conoce. Aprenderás más al subir de nivel.'),
    nTrucos ? h('div', null, h('h3', null, `Trucos (${cr.trucos.length}/${nTrucos}) · se lanzan sin límite`),
      h('div', { class: 'rejilla-tarjetas compacta' }, listaConjurosElegibles(cr, 0).map(id => tarjetaConjuro(id, cr.trucos.includes(id), cr.trucos.length >= nTrucos, () => alternar(cr.trucos, id, nTrucos))))) : null,
    nConj ? h('div', null, h('h3', null, `Conjuros de nivel 1 (${cr.conjuros.length}/${nConj}) · gastan espacios de conjuro`),
      h('div', { class: 'rejilla-tarjetas compacta' }, listaConjurosElegibles(cr, 1).map(id => tarjetaConjuro(id, cr.conjuros.includes(id), cr.conjuros.length >= nConj, () => alternar(cr.conjuros, id, nConj))))) : null,
    l.tipo === 'preparados' ? h('div', null, h('h3', null, 'Tus conjuros de nivel 1'), h('div', { class: 'rejilla-tarjetas compacta' }, listaConjurosElegibles(cr, 1).map(id => tarjetaConjuro(id, true, true, () => {})))) : null);
}

function pasoFinal(cr) {
  const dmDisponible = !!DM.sample;
  if (!cr.modo) cr.modo = dmDisponible ? 'dm' : (DM.comprobado ? 'mazmorra' : null);
  const campoNombre = h('input', { id: 'cr-nombre', class: 'campo campo-nombre', maxlength: 40, value: cr.nombre, placeholder: 'Nombre de tu héroe', oninput: e => { cr.nombre = e.target.value; const err = validarPaso(cr, 'final'); const b = $('.creacion-pie .btn-primario'); if (b) b.disabled = !!err; const s = $('.creacion-error'); if (s) s.textContent = err || ''; const r = $('.resumen-nombre'); if (r) r.textContent = cr.nombre || 'Sin nombre'; } });
  return h('div', null,
    h('div', { class: 'fila-nombre' }, campoNombre, h('button', { class: 'btn', onclick: () => { cr.nombre = elegir(NOMBRES_SUGERIDOS); render(); } }, 'Sugerir')),
    h('h3', null, 'Cómo quieres jugar'),
    h('div', { class: 'rejilla-modos' },
      h('button', { class: 'tarjeta tarjeta-modo' + (cr.modo === 'dm' ? ' activa' : ''), disabled: !dmDisponible, onclick: () => { cr.modo = 'dm'; render(); } },
        h('span', { class: 'tarjeta-titulo' }, 'Campaña con Claude como DM'),
        h('span', { class: 'tarjeta-desc' }, 'Una historia abierta: escribe lo que quieras hacer y el DM narra, interpreta a los personajes y te pide tiradas.'),
        h('span', { class: 'tarjeta-dato' }, dmDisponible ? 'Usa tu cuenta de Claude; te pedirá permiso la primera vez.' : DM.comprobado ? 'Solo disponible al jugar dentro de Claude.' : 'Comprobando si Claude está disponible…')),
      h('button', { class: 'tarjeta tarjeta-modo' + (cr.modo === 'mazmorra' ? ' activa' : ''), onclick: () => { cr.modo = 'mazmorra'; render(); } },
        h('span', { class: 'tarjeta-titulo' }, 'Mazmorra clásica'),
        h('span', { class: 'tarjeta-desc' }, 'Cinco pisos generados al azar con combates, trampas, eventos, mercaderes y jefes. Funciona sin conexión a la IA.'),
        h('span', { class: 'tarjeta-dato' }, 'Del nivel 1 al 5 · 30-60 minutos'))),
    cr.modo === 'dm' ? h('div', { class: 'detalle' },
      h('h3', null, 'Campaña'),
      h('div', { class: 'rejilla-tarjetas compacta' }, Object.entries(CAMPANAS).map(([id, c]) => tarjetaSeleccion(cr.campana === id, () => { cr.campana = id; render(); },
        h('span', { class: 'tarjeta-titulo' }, c.titulo), h('span', { class: 'tarjeta-dato' }, c.etiqueta), h('span', { class: 'tarjeta-desc' }, c.gancho)))),
      cr.campana === 'libre' ? h('textarea', { id: 'cr-premisa', class: 'campo', rows: 3, maxlength: 600, placeholder: 'Ejemplo: Soy guardaespaldas de una princesa que huye de su propio padre por el desierto de Kharam.', oninput: e => { cr.premisa = e.target.value; const err = validarPaso(cr, 'final'); const b = $('.creacion-pie .btn-primario'); if (b) b.disabled = !!err; const s = $('.creacion-error'); if (s) s.textContent = err || ''; } }, cr.premisa) : null,
      h('div', { class: 'fila-ajustes' },
        h('label', { class: 'fila-campo' }, h('span', null, 'Tono'), selector('cr-tono', Object.entries(TONOS).map(([id, t]) => [id, t.nombre]), cr.tono, v => { cr.tono = v; })),
        h('label', { class: 'fila-campo' }, h('span', null, 'Narrador'), selector('cr-modelo', Object.entries(MODELOS_DM).map(([id, t]) => [id, `${t.nombre} — ${t.desc}`]), cr.modeloDM, v => { cr.modeloDM = v; })))) : null,
    h('div', { class: 'detalle' },
      h('h3', null, 'Dificultad'),
      h('div', { class: 'rejilla-tarjetas compacta' }, Object.entries(DIFICULTADES).map(([id, d]) => tarjetaSeleccion(cr.dificultad === id, () => { cr.dificultad = id; render(); }, h('span', { class: 'tarjeta-titulo' }, d.nombre), h('span', { class: 'tarjeta-desc' }, d.desc))))));
}

function resumenCreacion(cr) {
  const listo = cr.raza && cr.clase;
  if (!listo) return h('aside', { class: 'resumen-creacion vacio' }, h('p', null, 'Elige raza y clase para ver la ficha de tu héroe.'));
  if (!cr.asign) cr.asign = asignacionPorClase(cr.clase, cr.pool);
  const ajPrev = estado.ajustes.dificultad;
  estado.ajustes.dificultad = cr.dificultad;
  const hr = crearHeroe(opcionesCreacion(cr));
  estado.ajustes.dificultad = ajPrev;
  const armas = ataquesDisponibles(hr);
  return h('aside', { class: 'resumen-creacion' },
    h('div', { class: 'resumen-nombre' }, cr.nombre || 'Sin nombre'),
    h('div', { class: 'resumen-sub' }, `${RAZAS[cr.raza].nombre} ${CLASES[cr.clase].nombre.toLowerCase()}${cr.trasfondo ? ' · ' + TRASFONDOS[cr.trasfondo].nombre.toLowerCase() : ''}`),
    h('div', { class: 'resumen-bloques' },
      h('div', null, h('span', { class: 'etq' }, 'PG'), h('b', null, hr.pgMax)),
      h('div', null, h('span', { class: 'etq' }, 'CA'), h('b', null, claseArmadura(hr))),
      h('div', null, h('span', { class: 'etq' }, 'Vel.'), h('b', null, metros(velocidad(hr))))),
    h('div', { class: 'resumen-car' }, CARACTERISTICAS.map(c => h('div', null, h('span', { class: 'etq' }, c.abrev), h('b', null, valorCar(hr, c.id)), h('small', null, signo(modCar(hr, c.id)))))),
    h('div', { class: 'resumen-lista' }, h('span', { class: 'etq' }, 'Ataques'), armas.map(a => h('div', null, `${a.nombre} ${signo(a.bono)} · ${a.dados}${a.modDanio ? signo(a.modDanio) : ''}`))),
    hr.habilidades.length ? h('div', { class: 'resumen-lista' }, h('span', { class: 'etq' }, 'Habilidades'), h('div', null, hr.habilidades.map(x => HABILIDADES[x].nombre).join(', '))) : null,
    h('div', { class: 'resumen-lista' }, h('span', { class: 'etq' }, 'Equipo'), h('div', null, hr.inventario.map(i => nombreObjeto(i)).join(', '))));
}

function comenzarPartida(cr) {
  estado.ajustes.dificultad = cr.dificultad;
  estado.ajustes.tono = cr.tono;
  estado.ajustes.modeloDM = cr.modeloDM;
  estado.heroe = crearHeroe(opcionesCreacion(cr));
  estado.modo = cr.modo;
  estado.pantalla = 'juego';
  estado.registro = [];
  UI.vistaMovil = 'escena'; UI.tab = 'ficha';
  UI.creacion = null;
  if (cr.modo === 'dm') {
    estado.dm = nuevoEstadoDM(cr.campana, cr.premisa.trim());
    render();
    accionDM('[INICIO DE LA PARTIDA] Presenta la escena de apertura: dónde está el héroe, qué ve y qué gancho lo empuja a la aventura. Incluye "lugar", "mision" y "opciones".', { oculto: true });
  } else {
    nuevaMazmorra();
    render();
  }
}

function restaurarPartida() {
  if (!estado || !estado.heroe) { estado = estadoBase(); render(); return; }
  estado.pantalla = 'juego';
  UI.vistaMovil = 'escena';
  if (estado.dm && estado.dm.cargando) { estado.dm.cargando = false; estado.dm.error = { code: 'upstream_error', texto: 'La última respuesta del DM se interrumpió. Pulsa «Reintentar».' }; }
  render();
  const c = estado.combate;
  if (c && !c.resultado) {
    if (c.orden[c.turno] === 'heroe') { c.esperandoJugador = true; renderJuego(); }
    else { c.esperandoJugador = false; bucleCombate(); }
  } else if (c && c.resultado && !c.cerrado) terminarCombate();
  else if (c && c.cerrado) mostrarFinCombate(c);
}
