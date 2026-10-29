// ─── Interfaz: estado de la vista, modales, dado animado, avisos y guardado ───

const CLAVE_PARTIDA = 'dyd-partida-v1';
const CLAVE_CONTROL = 'dyd-control-v1';
const VERSION_GUARDADO = 1;

let estado = null; // estado de la partida (serializable)
const UI = { tab: 'ficha', vistaMovil: 'escena', creacion: null, modoCombate: null, hover: null, menuAbierto: null, streaming: '', nuevoDesde: 0 };

function estadoBase() {
  return { version: VERSION_GUARDADO, pantalla: 'titulo', modo: null, heroe: null, ajustes: { dificultad: 'normal', tono: 'epico', modeloDM: 'quick', animarDados: true }, dm: null, mazmorra: null, combate: null, registro: [], creado: Date.now() };
}

// ─── Guardado ───
function guardar() {
  if (!estado || !estado.heroe) return;
  const copia = Object.assign({}, estado);
  if (copia.dm) copia.dm = Object.assign({}, copia.dm, { cargando: false });
  Almacen.escribir(CLAVE_PARTIDA, copia);
}
function guardarPuntoControl() { if (estado && estado.heroe) Almacen.escribir(CLAVE_CONTROL, Object.assign({}, estado, { combate: null })); }
function partidaGuardada() { const p = Almacen.leer(CLAVE_PARTIDA); return p && p.version === VERSION_GUARDADO && p.heroe ? p : null; }
function exportarPartida() { return 'DYD1:' + aBase64(JSON.stringify(estado)); }
function importarPartida(codigo) {
  const limpio = String(codigo || '').trim().replace(/^DYD1:/, '');
  const datos = JSON.parse(deBase64(limpio));
  if (!datos || datos.version !== VERSION_GUARDADO || !datos.heroe) throw new Error('El código no es una partida válida.');
  return datos;
}

// ─── Avisos ───
function aviso(texto, tipo = '') {
  const cont = $('#avisos');
  if (!cont) return;
  const el = h('div', { class: 'aviso ' + tipo, role: 'status' }, texto);
  cont.append(el);
  setTimeout(() => { el.classList.add('saliendo'); setTimeout(() => el.remove(), 400); }, 3200);
}

// ─── Modales ───
let _modalResolver = null;
function abrirModal({ titulo, cuerpo, acciones = [], cerrable = true, clase = '', alCerrar = null }) {
  const capa = $('#capa-modal');
  vaciar(capa);
  const cerrar = (valor) => {
    capa.hidden = true; vaciar(capa);
    document.removeEventListener('keydown', teclas);
    const r = _modalResolver; _modalResolver = null;
    if (alCerrar) alCerrar(valor);
    if (r) r(valor);
  };
  const teclas = (ev) => { if (ev.key === 'Escape' && cerrable) cerrar(null); };
  const caja = h('div', { class: 'modal ' + clase, role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo || 'Diálogo' },
    titulo ? h('header', { class: 'modal-cab' }, h('h2', null, titulo), cerrable ? h('button', { class: 'btn-icono', 'aria-label': 'Cerrar', onclick: () => cerrar(null) }, '✕') : null) : null,
    h('div', { class: 'modal-cuerpo' }, typeof cuerpo === 'function' ? cuerpo(cerrar) : cuerpo),
    acciones.length ? h('footer', { class: 'modal-pie' }, acciones.map(a => h('button', { class: 'btn ' + (a.clase || ''), disabled: a.deshabilitado, onclick: () => { if (a.onClick) { const r = a.onClick(cerrar); if (r === false) return; } if (a.cierra !== false) cerrar(a.valor !== undefined ? a.valor : true); } }, a.texto))) : null);
  capa.append(caja);
  capa.hidden = false;
  capa.onclick = (ev) => { if (ev.target === capa && cerrable) cerrar(null); };
  document.addEventListener('keydown', teclas);
  setTimeout(() => { const f = caja.querySelector('.modal-pie .btn-primario, .modal-cuerpo button, .modal-cuerpo input, .modal-cuerpo textarea'); if (f) f.focus(); }, 30);
  return new Promise(res => { _modalResolver = res; });
}
function cerrarModal() { const capa = $('#capa-modal'); if (capa && !capa.hidden) { capa.hidden = true; vaciar(capa); const r = _modalResolver; _modalResolver = null; if (r) r(null); } }

function confirmar(titulo, texto, si = 'Aceptar', no = 'Cancelar') {
  return abrirModal({ titulo, cuerpo: h('p', null, texto), acciones: [{ texto: no, valor: false }, { texto: si, clase: 'btn-primario', valor: true }] }).then(v => !!v);
}

// Preguntas del motor de combate (reacciones, castigo divino...)
Hooks.preguntar = (titulo, texto, opciones) => abrirModal({
  titulo, cerrable: false, clase: 'modal-pregunta',
  cuerpo: h('p', null, texto),
  acciones: opciones.map((o, i) => ({ texto: o.etiqueta, clase: i === 0 ? 'btn-primario' : '', valor: o.valor })),
}).then(v => v === null ? opciones[opciones.length - 1].valor : v);

// ─── Dado animado ───
function svgD20(clase) {
  return `<svg class="${clase}" viewBox="0 0 100 100" aria-hidden="true"><polygon class="d20-cara" points="50,3 93,27 93,73 50,97 7,73 7,27"/><polygon class="d20-linea" points="50,22 78,66 22,66"/><polyline class="d20-linea" points="50,3 50,22 7,27 22,66 7,73 50,97 78,66 93,73 78,66 93,27 50,22 22,66 50,97"/></svg>`;
}
let _saltarDado = null;
async function animarDado(t, etiqueta) {
  if (estado && estado.ajustes && estado.ajustes.animarDados === false) return;
  const capa = $('#capa-dado');
  if (!capa) return;
  vaciar(capa);
  const dados = t.dados.map((v, i) => {
    const elegido = t.dados.length === 1 || v === t.valor && t.dados.indexOf(t.valor) === i;
    const caja = h('div', { class: 'dado-caja' + (elegido ? ' elegido' : ' descartado') });
    caja.innerHTML = svgD20('d20') + `<span class="dado-num">${azar(20) + 1}</span>`;
    return { caja, v };
  });
  const etiquetaModo = t.modo === 'ventaja' ? 'con ventaja' : t.modo === 'desventaja' ? 'con desventaja' : '';
  capa.append(h('div', { class: 'dado-escena' }, h('div', { class: 'dado-fila' }, dados.map(d => d.caja)), h('div', { class: 'dado-etiqueta' }, etiqueta, etiquetaModo ? h('span', null, ' · ' + etiquetaModo) : null)));
  capa.hidden = false;
  let saltado = false;
  const promesaSalto = new Promise(r => { _saltarDado = () => { saltado = true; r(); }; });
  capa.onclick = () => _saltarDado && _saltarDado();
  const reducido = movimientoReducido();
  if (!reducido) {
    capa.classList.add('girando');
    for (let i = 0; i < 9 && !saltado; i++) {
      dados.forEach(d => { d.caja.querySelector('.dado-num').textContent = azar(20) + 1; });
      await Promise.race([esperar(45 + i * 9), promesaSalto]);
    }
    capa.classList.remove('girando');
  }
  dados.forEach(d => {
    d.caja.querySelector('.dado-num').textContent = d.v;
    if (d.v === 20) d.caja.classList.add('nat20');
    if (d.v === 1) d.caja.classList.add('nat1');
  });
  capa.classList.add('asentado');
  await Promise.race([esperar(reducido ? 500 : 650), promesaSalto]);
  capa.classList.remove('asentado');
  capa.hidden = true;
  _saltarDado = null;
}
Hooks.dado = animarDado;

// ─── Utilidades visuales ───
function barra(valor, max, clase, etiqueta) {
  const pct = max > 0 ? limitar(valor / max * 100, 0, 100) : 0;
  return h('div', { class: 'barra ' + clase, role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': valor, 'aria-label': etiqueta || '' }, h('span', { style: { width: pct + '%' } }));
}
function pastilla(texto, clase = '') { return h('span', { class: 'pastilla ' + clase }, texto); }
function titulo2(texto) { return h('h3', { class: 'seccion-titulo' }, texto); }
function nombreClaseRaza(heroe) {
  return `${RAZAS[heroe.raza].nombre} ${CLASES[heroe.clase].nombre.toLowerCase()} · nivel ${heroe.nivel}`;
}

// ─── Render principal ───
function render() {
  const app = $('#app');
  if (!app) return;
  if (!estado) estado = estadoBase();
  const p = estado.pantalla;
  document.body.dataset.pantalla = p;
  vaciar(app);
  if (p === 'titulo') app.append(pantallaTitulo());
  else if (p === 'creacion') app.append(pantallaCreacion());
  else app.append(pantallaJuego());
  if (estado.heroe) guardar();
}

// Renderiza solo la zona de juego conservando el foco del cuadro de texto
function renderJuego() {
  if (!estado || !['juego'].includes(estado.pantalla)) { render(); return; }
  const activo = document.activeElement;
  const idFoco = activo && activo.id;
  const sel = activo && activo.selectionStart;
  const scrollPanel = $('.panel-cuerpo') ? $('.panel-cuerpo').scrollTop : 0;
  render();
  if (idFoco) { const el = document.getElementById(idFoco); if (el) { el.focus(); try { if (sel != null) el.setSelectionRange(sel, sel); } catch (e) { /* no editable */ } } }
  const pc = $('.panel-cuerpo'); if (pc) pc.scrollTop = scrollPanel;
}

function cabeceraJuego() {
  const hr = estado.heroe;
  const sig = hr.nivel < NIVEL_MAXIMO ? UMBRAL_PX[hr.nivel + 1] : null;
  const ant = UMBRAL_PX[hr.nivel];
  return h('header', { class: 'barra-sup' },
    h('div', { class: 'barra-marca', title: 'Dados y Dragones' }, h('span', { class: 'marca-d20', html: svgD20('mini-d20') }), h('span', { class: 'marca-texto' }, 'Dados y Dragones')),
    h('div', { class: 'barra-heroe' },
      h('div', { class: 'heroe-nombre' }, hr.nombre),
      h('div', { class: 'heroe-sub' }, nombreClaseRaza(hr))),
    h('div', { class: 'barra-stats' },
      h('div', { class: 'stat-pg' + (hr.pg <= hr.pgMax / 3 ? ' critico' : '') },
        h('div', { class: 'stat-cab' }, h('span', { class: 'etq' }, 'PG'), h('b', null, `${hr.pg}`), h('span', { class: 'de' }, `/${hr.pgMax}`), hr.pgTemp ? h('span', { class: 'temp' }, ` +${hr.pgTemp}`) : null),
        barra(hr.pg, hr.pgMax, 'barra-pg', 'Puntos de golpe')),
      h('div', { class: 'stat-ca', title: 'Clase de armadura' }, h('span', { class: 'etq' }, 'CA'), h('b', null, claseArmadura(hr))),
      h('div', { class: 'stat-px', title: sig ? `${hr.px} / ${sig} PX` : 'Nivel máximo' },
        h('div', { class: 'stat-cab' }, h('span', { class: 'etq' }, 'PX'), h('b', null, hr.px), sig ? h('span', { class: 'de' }, `/${sig}`) : h('span', { class: 'de' }, ' máx.')),
        barra(sig ? hr.px - ant : 1, sig ? sig - ant : 1, 'barra-px', 'Experiencia')),
      h('div', { class: 'stat-oro', title: 'Piezas de oro' }, h('span', { class: 'etq' }, 'po'), h('b', null, hr.oro)),
      h('button', { class: 'btn-inspiracion' + (hr.inspiracion ? ' activa' : '') + (hr.usarInspiracion ? ' armada' : ''), title: hr.inspiracion ? (hr.usarInspiracion ? 'Tu próxima tirada de d20 tendrá ventaja' : 'Pulsa para usar tu inspiración en la próxima tirada') : 'Sin inspiración (el DM puede concederla)', disabled: !hr.inspiracion, 'aria-pressed': hr.usarInspiracion ? 'true' : 'false', onclick: () => { hr.usarInspiracion = !hr.usarInspiracion; aviso(hr.usarInspiracion ? 'Inspiración preparada: tu próxima tirada de d20 tendrá ventaja.' : 'Inspiración guardada.'); renderJuego(); } }, '★')),
    h('button', { class: 'btn-icono btn-menu', 'aria-label': 'Menú', onclick: abrirMenu }, '☰'));
}

function pantallaJuego() {
  const enCombate = !!estado.combate;
  const escena = enCombate ? vistaCombate() : estado.modo === 'dm' ? vistaDM() : vistaMazmorra();
  const pestanas = [['escena', enCombate ? 'Combate' : 'Escena'], ['ficha', 'Ficha'], ['equipo', 'Equipo'], ['magia', 'Magia'], ['diario', estado.modo === 'dm' ? 'Diario' : 'Mapa']].filter(([id]) => id !== 'magia' || esLanzador(estado.heroe) || estado.heroe.inventario.some(i => OBJETOS[i.id] && ['pergamino', 'varita'].includes(OBJETOS[i.id].tipo)));
  return h('div', { class: 'juego vista-' + UI.vistaMovil + (enCombate ? ' en-combate' : '') },
    cabeceraJuego(),
    h('nav', { class: 'pestanas-movil', 'aria-label': 'Secciones' }, pestanas.map(([id, t]) => h('button', { class: UI.vistaMovil === id ? 'activa' : '', onclick: () => { UI.vistaMovil = id; if (id !== 'escena') UI.tab = id; renderJuego(); } }, t))),
    h('div', { class: 'juego-cuerpo' },
      h('main', { class: 'escena', id: 'escena' }, escena),
      panelLateral()));
}

function abrirMenu() {
  const a = estado.ajustes;
  const cuerpo = (cerrar) => {
    const exportado = h('textarea', { id: 'campo-exportar', class: 'campo codigo', readonly: true, rows: 3 }, exportarPartida());
    return h('div', { class: 'menu-juego' },
      titulo2('Ajustes'),
      h('label', { class: 'fila-campo' }, h('span', null, 'Dificultad'), selector('aj-dif', Object.entries(DIFICULTADES).map(([id, d]) => [id, d.nombre]), a.dificultad, v => { a.dificultad = v; recalcularPg(estado.heroe); renderJuego(); })),
      estado.modo === 'dm' ? h('label', { class: 'fila-campo' }, h('span', null, 'Tono del DM'), selector('aj-tono', Object.entries(TONOS).map(([id, t]) => [id, t.nombre]), a.tono, v => { a.tono = v; guardar(); })) : null,
      estado.modo === 'dm' ? h('label', { class: 'fila-campo' }, h('span', null, 'Narrador'), selector('aj-modelo', Object.entries(MODELOS_DM).map(([id, t]) => [id, `${t.nombre} — ${t.desc}`]), a.modeloDM, v => { a.modeloDM = v; guardar(); })) : null,
      h('label', { class: 'fila-campo casilla' }, h('input', { type: 'checkbox', id: 'aj-dados', checked: a.animarDados !== false, onchange: e => { a.animarDados = e.target.checked; guardar(); } }), h('span', null, 'Animar las tiradas de dados')),
      titulo2('Guardar y compartir'),
      h('p', { class: 'nota' }, 'La partida se guarda sola en este navegador. Para llevarla a otro dispositivo, copia este código y pégalo en «Importar partida».'),
      exportado,
      h('div', { class: 'fila-botones' },
        h('button', { class: 'btn', onclick: () => copiarTexto(exportado.value, exportado).then(ok => aviso(ok ? 'Código copiado.' : 'Selecciona el texto y cópialo.')) }, 'Copiar código')),
      titulo2('Partida'),
      h('div', { class: 'fila-botones' },
        h('button', { class: 'btn', onclick: async () => { cerrar(); if (await confirmar('Volver al título', 'Tu partida queda guardada y podrás continuarla desde el título.', 'Volver')) { guardar(); UI.partidaEnMemoria = estado; estado = Object.assign(estadoBase(), { ajustes: estado.ajustes }); render(); } } }, 'Volver al título')));
  };
  abrirModal({ titulo: 'Menú', cuerpo, clase: 'modal-menu' });
}

function selector(id, opciones, valor, onCambio) {
  return h('select', { id, class: 'campo', onchange: e => onCambio(e.target.value) }, opciones.map(([v, t]) => h('option', { value: v, selected: v === valor }, t)));
}
