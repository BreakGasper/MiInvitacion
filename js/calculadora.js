/* Panel › Calculadora: lista de compras (cosa, cantidad, precio) contra el efectivo disponible.
   La lista en uso se guarda sola en /gastos/calculadora de Firebase:
   { disponible, nombre, guardadaId, items: { id: { concepto, cantidad, precio, incluir, orden } } }
   y las cotizaciones guardadas con nombre en /gastos/guardadas/{id}:
   { nombre, disponible, items, total, fecha } */
import {
  ref, onValue, set, update, push, remove, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

export function iniciarCalculadora({ db, esc, toast }) {
  const $ = (s, r = document) => r.querySelector(s);
  const st = { disponible: 0, items: {}, nombre: '', guardadaId: '', guardadas: {}, sel: new Set(), editando: false };
  const RUTA = 'gastos/calculadora';

  const mx = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const dinero = (v) => mx.format(Number(v) || 0);
  const num = (v) => {
    const n = Number(String(v ?? '').replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  };
  const subtotal = (x) => (Number(x.cantidad) || 0) * (Number(x.precio) || 0);
  const ordenados = () => Object.entries(st.items).sort(([, a], [, b]) => (a.orden || 0) - (b.orden || 0));
  const enUso = () => !!document.activeElement?.closest('#vista-calc');

  const pendientes = {};
  const sub = onValue(ref(db, RUTA), (snap) => {
    const v = snap.val() || {};
    // Lo que todavía se está guardando manda sobre lo que llega de Firebase
    const locales = st.items;
    st.items = v.items || {};
    Object.keys(pendientes).forEach((k) => { if (k !== 'disponible' && locales[k]) st.items[k] = locales[k]; });
    if (!('disponible' in pendientes)) st.disponible = Number(v.disponible) || 0;
    st.nombre = v.nombre || '';
    st.guardadaId = v.guardadaId || '';
    // Mientras escribes no se redibuja la lista (para no perder el cursor)
    if (enUso()) pintarTotales(); else pintarTodo();
  });

  const subGuardadas = onValue(ref(db, 'gastos/guardadas'), (snap) => {
    st.guardadas = snap.val() || {};
    pintarGuardadas();
    pintarEstado();
  });

  // Guardado con pausa para no escribir en cada tecla
  function guardarLuego(clave, fn) {
    clearTimeout(pendientes[clave]);
    pendientes[clave] = setTimeout(() => {
      delete pendientes[clave];
      fn().catch((err) => toast(`Error: ${err.code || err.message}`));
    }, 400);
  }

  /* ---------- pintar ---------- */
  function fila([id, x]) {
    return `
      <div class="calc-fila ${x.incluir === false ? 'fuera' : ''}" data-id="${esc(id)}">
        <input type="checkbox" class="int-check" name="incluir" ${x.incluir === false ? '' : 'checked'} aria-label="Contar en el total" title="Contar en el total">
        <input name="concepto" class="c-concepto" maxlength="80" value="${esc(x.concepto)}" aria-label="Cosa">
        <input name="cantidad" class="c-num" type="number" min="0" step="any" inputmode="decimal" value="${esc(x.cantidad)}" aria-label="Cantidad">
        <input name="precio" class="c-num" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(x.precio)}" aria-label="Precio por pieza">
        <span class="c-sub">${dinero(subtotal(x))}</span>
        <button type="button" class="b b-sec b-ico" data-quitar aria-label="Quitar"><i class="fa-solid fa-trash"></i></button>
      </div>`;
  }

  function pintarTodo() {
    const disp = $('#calc-disponible');
    if (document.activeElement !== disp) disp.value = st.disponible || '';
    const lista = ordenados();
    $('#calc-filas').innerHTML = lista.length
      ? lista.map(fila).join('')
      : '<p class="int-vacio">Agrega abajo lo que vas a comprar.</p>';
    pintarTotales();
  }

  function pintarTotales() {
    const lista = ordenados();
    const contar = lista.filter(([, x]) => x.incluir !== false);
    const total = contar.reduce((s, [, x]) => s + subtotal(x), 0);
    const piezas = contar.reduce((s, [, x]) => s + (Number(x.cantidad) || 0), 0);
    const dif = st.disponible - total;
    const avance = st.disponible > 0 ? Math.min(100, Math.round((total / st.disponible) * 100)) : 0;
    $('#calc-resumen').innerHTML = `
      <div class="dato"><div class="dato-n">${dinero(st.disponible)}</div><div class="dato-t">Efectivo disponible</div></div>
      <div class="dato"><div class="dato-n">${dinero(total)}</div><div class="dato-t">Total de la lista · ${contar.length} ${contar.length === 1 ? 'cosa' : 'cosas'}, ${piezas} piezas</div>
        <div class="barra-prog ${dif < 0 ? 'excedida' : ''}"><span style="width:${avance}%"></span></div></div>
      <div class="dato ${dif < 0 ? 'no' : 'si'}"><div class="dato-n">${dinero(Math.abs(dif))}</div>
        <div class="dato-t">${dif < 0 ? 'Te falta' : 'Te sobra'}</div></div>`;
    $('#calc-total').innerHTML = `
      <div><span>Total</span><b>${dinero(total)}</b></div>
      <div><span>Efectivo disponible</span><b>${dinero(st.disponible)}</b></div>
      <div class="${dif < 0 ? 'rojo' : 'verde'}"><span>${dif < 0 ? 'Te falta' : 'Te sobra'}</span><b>${dinero(Math.abs(dif))}</b></div>
      ${lista.length > contar.length ? `<p class="ayuda">${lista.length - contar.length} cosa(s) sin palomita no se cuentan en el total.</p>` : ''}`;
    pintarEstado();
  }

  /* ---------- cotizaciones guardadas ---------- */
  const totalDe = (items) => Object.values(items || {}).filter((x) => x.incluir !== false).reduce((s, x) => s + subtotal(x), 0);
  // Huella para saber si la lista cambió desde que se guardó
  const firma = (items, disponible) => JSON.stringify([Number(disponible) || 0, Object.values(items || {})
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .map((x) => [x.concepto || '', Number(x.cantidad) || 0, Number(x.precio) || 0, x.incluir !== false])]);
  const guardadaActual = () => (st.guardadaId ? st.guardadas[st.guardadaId] : null);
  const sinGuardar = () => {
    const g = guardadaActual();
    if (!g) return Object.keys(st.items).length > 0;
    return firma(g.items, g.disponible) !== firma(st.items, st.disponible);
  };

  // Una cotización guardada se abre en modo consulta; con "Editar" se puede cambiar.
  const enConsulta = () => !!guardadaActual() && !st.editando && !sinGuardar();
  function pintarModo() {
    const consulta = enConsulta();
    $('#vista-calc').classList.toggle('solo-lectura', consulta);
    document.querySelectorAll('#calc-filas input, #calc-disponible').forEach((i) => { i.disabled = consulta; });
    $('#calc-editar').hidden = !consulta;
    $('#calc-guardar').hidden = consulta;
    $('#calc-cancelar-ed').hidden = consulta || !guardadaActual();
  }

  function pintarEstado() {
    pintarModo();
    const g = guardadaActual();
    $('#calc-estado').innerHTML = g
      ? `<i class="fa-solid fa-file-invoice-dollar"></i> <b>${esc(g.nombre)}</b>
         ${sinGuardar() ? '<span class="etq pend">Cambios sin guardar</span>' : '<span class="etq si">Guardada</span>'}
         ${enConsulta() ? '<span class="etq env"><i class="fa-solid fa-eye"></i> Solo consulta</span>' : g ? '<span class="etq admin"><i class="fa-solid fa-pen"></i> Editando</span>' : ''}`
      : `<i class="fa-solid fa-file-circle-plus"></i> <b>${esc(st.nombre || 'Cotización nueva')}</b>
         ${Object.keys(st.items).length ? '<span class="etq pend">Sin guardar</span>' : ''}`;
  }

  function pintarGuardadas() {
    const lista = Object.entries(st.guardadas).sort(([, a], [, b]) => (b.fecha || 0) - (a.fecha || 0));
    st.sel.forEach((gid) => { if (!st.guardadas[gid]) st.sel.delete(gid); });
    pintarBarraUnir();
    $('#calc-guardadas').innerHTML = lista.length ? lista.map(([gid, g]) => {
      const total = Number(g.total) || totalDe(g.items);
      const dif = (Number(g.disponible) || 0) - total;
      const n = Object.keys(g.items || {}).length;
      const fecha = g.fecha ? new Date(g.fecha).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
      return `
        <div class="pase guardada ${gid === st.guardadaId ? 'abierta' : ''} ${st.sel.has(gid) ? 'elegida' : ''}">
          <div class="g-cab">
            <input type="checkbox" class="int-check" data-sel="${esc(gid)}" ${st.sel.has(gid) ? 'checked' : ''} aria-label="Seleccionar para unir">
            <div>
            <div class="pase-nombre">${esc(g.nombre)} ${gid === st.guardadaId ? '<span class="etq env">Abierta</span>' : ''}</div>
            <div class="pase-meta"><span>${n} ${n === 1 ? 'cosa' : 'cosas'}</span><span>Efectivo ${dinero(g.disponible)}</span><span>${fecha}</span></div>
            </div>
          </div>
          <div class="gasto-total">${dinero(total)}
            <div class="${dif < 0 ? 'rojo' : 'verde'} g-dif">${dif < 0 ? 'Falta' : 'Sobra'} ${dinero(Math.abs(dif))}</div></div>
          <div class="pase-btns">
            <button type="button" class="b b-pri" data-abrir="${esc(gid)}"><i class="fa-solid fa-folder-open"></i> Abrir</button>
            <button type="button" class="b b-sec" data-borrar-g="${esc(gid)}"><i class="fa-solid fa-trash"></i> Borrar</button>
          </div>
        </div>`;
    }).join('') : '<p class="int-vacio">Todavía no guardas ninguna cotización.</p>';
  }

  function pintarBarraUnir() {
    const n = st.sel.size;
    const total = [...st.sel].reduce((s, gid) => s + totalDe(st.guardadas[gid]?.items), 0);
    $('#calc-unir').disabled = n < 2;
    $('#calc-unir-txt').textContent = n < 2
      ? 'Marca 2 o más cotizaciones para unirlas'
      : `${n} seleccionadas · total ${dinero(total)}`;
  }

  // Junta las cosas de varias cotizaciones. Si la misma cosa (mismo nombre y precio)
  // aparece en varias, se suman las cantidades en un solo renglón.
  function unir(ids) {
    const items = {};
    const porClave = {};
    let orden = 0;
    ids.forEach((gid) => {
      Object.values(st.guardadas[gid].items || {})
        .sort((a, b) => (a.orden || 0) - (b.orden || 0))
        .forEach((x) => {
          const clave = `${String(x.concepto || '').trim().toLowerCase()}|${Number(x.precio) || 0}`;
          const ya = porClave[clave];
          if (ya) {
            ya.cantidad = Math.round(((Number(ya.cantidad) || 0) + (Number(x.cantidad) || 0)) * 100) / 100;
            ya.incluir = ya.incluir || x.incluir !== false;
            return;
          }
          const id = push(ref(db, `${RUTA}/items`)).key;
          items[id] = {
            concepto: x.concepto || '', cantidad: Number(x.cantidad) || 0, precio: Number(x.precio) || 0, incluir: x.incluir !== false, orden: ++orden,
          };
          porClave[clave] = items[id];
        });
    });
    return items;
  }

  function cancelarPendientes() {
    Object.keys(pendientes).forEach((k) => { clearTimeout(pendientes[k]); delete pendientes[k]; });
  }
  // Cambia la lista en uso (abrir una guardada o empezar una nueva)
  async function cargar({ items = {}, disponible = 0, nombre = '', guardadaId = '' }) {
    cancelarPendientes();
    Object.assign(st, { items: structuredClone(items), disponible, nombre, guardadaId, editando: false });
    pintarTodo();
    await set(ref(db, RUTA), { items, disponible, nombre, guardadaId });
  }

  /* ---------- eventos ---------- */
  $('#calc-disponible').addEventListener('input', (e) => {
    st.disponible = num(e.target.value);
    pintarTotales();
    guardarLuego('disponible', () => set(ref(db, `${RUTA}/disponible`), st.disponible));
  });

  function leerFila(f) {
    const id = f.dataset.id;
    st.items[id] = {
      ...st.items[id],
      concepto: f.querySelector('[name=concepto]').value.trim(),
      cantidad: num(f.querySelector('[name=cantidad]').value),
      precio: num(f.querySelector('[name=precio]').value),
      incluir: f.querySelector('[name=incluir]').checked,
    };
    f.classList.toggle('fuera', !st.items[id].incluir);
    f.querySelector('.c-sub').textContent = dinero(subtotal(st.items[id]));
    pintarTotales();
    const { concepto, cantidad, precio, incluir } = st.items[id];
    guardarLuego(id, () => update(ref(db, `${RUTA}/items/${id}`), { concepto, cantidad, precio, incluir }));
  }
  $('#calc-filas').addEventListener('input', (e) => { const f = e.target.closest('.calc-fila'); if (f) leerFila(f); });
  $('#calc-filas').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-quitar]');
    if (!b) return;
    const id = b.closest('.calc-fila').dataset.id;
    clearTimeout(pendientes[id]);
    delete pendientes[id];
    delete st.items[id];
    pintarTodo();
    try { await remove(ref(db, `${RUTA}/items/${id}`)); } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });

  $('#calc-nuevo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const datos = {
      concepto: f.concepto.value.trim(),
      cantidad: num(f.cantidad.value) || 1,
      precio: num(f.precio.value),
      incluir: true,
      orden: Math.max(0, ...Object.values(st.items).map((x) => x.orden || 0)) + 1,
    };
    if (!datos.concepto) { f.concepto.focus(); return; }
    const nuevo = push(ref(db, `${RUTA}/items`));
    st.items[nuevo.key] = datos;
    f.reset();
    pintarTodo();
    f.concepto.focus();
    try { await set(nuevo, datos); } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });

  $('#calc-guardar').addEventListener('click', async () => {
    if (!Object.keys(st.items).length) { toast('Agrega al menos una cosa antes de guardar'); return; }
    const g = guardadaActual();
    const nombre = (prompt('Nombre de la cotización (ej. "Refrescos Costco"):', g?.nombre || st.nombre || '') || '').trim().slice(0, 80);
    if (!nombre) return;
    const datos = {
      nombre, disponible: st.disponible, items: structuredClone(st.items), total: totalDe(st.items), fecha: serverTimestamp(),
    };
    try {
      // Mismo nombre que la abierta = se actualiza; nombre distinto = se guarda como otra cotización
      const destino = g && g.nombre === nombre ? ref(db, `gastos/guardadas/${st.guardadaId}`) : push(ref(db, 'gastos/guardadas'));
      await set(destino, datos);
      st.nombre = nombre;
      st.guardadaId = destino.key;
      st.editando = false;
      await update(ref(db, RUTA), { nombre, guardadaId: destino.key });
      pintarGuardadas();
      pintarEstado();
      toast(g && g.nombre === nombre ? 'Cotización actualizada' : `Cotización "${nombre}" guardada`);
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });

  $('#calc-editar').addEventListener('click', () => {
    st.editando = true;
    pintarEstado();
    $('#calc-nuevo').concepto.focus();
    toast('Ya puedes editar. Al terminar presiona "Guardar cotización".');
  });

  $('#calc-cancelar-ed').addEventListener('click', async () => {
    const g = guardadaActual();
    if (!g) return;
    if (sinGuardar() && !confirm('¿Descartar los cambios y regresar a como estaba guardada?')) return;
    try {
      await cargar({ items: g.items || {}, disponible: Number(g.disponible) || 0, nombre: g.nombre, guardadaId: st.guardadaId });
      toast('Cambios descartados');
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });

  $('#calc-nueva-cot').addEventListener('click', async () => {
    if (sinGuardar() && !confirm('Tienes cambios sin guardar en esta lista. ¿Empezar una nueva de todos modos?')) return;
    try {
      await cargar({ disponible: st.disponible });
      toast('Lista nueva (tu efectivo disponible se queda)');
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });

  $('#calc-guardadas').addEventListener('change', (e) => {
    const c = e.target.closest('[data-sel]');
    if (!c) return;
    if (c.checked) st.sel.add(c.dataset.sel); else st.sel.delete(c.dataset.sel);
    c.closest('.guardada').classList.toggle('elegida', c.checked);
    pintarBarraUnir();
  });

  $('#calc-unir').addEventListener('click', async () => {
    // En el orden en que aparecen en la lista
    const ids = Object.entries(st.guardadas).sort(([, a], [, b]) => (b.fecha || 0) - (a.fecha || 0))
      .map(([gid]) => gid).filter((gid) => st.sel.has(gid));
    if (ids.length < 2) return;
    if (sinGuardar() && !confirm('La lista actual tiene cambios sin guardar y se va a reemplazar. ¿Continuar?')) return;
    const nombres = ids.map((gid) => st.guardadas[gid].nombre);
    const disponible = st.disponible || Math.max(...ids.map((gid) => Number(st.guardadas[gid].disponible) || 0));
    try {
      await cargar({ items: unir(ids), disponible, nombre: nombres.join(' + ').slice(0, 80), guardadaId: '' });
      st.sel.clear();
      pintarGuardadas();
      $('#vista-calc').scrollIntoView({ behavior: 'smooth' });
      toast(`Uniste ${ids.length} cotizaciones. Revisa la lista y presiona "Guardar cotización".`);
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });

  $('#calc-guardadas').addEventListener('click', async (e) => {
    const abrir = e.target.closest('[data-abrir]');
    const borrar = e.target.closest('[data-borrar-g]');
    try {
      if (abrir) {
        const gid = abrir.dataset.abrir;
        const g = st.guardadas[gid];
        if (!g) return;
        if (sinGuardar() && !confirm('La lista actual tiene cambios sin guardar y se va a reemplazar. ¿Continuar?')) return;
        await cargar({ items: g.items || {}, disponible: Number(g.disponible) || 0, nombre: g.nombre, guardadaId: gid });
        $('#vista-calc').scrollIntoView({ behavior: 'smooth' });
        toast(`Abriste "${g.nombre}"`);
      } else if (borrar) {
        const gid = borrar.dataset.borrarG;
        const g = st.guardadas[gid];
        if (!g || !confirm(`¿Borrar la cotización "${g.nombre}"?`)) return;
        await remove(ref(db, `gastos/guardadas/${gid}`));
        if (gid === st.guardadaId) {
          st.guardadaId = '';
          await update(ref(db, RUTA), { guardadaId: '' });
        }
        toast('Cotización borrada');
      }
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });

  $('#calc-excel').addEventListener('click', () => {
    const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = [['Cosa', 'Cantidad', 'Precio', 'Subtotal', 'Cuenta en el total'].map(celda).join(',')];
    let total = 0;
    ordenados().forEach(([, x]) => {
      if (x.incluir !== false) total += subtotal(x);
      filas.push([x.concepto, x.cantidad, x.precio, subtotal(x), x.incluir === false ? 'No' : 'Sí'].map(celda).join(','));
    });
    filas.push('', ['Total', '', '', total].map(celda).join(','), ['Efectivo disponible', '', '', st.disponible].map(celda).join(','),
      [st.disponible - total < 0 ? 'Te falta' : 'Te sobra', '', '', Math.abs(st.disponible - total)].map(celda).join(','));
    const blob = new Blob([`﻿${filas.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const nombre = (guardadaActual()?.nombre || 'calculadora').replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/g, '').trim().replace(/\s+/g, '-');
    a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ---------- recibo por WhatsApp (texto o imagen) ---------- */
  const NOVIOS = `${window.INVITACION?.novios?.nombre1 || 'Carlos'} & ${window.INVITACION?.novios?.nombre2 || 'Monse'}`;
  const fechaLarga = () => new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const cant = (v) => (Number(v) || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 });

  function datosRecibo() {
    const f = $('#form-recibo');
    const cosas = ordenados().map(([, x]) => x).filter((x) => x.incluir !== false);
    const total = cosas.reduce((s, x) => s + subtotal(x), 0);
    return {
      titulo: guardadaActual()?.nombre || st.nombre || 'Cotización',
      cosas, total,
      efectivo: f.efectivo.checked,
      mensaje: f.mensaje.value.trim(),
    };
  }

  function textoRecibo(r) {
    const dif = st.disponible - r.total;
    return [
      r.mensaje,
      r.mensaje ? '' : null,
      `🧾 *Cotización: ${r.titulo}*`,
      `Boda ${NOVIOS} · ${fechaLarga()}`,
      '',
      ...r.cosas.map((x) => `• ${x.concepto}\n   ${cant(x.cantidad)} × ${dinero(x.precio)} = *${dinero(subtotal(x))}*`),
      '',
      `*TOTAL: ${dinero(r.total)}*`,
      ...(r.efectivo ? [`Efectivo disponible: ${dinero(st.disponible)}`, `${dif < 0 ? 'Falta' : 'Sobra'}: ${dinero(Math.abs(dif))}`] : []),
    ].filter((l) => l !== null).join('\n');
  }

  function pintarVistaRecibo() { $('#recibo-vista').textContent = textoRecibo(datosRecibo()); }

  async function imagenRecibo(r) {
    try { await Promise.all([document.fonts.load('48px MonteCarlo'), document.fonts.load('600 20px Outfit'), document.fonts.load('400 20px Outfit')]); } catch (e) { /* sin fuente: usa la del sistema */ }
    const W = 600;
    const FILA = 58;
    const extra = r.efectivo ? 70 : 0;
    const H = 200 + r.cosas.length * FILA + 120 + extra + 60;
    const k = 2;
    const cv = document.createElement('canvas');
    cv.width = W * k; cv.height = H * k;
    const c = cv.getContext('2d');
    c.scale(k, k);
    const AZUL = '#1f3557'; const ORO = '#b3813d'; const GRIS = '#77716b'; const TXT = '#2b2a28';
    c.fillStyle = '#fffdf9'; c.fillRect(0, 0, W, H);
    // Encabezado
    c.fillStyle = AZUL; c.fillRect(0, 0, W, 120);
    c.fillStyle = ORO; c.fillRect(0, 120, W, 4);
    c.textAlign = 'center';
    c.fillStyle = '#e9cf9c'; c.font = '52px MonteCarlo, cursive';
    c.fillText(NOVIOS, W / 2, 68);
    c.fillStyle = '#ffffff'; c.font = '500 14px Outfit, sans-serif';
    c.fillText('C O T I Z A C I Ó N', W / 2, 100);
    // Título y fecha
    const recorta = (t, max) => { let s = String(t); while (s.length > 1 && c.measureText(s).width > max) s = s.slice(0, -1); return s === String(t) ? s : `${s.trimEnd()}…`; };
    c.fillStyle = TXT; c.font = '600 22px Outfit, sans-serif';
    c.fillText(recorta(r.titulo, W - 60), W / 2, 162);
    c.fillStyle = GRIS; c.font = '400 14px Outfit, sans-serif';
    c.fillText(fechaLarga(), W / 2, 184);
    // Renglones
    let y = 200;
    r.cosas.forEach((x, i) => {
      if (i % 2 === 0) { c.fillStyle = '#f7f4ee'; c.fillRect(24, y, W - 48, FILA); }
      c.textAlign = 'left'; c.fillStyle = TXT; c.font = '500 17px Outfit, sans-serif';
      c.fillText(recorta(x.concepto, W - 230), 40, y + 25);
      c.fillStyle = GRIS; c.font = '400 13px Outfit, sans-serif';
      c.fillText(`${cant(x.cantidad)} × ${dinero(x.precio)}`, 40, y + 45);
      c.textAlign = 'right'; c.fillStyle = TXT; c.font = '600 17px Outfit, sans-serif';
      c.fillText(dinero(subtotal(x)), W - 40, y + 35);
      y += FILA;
    });
    // Total
    y += 18;
    c.strokeStyle = ORO; c.lineWidth = 2; c.setLineDash([6, 5]);
    c.beginPath(); c.moveTo(24, y); c.lineTo(W - 24, y); c.stroke(); c.setLineDash([]);
    y += 48;
    c.textAlign = 'left'; c.fillStyle = AZUL; c.font = '700 24px Outfit, sans-serif'; c.fillText('TOTAL', 40, y);
    c.textAlign = 'right'; c.fillText(dinero(r.total), W - 40, y);
    c.textAlign = 'left'; c.fillStyle = GRIS; c.font = '400 13px Outfit, sans-serif';
    c.fillText(`${r.cosas.length} ${r.cosas.length === 1 ? 'concepto' : 'conceptos'}`, 40, y + 22);
    if (r.efectivo) {
      const dif = st.disponible - r.total;
      y += 58;
      c.font = '400 16px Outfit, sans-serif'; c.fillStyle = TXT;
      c.textAlign = 'left'; c.fillText('Efectivo disponible', 40, y);
      c.textAlign = 'right'; c.fillText(dinero(st.disponible), W - 40, y);
      y += 26;
      c.font = '600 16px Outfit, sans-serif'; c.fillStyle = dif < 0 ? '#b0473f' : '#2f8a4c';
      c.textAlign = 'left'; c.fillText(dif < 0 ? 'Falta' : 'Sobra', 40, y);
      c.textAlign = 'right'; c.fillText(dinero(Math.abs(dif)), W - 40, y);
    }
    // Pie
    c.textAlign = 'center'; c.fillStyle = ORO; c.font = '400 13px Outfit, sans-serif';
    c.fillText('Boda · 19 de diciembre de 2026', W / 2, H - 24);
    return new Promise((ok) => cv.toBlob(ok, 'image/png'));
  }

  $('#calc-whatsapp').addEventListener('click', () => {
    if (!ordenados().some(([, x]) => x.incluir !== false)) { toast('La lista está vacía'); return; }
    pintarVistaRecibo();
    $('#dlg-recibo').showModal();
  });
  $('#form-recibo').addEventListener('input', pintarVistaRecibo);
  $('#cerrar-recibo').addEventListener('click', () => $('#dlg-recibo').close());

  $('#form-recibo').addEventListener('submit', (e) => {
    e.preventDefault();
    const tel = e.currentTarget.telefono.value.replace(/\D/g, '');
    if (tel && tel.length !== 10 && tel.length !== 12) { toast('El teléfono debe tener 10 dígitos'); return; }
    const destino = tel ? (tel.length === 10 ? `52${tel}` : tel) : '';
    window.open(`https://wa.me/${destino}?text=${encodeURIComponent(textoRecibo(datosRecibo()))}`, '_blank', 'noopener');
    $('#dlg-recibo').close();
  });

  $('#recibo-imagen').addEventListener('click', async () => {
    const r = datosRecibo();
    const blob = await imagenRecibo(r);
    const nombre = `cotizacion-${r.titulo.replace(/[^\wáéíóúñ-]+/gi, '-').toLowerCase()}.png`;
    const archivo = new File([blob], nombre, { type: 'image/png' });
    // En el celular abre "Compartir" (eliges WhatsApp); en la computadora se descarga
    if (navigator.canShare?.({ files: [archivo] })) {
      try { await navigator.share({ files: [archivo], title: `Cotización: ${r.titulo}` }); } catch (err) { /* canceló */ }
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Se descargó la imagen del recibo: adjúntala en tu chat de WhatsApp');
  });

  return () => { sub(); subGuardadas(); };
}
