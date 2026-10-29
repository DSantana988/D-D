// ─── Modelo del héroe: estadísticas derivadas, descansos, nivel e inventario ───

function crearHeroe(op) {
  // op: {nombre, raza, clase, trasfondo, base:{fue..}, habilidades:[], pericia:[], estilo, enemigoPredilecto, linaje, trucos:[], conjuros:[]}
  const raza = RAZAS[op.raza], clase = CLASES[op.clase], tras = TRASFONDOS[op.trasfondo];
  const base = {};
  for (const c of CARACTERISTICAS) base[c.id] = (op.base[c.id] || 10) + ((raza.bonos || {})[c.id] || 0);
  const habilidades = new Set([...(op.habilidades || []), ...(tras ? tras.habilidades : []), ...(raza.habilidades || [])]);
  const heroe = {
    nombre: op.nombre || 'Sin nombre', raza: op.raza, clase: op.clase, trasfondo: op.trasfondo,
    nivel: 1, px: 0, base,
    habilidades: Array.from(habilidades), pericia: op.pericia || [],
    estilo: op.estilo || null, enemigoPredilecto: op.enemigoPredilecto || null, linaje: op.linaje || null,
    invocaciones: [], trucos: op.trucos || [], conjuros: op.conjuros || [],
    pg: 0, pgMax: 0, pgTemp: 0, dadosGolpe: 1,
    espaciosUsados: [0, 0, 0, 0],
    recursos: {},
    inventario: [], oro: (tras ? tras.oro : 10) + 10,
    condiciones: [], efectos: {}, inspiracion: true,
    muerte: { exitos: 0, fallos: 0 }, caido: false, muerto: false,
    estadisticas: { enemigos: 0, criticos: 0, danioHecho: 0, danioRecibido: 0, combates: 0 },
  };
  for (const id of equipoInicial(op.clase, op.estilo)) anadirObjeto(heroe, id, 1, true);
  heroe.pgMax = calcularPgMax(heroe);
  heroe.pg = heroe.pgMax;
  reiniciarRecursos(heroe, 'largo');
  return heroe;
}

function calcularPgMax(heroe) {
  const clase = CLASES[heroe.clase], raza = RAZAS[heroe.raza];
  const conMod = modificador(valorCar(heroe, 'con'));
  const dif = DIFICULTADES[(typeof estado !== 'undefined' && estado && estado.ajustes && estado.ajustes.dificultad) || 'normal'] || DIFICULTADES.normal;
  // Nivel 1: dado máximo; después, la media (o lo tirado al subir de nivel, guardado en pgSubidas)
  let pg = clase.dado + conMod;
  const subidas = heroe.pgSubidas || [];
  for (let n = 2; n <= heroe.nivel; n++) pg += Math.max(1, (subidas[n] != null ? subidas[n] : Math.floor(clase.dado / 2) + 1) + conMod);
  pg += (raza.pgPorNivel || 0) * heroe.nivel;
  pg += dif.pgExtraNivel * heroe.nivel;
  pg += heroe.efectos.auxilio || 0;
  return Math.max(1, pg);
}

function recalcularPg(heroe) {
  const antes = heroe.pgMax;
  heroe.pgMax = calcularPgMax(heroe);
  if (heroe.pgMax > antes) heroe.pg += heroe.pgMax - antes;
  heroe.pg = Math.min(heroe.pg, heroe.pgMax);
}

function objetosEquipados(heroe) { return heroe.inventario.filter(i => i.equipado && OBJETOS[i.id]); }

function valorCar(heroe, car) {
  let v = heroe.base[car];
  for (const it of objetosEquipados(heroe)) {
    const o = OBJETOS[it.id];
    if (o.fijaCar && o.fijaCar[car]) v = Math.max(v, o.fijaCar[car]);
  }
  if (car === 'fue' && heroe.efectos.fuerzaGigante) v = Math.max(v, 21);
  return v;
}
function modCar(heroe, car) { return modificador(valorCar(heroe, car)); }
function competencia(heroe) { return bonoCompetencia(heroe.nivel); }
function tieneRasgo(heroe, id) { return CLASES[heroe.clase].rasgos.some(r => r.id === id && r.nivel <= heroe.nivel); }

function armaduraEquipada(heroe) { const it = heroe.inventario.find(i => i.equipado && OBJETOS[i.id] && OBJETOS[i.id].tipo === 'armadura'); return it ? OBJETOS[it.id] : null; }
function escudoEquipado(heroe) { const it = heroe.inventario.find(i => i.equipado && OBJETOS[i.id] && OBJETOS[i.id].tipo === 'escudo'); return it ? OBJETOS[it.id] : null; }

function competenteArmadura(heroe, obj) {
  const c = CLASES[heroe.clase];
  if (obj.tipo === 'escudo') return c.armaduras.includes('escudo');
  return c.armaduras.includes(obj.armadura);
}
function competenteArma(heroe, obj) {
  const c = CLASES[heroe.clase];
  return c.armas.includes(obj.categoria) || c.armas.includes(obj.base || '') || c.armas.includes(Object.keys(OBJETOS).find(k => OBJETOS[k] === obj));
}

function claseArmadura(heroe, opciones = {}) {
  const arm = armaduraEquipada(heroe), esc = escudoEquipado(heroe);
  const des = modCar(heroe, 'des');
  let ca;
  if (arm) {
    ca = arm.ca + Math.min(des, arm.desMax);
    if (heroe.estilo === 'defensa') ca += 1;
  } else if (tieneRasgo(heroe, 'defensa_sin_armadura')) {
    ca = 10 + des + modCar(heroe, 'con');
  } else if (heroe.efectos.armaduraMago || (heroe.invocaciones || []).includes('armadura_sombras')) {
    ca = 13 + des;
  } else {
    ca = 10 + des;
  }
  if (esc) ca += esc.ca;
  for (const it of objetosEquipados(heroe)) {
    const o = OBJETOS[it.id];
    if (o.bonoCA) ca += o.bonoCA;
    if (o.bonoCASinArmadura && !arm && !esc) ca += o.bonoCASinArmadura;
  }
  if (opciones.combate !== false) {
    if (heroe.efectos.escudoFe) ca += 2;
    if (heroe.efectos.escudoReaccion) ca += 5;
    if (heroe.efectos.pielRobliza) ca = Math.max(ca, 16);
  }
  return ca;
}

function velocidad(heroe) {
  let v = RAZAS[heroe.raza].vel;
  const arm = armaduraEquipada(heroe);
  if (tieneRasgo(heroe, 'movimiento_rapido') && !(arm && arm.armadura === 'pesada')) v += 2;
  if (arm && arm.fuerzaMin && valorCar(heroe, 'fue') < arm.fuerzaMin) v -= 2;
  for (const it of objetosEquipados(heroe)) { const o = OBJETOS[it.id]; if (o.bonoVel) v += o.bonoVel; }
  return v;
}

function bonoHabilidad(heroe, hab) {
  const info = HABILIDADES[hab];
  let b = modCar(heroe, info.car);
  if (heroe.habilidades.includes(hab)) b += competencia(heroe) * (heroe.pericia.includes(hab) ? 2 : 1);
  return b;
}
function bonoSalvacion(heroe, car) {
  let b = modCar(heroe, car);
  if (CLASES[heroe.clase].salvaciones.includes(car)) b += competencia(heroe);
  for (const it of objetosEquipados(heroe)) { const o = OBJETOS[it.id]; if (o.bonoSalv) b += o.bonoSalv; }
  return b;
}
function percepcionPasiva(heroe) { return 10 + bonoHabilidad(heroe, 'percepcion'); }

// ─── Magia ───
function carLanzamiento(heroe) { const l = CLASES[heroe.clase].lanzamiento; return l ? l.car : null; }
function esLanzador(heroe) {
  const l = CLASES[heroe.clase].lanzamiento;
  if (!l) return false;
  return espaciosTotales(heroe).some(n => n > 0) || (l.trucos[heroe.nivel - 1] || 0) > 0;
}
function bonoAtaqueConjuro(heroe) {
  const car = carLanzamiento(heroe) || 'int';
  let b = competencia(heroe) + modCar(heroe, car);
  for (const it of objetosEquipados(heroe)) { const o = OBJETOS[it.id]; if (o.bonoConjuro) b += o.bonoConjuro; }
  return b;
}
function cdConjuro(heroe) { const car = carLanzamiento(heroe) || 'int'; return 8 + competencia(heroe) + modCar(heroe, car); }

// Devuelve [n1, n2, n3] espacios totales por nivel de conjuro
function espaciosTotales(heroe) {
  const l = CLASES[heroe.clase].lanzamiento;
  if (!l) return [0, 0, 0];
  if (l.espacios === 'pacto') {
    const [cant, niv] = ESPACIOS_PACTO[heroe.nivel];
    const r = [0, 0, 0]; r[niv - 1] = cant; return r;
  }
  const tabla = l.espacios === 'completo' ? ESPACIOS_COMPLETO : ESPACIOS_MEDIO;
  const fila = tabla[heroe.nivel] || [];
  return [fila[0] || 0, fila[1] || 0, fila[2] || 0];
}
function espaciosLibres(heroe) {
  const t = espaciosTotales(heroe);
  return t.map((n, i) => Math.max(0, n - (heroe.espaciosUsados[i] || 0)));
}
function nivelMaxConjuro(heroe) {
  const t = espaciosTotales(heroe);
  for (let i = t.length - 1; i >= 0; i--) if (t[i] > 0) return i + 1;
  return 0;
}
function gastarEspacio(heroe, nivel) {
  if (espaciosLibres(heroe)[nivel - 1] <= 0) return false;
  heroe.espaciosUsados[nivel - 1] = (heroe.espaciosUsados[nivel - 1] || 0) + 1;
  return true;
}

// Conjuros que el héroe puede lanzar ahora mismo (ids)
function conjurosDisponibles(heroe) {
  const l = CLASES[heroe.clase].lanzamiento;
  const maxNivel = nivelMaxConjuro(heroe);
  let lista = [...heroe.trucos];
  if (l) {
    if (l.tipo === 'preparados') lista = lista.concat(conjurosDeClase(heroe.clase, maxNivel).filter(id => CONJUROS[id].nivel > 0));
    else lista = lista.concat(heroe.conjuros.filter(id => CONJUROS[id] && CONJUROS[id].nivel <= maxNivel));
  }
  if (RAZAS[heroe.raza].reprension && heroe.nivel >= 3 && !lista.includes('reprension_infernal')) lista.push('reprension_infernal@raza');
  return Array.from(new Set(lista));
}

function cuantosTrucos(heroe) {
  const l = CLASES[heroe.clase].lanzamiento;
  let n = l ? (l.trucos[heroe.nivel - 1] || 0) : 0;
  if (tieneRasgo(heroe, 'pacto_tomo')) n += 2;
  return n;
}
function cuantosConjurosConocidos(heroe) {
  const l = CLASES[heroe.clase].lanzamiento;
  if (!l || l.tipo !== 'conocidos') return 0;
  return l.conocidos[heroe.nivel - 1] || 0;
}
function opcionesTrucos(heroe) {
  const propios = Object.keys(CONJUROS).filter(id => CONJUROS[id].nivel === 0 && CONJUROS[id].clases.includes(heroe.clase));
  if (tieneRasgo(heroe, 'pacto_tomo')) return Object.keys(CONJUROS).filter(id => CONJUROS[id].nivel === 0);
  return propios;
}

// ─── Recursos de clase y raza ───
function maxRecurso(heroe, rec) {
  switch (rec) {
    case 'furia': return heroe.nivel >= 3 ? 3 : 2;
    case 'imposicion': return 5 * heroe.nivel;
    default: return 1;
  }
}
function reiniciarRecursos(heroe, tipo) {
  const r = heroe.recursos;
  // Se recuperan con descanso corto
  r.tomarAliento = 1; r.oleada = 1; r.canalizar = 1; r.aliento = 1;
  if (CLASES[heroe.clase].lanzamiento && CLASES[heroe.clase].lanzamiento.espacios === 'pacto') heroe.espaciosUsados = [0, 0, 0, 0];
  if (tipo === 'largo') {
    r.furia = maxRecurso(heroe, 'furia');
    r.imposicion = maxRecurso(heroe, 'imposicion');
    r.aguante = 1; r.reprension = 1; r.recuperacionArcana = 1; r.perla = 1;
    heroe.espaciosUsados = [0, 0, 0, 0];
    heroe.dadosGolpe = Math.min(heroe.nivel, heroe.dadosGolpe + Math.max(1, Math.floor(heroe.nivel / 2)));
  }
}

function descansoCorto(heroe) {
  reiniciarRecursos(heroe, 'corto');
  heroe.muerte = { exitos: 0, fallos: 0 };
}
function gastarDadoGolpe(heroe) {
  if (heroe.dadosGolpe <= 0 || heroe.pg >= heroe.pgMax) return null;
  heroe.dadosGolpe--;
  const t = tirarDados('1d' + CLASES[heroe.clase].dado);
  const cura = Math.max(1, t.total + modCar(heroe, 'con'));
  const antes = heroe.pg;
  heroe.pg = Math.min(heroe.pgMax, heroe.pg + cura);
  return { tirada: t, cura: heroe.pg - antes };
}
function descansoLargo(heroe) {
  if (heroe.efectos.auxilio) { heroe.efectos.auxilio = 0; }
  heroe.efectos.armaduraMago = false;
  heroe.efectos.resistFuego = false;
  heroe.pgMax = calcularPgMax(heroe);
  heroe.pg = heroe.pgMax; heroe.pgTemp = 0;
  heroe.condiciones = [];
  heroe.muerte = { exitos: 0, fallos: 0 }; heroe.caido = false;
  reiniciarRecursos(heroe, 'largo');
  for (const it of heroe.inventario) { const o = OBJETOS[it.id]; if (o && o.tipo === 'varita' && it.cargas != null) it.cargas = Math.min(o.cargas, it.cargas + 1 + azar(3)); }
}

// ─── Inventario ───
function anadirObjeto(heroe, id, cantidad = 1, equipar = false, extra = null) {
  const o = OBJETOS[id];
  if (!o) {
    // Objeto narrativo inventado por el DM
    const nombre = (extra && extra.nombre) || id;
    const existente = heroe.inventario.find(i => !OBJETOS[i.id] && i.nombre === nombre);
    if (existente) { existente.cantidad += cantidad; return existente; }
    const it = { uid: uid('o'), id: 'narrativo', nombre, descripcion: (extra && extra.descripcion) || '', cantidad };
    heroe.inventario.push(it); return it;
  }
  const apilable = o.tipo === 'consumible' || o.tipo === 'pergamino' || o.tipo === 'util';
  if (apilable) {
    const existente = heroe.inventario.find(i => i.id === id);
    if (existente) { existente.cantidad += cantidad; return existente; }
  }
  let ultimo = null;
  const veces = apilable ? 1 : cantidad;
  for (let k = 0; k < veces; k++) {
    const it = { uid: uid('o'), id, cantidad: apilable ? cantidad : 1, equipado: false };
    if (o.tipo === 'varita') it.cargas = o.cargas;
    heroe.inventario.push(it);
    if (equipar && k === 0) equiparObjeto(heroe, it.uid, true);
    ultimo = it;
  }
  return ultimo;
}
function quitarObjeto(heroe, uidObj, cantidad = 1) {
  const i = heroe.inventario.findIndex(x => x.uid === uidObj);
  if (i < 0) return false;
  const it = heroe.inventario[i];
  it.cantidad -= cantidad;
  if (it.cantidad <= 0) heroe.inventario.splice(i, 1);
  return true;
}
function contarObjeto(heroe, id) { return heroe.inventario.filter(i => i.id === id).reduce((s, i) => s + i.cantidad, 0); }

function nombreObjeto(it) { return OBJETOS[it.id] ? OBJETOS[it.id].nombre : it.nombre; }

function armasEquipadas(heroe) {
  return heroe.inventario.filter(i => i.equipado && OBJETOS[i.id] && OBJETOS[i.id].tipo === 'arma');
}

// Equipa respetando huecos: 1 armadura, 1 escudo, hasta 2 armas, 1 objeto por ranura
function equiparObjeto(heroe, uidObj, equipar) {
  const it = heroe.inventario.find(x => x.uid === uidObj);
  if (!it) return 'No encuentras ese objeto.';
  const o = OBJETOS[it.id];
  if (!o || !['arma', 'armadura', 'escudo', 'magico'].includes(o.tipo)) return 'Ese objeto no se equipa.';
  if (!equipar) { it.equipado = false; return null; }
  if (o.tipo === 'armadura') {
    heroe.inventario.forEach(x => { if (x !== it && OBJETOS[x.id] && OBJETOS[x.id].tipo === 'armadura') x.equipado = false; });
  } else if (o.tipo === 'escudo') {
    heroe.inventario.forEach(x => { if (x !== it && OBJETOS[x.id] && OBJETOS[x.id].tipo === 'escudo') x.equipado = false; });
    heroe.inventario.forEach(x => { if (x.equipado && OBJETOS[x.id] && OBJETOS[x.id].tipo === 'arma' && (OBJETOS[x.id].props || []).includes('dos_manos') && !(OBJETOS[x.id].props || []).includes('a_distancia')) x.equipado = false; });
  } else if (o.tipo === 'arma') {
    const armas = armasEquipadas(heroe).filter(x => x !== it);
    if (armas.length >= 2) armas[0].equipado = false;
    if ((o.props || []).includes('dos_manos') && !(o.props || []).includes('a_distancia')) {
      heroe.inventario.forEach(x => { if (OBJETOS[x.id] && OBJETOS[x.id].tipo === 'escudo') x.equipado = false; });
    }
  } else if (o.tipo === 'magico') {
    heroe.inventario.forEach(x => { if (x !== it && OBJETOS[x.id] && OBJETOS[x.id].ranura === o.ranura && OBJETOS[x.id].tipo === 'magico') x.equipado = false; });
  }
  it.equipado = true;
  return null;
}

// ─── Ataques con arma ───
function perfilArma(heroe, it) {
  const o = OBJETOS[it.id];
  const props = o.props || [];
  const distancia = props.includes('a_distancia');
  const sutil = props.includes('sutil');
  let car = distancia ? 'des' : 'fue';
  if (sutil && modCar(heroe, 'des') > modCar(heroe, 'fue')) car = 'des';
  const comp = competenteArma(heroe, o) ? competencia(heroe) : 0;
  const magico = o.magico || 0;
  let bono = modCar(heroe, car) + comp + magico;
  if (distancia && heroe.estilo === 'arqueria') bono += 2;
  if (heroe.efectos.armaSagrada) bono += Math.max(1, modCar(heroe, 'car'));
  const sinEscudo = !escudoEquipado(heroe);
  const otrasArmasCuerpo = armasEquipadas(heroe).filter(x => x !== it && !(OBJETOS[x.id].props || []).includes('a_distancia'));
  const dados = (o.versatil && sinEscudo && otrasArmasCuerpo.length === 0) ? o.versatil : o.danio;
  let modDanio = modCar(heroe, car) + magico;
  if (heroe.estilo === 'duelo' && !distancia && !props.includes('dos_manos') && otrasArmasCuerpo.length === 0) modDanio += 2;
  return {
    uid: it.uid, id: it.id, nombre: o.nombre, bono, dados, modDanio, tipo: o.tipoDanio, car,
    alcance: distancia ? 0 : 1, distancia: o.distancia || null, aDistancia: distancia, arrojadiza: props.includes('arrojadiza'),
    sutil, dosManos: props.includes('dos_manos'), magico: magico > 0 || !!o.danioExtra, extra: o.danioExtra || null, tipoExtra: o.tipoExtra || null,
  };
}

function ataquesDisponibles(heroe) {
  const armas = armasEquipadas(heroe).map(it => perfilArma(heroe, it));
  if (!armas.length) {
    const fue = modCar(heroe, 'fue');
    armas.push({ uid: 'desarmado', id: 'desarmado', nombre: 'Golpe sin armas', bono: fue + competencia(heroe), dados: '1', modDanio: fue, tipo: 'contundente', car: 'fue', alcance: 1, distancia: null, aDistancia: false });
  }
  return armas;
}

// ─── Experiencia y nivel ───
function ganarPx(heroe, px) {
  heroe.px += Math.max(0, Math.round(px));
  return puedeSubirNivel(heroe);
}
function puedeSubirNivel(heroe) { return heroe.nivel < NIVEL_MAXIMO && heroe.px >= UMBRAL_PX[heroe.nivel + 1]; }

// Aplica la subida (las elecciones vienen de la interfaz)
function subirNivel(heroe, eleccion) {
  // eleccion: {pg: 'media'|n, mejora: {car: +n}, trucos:[], conjuros:[], invocaciones:[], estilo}
  heroe.nivel++;
  heroe.pgSubidas = heroe.pgSubidas || [];
  const clase = CLASES[heroe.clase];
  heroe.pgSubidas[heroe.nivel] = typeof eleccion.pg === 'number' ? eleccion.pg : Math.floor(clase.dado / 2) + 1;
  if (eleccion.mejora) for (const [car, v] of Object.entries(eleccion.mejora)) heroe.base[car] = Math.min(20, heroe.base[car] + v);
  if (eleccion.trucos) heroe.trucos = Array.from(new Set([...heroe.trucos, ...eleccion.trucos]));
  if (eleccion.conjuros) heroe.conjuros = Array.from(new Set([...heroe.conjuros, ...eleccion.conjuros]));
  if (eleccion.invocaciones) heroe.invocaciones = Array.from(new Set([...(heroe.invocaciones || []), ...eleccion.invocaciones]));
  if (eleccion.estilo) heroe.estilo = eleccion.estilo;
  heroe.dadosGolpe++;
  const antes = heroe.pgMax;
  heroe.pgMax = calcularPgMax(heroe);
  heroe.pg += heroe.pgMax - antes;
  if (heroe.recursos.furia != null) heroe.recursos.furia = Math.min(maxRecurso(heroe, 'furia'), heroe.recursos.furia + (heroe.nivel === 3 ? 1 : 0));
  if (heroe.recursos.imposicion != null) heroe.recursos.imposicion += 5;
}

function rasgosNuevos(heroe, nivel) { return CLASES[heroe.clase].rasgos.filter(r => r.nivel === nivel); }

// ─── Condiciones ───
function tieneCondicion(ent, id) { return (ent.condiciones || []).some(c => c.id === id); }
function ponerCondicion(ent, id, extra = {}) {
  if (!ent.condiciones) ent.condiciones = [];
  const prev = ent.condiciones.find(c => c.id === id);
  if (prev) { Object.assign(prev, extra); return prev; }
  const c = Object.assign({ id }, extra);
  ent.condiciones.push(c); return c;
}
function quitarCondicion(ent, id) { if (ent.condiciones) ent.condiciones = ent.condiciones.filter(c => c.id !== id); }

// Resumen textual de la ficha (para el DM)
function resumenFicha(heroe) {
  const raza = RAZAS[heroe.raza], clase = CLASES[heroe.clase];
  const cars = CARACTERISTICAS.map(c => `${c.abrev} ${valorCar(heroe, c.id)} (${signo(modCar(heroe, c.id))})`).join(', ');
  const habs = heroe.habilidades.map(hb => HABILIDADES[hb].nombre + ' ' + signo(bonoHabilidad(heroe, hb))).join(', ');
  const equipo = heroe.inventario.map(it => nombreObjeto(it) + (it.cantidad > 1 ? ' ×' + it.cantidad : '') + (it.equipado ? ' (equipado)' : '')).join(', ') || 'nada';
  const conj = conjurosDisponibles(heroe).map(id => (CONJUROS[id.split('@')[0]] || {}).nombre).filter(Boolean).join(', ');
  const esp = espaciosTotales(heroe).map((t, i) => t ? `${i + 1}º: ${espaciosLibres(heroe)[i]}/${t}` : null).filter(Boolean).join(', ');
  const conds = (heroe.condiciones || []).map(c => (CONDICIONES[c.id] || { nombre: c.id }).nombre).join(', ') || 'ninguna';
  return [
    `Nombre: ${heroe.nombre}. ${raza.nombre} ${clase.nombre.toLowerCase()} de nivel ${heroe.nivel}. Trasfondo: ${TRASFONDOS[heroe.trasfondo].nombre}.`,
    `PG ${heroe.pg}/${heroe.pgMax}${heroe.pgTemp ? ' (+' + heroe.pgTemp + ' temporales)' : ''}. CA ${claseArmadura(heroe)}. PX ${heroe.px}${heroe.nivel < NIVEL_MAXIMO ? '/' + UMBRAL_PX[heroe.nivel + 1] : ''}. Oro: ${heroe.oro} po.`,
    `Características: ${cars}. Percepción pasiva ${percepcionPasiva(heroe)}.`,
    `Habilidades con competencia: ${habs}.`,
    `Equipo: ${equipo}.`,
    conj ? `Conjuros: ${conj}.${esp ? ' Espacios libres: ' + esp + '.' : ''}` : '',
    `Condiciones: ${conds}.${heroe.inspiracion ? ' Tiene inspiración.' : ''}`,
  ].filter(Boolean).join('\n');
}
