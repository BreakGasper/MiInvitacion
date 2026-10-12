/* Panel › Mesas: plano del salón, mesas y acomodo de invitados.
   Datos independientes de las invitaciones: /mesas, /acomodo y /salon en Firebase. */
import {
  ref, onValue, set, update, push,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const TIPOS = {
  rect: { nombre: 'Rectangular', plural: 'Rectangulares', cap: 12 },
  cuad: { nombre: 'Cuadrada', plural: 'Cuadradas', cap: 12 },
  red: { nombre: 'Redonda', plural: 'Redondas', cap: 10 },
};

export function iniciarMesas({ db, esc, toast }) {
  const $ = (s, r = document) => r.querySelector(s);
  const st = { mesas: {}, acomodo: {}, elementos: {}, mover: false, q: '', soloSinMesa: false, abierta: null, elem: null };
  const subs = [];
  const cargados = new Set();
  const NODOS = { mesas: 'mesas', acomodo: 'acomodo', elementos: 'salon/elementos' };

  Object.entries(NODOS).forEach(([clave, ruta]) => {
    subs.push(onValue(ref(db, ruta), (snap) => {
      st[clave] = snap.val() || {};
      cargados.add(clave);
      if (cargados.size === 3) pintar();
    }));
  });

  /* ---------- utilidades ---------- */
  const mesasOrdenadas = () => Object.entries(st.mesas).sort(([, a], [, b]) => (a.numero || 0) - (b.numero || 0));
  const invitadosDe = (mid) => Object.entries(st.acomodo)
    .filter(([, g]) => g.mesa === mid)
    .sort(([, a], [, b]) => (a.orden ?? 0) - (b.orden ?? 0) || String(a.nombre).localeCompare(b.nombre));
  const opcionesMesa = (actual) => `<option value="">Sin mesa</option>${mesasOrdenadas().map(([mid, m]) => {
    const n = invitadosDe(mid).length;
    return `<option value="${esc(mid)}" ${mid === actual ? 'selected' : ''}>Mesa ${esc(m.numero)} (${n}/${esc(m.capacidad)})</option>`;
  }).join('')}`;
  const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
  const r1 = (v) => Math.round(v * 10) / 10;

  /* ---------- sillas alrededor de la mesa ---------- */
  function sillas(m, ocupadas) {
    const cap = Math.max(1, Number(m.capacidad) || 1);
    const pts = [];
    if (m.tipo === 'red') {
      for (let i = 0; i < cap; i++) {
        const a = (i / cap) * Math.PI * 2 - Math.PI / 2;
        pts.push([50 + Math.cos(a) * 64, 50 + Math.sin(a) * 64]);
      }
    } else if (m.tipo === 'rect') {
      const lado = Math.ceil(cap / 2);
      for (let i = 0; i < cap; i++) {
        const fila = i < lado ? 0 : 1;
        const j = fila ? i - lado : i;
        const total = fila ? cap - lado : lado;
        pts.push([((j + 0.5) / total) * 100, fila ? 132 : -32]);
      }
    } else {
      const porLado = [0, 0, 0, 0];
      for (let i = 0; i < cap; i++) porLado[i % 4] += 1;
      porLado.forEach((n, l) => {
        for (let k = 0; k < n; k++) {
          const t = ((k + 0.5) / n) * 100;
          pts.push([[t, -26], [126, t], [100 - t, 126], [-26, 100 - t]][l]);
        }
      });
    }
    return pts.map(([x, y], i) => `<span class="silla ${i < ocupadas ? 'ocupada' : ''}" style="left:${x}%;top:${y}%"></span>`).join('');
  }

  /* ---------- pintar ---------- */
  function pintar() {
    const mesas = mesasOrdenadas();
    const todos = Object.values(st.acomodo);
    const sentados = todos.filter((g) => g.mesa && st.mesas[g.mesa]).length;
    const capacidad = mesas.reduce((a, [, m]) => a + (Number(m.capacidad) || 0), 0);
    const conteo = { rect: 0, cuad: 0, red: 0 };
    mesas.forEach(([, m]) => { conteo[m.tipo] = (conteo[m.tipo] || 0) + 1; });

    $('#mesas-resumen').innerHTML = `
      <div class="dato"><div class="dato-n">${mesas.length}</div><div class="dato-t">Mesas</div></div>
      <div class="dato si"><div class="dato-n">${sentados}</div><div class="dato-t">Invitados con mesa</div></div>
      <div class="dato pend"><div class="dato-n">${todos.length - sentados}</div><div class="dato-t">Sin mesa</div></div>
      <div class="dato"><div class="dato-n">${capacidad}</div><div class="dato-t">Lugares en total</div></div>
      <div class="dato"><div class="dato-n">${Math.max(0, capacidad - sentados)}</div><div class="dato-t">Lugares libres</div></div>`;

    $('#mesas-tipos').innerHTML = `
      <table class="tabla tipos">
        <thead><tr><th>Tipo</th><th>Total</th></tr></thead>
        <tbody>
          ${Object.entries(TIPOS).map(([k, t]) => `<tr><td><span class="mini ${k}"></span> ${t.plural}</td><td>${conteo[k] || 0}</td></tr>`).join('')}
          <tr class="total"><td>Total mesas</td><td>${mesas.length}</td></tr>
        </tbody>
      </table>`;

    $('#salon').classList.toggle('moviendo', st.mover);

    $('#salon-elementos').innerHTML = Object.entries(st.elementos).map(([eid, e]) => `
      <div class="elem" data-elem="${esc(eid)}" role="button" tabindex="0"
        style="left:${Number(e.x) || 50}%;top:${Number(e.y) || 50}%;width:${Number(e.w) || 10}%;height:${Number(e.h) || 10}%;--elem-color:${esc(e.color || '#3f6fb5')}">
        <span class="elem-t">${esc(e.nombre)}</span>
        <span class="elem-tam" title="Arrastra para cambiar el tamaño"></span>
      </div>`).join('');

    $('#salon-mesas').innerHTML = mesas.map(([mid, m]) => {
      const n = invitadosDe(mid).length;
      const cap = Number(m.capacidad) || 0;
      const estado = n > cap ? 'llena-de-mas' : n === cap ? 'llena' : n === 0 ? 'vacia' : '';
      return `
        <button type="button" class="mesa ${esc(m.tipo)} ${m.girada ? 'girada' : ''} ${estado}" data-mesa="${esc(mid)}"
          style="left:${Number(m.x) || 50}%;top:${Number(m.y) || 50}%"
          aria-label="Mesa ${esc(m.numero)}, ${n} de ${cap} personas">
          <span class="mesa-cuerpo">
            ${sillas(m, n)}
            <span class="mesa-txt"><span class="mesa-num">${esc(m.numero)}</span><span class="mesa-oc">${n}/${cap}</span></span>
          </span>
        </button>`;
    }).join('');

    pintarLista();
    const sel = $('#form-acomodo-nuevo').mesa;
    sel.innerHTML = opcionesMesa(sel.value);
    if (st.abierta && $('#dlg-mesa').open) pintarMesaAbierta();
  }

  function pintarLista() {
    const q = st.q.trim().toLowerCase();
    const filas = Object.entries(st.acomodo)
      .filter(([, g]) => (!st.soloSinMesa || !g.mesa || !st.mesas[g.mesa]))
      .filter(([, g]) => !q || `${g.nombre} mesa ${st.mesas[g.mesa]?.numero ?? ''}`.toLowerCase().includes(q))
      .sort(([, a], [, b]) => (st.mesas[a.mesa]?.numero ?? 999) - (st.mesas[b.mesa]?.numero ?? 999)
        || (a.orden ?? 0) - (b.orden ?? 0));
    $('#acomodo-conteo').textContent = `${filas.length} ${filas.length === 1 ? 'invitado' : 'invitados'}`;
    $('#acomodo-lista').innerHTML = filas.length ? filas.map(([gid, g]) => `
      <div class="acomodo-fila">
        <input type="text" class="ac-nombre" data-gid="${esc(gid)}" value="${esc(g.nombre)}" maxlength="80" aria-label="Nombre">
        <select class="ac-mesa" data-gid="${esc(gid)}" aria-label="Mesa">${opcionesMesa(st.mesas[g.mesa] ? g.mesa : '')}</select>
        <button type="button" class="b b-sec b-ico ac-borrar" data-gid="${esc(gid)}" title="Eliminar invitado" aria-label="Eliminar invitado"><i class="fa-solid fa-trash"></i></button>
      </div>`).join('') : '<p class="vacio">No hay invitados con este filtro.</p>';
  }

  /* ---------- arrastrar mesas y elementos / cambiar tamaño ---------- */
  const salon = $('#salon');
  let arrastre = null;
  salon.addEventListener('pointerdown', (e) => {
    if (!st.mover) return;
    const tam = e.target.closest('.elem-tam');
    const pieza = e.target.closest('.mesa, .elem');
    if (!pieza) return;
    e.preventDefault();
    pieza.setPointerCapture(e.pointerId);
    const area = $('#salon-area').getBoundingClientRect();
    const caja = pieza.getBoundingClientRect();
    arrastre = {
      pieza,
      ruta: pieza.dataset.mesa ? `mesas/${pieza.dataset.mesa}` : `salon/elementos/${pieza.dataset.elem}`,
      modo: tam ? 'tam' : 'mover',
      area,
      // distancia del puntero al centro, para que la pieza no "brinque"
      dx: e.clientX - (caja.left + caja.width / 2),
      dy: e.clientY - (caja.top + caja.height / 2),
      x0: caja.left,
      y0: caja.top,
    };
  });
  salon.addEventListener('pointermove', (e) => {
    if (!arrastre) return;
    const { area, pieza } = arrastre;
    if (arrastre.modo === 'tam') {
      const w = limitar(((e.clientX - arrastre.x0) / area.width) * 100, 3, 80);
      const h = limitar(((e.clientY - arrastre.y0) / area.height) * 100, 3, 80);
      const x = ((arrastre.x0 - area.left) / area.width) * 100 + w / 2;
      const y = ((arrastre.y0 - area.top) / area.height) * 100 + h / 2;
      Object.assign(pieza.style, { width: `${w}%`, height: `${h}%`, left: `${x}%`, top: `${y}%` });
      Object.assign(arrastre, { cambios: { w: r1(w), h: r1(h), x: r1(x), y: r1(y) } });
      return;
    }
    const x = limitar(((e.clientX - arrastre.dx - area.left) / area.width) * 100, 1, 99);
    const y = limitar(((e.clientY - arrastre.dy - area.top) / area.height) * 100, 1, 99);
    pieza.style.left = `${x}%`;
    pieza.style.top = `${y}%`;
    arrastre.cambios = { x: r1(x), y: r1(y) };
  });
  const soltar = async () => {
    if (!arrastre) return;
    const { ruta, cambios } = arrastre;
    arrastre = null;
    if (cambios) await update(ref(db, ruta), cambios);
  };
  salon.addEventListener('pointerup', soltar);
  salon.addEventListener('pointercancel', soltar);
  salon.addEventListener('click', (e) => {
    if (st.mover) return;
    const m = e.target.closest('.mesa');
    if (m) { abrirMesa(m.dataset.mesa); return; }
    const el = e.target.closest('.elem');
    if (el) abrirElemento(el.dataset.elem);
  });
  $('#btn-mover').addEventListener('click', () => {
    st.mover = !st.mover;
    $('#btn-mover').classList.toggle('activo', st.mover);
    $('#btn-mover').innerHTML = st.mover
      ? '<i class="fa-solid fa-check"></i> Listo'
      : '<i class="fa-solid fa-up-down-left-right"></i> Mover y acomodar';
    $('#salon').classList.toggle('moviendo', st.mover);
  });

  /* ---------- nueva mesa / nuevo elemento ---------- */
  $('#btn-nueva-mesa').addEventListener('click', async () => {
    const tipo = $('#nueva-mesa-tipo').value;
    const numero = Math.max(0, ...Object.values(st.mesas).map((m) => Number(m.numero) || 0)) + 1;
    await set(push(ref(db, 'mesas')), { numero, tipo, capacidad: TIPOS[tipo].cap, x: 50, y: 50 });
    toast(`Mesa ${numero} agregada al centro del salón`);
  });
  $('#btn-nuevo-elem').addEventListener('click', async () => {
    const nombre = prompt('¿Qué quieres agregar al salón? (ej. Barra, DJ, Mesa de dulces)');
    if (!nombre || !nombre.trim()) return;
    await set(push(ref(db, 'salon/elementos')), { nombre: nombre.trim().slice(0, 40), x: 50, y: 50, w: 12, h: 10, color: '#3f6fb5' });
    toast(`"${nombre.trim()}" agregado al centro del salón`);
  });

  /* ---------- ventana de un elemento del salón ---------- */
  const dlgE = $('#dlg-elem');
  function abrirElemento(eid) {
    const e = st.elementos[eid];
    if (!e) return;
    st.elem = eid;
    const f = $('#form-elem');
    f.nombre.value = e.nombre || '';
    f.color.value = e.color || '#3f6fb5';
    dlgE.showModal();
  }
  $('#form-elem').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    await update(ref(db, `salon/elementos/${st.elem}`), { nombre: f.nombre.value.trim().slice(0, 40) || 'Sin nombre', color: f.color.value });
    dlgE.close();
  });
  $('#cerrar-elem').addEventListener('click', () => dlgE.close());
  $('#eliminar-elem').addEventListener('click', async () => {
    if (!confirm(`¿Quitar "${st.elementos[st.elem]?.nombre}" del salón?`)) return;
    await set(ref(db, `salon/elementos/${st.elem}`), null);
    dlgE.close();
  });

  /* ---------- ventana de una mesa ---------- */
  const dlg = $('#dlg-mesa');
  function abrirMesa(mid) {
    st.abierta = mid;
    pintarMesaAbierta();
    dlg.showModal();
  }
  function pintarMesaAbierta() {
    const m = st.mesas[st.abierta];
    if (!m) { dlg.close(); return; }
    const lista = invitadosDe(st.abierta);
    const f = $('#form-mesa');
    if (!f.contains(document.activeElement)) {
      f.numero.value = m.numero;
      f.tipo.value = m.tipo;
      f.capacidad.value = m.capacidad;
      f.girada.checked = !!m.girada;
    }
    $('#dlg-mesa-t').textContent = `Mesa ${m.numero} · ${lista.length}/${m.capacidad}`;
    $('#mesa-invitados').innerHTML = lista.length ? lista.map(([gid, g]) => `
      <div class="acomodo-fila">
        <input type="text" class="ac-nombre" data-gid="${esc(gid)}" value="${esc(g.nombre)}" maxlength="80" aria-label="Nombre">
        <select class="ac-mesa" data-gid="${esc(gid)}" aria-label="Cambiar de mesa">${opcionesMesa(st.abierta)}</select>
      </div>`).join('') : '<p class="vacio">Mesa vacía.</p>';
    const sinMesa = Object.entries(st.acomodo).filter(([, g]) => !g.mesa || !st.mesas[g.mesa]);
    $('#mesa-sin').innerHTML = `<option value="">Elegir invitado sin mesa…</option>${sinMesa
      .map(([gid, g]) => `<option value="${esc(gid)}">${esc(g.nombre)}</option>`).join('')}`;
    $('#mesa-sin').disabled = !sinMesa.length;
  }
  $('#cerrar-mesa').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { st.abierta = null; });

  $('#form-mesa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    await update(ref(db, `mesas/${st.abierta}`), {
      numero: Number(f.numero.value) || st.mesas[st.abierta].numero,
      tipo: f.tipo.value,
      capacidad: limitar(Number(f.capacidad.value) || 1, 1, 30),
      girada: f.girada.checked,
    });
    toast('Mesa guardada');
  });
  $('#form-mesa').tipo.addEventListener('change', (e) => { $('#form-mesa').capacidad.value = TIPOS[e.target.value].cap; });

  $('#eliminar-mesa').addEventListener('click', async () => {
    const m = st.mesas[st.abierta];
    const lista = invitadosDe(st.abierta);
    if (!confirm(`¿Eliminar la mesa ${m.numero}? ${lista.length ? `Sus ${lista.length} invitados quedarán sin mesa.` : ''}`)) return;
    const cambios = { [`mesas/${st.abierta}`]: null };
    lista.forEach(([gid]) => { cambios[`acomodo/${gid}/mesa`] = ''; });
    await update(ref(db), cambios);
    dlg.close();
    toast('Mesa eliminada');
  });

  $('#mesa-sin').addEventListener('change', async (e) => {
    if (!e.target.value) return;
    await update(ref(db, `acomodo/${e.target.value}`), { mesa: st.abierta, orden: invitadosDe(st.abierta).length });
  });
  $('#form-mesa-nuevo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const campo = e.currentTarget.nombre;
    const nombre = campo.value.trim();
    if (!nombre) return;
    campo.value = '';
    campo.focus();
    await set(push(ref(db, 'acomodo')), { nombre, mesa: st.abierta, orden: invitadosDe(st.abierta).length });
  });

  /* ---------- cambios en la lista (renombrar / mover / borrar) ---------- */
  document.addEventListener('change', async (e) => {
    const gid = e.target.dataset?.gid;
    if (!gid || !st.acomodo[gid]) return;
    if (e.target.classList.contains('ac-mesa')) {
      const mesa = e.target.value;
      await update(ref(db, `acomodo/${gid}`), { mesa, orden: mesa ? invitadosDe(mesa).length : 0 });
      const m = st.mesas[mesa];
      if (m && invitadosDe(mesa).length > Number(m.capacidad)) toast(`Ojo: la mesa ${m.numero} ya pasó su capacidad`);
    } else if (e.target.classList.contains('ac-nombre')) {
      const nombre = e.target.value.trim();
      if (nombre && nombre !== st.acomodo[gid].nombre) await update(ref(db, `acomodo/${gid}`), { nombre });
    }
  });
  $('#acomodo-lista').addEventListener('click', async (e) => {
    const b = e.target.closest('.ac-borrar');
    if (!b) return;
    const g = st.acomodo[b.dataset.gid];
    if (confirm(`¿Eliminar a "${g.nombre}" de la lista de mesas?`)) await set(ref(db, `acomodo/${b.dataset.gid}`), null);
  });
  $('#form-acomodo-nuevo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const nombre = f.nombre.value.trim();
    if (!nombre) return;
    const mesa = f.mesa.value;
    f.nombre.value = '';
    f.nombre.focus();
    await set(push(ref(db, 'acomodo')), { nombre, mesa, orden: mesa ? invitadosDe(mesa).length : 0 });
    toast('Invitado agregado');
  });
  $('#acomodo-buscar').addEventListener('input', (e) => { st.q = e.target.value; pintarLista(); });
  $('#acomodo-sin-mesa').addEventListener('change', (e) => { st.soloSinMesa = e.target.checked; pintarLista(); });

  /* ---------- exportar ---------- */
  $('#exportar-mesas').addEventListener('click', () => {
    const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = [['Mesa', 'Tipo', 'Capacidad', 'Invitado'].map(celda).join(',')];
    mesasOrdenadas().forEach(([mid, m]) => {
      const lista = invitadosDe(mid);
      if (!lista.length) filas.push([m.numero, TIPOS[m.tipo]?.nombre, m.capacidad, ''].map(celda).join(','));
      lista.forEach(([, g]) => filas.push([m.numero, TIPOS[m.tipo]?.nombre, m.capacidad, g.nombre].map(celda).join(',')));
    });
    Object.values(st.acomodo).filter((g) => !g.mesa || !st.mesas[g.mesa])
      .forEach((g) => filas.push(['Sin mesa', '', '', g.nombre].map(celda).join(',')));
    const blob = new Blob([`﻿${filas.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mesas-boda-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  return () => subs.forEach((cancelar) => cancelar());
}
