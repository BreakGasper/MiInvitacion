/* Panel › Pendientes: listas de cosas por hacer que se marcan como terminadas.
   /pendientes/{listaId}  { nombre, creada, items: { {itemId}: { texto, hecho, creado, fechaHecho? } } } */
import {
  ref, onValue, set, update, remove, push,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

export function iniciarPendientes({ db, esc, toast }) {
  const $ = (s, r = document) => r.querySelector(s);
  // cerradas: listas plegadas · borradores: lo que se está escribiendo en cada lista (para no perderlo al llegar un cambio)
  const st = { listas: {}, filtro: 'todos', cerradas: new Set(), borradores: {} };

  onValue(ref(db, 'pendientes'), (snap) => {
    st.listas = snap.val() || {};
    pintar();
  });

  const items = (l) => Object.entries(l.items || {}).sort(([, a], [, b]) => (a.creado || 0) - (b.creado || 0));
  const cuenta = (l) => {
    const it = items(l);
    return { total: it.length, hechos: it.filter(([, x]) => x.hecho).length };
  };
  const fechaTxt = (t) => (t ? new Date(t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '');

  function filaItem(lid, id, x) {
    return `
      <li class="pd-item ${x.hecho ? 'hecho' : ''}">
        <label class="pd-check">
          <input type="checkbox" data-a="marcar" data-l="${esc(lid)}" data-i="${esc(id)}" ${x.hecho ? 'checked' : ''}>
          <span class="pd-texto">${esc(x.texto)}</span>
        </label>
        ${x.hecho && x.fechaHecho ? `<span class="pd-fecha">${esc(fechaTxt(x.fechaHecho))}</span>` : ''}
        <button type="button" class="b b-sec b-ico" data-a="editar-item" data-l="${esc(lid)}" data-i="${esc(id)}" title="Editar" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
        <button type="button" class="b b-sec b-ico" data-a="quitar-item" data-l="${esc(lid)}" data-i="${esc(id)}" title="Quitar" aria-label="Quitar"><i class="fa-solid fa-xmark"></i></button>
      </li>`;
  }

  function tarjeta(lid, l) {
    const { total, hechos } = cuenta(l);
    const pct = total ? Math.round((hechos / total) * 100) : 0;
    const cerrada = st.cerradas.has(lid);
    const visibles = items(l).filter(([, x]) => (st.filtro === 'pend' ? !x.hecho : st.filtro === 'hechos' ? x.hecho : true));
    return `
      <section class="caja pd-lista ${total && hechos === total ? 'completa' : ''}" data-lista="${esc(lid)}">
        <div class="pd-cab">
          <button type="button" class="pd-plegar" data-a="plegar" data-l="${esc(lid)}" aria-expanded="${!cerrada}" aria-label="${cerrada ? 'Abrir' : 'Cerrar'} lista">
            <i class="fa-solid ${cerrada ? 'fa-chevron-right' : 'fa-chevron-down'}"></i>
            <span class="pd-nombre">${esc(l.nombre)}</span>
          </button>
          <span class="etq ${total && hechos === total ? 'si' : 'pend'}">${hechos}/${total}</span>
          <button type="button" class="b b-sec b-ico" data-a="renombrar" data-l="${esc(lid)}" title="Renombrar lista" aria-label="Renombrar lista"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="b b-sec b-ico" data-a="borrar-lista" data-l="${esc(lid)}" title="Eliminar lista" aria-label="Eliminar lista"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="barra-prog"><span style="width:${pct}%"></span></div>
        ${cerrada ? '' : `
          <ul class="pd-items">
            ${visibles.length ? visibles.map(([id, x]) => filaItem(lid, id, x)).join('')
    : `<li class="vacio pd-vacio">${total ? (st.filtro === 'pend' ? '¡Todo terminado en esta lista! 🎉' : 'Nada terminado todavía.') : 'Sin pendientes. Agrega el primero.'}</li>`}
          </ul>
          <form class="pd-nuevo" data-l="${esc(lid)}">
            <input name="texto" maxlength="120" placeholder="Agregar pendiente…" aria-label="Nuevo pendiente" autocomplete="off" value="${esc(st.borradores[lid] || '')}">
            <button type="submit" class="b b-pri" aria-label="Agregar pendiente"><i class="fa-solid fa-plus"></i><span class="pd-btn-t"> Agregar</span></button>
          </form>
          ${hechos ? `<button type="button" class="pd-limpiar" data-a="limpiar" data-l="${esc(lid)}"><i class="fa-solid fa-broom"></i> Quitar los terminados (${hechos})</button>` : ''}`}
      </section>`;
  }

  function pintar() {
    const lids = Object.keys(st.listas).sort((a, b) => (st.listas[a].creada || 0) - (st.listas[b].creada || 0));
    const total = lids.reduce((a, id) => a + cuenta(st.listas[id]).total, 0);
    const hechos = lids.reduce((a, id) => a + cuenta(st.listas[id]).hechos, 0);
    const pct = total ? Math.round((hechos / total) * 100) : 0;

    $('#pend-resumen').innerHTML = `
      <div class="dato"><div class="dato-n">${lids.length}</div><div class="dato-t">Listas</div></div>
      <div class="dato pend"><div class="dato-n">${total - hechos}</div><div class="dato-t">Pendientes</div></div>
      <div class="dato si"><div class="dato-n">${hechos}</div><div class="dato-t">Terminados</div></div>
      <div class="dato"><div class="dato-n">${pct}%</div><div class="dato-t">Avance</div><div class="barra-prog"><span style="width:${pct}%"></span></div></div>`;

    document.querySelectorAll('#pend-filtros .chip').forEach((c) => c.classList.toggle('activo', c.dataset.pf === st.filtro));

    // Conserva el foco y el texto escrito mientras llegan cambios en vivo
    const activo = document.activeElement;
    const enLista = activo?.closest?.('.pd-nuevo');
    const foco = enLista ? enLista.dataset.l : null;
    const pos = enLista ? activo.selectionStart : 0;

    $('#pend-listas').innerHTML = lids.length ? lids.map((id) => tarjeta(id, st.listas[id])).join('')
      : '<section class="caja"><p class="vacio">Todavía no hay listas. Crea la primera arriba (ej. “Antes de la boda”).</p></section>';

    if (foco) {
      const inp = document.querySelector(`.pd-nuevo[data-l="${CSS.escape(foco)}"] input`);
      if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch { /* sin selección */ } }
    }
  }

  const guardar = async (fn, ok) => {
    try { await fn(); if (ok) toast(ok); } catch (err) { toast(`Error: ${err.code || err.message}`); }
  };

  /* ---------- nueva lista ---------- */
  $('#pend-nueva-lista').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const nombre = f.nombre.value.trim();
    if (!nombre) return;
    guardar(async () => {
      await set(push(ref(db, 'pendientes')), { nombre, creada: Date.now() });
      f.reset();
    }, 'Lista creada');
  });

  /* ---------- filtros ---------- */
  $('#pend-filtros').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pf]');
    if (!b) return;
    st.filtro = b.dataset.pf;
    pintar();
  });

  /* ---------- agregar pendiente (envío del formulario de cada lista) ---------- */
  $('#pend-listas').addEventListener('submit', (e) => {
    const f = e.target.closest('.pd-nuevo');
    if (!f) return;
    e.preventDefault();
    const lid = f.dataset.l;
    const texto = f.texto.value.trim();
    if (!texto) return;
    st.borradores[lid] = '';
    f.texto.value = '';
    guardar(() => set(push(ref(db, `pendientes/${lid}/items`)), { texto, hecho: false, creado: Date.now() }));
  });
  $('#pend-listas').addEventListener('input', (e) => {
    const f = e.target.closest('.pd-nuevo');
    if (f) st.borradores[f.dataset.l] = e.target.value;
  });

  /* ---------- marcar / editar / quitar ---------- */
  $('#pend-listas').addEventListener('change', (e) => {
    const c = e.target.closest('[data-a="marcar"]');
    if (!c) return;
    const { l, i } = c.dataset;
    guardar(() => update(ref(db, `pendientes/${l}/items/${i}`), { hecho: c.checked, fechaHecho: c.checked ? Date.now() : null }));
  });

  $('#pend-listas').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]');
    if (!b) return;
    const { a, l, i } = b.dataset;
    const lista = st.listas[l];
    if (!lista) return;
    if (a === 'plegar') {
      if (st.cerradas.has(l)) st.cerradas.delete(l); else st.cerradas.add(l);
      pintar();
    } else if (a === 'renombrar') {
      const n = prompt('Nombre de la lista:', lista.nombre);
      if (n && n.trim()) guardar(() => update(ref(db, `pendientes/${l}`), { nombre: n.trim().slice(0, 60) }));
    } else if (a === 'borrar-lista') {
      const { total } = cuenta(lista);
      if (confirm(`¿Eliminar la lista "${lista.nombre}"${total ? ` y sus ${total} pendientes` : ''}? No se puede deshacer.`)) {
        guardar(() => remove(ref(db, `pendientes/${l}`)), 'Lista eliminada');
      }
    } else if (a === 'editar-item') {
      const n = prompt('Editar pendiente:', lista.items?.[i]?.texto || '');
      if (n && n.trim()) guardar(() => update(ref(db, `pendientes/${l}/items/${i}`), { texto: n.trim().slice(0, 120) }));
    } else if (a === 'quitar-item') {
      guardar(() => remove(ref(db, `pendientes/${l}/items/${i}`)));
    } else if (a === 'limpiar') {
      const hechos = items(lista).filter(([, x]) => x.hecho);
      if (confirm(`¿Quitar los ${hechos.length} pendientes terminados de "${lista.nombre}"?`)) {
        guardar(() => update(ref(db, `pendientes/${l}/items`), Object.fromEntries(hechos.map(([id]) => [id, null]))), 'Terminados quitados');
      }
    }
  });
}
