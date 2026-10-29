// ─── Arranque ───

function arrancar(datos) {
  const previo = datos && datos.estado;
  if (previo && previo.version === VERSION_GUARDADO && previo.heroe && previo.pantalla === 'juego') {
    estado = previo;
    restaurarPartida();
  } else {
    estado = estadoBase();
    if (previo && previo.ajustes) estado.ajustes = previo.ajustes;
    render();
  }
  comprobarDM().then(() => { if (estado && (estado.pantalla === 'creacion' || estado.pantalla === 'titulo')) render(); });
  // Altura real de la barra superior para colocar las pestañas móviles debajo
  const medir = () => { const b = document.querySelector('.barra-sup'); if (b) document.documentElement.style.setProperty('--alto-barra', b.offsetHeight + 'px'); };
  new MutationObserver(medir).observe(document.getElementById('app'), { childList: true });
  window.addEventListener('resize', medir);
}

// Acceso para pruebas automáticas: solo con #depurar en la dirección
if (typeof location !== 'undefined' && location.hash === '#depurar') {
  window.__dyd = { get estado() { return estado; }, render, renderJuego, empezarCombate, flujoSubidaNivel };
}

(function () {
  const hot = typeof window !== 'undefined' && window.claude && window.claude.hot;
  try { if (hot && typeof hot.snapshot === 'function') hot.snapshot(() => ({ estado })); } catch (e) { /* sin recarga en caliente */ }
  const iniciar = (d) => arrancar(d || {});
  if (hot && typeof hot.ready === 'function') hot.ready(iniciar);
  else iniciar(hot && hot.data);
})();
