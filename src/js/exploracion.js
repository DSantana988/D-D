// ─── Exploración: pruebas de característica, efectos narrativos y descansos ───

const SIN_TILDES = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

function normalizarHabilidad(v) {
  const s = SIN_TILDES(v).replace(/\s+/g, '_');
  if (HABILIDADES[s]) return s;
  for (const [id, hb] of Object.entries(HABILIDADES)) if (SIN_TILDES(hb.nombre).replace(/\s+/g, '_') === s) return id;
  const alias = { sigil: 'sigilo', stealth: 'sigilo', percepcion: 'percepcion', perception: 'percepcion', atletica: 'atletismo', athletics: 'atletismo', persuadir: 'persuasion', enganar: 'engano', intimidar: 'intimidacion', investigar: 'investigacion', trato_con_animales: 'trato_animales', juego_de_manos: 'juego_manos', arcana: 'arcanos', insight: 'perspicacia', medicine: 'medicina', survival: 'supervivencia', nature: 'naturaleza', religion: 'religion', history: 'historia', acrobatics: 'acrobacias', performance: 'interpretacion', deception: 'engano' };
  return alias[s] || null;
}
function normalizarCaracteristica(v) {
  const s = SIN_TILDES(v);
  const mapa = { fue: 'fue', fuerza: 'fue', str: 'fue', des: 'des', destreza: 'des', dex: 'des', con: 'con', constitucion: 'con', int: 'int', inteligencia: 'int', sab: 'sab', sabiduria: 'sab', wis: 'sab', car: 'car', carisma: 'car', cha: 'car' };
  return mapa[s] || mapa[s.slice(0, 3)] || null;
}

// Describe una prueba: bono, ventajas y etiqueta para mostrarla antes de tirar
function describirPrueba(p) {
  const h = estado.heroe;
  const r = { etiqueta: '', bono: 0, ventaja: !!p.ventaja, desventaja: !!p.desventaja, fuentes: [], guia: false, cd: p.cd };
  if (p.tipo === 'habilidad') {
    const hab = HABILIDADES[p.id];
    r.etiqueta = `Prueba de ${hab.nombre} (${ABREV_CAR[hab.car]})`;
    r.bono = bonoHabilidad(h, p.id);
    if (p.id === 'sigilo') {
      const arm = armaduraEquipada(h);
      if (arm && arm.sigiloDesv) { r.desventaja = true; r.fuentes.push('armadura ruidosa'); }
      if (objetosEquipados(h).some(it => OBJETOS[it.id].ventajaHab === 'sigilo')) { r.ventaja = true; r.fuentes.push('equipo élfico'); }
    }
    if (p.id === 'medicina' && contarObjeto(h, 'kit_sanador') > 0) { r.ventaja = true; r.fuentes.push('kit de sanador'); }
    if (hab.car === 'fue' && h.efectos.furia) r.ventaja = true;
  } else if (p.tipo === 'caracteristica') {
    r.etiqueta = `Prueba de ${NOMBRE_CAR[p.id]}`;
    r.bono = modCar(h, p.id);
  } else {
    r.etiqueta = `Salvación de ${NOMBRE_CAR[p.id]}`;
    r.bono = bonoSalvacion(h, p.id);
    if (p.id === 'des' && tieneRasgo(h, 'sentido_peligro')) { r.ventaja = true; r.fuentes.push('sentido del peligro'); }
  }
  if (p.tipo !== 'salvacion') {
    if (tieneCondicion(h, 'envenenado')) { r.desventaja = true; r.fuentes.push('envenenado'); }
    if (h.trucos.includes('guia')) { r.guia = true; r.fuentes.push('Guía +1d4'); }
  }
  if (p.ventaja) r.fuentes.push('ventaja del DM');
  if (p.desventaja) r.fuentes.push('desventaja del DM');
  return r;
}

async function realizarPrueba(p, animar) {
  const h = estado.heroe;
  const d = describirPrueba(p);
  let vent = d.ventaja;
  if (h.usarInspiracion && h.inspiracion) { vent = true; h.inspiracion = false; h.usarInspiracion = false; d.fuentes.push('inspiración'); }
  const t = tirarD20({ ventaja: vent, desventaja: d.desventaja, afortunado: !!RAZAS[h.raza].afortunado });
  if (animar) await animar(t, d.etiqueta);
  const extraGuia = d.guia ? dado(4) : 0;
  const total = t.valor + d.bono + extraGuia;
  const exito = p.cd != null ? total >= p.cd : null;
  const dadosTxt = t.dados.length > 1 ? `${t.dados.join(' y ')} (${t.modo})` : `${t.valor}`;
  const texto = `${d.etiqueta}${p.cd != null ? ` CD ${p.cd}` : ''}: d20 = ${dadosTxt} ${signo(d.bono)}${extraGuia ? ' +' + extraGuia + ' (Guía)' : ''} = ${total}${exito != null ? (exito ? ' → ÉXITO' : ' → FALLO') : ''}${t.valor === 20 ? ' (¡20 natural!)' : t.valor === 1 ? ' (1 natural)' : ''}`;
  registrarTirada(texto, exito === false ? 'malo' : exito ? 'bueno' : '');
  return { t, total, exito, texto, natural: t.valor };
}

function registrarTirada(texto, clase) {
  if (!estado.registro) estado.registro = [];
  estado.registro.unshift({ texto, clase, hora: Date.now() });
  if (estado.registro.length > 60) estado.registro.length = 60;
}

// Daño fuera de combate (trampas, eventos)
function danioFueraCombate(cantidad, tipo) {
  const h = estado.heroe, raza = RAZAS[h.raza];
  const resist = [...(raza.resist || [])];
  if (raza.aliento && h.linaje) resist.push(LINAJES_DRACONIDOS[h.linaje].danio);
  if (h.efectos.resistFuego) resist.push('fuego');
  let n = aplicarResistencias(tipo, cantidad, resist, [], [], true);
  if (h.pgTemp) { const a = Math.min(h.pgTemp, n); h.pgTemp -= a; n -= a; }
  h.pg -= n;
  let texto = `Sufres ${n} de daño${tipo ? ' de ' + tipo : ''}.`;
  if (h.pg <= 0) {
    if (estado.ajustes.dificultad === 'dificil' && -h.pg >= h.pgMax) { h.pg = 0; h.muerto = true; texto += ' El golpe es mortal.'; }
    else if (estado.ajustes.dificultad === 'dificil') {
      // Tiradas contra la muerte rápidas
      let ex = 0, fa = 0;
      while (ex < 3 && fa < 3) { const v = dado(20); if (v === 20) { ex = 3; break; } if (v >= 10) ex++; else fa += v === 1 ? 2 : 1; }
      if (fa >= 3) { h.pg = 0; h.muerto = true; texto += ' Caes inconsciente y no vuelves a despertar.'; }
      else { h.pg = 1; texto += ' Caes inconsciente, pero logras estabilizarte y despiertas con 1 PG.'; }
    } else { h.pg = 1; texto += ' Quedas al borde de la inconsciencia (1 PG).'; }
  }
  h.estadisticas.danioRecibido += n;
  return texto;
}

// Efectos que llegan del DM o de los eventos de la mazmorra. Devuelve líneas de texto para el registro.
function aplicarEfectos(efectos, origen = 'dm') {
  const h = estado.heroe;
  const lineas = [];
  let subida = false, descanso = null;
  for (const ef of (Array.isArray(efectos) ? efectos : [])) {
    if (!ef || typeof ef !== 'object') continue;
    const tipo = SIN_TILDES(ef.tipo).replace('dano', 'danio');
    switch (tipo) {
      case 'oro': {
        let n = Math.round(Number(ef.cantidad) || 0);
        n = limitar(n, -h.oro, origen === 'dm' ? 150 * h.nivel + 100 : 5000);
        if (!n) break;
        h.oro += n;
        lineas.push(n > 0 ? `+${n} po` : `${n} po`);
        break;
      }
      case 'objeto': {
        const id = ef.id && OBJETOS[ef.id] ? ef.id : null;
        const cant = limitar(parseInt(ef.cantidad || 1, 10) || 1, 1, 10);
        if (id) { anadirObjeto(h, id, cant); lineas.push(`Obtienes: ${OBJETOS[id].nombre}${cant > 1 ? ' ×' + cant : ''}`); }
        else if (ef.nombre) { anadirObjeto(h, String(ef.nombre).slice(0, 60), cant, false, { nombre: String(ef.nombre).slice(0, 60), descripcion: String(ef.descripcion || '').slice(0, 200) }); lineas.push(`Obtienes: ${String(ef.nombre).slice(0, 60)}`); }
        break;
      }
      case 'quitar_objeto': {
        const nombre = SIN_TILDES(ef.nombre || (ef.id && OBJETOS[ef.id] ? OBJETOS[ef.id].nombre : ef.id));
        const it = h.inventario.find(i => SIN_TILDES(nombreObjeto(i)) === nombre || i.id === ef.id) || h.inventario.find(i => SIN_TILDES(nombreObjeto(i)).includes(nombre) && nombre.length > 3);
        if (it) { lineas.push(`Pierdes: ${nombreObjeto(it)}`); quitarObjeto(h, it.uid, Math.min(it.cantidad, parseInt(ef.cantidad || 1, 10) || 1)); }
        break;
      }
      case 'danio': {
        const expr = ef.dados || ef.cantidad || '1d6';
        const t = tirarDados(String(expr).replace(/\s/g, ''));
        const n = Math.min(t.total, origen === 'dm' ? 8 * h.nivel + 10 : 999);
        lineas.push(danioFueraCombate(n, ef.danio || ef.tipoDanio || ''));
        break;
      }
      case 'curacion': {
        const n = ef.dados ? tirarDados(String(ef.dados)).total : (Number(ef.cantidad) || 0);
        if (n > 0) { const antes = h.pg; h.pg = Math.min(h.pgMax, h.pg + n); lineas.push(`Recuperas ${h.pg - antes} PG`); }
        break;
      }
      case 'px': {
        const tope = h.nivel < NIVEL_MAXIMO ? Math.max(50, Math.round((UMBRAL_PX[h.nivel + 1] - UMBRAL_PX[h.nivel]) * 0.35)) : 300;
        const n = limitar(Math.round(Number(ef.cantidad) || 0), 0, origen === 'dm' ? tope : 5000);
        if (n > 0) { subida = ganarPx(h, n) || subida; lineas.push(`+${n} PX${ef.motivo ? ' (' + String(ef.motivo).slice(0, 60) + ')' : ''}`); }
        break;
      }
      case 'condicion': {
        const id = SIN_TILDES(ef.condicion);
        if (['envenenado', 'asustado', 'derribado'].includes(id)) { ponerCondicion(h, id); lineas.push(`Quedas ${CONDICIONES[id].nombre.toLowerCase()}`); }
        break;
      }
      case 'quitar_condicion': {
        const id = SIN_TILDES(ef.condicion);
        if (tieneCondicion(h, id)) { quitarCondicion(h, id); lineas.push(`Ya no estás ${CONDICIONES[id] ? CONDICIONES[id].nombre.toLowerCase() : id}`); }
        break;
      }
      case 'inspiracion': if (!h.inspiracion) { h.inspiracion = true; lineas.push('Ganas inspiración ★'); } break;
      case 'descanso': descanso = SIN_TILDES(ef.clase) === 'largo' ? 'largo' : 'corto'; break;
    }
  }
  if (descanso === 'largo') { descansoLargo(h); lineas.push('Descanso largo: recuperas todos tus PG, espacios de conjuro y recursos.'); }
  if (descanso === 'corto') { descansoCorto(h); lineas.push('Descanso corto: recuperas tus recursos de descanso corto.'); }
  return { lineas, subida: subida || puedeSubirNivel(h), descanso };
}

function normalizarMonstruo(v) {
  if (!v) return null;
  const s = SIN_TILDES(v).replace(/\s+/g, '_');
  if (MONSTRUOS[s]) return s;
  for (const [id, m] of Object.entries(MONSTRUOS)) if (SIN_TILDES(m.nombre).replace(/\s+/g, '_') === s) return id;
  for (const [id, m] of Object.entries(MONSTRUOS)) if (s.includes(SIN_TILDES(m.nombre).replace(/\s+/g, '_')) || SIN_TILDES(m.nombre).replace(/\s+/g, '_').includes(s)) return id;
  return null;
}
