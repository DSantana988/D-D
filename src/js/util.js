// ─── Utilidades generales: azar, dados, DOM y almacenamiento ───

const _cripto = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;

// Entero aleatorio en [0, n)
function azar(n) {
  if (_cripto) {
    const buf = new Uint32Array(1);
    const limite = Math.floor(0x100000000 / n) * n;
    let v;
    do { _cripto.getRandomValues(buf); v = buf[0]; } while (v >= limite);
    return v % n;
  }
  return Math.floor(Math.random() * n);
}

function dado(caras) { return 1 + azar(caras); }
function elegir(lista) { return lista[azar(lista.length)]; }
function barajar(lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = azar(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function elegirPonderado(pares) {
  // pares: [[valor, peso], ...]
  const total = pares.reduce((s, p) => s + p[1], 0);
  let r = azar(total);
  for (const [v, p] of pares) { if (r < p) return v; r -= p; }
  return pares[pares.length - 1][0];
}
function limitar(v, min, max) { return Math.max(min, Math.min(max, v)); }
function signo(n) { return n >= 0 ? '+' + n : '−' + Math.abs(n); }
let _uid = Date.now() % 100000;
function uid(prefijo = 'u') { _uid++; return prefijo + _uid.toString(36) + azar(1296).toString(36); }

// "2d6+3", "1d8", "4", "3d10-1"
function analizarDados(expr) {
  const s = String(expr).replace(/\s+/g, '').toLowerCase();
  const m = s.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (m) return { n: m[1] === '' ? 1 : parseInt(m[1], 10), caras: parseInt(m[2], 10), mod: m[3] ? parseInt(m[3], 10) : 0 };
  const k = parseInt(s, 10);
  return { n: 0, caras: 0, mod: isNaN(k) ? 0 : k };
}

// Tira una expresión de dados. opciones: critico (duplica dados), rerollHasta (arma a dos manos: repite 1-2 una vez)
function tirarDados(expr, opciones = {}) {
  const { n, caras, mod } = analizarDados(expr);
  const cantidad = opciones.critico ? n * 2 : n;
  const tiradas = [];
  for (let i = 0; i < cantidad; i++) {
    let v = dado(caras);
    if (opciones.rerollHasta && v <= opciones.rerollHasta) v = dado(caras);
    tiradas.push(v);
  }
  const total = Math.max(0, tiradas.reduce((s, v) => s + v, 0) + mod);
  const textoMod = mod ? (mod > 0 ? ' + ' + mod : ' − ' + Math.abs(mod)) : '';
  return { total, tiradas, mod, caras, expr: `${cantidad ? cantidad + 'd' + caras : ''}${cantidad && mod ? (mod > 0 ? '+' + mod : mod) : (!cantidad ? mod : '')}`, texto: tiradas.length ? `[${tiradas.join(', ')}]${textoMod}` : String(mod) };
}

// Suma dados por número y caras: sumarDados(3, 6)
function sumarDados(n, caras, critico = false) {
  let t = 0; const k = critico ? n * 2 : n;
  for (let i = 0; i < k; i++) t += dado(caras);
  return t;
}

// d20 con ventaja/desventaja y suerte de mediano (repite los 1 naturales)
function tirarD20({ ventaja = false, desventaja = false, afortunado = false } = {}) {
  const uno = () => { let v = dado(20); if (afortunado && v === 1) v = dado(20); return v; };
  const modo = ventaja && !desventaja ? 'ventaja' : desventaja && !ventaja ? 'desventaja' : 'normal';
  if (modo === 'normal') { const v = uno(); return { valor: v, dados: [v], modo }; }
  const a = uno(), b = uno();
  return { valor: modo === 'ventaja' ? Math.max(a, b) : Math.min(a, b), dados: [a, b], modo };
}

function promedioDados(expr) {
  const { n, caras, mod } = analizarDados(expr);
  return Math.floor(n * (caras + 1) / 2) + mod;
}

// ─── DOM ───
function h(etiqueta, attrs, ...hijos) {
  const el = document.createElement(etiqueta);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}
function $(sel, raiz) { return (raiz || document).querySelector(sel); }
function $$(sel, raiz) { return Array.from((raiz || document).querySelectorAll(sel)); }
function vaciar(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }

function escaparHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Texto del DM → HTML seguro (párrafos y **negritas**)
function textoEnriquecido(s) {
  const seguro = escaparHtml(String(s || '').trim());
  return seguro.split(/\n{2,}/).map(p => '<p>' + p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>') + '</p>').join('');
}

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }
const movimientoReducido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Almacenamiento local (puede fallar en ventanas privadas o vistas previas) ───
const Almacen = {
  leer(clave) { try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  escribir(clave, valor) { try { localStorage.setItem(clave, JSON.stringify(valor)); return true; } catch (e) { return false; } },
  borrar(clave) { try { localStorage.removeItem(clave); } catch (e) { /* sin almacenamiento */ } },
};

function aBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
}
function deBase64(b64) {
  const bin = atob(b64.trim());
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function copiarTexto(texto, campoRespaldo) {
  try {
    const p = navigator.clipboard && navigator.clipboard.writeText(texto);
    if (p && p.catch) return p.then(() => true).catch(() => { if (campoRespaldo) { campoRespaldo.focus(); campoRespaldo.select(); } return false; });
  } catch (e) { /* sin portapapeles */ }
  if (campoRespaldo) { campoRespaldo.focus(); campoRespaldo.select(); }
  return Promise.resolve(false);
}

function metros(casillas) {
  const m = casillas * 1.5;
  return (Number.isInteger(m) ? m : m.toFixed(1).replace('.', ',')) + ' m';
}
