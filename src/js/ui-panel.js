// ─── Panel lateral: ficha, equipo, magia, diario y registro de dados ───

function panelLateral() {
  const hr = estado.heroe;
  const tabs = [['ficha', 'Ficha'], ['equipo', 'Equipo'], ['magia', 'Magia'], ['diario', estado.modo === 'dm' ? 'Diario' : 'Mapa'], ['dados', 'Dados']];
  if (UI.vistaMovil !== 'escena') UI.tab = UI.vistaMovil;
  if (UI.tab === 'escena') UI.tab = 'ficha';
  const contenido = { ficha: tabFicha, equipo: tabEquipo, magia: tabMagia, diario: tabDiario, dados: tabDados }[UI.tab] || tabFicha;
  return h('aside', { class: 'panel', 'aria-label': 'Hoja de personaje' },
    h('nav', { class: 'panel-tabs', role: 'tablist' }, tabs.map(([id, t]) => h('button', { role: 'tab', 'aria-selected': UI.tab === id ? 'true' : 'false', class: UI.tab === id ? 'activa' : '', onclick: () => { UI.tab = id; if (UI.vistaMovil !== 'escena') UI.vistaMovil = id; renderJuego(); } }, t))),
    h('div', { class: 'panel-cuerpo' }, contenido(hr)));
}

function tabFicha(hr) {
  const raza = RAZAS[hr.raza], clase = CLASES[hr.clase];
  const recursos = [];
  const r = hr.recursos;
  if (tieneRasgo(hr, 'furia')) recursos.push(['Furia', `${r.furia}/${maxRecurso(hr, 'furia')}`]);
  if (tieneRasgo(hr, 'tomar_aliento')) recursos.push(['Tomar aliento', r.tomarAliento ? 'Listo' : 'Gastado']);
  if (tieneRasgo(hr, 'oleada_accion')) recursos.push(['Oleada de acción', r.oleada ? 'Lista' : 'Gastada']);
  if (tieneRasgo(hr, 'imposicion_manos')) recursos.push(['Imposición de manos', `${r.imposicion} PG`]);
  if (tieneRasgo(hr, 'canalizar_divinidad') || tieneRasgo(hr, 'arma_sagrada')) recursos.push(['Canalizar divinidad', r.canalizar ? 'Lista' : 'Gastada']);
  if (tieneRasgo(hr, 'recuperacion_arcana')) recursos.push(['Recuperación arcana', r.recuperacionArcana ? 'Lista' : 'Gastada']);
  if (raza.aliento) recursos.push(['Arma de aliento', r.aliento ? 'Lista' : 'Gastada']);
  if (raza.aguante) recursos.push(['Aguante incansable', r.aguante ? 'Listo' : 'Gastado']);
  recursos.push(['Dados de golpe', `${hr.dadosGolpe}/${hr.nivel} (d${clase.dado})`]);
  const rasgos = [...raza.rasgos.map(t => ({ nombre: t.nombre, desc: t.desc, origen: raza.nombre })), ...clase.rasgos.filter(t => t.nivel <= hr.nivel && !(t.id === 'estilo_combate' && hr.estilo) && !(t.id === 'enemigo_predilecto' && hr.enemigoPredilecto)).map(t => ({ nombre: t.nombre, desc: t.desc, origen: 'Nv ' + t.nivel }))];
  if (hr.estilo) rasgos.push({ nombre: 'Estilo: ' + ESTILOS_COMBATE[hr.estilo].nombre, desc: ESTILOS_COMBATE[hr.estilo].desc, origen: clase.nombre });
  if (hr.enemigoPredilecto) rasgos.push({ nombre: 'Enemigo predilecto: ' + TIPOS_ENEMIGO_PREDILECTO[hr.enemigoPredilecto], desc: '+2 al daño con armas contra ellos.', origen: clase.nombre });
  if (hr.linaje) rasgos.push({ nombre: 'Linaje ' + LINAJES_DRACONIDOS[hr.linaje].nombre.toLowerCase(), desc: `Aliento y resistencia de ${LINAJES_DRACONIDOS[hr.linaje].danio}.`, origen: raza.nombre });
  (hr.invocaciones || []).forEach(id => rasgos.push({ nombre: INVOCACIONES[id].nombre, desc: INVOCACIONES[id].desc, origen: 'Invocación' }));
  return h('div', { class: 'ficha' },
    h('div', { class: 'ficha-cab' },
      h('div', null, h('div', { class: 'ficha-nombre' }, hr.nombre), h('div', { class: 'ficha-sub' }, `${nombreClaseRaza(hr)} · ${TRASFONDOS[hr.trasfondo].nombre}`))),
    h('div', { class: 'ficha-bloques' },
      bloqueDato('CA', claseArmadura(hr)), bloqueDato('Iniciativa', signo(modCar(hr, 'des'))), bloqueDato('Velocidad', metros(velocidad(hr))), bloqueDato('Competencia', signo(competencia(hr))), bloqueDato('Percepción pasiva', percepcionPasiva(hr))),
    h('div', { class: 'ficha-car' }, CARACTERISTICAS.map(c => h('div', { class: 'car-caja' },
      h('span', { class: 'etq' }, c.abrev), h('b', null, signo(modCar(hr, c.id))), h('small', null, valorCar(hr, c.id)),
      h('span', { class: 'car-salv' + (clase.salvaciones.includes(c.id) ? ' comp' : ''), title: 'Salvación de ' + c.nombre }, 'Salv. ' + signo(bonoSalvacion(hr, c.id)))))),
    (hr.condiciones || []).length ? h('div', { class: 'ficha-condiciones' }, hr.condiciones.map(cn => pastilla((CONDICIONES[cn.id] || { nombre: cn.id }).nombre, 'mala'))) : null,
    titulo2('Habilidades'),
    h('ul', { class: 'lista-habilidades' }, Object.entries(HABILIDADES).map(([id, hb]) => {
      const comp = hr.habilidades.includes(id), peri = hr.pericia.includes(id);
      return h('li', { class: comp ? 'comp' : '' }, h('span', { class: 'marca', 'aria-label': peri ? 'pericia' : comp ? 'competente' : 'sin competencia' }, peri ? '◆' : comp ? '●' : '○'), h('span', { class: 'hab-nombre' }, hb.nombre, h('small', null, ' ' + ABREV_CAR[hb.car])), h('b', null, signo(bonoHabilidad(hr, id))));
    })),
    titulo2('Recursos'),
    h('ul', { class: 'lista-recursos' }, recursos.map(([n, v]) => h('li', null, h('span', null, n), h('b', null, v)))),
    titulo2('Rasgos'),
    h('div', { class: 'lista-detalles' }, rasgos.map(t => h('details', null, h('summary', null, t.nombre, h('small', null, ' · ' + t.origen)), h('p', null, t.desc)))),
    titulo2('Hazañas'),
    h('ul', { class: 'lista-recursos' },
      h('li', null, h('span', null, 'Enemigos derrotados'), h('b', null, hr.estadisticas.enemigos)),
      h('li', null, h('span', null, 'Golpes críticos'), h('b', null, hr.estadisticas.criticos)),
      h('li', null, h('span', null, 'Daño causado'), h('b', null, hr.estadisticas.danioHecho)),
      h('li', null, h('span', null, 'Daño recibido'), h('b', null, hr.estadisticas.danioRecibido))));
}

function bloqueDato(etq, valor) { return h('div', { class: 'bloque-dato' }, h('span', { class: 'etq' }, etq), h('b', null, valor)); }

function puedeActuarFueraCombate() { return !estado.combate && !(estado.dm && estado.dm.cargando); }

function tabEquipo(hr) {
  const fuera = puedeActuarFueraCombate();
  const grupos = { arma: 'Armas', armadura: 'Armaduras', escudo: 'Armaduras', magico: 'Objetos mágicos', varita: 'Objetos mágicos', consumible: 'Consumibles', pergamino: 'Consumibles', util: 'Equipo', narrativo: 'Objetos de la historia' };
  const orden = ['Armas', 'Armaduras', 'Objetos mágicos', 'Consumibles', 'Equipo', 'Objetos de la historia'];
  const porGrupo = {};
  for (const it of hr.inventario) {
    const o = OBJETOS[it.id];
    const g = grupos[o ? o.tipo : 'narrativo'] || 'Equipo';
    (porGrupo[g] = porGrupo[g] || []).push(it);
  }
  const armas = ataquesDisponibles(hr);
  return h('div', { class: 'equipo' },
    h('div', { class: 'ficha-bloques' }, bloqueDato('Oro', hr.oro + ' po'), bloqueDato('CA', claseArmadura(hr))),
    titulo2('Ataques'),
    h('ul', { class: 'lista-ataques' }, armas.map(a => h('li', null, h('b', null, a.nombre), h('span', null, `${signo(a.bono)} al ataque`), h('span', null, `${a.dados}${a.modDanio ? signo(a.modDanio) : ''} ${a.tipo}${a.extra ? ' +' + a.extra + ' ' + a.tipoExtra : ''}`), h('small', null, a.aDistancia ? `Distancia ${metros(a.distancia[0])}/${metros(a.distancia[1])}` : a.arrojadiza ? `Cuerpo a cuerpo o arrojadiza (${metros(a.distancia[0])})` : 'Cuerpo a cuerpo')))),
    orden.filter(g => porGrupo[g]).map(g => h('div', null,
      titulo2(g),
      h('ul', { class: 'lista-objetos' }, porGrupo[g].map(it => filaObjeto(hr, it, fuera))))));
}

function filaObjeto(hr, it, fuera) {
  const o = OBJETOS[it.id];
  const acciones = [];
  if (o && ['arma', 'armadura', 'escudo', 'magico'].includes(o.tipo)) {
    const sinComp = (o.tipo === 'armadura' || o.tipo === 'escudo') && !competenteArmadura(hr, o);
    acciones.push(h('button', { class: 'btn btn-mini' + (it.equipado ? ' activo' : ''), disabled: !fuera, title: sinComp ? 'No tienes competencia con esta armadura' : '', onclick: () => {
      equiparObjeto(hr, it.uid, !it.equipado);
      if (estado.dm && estado.modo === 'dm') estado.dm.notas.push(`El héroe ${it.equipado ? 'se equipa' : 'se quita'} ${o.nombre}.`);
      renderJuego();
    } }, it.equipado ? 'Equipado' : 'Equipar'));
  }
  if (o && o.tipo === 'consumible' && o.efecto !== 'arrojar') acciones.push(h('button', { class: 'btn btn-mini', disabled: !fuera, onclick: () => { const r = aplicarConsumible(it); aviso(r.texto, 'bueno'); if (estado.modo === 'dm' && estado.dm) estado.dm.notas.push(`${r.texto.replace(/^Usas/, 'El héroe usa')}`); renderJuego(); } }, 'Usar'));
  if (o && (o.tipo === 'pergamino' || o.tipo === 'varita')) {
    const cj = CONJUROS[o.conjuro];
    const fueraOk = ['curacion'].includes(cj.modo);
    acciones.push(h('button', { class: 'btn btn-mini', disabled: !fuera || !fueraOk || (o.tipo === 'varita' && !it.cargas), title: fueraOk ? '' : 'Úsalo en combate', onclick: async () => { const r = await lanzarConjuro(o.conjuro, o.nivelConjuro || cj.nivel, null, { gratis: true }); if (o.tipo === 'pergamino') quitarObjeto(hr, it.uid, 1); else it.cargas--; aviso(r.texto || 'Hecho.', 'bueno'); renderJuego(); } }, 'Usar'));
  }
  const nombre = nombreObjeto(it) + (it.cantidad > 1 ? ' ×' + it.cantidad : '') + (o && o.tipo === 'varita' ? ` (${it.cargas || 0} cargas)` : '');
  const desc = o ? (o.desc || describirObjeto(o)) : it.descripcion;
  return h('li', { class: 'fila-objeto' + (it.equipado ? ' equipado' : '') },
    h('div', { class: 'objeto-info' }, h('b', null, nombre), desc ? h('small', null, desc) : null),
    h('div', { class: 'objeto-acciones' }, acciones,
      h('button', { class: 'btn-icono btn-tirar', 'aria-label': 'Tirar ' + nombreObjeto(it), title: 'Tirar', disabled: !fuera, onclick: async () => { if (await confirmar('Tirar objeto', `¿Tiras ${nombreObjeto(it)}? Lo perderás.`, 'Tirar')) { quitarObjeto(hr, it.uid, it.cantidad); renderJuego(); } } }, '✕')));
}

function describirObjeto(o) {
  if (o.tipo === 'arma') return `${o.danio}${o.versatil ? ' (' + o.versatil + ' a dos manos)' : ''} ${o.tipoDanio}${o.magico ? ', +' + o.magico : ''}${(o.props || []).length ? ' · ' + o.props.map(p => ({ sutil: 'sutil', ligera: 'ligera', arrojadiza: 'arrojadiza', versatil: 'versátil', pesada: 'pesada', dos_manos: 'a dos manos', a_distancia: 'a distancia' }[p])).join(', ') : ''}`;
  if (o.tipo === 'armadura') return `CA ${o.ca}${o.desMax >= 99 ? ' + DES' : o.desMax > 0 ? ' + DES (máx. 2)' : ''} · ${o.armadura}${o.fuerzaMin ? ' · FUE ' + o.fuerzaMin : ''}${o.sigiloDesv ? ' · desventaja en Sigilo' : ''}`;
  if (o.tipo === 'escudo') return `+${o.ca} CA`;
  return '';
}

function tabMagia(hr) {
  const fuera = puedeActuarFueraCombate();
  const tot = espaciosTotales(hr), lib = espaciosLibres(hr);
  const lista = conjurosDisponibles(hr);
  const conc = hr.efectos.concentracion;
  const porNivel = {};
  lista.forEach(id => { const n = CONJUROS[conjuroBase(id)].nivel; (porNivel[n] = porNivel[n] || []).push(id); });
  const pergaminos = hr.inventario.filter(i => OBJETOS[i.id] && ['pergamino', 'varita'].includes(OBJETOS[i.id].tipo));
  if (!lista.length && !pergaminos.length) return h('p', { class: 'nota' }, 'Tu clase no lanza conjuros. Aquí aparecerán los pergaminos y varitas que encuentres.');
  return h('div', { class: 'magia' },
    estado.modo !== 'dm' && lista.some(id => CONJUROS[conjuroBase(id)].modo === 'narrativo') ? h('p', { class: 'nota' }, 'Los conjuros de utilidad solo tienen efecto en una campaña con DM.') : null,
    carLanzamiento(hr) ? h('div', { class: 'ficha-bloques' }, bloqueDato('CD de conjuros', cdConjuro(hr)), bloqueDato('Ataque de conjuro', signo(bonoAtaqueConjuro(hr))), bloqueDato('Característica', ABREV_CAR[carLanzamiento(hr)])) : null,
    tot.some(n => n) ? h('div', { class: 'espacios' }, tot.map((n, i) => n ? h('div', { class: 'espacio-nivel' }, h('span', { class: 'etq' }, `Nivel ${i + 1}`), h('span', { class: 'pips' }, Array.from({ length: n }, (_, k) => h('i', { class: k < lib[i] ? 'lleno' : 'vacio' })))) : null)) : null,
    conc ? h('p', { class: 'nota' }, 'Concentrándote en: ', h('b', null, CONJUROS[conc.conjuro].nombre)) : null,
    tieneRasgo(hr, 'recuperacion_arcana') ? h('p', { class: 'nota' }, hr.recursos.recuperacionArcana ? 'Recuperación arcana disponible en tu próximo descanso corto.' : 'Ya usaste la recuperación arcana hoy.') : null,
    hr.efectos.armaduraMago ? h('p', { class: 'nota' }, 'Armadura de mago activa.') : null,
    Object.keys(porNivel).sort().map(n => h('div', null,
      titulo2(n === '0' ? 'Trucos' : `Nivel ${n}`),
      h('ul', { class: 'lista-conjuros' }, porNivel[n].map(id => {
        const info = infoLanzamiento(id, false);
        const cj = info.cj;
        const lanzable = fuera && !info.motivo && info.niveles.length && !(cj.modo === 'narrativo' && estado.modo !== 'dm');
        return h('li', null,
          h('details', null, h('summary', null, h('b', null, cj.nombre), h('small', null, [ { accion: 'Acción', adicional: 'Adicional', reaccion: 'Reacción' }[cj.tiempo], cj.concentracion ? 'Concentración' : null, cj.ritual ? 'Ritual' : null, id.endsWith('@raza') ? 'Legado tiefling' : null].filter(Boolean).join(' · '))), h('p', null, cj.desc)),
          lanzable && !cj.pasivo ? h('button', { class: 'btn btn-mini', onclick: () => lanzarFueraCombate(id, info) }, cj.ritual && ['mago', 'clerigo'].includes(hr.clase) ? 'Ritual' : 'Lanzar') : null);
      })))),
    pergaminos.length ? h('div', null, titulo2('Pergaminos y varitas'), h('ul', { class: 'lista-objetos' }, pergaminos.map(it => filaObjeto(hr, it, fuera)))) : null);
}

async function lanzarFueraCombate(id, info) {
  const hr = estado.heroe;
  let nivel = info.niveles[0];
  if (info.niveles.length > 1 && info.cj.nivel > 0) {
    nivel = await abrirModal({ titulo: info.cj.nombre, cuerpo: h('p', null, '¿Con qué espacio lo lanzas?'), acciones: info.niveles.map(n => ({ texto: `Nivel ${n}`, valor: n })) });
    if (!nivel) return;
  }
  const r = await lanzarConjuro(id, nivel, null, {});
  if (r && r.error) { aviso(r.error, 'malo'); return; }
  if (estado.modo === 'dm' && estado.dm) {
    if (r.narrativo) { UI.vistaMovil = 'escena'; accionDM(`Lanzo el conjuro ${info.cj.nombre}.`); return; }
    estado.dm.notas.push(`El héroe lanza ${info.cj.nombre}. ${r.texto || ''}`.trim());
  }
  aviso(r.texto || `Lanzas ${info.cj.nombre}.`, 'bueno');
  renderJuego();
}

function tabDiario() {
  if (estado.modo === 'dm' && estado.dm) {
    const dm = estado.dm, camp = CAMPANAS[dm.campana] || CAMPANAS.libre;
    return h('div', { class: 'diario' },
      h('div', { class: 'diario-campana' }, h('span', { class: 'etq' }, 'Campaña'), h('b', null, camp.titulo)),
      dm.mision ? h('div', { class: 'diario-mision' }, h('span', { class: 'etq' }, 'Misión actual'), h('p', null, dm.mision)) : null,
      dm.lugar ? h('div', { class: 'diario-mision' }, h('span', { class: 'etq' }, 'Lugar'), h('p', null, dm.lugar)) : null,
      titulo2('Notas del viaje'),
      dm.diario.length ? h('ol', { class: 'lista-diario' }, dm.diario.map(d => h('li', null, d))) : h('p', { class: 'nota' }, 'El DM anotará aquí los nombres, pistas y promesas importantes.'));
  }
  const mz = estado.mazmorra;
  if (!mz) return h('p', null, '—');
  const piso = PISOS[mz.piso];
  return h('div', { class: 'diario' },
    h('div', { class: 'diario-campana' }, h('span', { class: 'etq' }, `Piso ${mz.piso + 1} de ${PISOS.length}`), h('b', null, piso.nombre)),
    mapaMazmorra(true),
    h('p', { class: 'nota' }, mz.mapaRevelado ? 'Conoces la distribución completa de este piso.' : 'Las salas aparecen en el mapa a medida que las descubres.'));
}

function tabDados() {
  const lanzar = (caras) => { const v = dado(caras); registrarTirada(`d${caras}: ${v}`, ''); renderJuego(); };
  return h('div', { class: 'dados' },
    titulo2('Tirar dados'),
    h('div', { class: 'fila-dados' }, [4, 6, 8, 10, 12, 20, 100].map(c => h('button', { class: 'btn dado-btn', onclick: () => lanzar(c) }, 'd' + c))),
    titulo2('Registro de tiradas'),
    (estado.registro || []).length ? h('ul', { class: 'registro' }, estado.registro.map(r => h('li', { class: r.clase }, r.texto))) : h('p', { class: 'nota' }, 'Aquí aparecerán tus pruebas de característica y salvaciones.'));
}

// ─── Subida de nivel ───
async function flujoSubidaNivel() {
  const hr = estado.heroe;
  while (puedeSubirNivel(hr)) {
    const ok = await modalSubidaNivel(hr);
    if (!ok) break;
  }
  renderJuego();
}

function modalSubidaNivel(hr) {
  const nuevo = hr.nivel + 1;
  const clase = CLASES[hr.clase];
  const eleccion = { pg: 'media', mejora: null, trucos: [], conjuros: [], invocaciones: [], estilo: null };
  const rasgos = clase.rasgos.filter(r => r.nivel === nuevo);
  const l = clase.lanzamiento;
  // Cuántos trucos y conjuros nuevos
  const hrSim = JSON.parse(JSON.stringify(hr)); hrSim.nivel = nuevo;
  const trucosNuevos = Math.max(0, cuantosTrucos(hrSim) - hr.trucos.length);
  const conjNuevos = l && l.tipo === 'conocidos' ? Math.max(0, cuantosConjurosConocidos(hrSim) - hr.conjuros.length) : 0;
  const maxNivelConj = nivelMaxConjuro(hrSim);
  const opcionesConj = l && l.tipo === 'conocidos' ? Object.keys(CONJUROS).filter(id => CONJUROS[id].clases.includes(hr.clase) && CONJUROS[id].nivel > 0 && CONJUROS[id].nivel <= maxNivelConj && !hr.conjuros.includes(id)) : [];
  const opcionesTr = opcionesTrucos(hrSim).filter(id => !hr.trucos.includes(id));
  const necesitaEstilo = clase.estilos && clase.estiloNivel === nuevo && !hr.estilo;
  const necesitaInv = hr.clase === 'brujo' && nuevo === 2;
  const asi = rasgos.some(r => r.id === 'mejora_caracteristica');
  let mejoraModo = '+2';
  let mejoraA = null, mejoraB = null;
  const pgMedia = Math.floor(clase.dado / 2) + 1;
  let pgTirado = null;
  const conMod = modCar(hr, 'con');

  return new Promise(resolver => {
    const valido = () => (!necesitaEstilo || eleccion.estilo) && eleccion.trucos.length === Math.min(trucosNuevos, opcionesTr.length) && eleccion.conjuros.length === Math.min(conjNuevos, opcionesConj.length) && (!necesitaInv || eleccion.invocaciones.length === 2) && (!asi || (mejoraModo === '+2' ? mejoraA : mejoraA && mejoraB && mejoraA !== mejoraB));
    const pintar = () => {
      const capa = $('#capa-modal .modal-cuerpo');
      if (!capa) return;
      vaciar(capa).append(cuerpo());
      const b = $('#capa-modal .modal-pie .btn-primario'); if (b) b.disabled = !valido();
    };
    const alternar = (lista, id, max) => { const i = lista.indexOf(id); if (i >= 0) lista.splice(i, 1); else if (lista.length < max) lista.push(id); pintar(); };
    const cuerpo = () => h('div', { class: 'subida' },
      h('p', { class: 'subida-titular' }, `¡${hr.nombre} alcanza el nivel ${nuevo}!`),
      h('div', { class: 'detalle' },
        h('h3', null, 'Puntos de golpe'),
        h('div', { class: 'fila-botones' },
          h('button', { class: 'btn' + (eleccion.pg === 'media' ? ' activo' : ''), onclick: () => { eleccion.pg = 'media'; pintar(); } }, `Media: ${pgMedia} ${signo(conMod)} = ${Math.max(1, pgMedia + conMod)} PG`),
          h('button', { class: 'btn' + (typeof eleccion.pg === 'number' ? ' activo' : ''), disabled: pgTirado !== null, onclick: () => { pgTirado = dado(clase.dado); eleccion.pg = pgTirado; registrarTirada(`Subida de nivel: d${clase.dado} = ${pgTirado}`, ''); pintar(); } }, pgTirado !== null ? `Tirada: ${pgTirado} ${signo(conMod)} = ${Math.max(1, pgTirado + conMod)} PG` : `Tirar d${clase.dado}`))),
      rasgos.length ? h('div', { class: 'detalle' }, h('h3', null, 'Nuevos rasgos'), h('ul', { class: 'lista-rasgos' }, rasgos.map(t => h('li', null, h('b', null, t.nombre + '. '), t.desc)))) : null,
      nuevo === 5 ? h('p', { class: 'nota' }, 'Tu bono de competencia sube a +3.') : null,
      espaciosTotales(hrSim).some((n, i) => n > espaciosTotales(hr)[i]) ? h('p', { class: 'nota' }, 'Espacios de conjuro: ' + espaciosTotales(hrSim).map((n, i) => n ? `nivel ${i + 1}: ${n}` : null).filter(Boolean).join(', ') + '.') : null,
      asi ? h('div', { class: 'detalle' },
        h('h3', null, 'Mejora de característica'),
        h('div', { class: 'segmentado' }, [['+2', '+2 a una'], ['+1', '+1 a dos']].map(([m, t]) => h('button', { class: mejoraModo === m ? 'activa' : '', onclick: () => { mejoraModo = m; mejoraA = null; mejoraB = null; pintar(); } }, t))),
        h('div', { class: 'fila-botones envolver' }, CARACTERISTICAS.map(c => {
          const v = hr.base[c.id];
          const sel = mejoraA === c.id || mejoraB === c.id;
          const max = mejoraModo === '+2' ? v + 2 > 20 : v + 1 > 20;
          return h('button', { class: 'btn btn-mini' + (sel ? ' activo' : ''), disabled: max && !sel, onclick: () => {
            if (mejoraModo === '+2') mejoraA = sel ? null : c.id;
            else if (sel) { if (mejoraA === c.id) mejoraA = mejoraB, mejoraB = null; else mejoraB = null; }
            else if (!mejoraA) mejoraA = c.id; else if (!mejoraB) mejoraB = c.id; else { mejoraA = mejoraB; mejoraB = c.id; }
            pintar();
          } }, `${c.abrev} ${v}`);
        }))) : null,
      necesitaEstilo ? h('div', { class: 'detalle' }, h('h3', null, 'Estilo de combate'), h('div', { class: 'rejilla-tarjetas compacta' }, clase.estilos.map(id => tarjetaSeleccion(eleccion.estilo === id, () => { eleccion.estilo = id; pintar(); }, h('span', { class: 'tarjeta-titulo' }, ESTILOS_COMBATE[id].nombre), h('span', { class: 'tarjeta-desc' }, ESTILOS_COMBATE[id].desc))))) : null,
      necesitaInv ? h('div', { class: 'detalle' }, h('h3', null, `Invocaciones (${eleccion.invocaciones.length}/2)`), h('div', { class: 'rejilla-tarjetas compacta' }, Object.entries(INVOCACIONES).map(([id, inv]) => tarjetaSeleccion(eleccion.invocaciones.includes(id), () => alternar(eleccion.invocaciones, id, 2), h('span', { class: 'tarjeta-titulo' }, inv.nombre), h('span', { class: 'tarjeta-desc' }, inv.desc))))) : null,
      trucosNuevos && opcionesTr.length ? h('div', { class: 'detalle' }, h('h3', null, `Nuevos trucos (${eleccion.trucos.length}/${Math.min(trucosNuevos, opcionesTr.length)})`), h('div', { class: 'rejilla-tarjetas compacta' }, opcionesTr.map(id => tarjetaConjuro(id, eleccion.trucos.includes(id), eleccion.trucos.length >= trucosNuevos, () => alternar(eleccion.trucos, id, trucosNuevos))))) : null,
      conjNuevos && opcionesConj.length ? h('div', { class: 'detalle' }, h('h3', null, `Nuevos conjuros (${eleccion.conjuros.length}/${Math.min(conjNuevos, opcionesConj.length)})`), h('div', { class: 'rejilla-tarjetas compacta' }, opcionesConj.map(id => tarjetaConjuro(id, eleccion.conjuros.includes(id), eleccion.conjuros.length >= conjNuevos, () => alternar(eleccion.conjuros, id, conjNuevos))))) : null);
    abrirModal({
      titulo: `Nivel ${nuevo}`, cerrable: false, clase: 'modal-ancho', cuerpo: cuerpo(),
      acciones: [{ texto: 'Subir de nivel', clase: 'btn-primario', deshabilitado: !valido(), onClick: () => {
        if (!valido()) return false;
        if (asi) eleccion.mejora = mejoraModo === '+2' ? { [mejoraA]: 2 } : { [mejoraA]: 1, [mejoraB]: 1 };
        subirNivel(hr, eleccion);
        if (estado.modo === 'dm' && estado.dm) estado.dm.notas.push(`El héroe ha subido a nivel ${hr.nivel}.`);
        aviso(`¡Nivel ${hr.nivel}!`, 'critico');
        guardar();
        return true;
      } }],
    }).then(v => resolver(!!v));
  });
}

// ─── Tienda ───
function abrirTienda(stock, alCerrar) {
  const hr = estado.heroe;
  const compras = [], ventas = [];
  let pestana = 'comprar';
  const pintar = () => { const c = $('#capa-modal .modal-cuerpo'); if (c) vaciar(c).append(cuerpo()); };
  const cuerpo = () => h('div', { class: 'tienda' },
    h('div', { class: 'tienda-cab' }, h('div', { class: 'segmentado' }, [['comprar', 'Comprar'], ['vender', 'Vender']].map(([id, t]) => h('button', { class: pestana === id ? 'activa' : '', onclick: () => { pestana = id; pintar(); } }, t))), h('span', { class: 'tienda-oro' }, h('b', null, hr.oro), ' po')),
    pestana === 'comprar'
      ? h('ul', { class: 'lista-tienda' }, stock.filter(id => OBJETOS[id]).map(id => {
        const o = OBJETOS[id];
        return h('li', null, h('div', { class: 'objeto-info' }, h('b', null, o.nombre), h('small', null, o.desc || describirObjeto(o))), h('span', { class: 'precio' }, o.precio + ' po'),
          h('button', { class: 'btn btn-mini', disabled: hr.oro < o.precio, onclick: () => { hr.oro -= o.precio; anadirObjeto(hr, id, 1); compras.push(o.nombre); aviso(`Compras ${o.nombre}.`, 'bueno'); pintar(); } }, 'Comprar'));
      }))
      : h('ul', { class: 'lista-tienda' }, hr.inventario.filter(it => OBJETOS[it.id] && OBJETOS[it.id].precio > 1).map(it => {
        const o = OBJETOS[it.id], p = precioVenta(it.id);
        return h('li', null, h('div', { class: 'objeto-info' }, h('b', null, o.nombre + (it.cantidad > 1 ? ' ×' + it.cantidad : '')), h('small', null, it.equipado ? 'Equipado' : '')), h('span', { class: 'precio' }, p + ' po'),
          h('button', { class: 'btn btn-mini', disabled: it.equipado, title: it.equipado ? 'Quítatelo antes de venderlo' : '', onclick: () => { hr.oro += p; quitarObjeto(hr, it.uid, 1); ventas.push(o.nombre); aviso(`Vendes ${o.nombre} por ${p} po.`); pintar(); } }, 'Vender'));
      })));
  return abrirModal({ titulo: 'Mercader', cuerpo: cuerpo(), clase: 'modal-ancho', acciones: [{ texto: 'Terminar', clase: 'btn-primario' }] }).then(() => {
    if (alCerrar) alCerrar({ compras, ventas });
    renderJuego();
  });
}

// ─── Descanso corto: gastar dados de golpe ───
function modalDescansoCorto(alTerminar) {
  const hr = estado.heroe;
  const lineas = [];
  // Recuperación arcana automática: recupera los espacios más altos posibles
  if (tieneRasgo(hr, 'recuperacion_arcana') && hr.recursos.recuperacionArcana) {
    let presupuesto = Math.ceil(hr.nivel / 2); const rec = [];
    for (let n = Math.min(presupuesto, 5); n >= 1; n--) while (presupuesto >= n && (hr.espaciosUsados[n - 1] || 0) > 0) { hr.espaciosUsados[n - 1]--; presupuesto -= n; rec.push(n); }
    if (rec.length) { hr.recursos.recuperacionArcana = 0; lineas.push(`Recuperación arcana: recuperas espacios de nivel ${rec.join(', ')}.`); }
  }
  const pintar = () => { const c = $('#capa-modal .modal-cuerpo'); if (c) vaciar(c).append(cuerpo()); };
  const cuerpo = () => h('div', null,
    h('p', null, 'Descansas una hora. Puedes gastar dados de golpe para recuperar puntos de golpe.'),
    h('div', { class: 'ficha-bloques' }, bloqueDato('PG', `${hr.pg}/${hr.pgMax}`), bloqueDato('Dados de golpe', `${hr.dadosGolpe} × d${CLASES[hr.clase].dado}`)),
    h('div', { class: 'fila-botones' }, h('button', { class: 'btn btn-primario', disabled: hr.dadosGolpe <= 0 || hr.pg >= hr.pgMax, onclick: () => { const r = gastarDadoGolpe(hr); if (r) { lineas.push(`Dado de golpe: ${r.tirada.texto} ${signo(modCar(hr, 'con'))} → +${r.cura} PG`); registrarTirada(`Dado de golpe: +${r.cura} PG`, 'bueno'); } pintar(); } }, `Gastar un dado de golpe (d${CLASES[hr.clase].dado} ${signo(modCar(hr, 'con'))})`)),
    lineas.length ? h('ul', { class: 'registro' }, lineas.map(l => h('li', null, l))) : null);
  return abrirModal({ titulo: 'Descanso corto', cuerpo: cuerpo(), acciones: [{ texto: 'Terminar el descanso', clase: 'btn-primario' }] }).then(() => { if (alTerminar) alTerminar(lineas); renderJuego(); });
}
