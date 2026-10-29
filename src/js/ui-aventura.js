// ─── Vistas de aventura: DM con IA y Mazmorra clásica ───

const NOMBRE_TERRENO = id => (TERRENOS[id] || TERRENOS.mazmorra).nombre;

function describirEncuentro(def) {
  const partes = {};
  for (const g of def.enemigos) {
    const nombre = g.nombre || MONSTRUOS[g.id].nombre;
    partes[nombre] = (partes[nombre] || 0) + (g.cantidad || 1);
  }
  return Object.entries(partes).map(([n, k]) => (k > 1 ? `${k} × ` : '') + n);
}

function tarjetaCombate(def, alLuchar, alRetirarse) {
  return h('div', { class: 'tarjeta-pendiente tarjeta-combate-pend' },
    h('div', { class: 'pend-etq' }, '¡Combate!'),
    h('ul', { class: 'lista-enemigos' }, def.enemigos.map(g => {
      const m = MONSTRUOS[g.id];
      return h('li', null, h('b', null, (g.cantidad > 1 ? g.cantidad + ' × ' : '') + (g.nombre || m.nombre)), h('small', null, ` ${TIPOS_CRIATURA[m.tipo]} · VD ${m.vd}${g.jefe ? ' · jefe' : ''}`));
    })),
    h('p', { class: 'nota' }, `Terreno: ${NOMBRE_TERRENO(def.terreno)}${def.sorpresa === 'heroe' ? ' · ¡Te han sorprendido!' : def.sorpresa === 'enemigos' ? ' · Los pillas desprevenidos' : ''}`),
    h('div', { class: 'fila-botones' },
      h('button', { class: 'btn btn-primario', onclick: alLuchar }, 'Luchar'),
      alRetirarse ? h('button', { class: 'btn', onclick: alRetirarse }, 'Retroceder') : null));
}

function empezarCombate(def, origen) {
  guardarPuntoControl();
  const c = iniciarCombate(def, origen);
  if (!c) return false;
  UI.modoCombate = null; UI.vistaMovil = 'escena';
  render();
  bucleCombate();
  return true;
}

// ─── DM con IA ───
function vistaDM() {
  const dm = estado.dm;
  const inicio = Math.max(0, dm.vista.length - 80);
  const vistos = UI.vistosDM == null ? dm.vista.length : UI.vistosDM;
  UI.vistosDM = dm.vista.length;
  const log = h('div', { class: 'dm-log', id: 'dm-log', 'aria-live': 'polite' },
    inicio > 0 ? h('p', { class: 'nota centrada' }, `(${inicio} entradas anteriores en el historial)`) : null,
    dm.vista.slice(inicio).map((e, i) => { const el = entradaVista(e); if (el && inicio + i >= vistos && e.tipo !== 'dm') el.classList.add('msg-nuevo'); return el; }),
    dm.cargando ? h('article', { class: 'msg msg-dm escribiendo' }, h('div', { id: 'dm-stream', html: UI.streaming ? textoEnriquecido(UI.streaming) : '' }), UI.streaming ? null : h('p', { class: 'pensando' }, 'El DM está pensando', h('span', { class: 'puntos' }, h('i'), h('i'), h('i')))) : null,
    dm.error && !dm.cargando ? h('div', { class: 'msg msg-error' }, h('p', null, dm.error.texto),
      h('div', { class: 'fila-botones' },
        dm.error.code !== 'not_granted' && dm.error.code !== 'sampling_disabled' ? h('button', { class: 'btn btn-primario', onclick: reintentarDM }, 'Reintentar') : null,
        dm.error.code === 'not_granted' ? h('button', { class: 'btn', onclick: abrirPermisos }, 'Abrir permisos') : null)) : null);
  setTimeout(() => { const l = $('#dm-log'); if (l) l.scrollTop = l.scrollHeight; }, 0);
  return h('div', { class: 'vista-dm' },
    h('div', { class: 'escena-cab' },
      h('div', null, h('span', { class: 'etq' }, (CAMPANAS[dm.campana] || CAMPANAS.libre).titulo), h('h2', { class: 'escena-lugar' }, dm.lugar || 'Comienza la aventura')),
      dm.mision ? h('p', { class: 'escena-mision' }, h('span', { class: 'etq' }, 'Misión'), ' ', dm.mision) : null),
    log,
    zonaAccionDM());
}

function entradaVista(e) {
  switch (e.tipo) {
    case 'dm': return h('article', { class: 'msg msg-dm', html: textoEnriquecido(e.texto) });
    case 'jugador': return h('div', { class: 'msg msg-jugador' }, h('span', { class: 'etq' }, 'Tú'), h('p', null, e.texto));
    case 'tirada': return h('div', { class: 'msg msg-tirada ' + (e.exito === true ? 'exito' : e.exito === false ? 'fallo' : '') }, h('span', { class: 'mini-dado', html: svgD20('d20-mini') }), h('span', null, e.texto));
    case 'efectos': return h('div', { class: 'msg msg-efectos' }, e.lineas.map(l => pastilla(l, 'efecto')));
    case 'combate': return h('div', { class: 'msg msg-combate ' + e.resultado }, h('b', null, { victoria: 'Victoria', derrota: 'Derrota', huida: 'Huida' }[e.resultado] || 'Combate'), ' · ', e.texto);
    case 'sistema': return h('p', { class: 'msg msg-sistema' }, e.texto);
  }
  return null;
}

function zonaAccionDM() {
  const dm = estado.dm, hr = estado.heroe;
  const ocupado = dm.cargando;
  const partes = [];
  if (dm.fin === 'victoria') partes.push(h('div', { class: 'tarjeta-pendiente' }, h('div', { class: 'pend-etq' }, 'La aventura ha concluido'), h('p', null, 'Has completado la trama principal. Puedes seguir explorando este mundo o empezar una nueva leyenda.'), h('div', { class: 'fila-botones' }, h('button', { class: 'btn btn-primario', onclick: mostrarVictoriaCampana }, 'Ver epílogo'))));
  if (dm.pendiente && !ocupado) {
    if (dm.pendiente.tipo === 'tirada') partes.push(tarjetaTirada(dm.pendiente.prueba));
    if (dm.pendiente.tipo === 'combate') partes.push(tarjetaCombate(dm.pendiente.def, () => {
      if (!empezarCombate(dm.pendiente.def, 'dm')) { dm.pendiente = null; accionDM('[COMBATE CANCELADO] El motor no pudo crear ese encuentro. Continúa la escena sin combate.', { oculto: true }); }
    }));
  }
  const bloqueado = ocupado || !!dm.pendiente;
  if (!bloqueado && dm.opciones.length) partes.push(h('div', { class: 'opciones' }, dm.opciones.map(o => h('button', { class: 'btn opcion', onclick: () => accionDM(o) }, o))));
  const area = h('textarea', { id: 'dm-entrada', class: 'campo entrada', rows: 2, maxlength: 500, disabled: bloqueado, placeholder: dm.pendiente ? 'Resuelve primero la tirada o el combate.' : '¿Qué haces? Describe tu acción o lo que dices…', oninput: e => { dm.borrador = e.target.value; }, onkeydown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } } }, dm.borrador || '');
  const enviar = () => { const t = (dm.borrador || '').trim(); if (!t || bloqueado) return; accionDM(t); };
  partes.push(h('form', { class: 'form-accion', onsubmit: e => { e.preventDefault(); enviar(); } },
    area,
    ocupado ? h('button', { type: 'button', class: 'btn', onclick: () => detenerDM() }, 'Detener') : h('button', { type: 'submit', class: 'btn btn-primario', disabled: bloqueado }, 'Actuar')));
  partes.push(h('div', { class: 'acciones-rapidas' },
    h('button', { class: 'btn btn-mini', disabled: bloqueado, onclick: () => accionDM('Quiero hacer un descanso corto (una hora) aquí, si es seguro.') }, 'Descanso corto'),
    h('button', { class: 'btn btn-mini', disabled: bloqueado, onclick: () => accionDM('Quiero acampar y hacer un descanso largo (ocho horas), si es seguro.') }, 'Descanso largo'),
    dm.tienda ? h('button', { class: 'btn btn-mini btn-destacado', disabled: ocupado, onclick: () => abrirTienda(dm.tienda, ({ compras, ventas }) => { if (compras.length || ventas.length) dm.notas.push(`En la tienda el héroe ${compras.length ? 'compra ' + compras.join(', ') : ''}${compras.length && ventas.length ? ' y ' : ''}${ventas.length ? 'vende ' + ventas.join(', ') : ''}.`); }) }, 'Abrir tienda') : null,
    hr.inspiracion ? h('span', { class: 'nota' }, '★ Tienes inspiración') : null));
  return h('div', { class: 'dm-accion' }, partes);
}

function tarjetaTirada(p) {
  const d = describirPrueba(p);
  return h('div', { class: 'tarjeta-pendiente tarjeta-tirada' },
    h('div', { class: 'pend-etq' }, 'El DM pide una tirada'),
    h('div', { class: 'tirada-titulo' }, h('b', null, d.etiqueta), h('span', { class: 'tirada-cd' }, 'CD ' + p.cd)),
    p.motivo ? h('p', { class: 'nota' }, p.motivo) : null,
    h('p', { class: 'tirada-calculo' }, `d20 ${signo(d.bono)}${d.guia ? ' + 1d4 (Guía)' : ''}`, d.ventaja && !d.desventaja ? pastilla('Ventaja', 'buena') : null, d.desventaja && !d.ventaja ? pastilla('Desventaja', 'mala') : null, d.fuentes.length ? h('small', null, ' ' + d.fuentes.join(', ')) : null),
    h('button', { class: 'btn btn-primario btn-tirar-d20', onclick: async (ev) => {
      ev.currentTarget.disabled = true;
      const r = await realizarPrueba(p, animarDado);
      estado.dm.vista.push({ tipo: 'tirada', texto: r.texto, exito: r.exito });
      estado.dm.pendiente = null;
      accionDM(`[RESULTADO DE LA TIRADA] ${r.texto}`, { oculto: true });
    } }, h('span', { html: svgD20('d20-boton') }), 'Tirar d20'));
}

async function accionDM(mensaje, op = {}) {
  const dm = estado.dm;
  if (!dm || dm.cargando) return;
  if (!op.oculto) dm.vista.push({ tipo: 'jugador', texto: mensaje });
  dm.opciones = []; dm.borrador = ''; dm.error = null;
  UI.streaming = '';
  const promesa = enviarAlDM(mensaje, txt => { UI.streaming = txt; const el = $('#dm-stream'); if (el) { el.innerHTML = textoEnriquecido(txt); const p = $('.pensando'); if (p) p.remove(); const l = $('#dm-log'); if (l) l.scrollTop = l.scrollHeight; } });
  renderJuego();
  const r = await promesa;
  UI.streaming = '';
  if (r.error && r.error.code === 'cancelled' && !op.oculto) {
    const ult = dm.vista[dm.vista.length - 1];
    if (ult && ult.tipo === 'jugador' && ult.texto === mensaje) { dm.vista.pop(); dm.borrador = mensaje; }
    dm.error = null;
  }
  renderJuego();
  if (r.error) return;
  if (r.descansoCorto) await modalDescansoCorto(lineas => { if (lineas.length) dm.notas.push('Durante el descanso: ' + lineas.join('; ') + '.'); });
  if (r.subida) await flujoSubidaNivel();
  if (dm.fin === 'victoria' && !dm.finMostrado) { dm.finMostrado = true; mostrarVictoriaCampana(); }
  guardar();
}

function reintentarDM() {
  const dm = estado.dm;
  if (!dm.ultimoMensaje) return;
  dm.error = null;
  const m = dm.ultimoMensaje;
  accionDM(m, { oculto: true });
}

async function abrirPermisos() {
  try {
    const perm = window.claude && await window.claude.use('permissions');
    if (perm) { await perm.manage(); reintentarDM(); return; }
  } catch (e) { /* sin panel */ }
  aviso('Abre el menú Permisos del artefacto para permitir el uso de Claude.');
}

// ─── Mazmorra clásica ───
function vistaMazmorra() {
  const mz = estado.mazmorra;
  const piso = pisoActual();
  const narr = mz.narracion.slice(-14);
  const vistos = UI.vistosMz == null ? mz.narracion.length : UI.vistosMz;
  UI.vistosMz = mz.narracion.length;
  const primeroNuevo = narr.length - Math.max(0, Math.min(narr.length, mz.narracion.length - vistos));
  setTimeout(() => { const l = $('#mz-log'); if (l) l.scrollTop = l.scrollHeight; }, 0);
  return h('div', { class: 'vista-mazmorra' },
    h('div', { class: 'escena-cab' },
      h('div', null, h('span', { class: 'etq' }, `Piso ${mz.piso + 1} de ${PISOS.length}`), h('h2', { class: 'escena-lugar' }, piso.nombre))),
    h('div', { class: 'mz-cuerpo' },
      h('div', { class: 'mz-mapa-caja' }, mapaMazmorra(false)),
      h('div', { class: 'mz-sala' },
        h('div', { class: 'mz-log', id: 'mz-log', 'aria-live': 'polite' }, narr.map((n, i) => h('p', { class: 'mz-linea ' + n.clase + (i >= primeroNuevo ? ' msg-nuevo' : ''), html: n.html }))),
        accionesMazmorra())));
}

const ETIQUETA_SALA = { entrada: 'Entrada', jefe: 'Jefe', combate: 'Peligro', evento: 'Suceso', trampa: 'Trampa', tesoro: 'Tesoro', santuario: 'Santuario', mercader: 'Mercader', vacia: 'Sala' };

function mapaMazmorra(mini) {
  const mz = estado.mazmorra;
  const salas = Object.values(mz.salas);
  const actual = salaActual();
  const vecinas = new Set(actual.conexiones);
  const conocidas = new Set();
  salas.forEach(s => { if (s.visitada || mz.mapaRevelado) conocidas.add(s.id); if (s.visitada) s.conexiones.forEach(c => conocidas.add(c)); });
  const celdas = [];
  for (let y = 0; y < MAPA_H; y++) for (let x = 0; x < MAPA_W; x++) {
    const s = salas.find(q => q.x === x && q.y === y);
    if (!s || !conocidas.has(s.id)) { celdas.push(h('div', { class: 'mz-celda vacia' })); continue; }
    const puertas = DIRECCIONES.map(d => { const o = salas.find(q => q.x === x + d.dx && q.y === y + d.dy); return o && s.conexiones.includes(o.id) ? d.nombre : null; }).filter(Boolean);
    const esActual = s.id === actual.id;
    const mover = !mini && vecinas.has(s.id) && puedeMoverse();
    const tipoVisible = s.visitada || (mz.mapaRevelado && s.tipo === 'jefe') ? s.tipo : null;
    const contenido = [h('span', { class: 'mz-etq' }, tipoVisible ? ETIQUETA_SALA[tipoVisible] : '?')];
    if (esActual) contenido.push(h('span', { class: 'mz-ficha', 'aria-label': 'Estás aquí' }));
    const clase = 'mz-celda sala ' + (s.visitada ? 'visitada ' : 'oculta ') + (tipoVisible ? 'tipo-' + tipoVisible + ' ' : '') + (s.resuelta ? 'resuelta ' : '') + (esActual ? 'actual ' : '') + (mover ? 'accesible ' : '') + puertas.map(p => 'p-' + p).join(' ');
    celdas.push(mover
      ? h('button', { class: clase, 'aria-label': `Ir al ${direccionHacia(actual, s)} (${tipoVisible ? ETIQUETA_SALA[tipoVisible] : 'sala desconocida'})`, onclick: () => moverMazmorra(s.id) }, contenido)
      : h('div', { class: clase, title: tipoVisible ? ETIQUETA_SALA[tipoVisible] : 'Sin explorar' }, contenido));
  }
  return h('div', { class: 'mz-mapa' + (mini ? ' mini' : ''), style: { gridTemplateColumns: `repeat(${MAPA_W}, 1fr)` } }, celdas);
}

async function moverMazmorra(id) {
  const r = entrarSala(id);
  if (r && r.tipo === 'combate') estado.mazmorra.pendiente = { tipo: 'combate', def: r.def };
  renderJuego();
  if (r && r.tipo === 'subida' && r.subida) await flujoSubidaNivel();
}

function botonPrueba(texto, prueba, onClick, extra) {
  const info = prueba ? describirPrueba(prueba) : null;
  return h('button', { class: 'btn opcion', onclick: onClick, disabled: extra && extra.deshabilitado },
    h('span', null, texto),
    info ? h('small', null, ` ${info.etiqueta.replace(/^Prueba de |^Salvación de /, m => m.startsWith('S') ? 'Salv. ' : '')} ${signo(info.bono)} · CD ${prueba.cd}`) : null,
    extra && extra.coste ? h('small', null, ` · ${extra.coste} po`) : null);
}

function accionesMazmorra() {
  const mz = estado.mazmorra, hr = estado.heroe, p = mz.pendiente;
  const sala = salaActual();
  const despues = async (r) => {
    renderJuego();
    if (r && r.combate) { mz.pendiente = { tipo: 'combate', def: r.combate }; renderJuego(); }
    if (r && r.subida) await flujoSubidaNivel();
    if (r && r.error) aviso(r.error, 'malo');
    guardar();
  };
  if (p && p.tipo === 'combate') {
    return h('div', { class: 'mz-acciones' }, tarjetaCombate(p.def, () => { mz.pendiente = null; empezarCombate(p.def, 'mazmorra'); }, sala.tipo === 'jefe' || !mz.anterior ? null : () => { mz.pendiente = null; mz.actual = mz.anterior; narrar('Retrocedes en silencio hasta la sala anterior.', 'nota'); renderJuego(); }));
  }
  if (p && p.tipo === 'evento') {
    const ev = EVENTOS.find(e => e.id === p.evento);
    return h('div', { class: 'mz-acciones' }, h('div', { class: 'opciones columna' }, ev.opciones.map((op, i) => botonPrueba(op.texto, op.prueba ? Object.assign({}, op.prueba, { cd: op.prueba.cd + mz.piso }) : null, async () => despues(await resolverOpcionEvento(i, animarDado)), { coste: op.coste, deshabilitado: op.coste && hr.oro < op.coste }))));
  }
  if (p && p.tipo === 'trampa') {
    const busca = bonoHabilidad(hr, 'investigacion') > bonoHabilidad(hr, 'percepcion') ? 'investigacion' : 'percepcion';
    const ops = p.fase === 'detectada'
      ? [botonPrueba('Desactivarla', { tipo: 'habilidad', id: 'juego_manos', cd: p.cd }, async () => despues(await resolverTrampa('desactivar', animarDado))), botonPrueba('Rodearla con cuidado', { tipo: 'habilidad', id: 'acrobacias', cd: p.cd - 2 }, async () => despues(await resolverTrampa('rodear', animarDado)))]
      : [botonPrueba('Buscar trampas', { tipo: 'habilidad', id: busca, cd: p.cd }, async () => despues(await resolverTrampa('buscar', animarDado))), botonPrueba('Avanzar sin más', null, async () => despues(await resolverTrampa('avanzar', animarDado)))];
    return h('div', { class: 'mz-acciones' }, h('div', { class: 'opciones columna' }, ops));
  }
  if (p && p.tipo === 'santuario') {
    return h('div', { class: 'mz-acciones' }, h('div', { class: 'opciones columna' },
      h('button', { class: 'btn opcion', disabled: p.usado, onclick: () => { usarSantuario('descansar'); renderJuego(); } }, p.usado ? 'Ya has descansado aquí' : 'Descanso largo (recuperas todo)'),
      h('button', { class: 'btn opcion', onclick: () => { usarSantuario('rezar'); renderJuego(); } }, 'Rezar ante la llama (elimina condiciones)'),
      h('button', { class: 'btn opcion', onclick: () => { usarSantuario('salir'); renderJuego(); } }, 'Seguir explorando')));
  }
  if (p && p.tipo === 'mercader') {
    return h('div', { class: 'mz-acciones' }, h('div', { class: 'opciones columna' },
      h('button', { class: 'btn btn-primario opcion', onclick: () => abrirTienda(p.stock) }, 'Ver mercancías'),
      h('button', { class: 'btn opcion', onclick: () => { cerrarMercader(); renderJuego(); } }, 'Despedirse y seguir')));
  }
  if (mz.completada) return h('div', { class: 'mz-acciones' }, h('button', { class: 'btn btn-primario', onclick: mostrarVictoriaMazmorra }, 'Ver el final'));
  const vecinas = salasVecinas();
  const botones = vecinas.map(s => h('button', { class: 'btn opcion', disabled: !puedeMoverse(), onclick: () => moverMazmorra(s.id) },
    h('span', null, `Ir al ${direccionHacia(sala, s)}`), h('small', null, ' · ' + (s.visitada ? (s.resuelta ? ETIQUETA_SALA[s.tipo] + ' (explorada)' : ETIQUETA_SALA[s.tipo]) : mz.mapaRevelado && s.tipo === 'jefe' ? 'Jefe' : 'sin explorar'))));
  if (sala.tipo === 'jefe' && sala.resuelta && mz.piso < PISOS.length - 1) botones.unshift(h('button', { class: 'btn btn-primario opcion', onclick: () => { descenderPiso(); renderJuego(); } }, `Descender al piso ${mz.piso + 2}`, h('small', null, ' · descanso largo incluido')));
  return h('div', { class: 'mz-acciones' },
    h('div', { class: 'opciones columna' }, botones),
    h('div', { class: 'acciones-rapidas' },
      h('button', { class: 'btn btn-mini', disabled: mz.descansoCortoUsado || !puedeMoverse(), title: 'Una vez por piso; pueden sorprenderte', onclick: async () => {
        const r = intentarDescansoCorto();
        if (r.combate) { mz.pendiente = { tipo: 'combate', def: r.combate }; renderJuego(); return; }
        if (r.descanso) await modalDescansoCorto();
        renderJuego();
      } }, mz.descansoCortoUsado ? 'Descanso corto usado' : 'Descanso corto')));
}

// ─── Fin de combate, derrota y victoria ───
Hooks.finCombate = (c) => { setTimeout(() => mostrarFinCombate(c), 250); };

function mostrarFinCombate(c) {
  const r = c.resumen;
  if (!r || UI.finMostrado === c.id) return;
  UI.finMostrado = c.id;
  if (r.resultado === 'muerte') { estado.combate = null; mostrarMuerte(); return; }
  const titulos = { victoria: '¡Victoria!', derrota: 'Derrota', huida: 'Has huido' };
  const textos = {
    victoria: `Has vencido en ${r.ronda} asaltos.`,
    derrota: 'Caes inconsciente. Cuando despiertes, las cosas habrán cambiado.',
    huida: 'Pones tierra de por medio. Tus enemigos siguen ahí.',
  };
  abrirModal({
    titulo: titulos[r.resultado], cerrable: false, clase: 'modal-fin-combate ' + r.resultado,
    cuerpo: h('div', null,
      h('p', null, textos[r.resultado]),
      h('div', { class: 'botin' },
        r.px ? pastilla(`+${r.px} PX`, 'efecto') : null,
        r.oro ? pastilla(`+${r.oro} po`, 'efecto') : null,
        r.objetos.map(id => pastilla(OBJETOS[id].nombre, 'efecto'))),
      h('p', { class: 'nota' }, `Te quedan ${estado.heroe.pg}/${estado.heroe.pgMax} PG.`)),
    acciones: [{ texto: 'Continuar', clase: 'btn-primario' }],
  }).then(async () => {
    estado.combate = null;
    UI.modoCombate = null;
    if (estado.modo === 'dm') {
      const dm = estado.dm;
      dm.pendiente = null;
      dm.vista.push({ tipo: 'combate', resultado: r.resultado, texto: `${r.px ? '+' + r.px + ' PX' : ''}${r.oro ? ' · +' + r.oro + ' po' : ''}${r.objetos.length ? ' · ' + r.objetos.map(id => OBJETOS[id].nombre).join(', ') : ''}` });
      render();
      if (puedeSubirNivel(estado.heroe)) await flujoSubidaNivel();
      accionDM(textoResultadoCombate(c), { oculto: true });
    } else {
      resolverCombateMazmorra(r);
      render();
      if (puedeSubirNivel(estado.heroe)) await flujoSubidaNivel();
    }
    guardar();
  });
}

function estadisticasHeroe() {
  const hr = estado.heroe, e = hr.estadisticas;
  return h('ul', { class: 'lista-recursos' },
    h('li', null, h('span', null, 'Nivel alcanzado'), h('b', null, hr.nivel)),
    h('li', null, h('span', null, 'Combates'), h('b', null, e.combates)),
    h('li', null, h('span', null, 'Enemigos derrotados'), h('b', null, e.enemigos)),
    h('li', null, h('span', null, 'Golpes críticos'), h('b', null, e.criticos)),
    h('li', null, h('span', null, 'Oro'), h('b', null, hr.oro + ' po')));
}

function mostrarMuerte() {
  const control = Almacen.leer(CLAVE_CONTROL);
  const hr = estado.heroe;
  hr.muerto = true;
  guardar();
  abrirModal({
    titulo: 'Tu leyenda termina aquí', cerrable: false, clase: 'modal-muerte',
    cuerpo: h('div', null, h('p', { class: 'epitafio' }, `Aquí yace ${hr.nombre}, ${RAZAS[hr.raza].nombre.toLowerCase()} ${CLASES[hr.clase].nombre.toLowerCase()} de nivel ${hr.nivel}.`), estadisticasHeroe()),
    acciones: [
      control ? { texto: 'Volver a antes del combate', clase: 'btn-primario', valor: 'control' } : null,
      { texto: 'Nueva partida', valor: 'nueva' },
    ].filter(Boolean),
  }).then(v => {
    if (v === 'control' && control) { estado = control; estado.combate = null; if (estado.dm) estado.dm.pendiente = estado.dm.pendiente; restaurarPartida(); return; }
    Almacen.borrar(CLAVE_PARTIDA); Almacen.borrar(CLAVE_CONTROL);
    const aj = estado.ajustes; estado = estadoBase(); estado.ajustes = aj; UI.partidaEnMemoria = null;
    render();
  });
}

function mostrarVictoriaCampana() {
  const camp = CAMPANAS[estado.dm.campana] || CAMPANAS.libre;
  abrirModal({
    titulo: 'Fin de la aventura', clase: 'modal-victoria',
    cuerpo: h('div', null, h('p', { class: 'epitafio' }, `«${camp.titulo}» ha llegado a su fin. Los bardos cantarán la historia de ${estado.heroe.nombre}.`), estadisticasHeroe()),
    acciones: [{ texto: 'Seguir jugando', clase: 'btn-primario', valor: 'seguir' }, { texto: 'Volver al título', valor: 'titulo' }],
  }).then(v => {
    if (v === 'titulo') { guardar(); UI.partidaEnMemoria = estado; const aj = estado.ajustes; estado = estadoBase(); estado.ajustes = aj; render(); }
  });
}

function mostrarVictoriaMazmorra() {
  abrirModal({
    titulo: '¡La mazmorra es tuya!', clase: 'modal-victoria',
    cuerpo: h('div', null, h('p', { class: 'epitafio' }, `Ignaxar ha caído y su tesoro es tuyo. ${estado.heroe.nombre} sale a la luz del sol convertido en leyenda.`), estadisticasHeroe()),
    acciones: [{ texto: 'Nueva partida', clase: 'btn-primario', valor: 'nueva' }, { texto: 'Seguir mirando', valor: 'quedarse' }],
  }).then(v => {
    if (v === 'nueva') { Almacen.borrar(CLAVE_PARTIDA); Almacen.borrar(CLAVE_CONTROL); const aj = estado.ajustes; estado = estadoBase(); estado.ajustes = aj; render(); }
  });
}
