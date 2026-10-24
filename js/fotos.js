/* Panel › Fotos: las fotos que mandan los invitados desde el QR de su mesa.
   /fotos/{id}    { mesa, thumb, fecha, nombre?, w, h }  → miniatura y datos (se cargan todas)
   /fotosImg/{id} "data:image/jpeg;base64,…"             → foto completa (se baja solo al abrirla) */
import {
  ref, onValue, get, update,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const SITIO = 'https://miinva-pgkvkj-d01c0.web.app/';

export function iniciarFotos({ db, esc, toast }) {
  const $ = (s, r = document) => r.querySelector(s);
  const st = { fotos: {}, filtro: 'todas', abierta: null };

  const sub = onValue(ref(db, 'fotos'), (snap) => {
    st.fotos = snap.val() || {};
    pintar();
  });

  const ordenadas = () => Object.entries(st.fotos).sort(([, a], [, b]) => (b.fecha || 0) - (a.fecha || 0));
  const fechaTxt = (t) => (t ? new Date(t).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
  const mesaTxt = (m) => (Number(m) ? `Mesa ${m}` : 'General');

  function pintar() {
    const todas = ordenadas();
    const porMesa = {};
    todas.forEach(([, f]) => { porMesa[f.mesa || 0] = (porMesa[f.mesa || 0] || 0) + 1; });
    const mesas = Object.keys(porMesa).map(Number).sort((a, b) => a - b);
    const personas = new Set(todas.map(([, f]) => (f.nombre || '').trim().toLowerCase()).filter(Boolean)).size;

    $('#fotos-resumen').innerHTML = `
      <div class="dato"><div class="dato-n">${todas.length}</div><div class="dato-t">Fotos recibidas</div></div>
      <div class="dato"><div class="dato-n">${mesas.filter((m) => m).length}</div><div class="dato-t">Mesas que han mandado fotos</div></div>
      <div class="dato"><div class="dato-n">${personas}</div><div class="dato-t">Invitados que pusieron su nombre</div></div>`;

    if (st.filtro !== 'todas' && !porMesa[st.filtro]) st.filtro = 'todas';
    $('#fotos-filtros').innerHTML = [`<button type="button" class="chip ${st.filtro === 'todas' ? 'activo' : ''}" data-ff="todas">Todas (${todas.length})</button>`,
      ...mesas.map((m) => `<button type="button" class="chip ${String(st.filtro) === String(m) ? 'activo' : ''}" data-ff="${m}">${mesaTxt(m)} (${porMesa[m]})</button>`)].join('');

    const lista = st.filtro === 'todas' ? todas : todas.filter(([, f]) => String(f.mesa || 0) === String(st.filtro));
    $('#fotos-grid').innerHTML = lista.length ? lista.map(([id, f]) => `
      <button type="button" class="foto-mini" data-foto="${esc(id)}" title="${esc(mesaTxt(f.mesa))}${f.nombre ? ` · ${esc(f.nombre)}` : ''}">
        <img src="${esc(f.thumb)}" alt="" loading="lazy">
        <span>${esc(mesaTxt(f.mesa))}${f.nombre ? ` · ${esc(f.nombre)}` : ''}</span>
      </button>`).join('')
      : '<p class="vacio">Todavía no llegan fotos. Cuando tus invitados escaneen el QR de su mesa, aparecerán aquí al momento.</p>';
  }

  $('#fotos-filtros').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ff]');
    if (!b) return;
    st.filtro = b.dataset.ff;
    pintar();
  });

  /* ---------- ver una foto en grande ---------- */
  const nombreArchivo = (id, f) => `mesa-${String(f.mesa || 0).padStart(2, '0')}_${new Date(f.fecha || Date.now()).toISOString().slice(0, 19).replace(/[:T]/g, '-')}_${id.slice(-5)}.jpg`;
  async function completa(id) {
    const snap = await get(ref(db, `fotosImg/${id}`));
    return snap.val() || st.fotos[id]?.thumb;
  }

  $('#fotos-grid').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-foto]');
    if (!b) return;
    const id = b.dataset.foto;
    const f = st.fotos[id];
    st.abierta = id;
    $('#foto-grande').src = f.thumb;
    $('#foto-info').textContent = `${mesaTxt(f.mesa)}${f.nombre ? ` · ${f.nombre}` : ''} · ${fechaTxt(f.fecha)}`;
    $('#dlg-foto').showModal();
    try {
      const url = await completa(id);
      if (st.abierta === id) $('#foto-grande').src = url;
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });
  $('#cerrar-foto').addEventListener('click', () => $('#dlg-foto').close());
  $('#bajar-foto').addEventListener('click', async () => {
    const id = st.abierta;
    if (!id) return;
    const a = document.createElement('a');
    a.href = await completa(id);
    a.download = nombreArchivo(id, st.fotos[id]);
    a.click();
  });
  $('#borrar-foto').addEventListener('click', async () => {
    const id = st.abierta;
    if (!id || !confirm('¿Borrar esta foto? No se puede recuperar.')) return;
    try {
      await update(ref(db), { [`fotos/${id}`]: null, [`fotosImg/${id}`]: null });
      $('#dlg-foto').close();
      toast('Foto borrada');
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });

  /* ---------- descargar todas (o las de la mesa elegida) en un .zip ---------- */
  function cargarZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = () => ok(window.JSZip);
      s.onerror = () => mal(new Error('No se pudo cargar el compresor'));
      document.head.append(s);
    });
  }
  $('#fotos-zip').addEventListener('click', async () => {
    const lista = (st.filtro === 'todas' ? ordenadas() : ordenadas().filter(([, f]) => String(f.mesa || 0) === String(st.filtro)));
    if (!lista.length) { toast('No hay fotos para descargar'); return; }
    const btn = $('#fotos-zip');
    btn.disabled = true;
    try {
      const JSZip = await cargarZip();
      const zip = new JSZip();
      for (let i = 0; i < lista.length; i++) {
        const [id, f] = lista[i];
        btn.textContent = `Preparando ${i + 1} de ${lista.length}…`;
        const url = await completa(id);
        zip.folder(mesaTxt(f.mesa)).file(nombreArchivo(id, f), url.split(',')[1], { base64: true });
      }
      btn.textContent = 'Comprimiendo…';
      const blob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fotos-boda${st.filtro === 'todas' ? '' : `-${mesaTxt(st.filtro).toLowerCase().replace(' ', '-')}`}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (err) {
      toast(`Error: ${err.code || err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Descargar .zip';
    }
  });

  $('#fotos-prueba').href = `${SITIO}fotos.html?mesa=1`;
  return sub;
}
