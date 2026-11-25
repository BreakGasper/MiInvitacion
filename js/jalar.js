/* Jalar hacia abajo para actualizar (como F5). Sirve en el icono de la pantalla de inicio, donde no hay botón de recargar. */
export function iniciarJalarParaActualizar() {
  const UMBRAL = 90; // px que hay que jalar para que recargue
  const ind = document.createElement('div');
  ind.className = 'jala';
  ind.setAttribute('aria-hidden', 'true');
  ind.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
  document.body.appendChild(ind);

  let y0 = null;
  let dy = 0;
  const bloqueado = (t) => document.querySelector('dialog[open]') || t.closest('input,textarea,select,dialog,.salon-scroll,[data-nojalar]');
  const reset = () => { ind.style.transform = ''; ind.classList.remove('listo', 'cargando', 'visible'); };

  window.addEventListener('touchstart', (e) => {
    y0 = e.touches.length === 1 && window.scrollY <= 0 && !bloqueado(e.target) ? e.touches[0].clientY : null;
    dy = 0;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    dy = e.touches[0].clientY - y0;
    if (dy <= 0 || window.scrollY > 0) { y0 = null; reset(); return; }
    const d = Math.min(dy * 0.5, 70);
    ind.classList.add('visible');
    ind.classList.toggle('listo', dy >= UMBRAL);
    ind.style.transform = `translate(-50%, ${d}px)`;
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (y0 !== null && dy >= UMBRAL) {
      ind.classList.add('cargando', 'visible');
      ind.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i>';
      ind.style.transform = 'translate(-50%, 48px)';
      setTimeout(() => window.location.reload(), 150);
    } else reset();
    y0 = null;
  }, { passive: true });
  window.addEventListener('touchcancel', () => { y0 = null; reset(); }, { passive: true });
}
