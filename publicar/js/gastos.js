/* Panel › Gastos: proveedores, pagos a proveedores, abonos de padrinos y cotizaciones.
   Datos en /gastos de Firebase (solo administradores):
   proveedores/{id}  { nombre, total, padrino, presupuesto, consigue, descripcion, orden }
   pagos/{id}        { proveedor, monto, fecha, nota }   → lo que ya se le pagó al proveedor
   aportes/{id}      { proveedor, monto, fecha, nota }   → lo que el padrino ya nos dio
   cotizaciones/{id} { proveedor, opcion, precio, piezas, cantidad, elegida } */
import {
  ref, onValue, set, update, push, remove, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const NODOS = ['proveedores', 'pagos', 'aportes', 'cotizaciones'];
const CONSIGUE = { novios: 'Novios', ellos: 'Padrino' };

export function iniciarGastos({ db, esc, toast }) {
  const $ = (s, r = document) => r.querySelector(s);
  const st = {
    proveedores: {}, pagos: {}, aportes: {}, cotizaciones: {},
    q: '', filtro: 'todos', vista: 'tarjetas', abierto: null, abono: null,
  };
  const subs = [];
  const cargados = new Set();
  NODOS.forEach((n) => {
    subs.push(onValue(ref(db, `gastos/${n}`), (snap) => {
      st[n] = snap.val() || {};
      cargados.add(n);
      if (cargados.size === NODOS.length) { pintar(); if ($('#dlg-gasto').open) pintarDetalle(); }
    }));
  });

  /* ---------- utilidades ---------- */
  const mx = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const dinero = (v) => mx.format(Number(v) || 0);
  const num = (v) => {
    const n = Number(String(v ?? '').replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  };
  const hoy = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
  const fechaTxt = (f) => (f
    ? new Date(`${f}T12:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Sin fecha');
  const pct = (a, b) => (b > 0 ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : 0);

  const movs = (nodo, pid) => Object.entries(st[nodo])
    .filter(([, m]) => m.proveedor === pid)
    .sort(([, a], [, b]) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || (b.creado || 0) - (a.creado || 0));
  const suma = (nodo, pid) => movs(nodo, pid).reduce((s, [, m]) => s + (Number(m.monto) || 0), 0);
  const cotizacionesDe = (pid) => Object.entries(st.cotizaciones)
    .filter(([, c]) => c.proveedor === pid)
    .sort(([, a], [, b]) => (a.creado || 0) - (b.creado || 0));

  function calc(pid) {
    const p = st.proveedores[pid] || {};
    const total = Number(p.total) || 0;
    const presupuesto = Number(p.presupuesto) || 0;
    const pagado = suma('pagos', pid);
    const recibido = suma('aportes', pid);
    return {
      total, presupuesto, pagado, recibido,
      faltaPagar: total - pagado,
      faltaRecibir: presupuesto - recibido,
      sobra: presupuesto - total,
    };
  }
  const ordenados = () => Object.entries(st.proveedores)
    .sort(([, a], [, b]) => (a.orden ?? 0) - (b.orden ?? 0) || String(a.nombre).localeCompare(b.nombre));

  const FILTROS = {
    todos: () => true,
    porpagar: (p, c) => c.faltaPagar > 0,
    pagados: (p, c) => c.total > 0 && c.faltaPagar <= 0,
    porrecibir: (p, c) => c.faltaRecibir > 0,
    noalcanza: (p, c) => c.sobra < 0,
    ellos: (p) => p.consigue === 'ellos',
  };
  function visibles() {
    const q = st.q.trim().toLowerCase();
    return ordenados().filter(([pid, p]) => {
      const c = calc(pid);
      if (!FILTROS[st.filtro](p, c)) return false;
      if (!q) return true;
      return [p.nombre, p.padrino, p.descripcion].some((t) => String(t || '').toLowerCase().includes(q));
    });
  }

  /* ---------- pintar ---------- */
  function pintar() {
    const todos = ordenados();
    const t = todos.reduce((s, [pid]) => {
      const c = calc(pid);
      Object.keys(s).forEach((k) => { s[k] += c[k]; });
      return s;
    }, { total: 0, pagado: 0, faltaPagar: 0, presupuesto: 0, recibido: 0, faltaRecibir: 0 });

    $('#gastos-resumen').innerHTML = `
      <div class="dato"><div class="dato-n">${dinero(t.total)}</div><div class="dato-t">Costo total · ${todos.length} proveedores</div></div>
      <div class="dato si"><div class="dato-n">${dinero(t.pagado)}</div><div class="dato-t">Pagado a proveedores</div>
        <div class="barra-prog"><span style="width:${pct(t.pagado, t.total)}%"></span></div></div>
      <div class="dato no"><div class="dato-n">${dinero(t.faltaPagar)}</div><div class="dato-t">Falta pagar</div></div>
      <div class="dato"><div class="dato-n">${dinero(t.presupuesto)}</div><div class="dato-t">Ofrecido por padrinos</div></div>
      <div class="dato si"><div class="dato-n">${dinero(t.recibido)}</div><div class="dato-t">Recibido de padrinos</div>
        <div class="barra-prog"><span style="width:${pct(t.recibido, t.presupuesto)}%"></span></div></div>
      <div class="dato pend"><div class="dato-n">${dinero(t.faltaRecibir)}</div><div class="dato-t">Falta que nos den</div></div>`;

    const lista = visibles();
    $('#gastos-conteo').textContent = `${lista.length} de ${todos.length} proveedores`;
    if (!lista.length) {
      $('#gastos-lista').innerHTML = '<p class="vacio">No hay proveedores con ese filtro.</p>';
      return;
    }
    $('#gastos-lista').innerHTML = st.vista === 'tabla' ? tabla(lista) : lista.map(tarjeta).join('');
  }

  function tarjeta([pid, p]) {
    const c = calc(pid);
    const cot = cotizacionesDe(pid);
    const elegida = cot.find(([, x]) => x.elegida);
    const clase = c.total > 0 && c.faltaPagar <= 0 ? 'si' : c.pagado > 0 ? 'pend' : c.total > 0 ? 'no' : '';
    const sinCosto = !c.total && !c.presupuesto;
    return `
      <article class="pase gasto ${clase}">
        <div>
          <div class="pase-nombre">${esc(p.nombre)}</div>
          <div class="pase-meta">
            <span><i class="fa-solid fa-hand-holding-heart"></i> ${esc(p.padrino || 'Sin padrino')}</span>
            <span class="etq ${p.consigue === 'ellos' ? 'admin' : 'env'}">Lo consigue: ${CONSIGUE[p.consigue] || 'Novios'}</span>
          </div>
        </div>
        <div class="gasto-total">${dinero(c.total)}</div>
        ${sinCosto ? '<div class="pase-det">Sin costo para los novios.</div>' : `
        <div class="gasto-barras">
          <div class="gb">
            <div class="gb-t"><span>Pagado al proveedor</span><b>${dinero(c.pagado)} de ${dinero(c.total)}</b></div>
            <div class="barra-prog"><span style="width:${pct(c.pagado, c.total)}%"></span></div>
            <div class="gb-f">${c.faltaPagar > 0 ? `Falta pagar <b class="rojo">${dinero(c.faltaPagar)}</b>` : c.total > 0 ? '<b class="verde">Pagado completo</b>' : ''}</div>
          </div>
          <div class="gb">
            <div class="gb-t"><span>Nos ha dado el padrino</span><b>${dinero(c.recibido)} de ${dinero(c.presupuesto)}</b></div>
            <div class="barra-prog dorada"><span style="width:${pct(c.recibido, c.presupuesto)}%"></span></div>
            <div class="gb-f">${c.faltaRecibir > 0 ? `Falta que nos dé <b class="ambar">${dinero(c.faltaRecibir)}</b>` : c.presupuesto > 0 ? '<b class="verde">Ya lo dio completo</b>' : ''}</div>
          </div>
        </div>
        <div class="pase-det">${c.sobra < 0
    ? `<b class="rojo">No alcanza: faltan ${dinero(-c.sobra)}</b> entre lo que da el padrino y el costo.`
    : c.sobra > 0 ? `Sobran <b class="verde">${dinero(c.sobra)}</b> de lo que da el padrino.` : 'Lo que da el padrino cubre justo el costo.'}</div>`}
        ${p.descripcion ? `<div class="pase-nota">${esc(p.descripcion)}</div>` : ''}
        ${cot.length ? `<div class="pase-det"><i class="fa-solid fa-scale-balanced"></i> ${cot.length} ${cot.length > 1 ? 'cotizaciones' : 'cotización'}${elegida ? ` · elegida: <b>${esc(elegida[1].opcion)}</b>` : ''}</div>` : ''}
        <div class="pase-btns">
          <button type="button" class="b b-pri" data-abono="pagos" data-id="${esc(pid)}"><i class="fa-solid fa-money-bill-wave"></i> Pagar a proveedor</button>
          <button type="button" class="b b-sec" data-abono="aportes" data-id="${esc(pid)}"><i class="fa-solid fa-hand-holding-dollar"></i> Abono del padrino</button>
          <button type="button" class="b b-sec" data-ver="${esc(pid)}"><i class="fa-solid fa-list"></i> Detalle</button>
        </div>
      </article>`;
  }

  function tabla(lista) {
    const t = { total: 0, pagado: 0, faltaPagar: 0, presupuesto: 0, recibido: 0, sobra: 0, faltaRecibir: 0 };
    const filas = lista.map(([pid, p]) => {
      const c = calc(pid);
      Object.keys(t).forEach((k) => { t[k] += c[k]; });
      return `<tr data-ver="${esc(pid)}">
        <td class="izq"><b>${esc(p.nombre)}</b></td>
        <td>${dinero(c.total)}</td><td>${dinero(c.pagado)}</td><td class="${c.faltaPagar > 0 ? 'rojo' : ''}">${dinero(c.faltaPagar)}</td>
        <td class="izq">${esc(p.padrino || '')}</td>
        <td>${dinero(c.presupuesto)}</td><td>${dinero(c.recibido)}</td>
        <td class="${c.sobra < 0 ? 'rojo' : ''}">${dinero(c.sobra)}</td><td class="${c.faltaRecibir > 0 ? 'ambar' : ''}">${dinero(c.faltaRecibir)}</td>
        <td>${CONSIGUE[p.consigue] || 'Novios'}</td>
        <td class="izq desc">${esc(p.descripcion || '')}</td>
      </tr>`;
    }).join('');
    return `
      <div class="tabla-scroll">
        <table class="tabla tabla-gastos">
          <thead><tr>
            <th class="izq">Proveedor</th><th>Total</th><th>Pagado</th><th>Faltante</th>
            <th class="izq">Padrino</th><th>Presupuesto</th><th>Abono</th><th>Sobra</th><th>Falta</th>
            <th>Lo consigue</th><th class="izq">Descripción</th>
          </tr></thead>
          <tbody>${filas}</tbody>
          <tfoot><tr>
            <td class="izq">Totales</td><td>${dinero(t.total)}</td><td>${dinero(t.pagado)}</td><td>${dinero(t.faltaPagar)}</td><td></td>
            <td>${dinero(t.presupuesto)}</td><td>${dinero(t.recibido)}</td><td>${dinero(t.sobra)}</td><td>${dinero(t.faltaRecibir)}</td><td></td><td></td>
          </tr></tfoot>
        </table>
      </div>`;
  }

  /* ---------- detalle de un proveedor ---------- */
  function abrirProveedor(pid) {
    st.abierto = pid;
    const p = pid ? st.proveedores[pid] : { consigue: 'novios' };
    const f = $('#form-gasto');
    f.nombre.value = p.nombre || '';
    f.total.value = p.total ?? '';
    f.padrino.value = p.padrino || '';
    f.presupuesto.value = p.presupuesto ?? '';
    f.consigue.value = p.consigue || 'novios';
    f.descripcion.value = p.descripcion || '';
    $('#dlg-gasto-t').textContent = pid ? p.nombre : 'Nuevo proveedor';
    $('#eliminar-gasto').hidden = !pid;
    pintarDetalle();
    if (!$('#dlg-gasto').open) $('#dlg-gasto').showModal();
    if (!pid) f.nombre.focus();
  }

  function listaMovs(nodo, pid, vacio) {
    const m = movs(nodo, pid);
    if (!m.length) return `<p class="int-vacio">${vacio}</p>`;
    return `<ul class="movs">${m.map(([mid, x]) => `
      <li>
        <span class="mov-f">${fechaTxt(x.fecha)}</span>
        <span class="mov-n">${esc(x.nota || '')}</span>
        <b>${dinero(x.monto)}</b>
        <button type="button" class="b b-sec b-ico" data-borrar="${nodo}" data-mid="${esc(mid)}" aria-label="Borrar"><i class="fa-solid fa-trash"></i></button>
      </li>`).join('')}</ul>`;
  }
  const formMov = (nodo, texto) => `
    <form class="mov-nuevo" data-nuevo="${nodo}">
      <input name="monto" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Monto $" required aria-label="Monto">
      <input name="fecha" type="date" value="${hoy()}" aria-label="Fecha">
      <input name="nota" maxlength="120" placeholder="Nota (opcional)" aria-label="Nota">
      <button type="submit" class="b b-pri"><i class="fa-solid fa-plus"></i> ${texto}</button>
    </form>`;

  function pintarDetalle() {
    const pid = st.abierto;
    const cont = $('#gasto-detalle');
    if (!pid || !st.proveedores[pid]) { cont.innerHTML = ''; return; }
    const c = calc(pid);
    const cot = cotizacionesDe(pid);
    cont.innerHTML = `
      <section class="det-sec">
        <h3><i class="fa-solid fa-money-bill-wave"></i> Pagos al proveedor
          <small>${dinero(c.pagado)} de ${dinero(c.total)} · falta ${dinero(c.faltaPagar)}</small></h3>
        ${listaMovs('pagos', pid, 'Todavía no hay pagos.')}
        ${formMov('pagos', 'Pago')}
      </section>
      <section class="det-sec">
        <h3><i class="fa-solid fa-hand-holding-dollar"></i> Abonos del padrino
          <small>${dinero(c.recibido)} de ${dinero(c.presupuesto)} · falta ${dinero(c.faltaRecibir)}</small></h3>
        ${listaMovs('aportes', pid, 'El padrino todavía no ha dado abonos.')}
        ${formMov('aportes', 'Abono')}
      </section>
      <section class="det-sec">
        <h3><i class="fa-solid fa-scale-balanced"></i> Cotizaciones</h3>
        ${cot.length ? `<ul class="movs cots">${cot.map(([cid, x]) => {
    const piezas = Math.max(1, Number(x.piezas) || 1);
    const sub = (Number(x.precio) || 0) * (Number(x.cantidad) || 0);
    return `<li class="${x.elegida ? 'elegida' : ''}">
            <button type="button" class="b b-ico estrella" data-elegir="${esc(cid)}" aria-label="Marcar como elegida" title="Marcar como elegida">
              <i class="fa-${x.elegida ? 'solid' : 'regular'} fa-star"></i></button>
            <span class="mov-n"><b>${esc(x.opcion)}</b><br>
              <small>${dinero(x.precio)}${piezas > 1 ? ` por ${piezas} piezas · ${dinero(x.precio / piezas)} c/u` : ''}</small>
              ${x.cantidad ? `<br><small>× ${esc(x.cantidad)} = <b>${dinero(sub)}</b>
                <button type="button" class="enlace" data-usar="${sub}">Usar como costo total</button></small>` : ''}</span>
            <button type="button" class="b b-sec b-ico" data-borrar="cotizaciones" data-mid="${esc(cid)}" aria-label="Borrar"><i class="fa-solid fa-trash"></i></button>
          </li>`;
  }).join('')}</ul>` : '<p class="int-vacio">Sin cotizaciones.</p>'}
        <form class="mov-nuevo cot-nueva" data-nuevo="cotizaciones">
          <input name="opcion" maxlength="80" placeholder="Opción (ej. Modelo)" required aria-label="Opción">
          <input name="precio" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Precio $" required aria-label="Precio">
          <input name="piezas" type="number" min="1" step="1" placeholder="Piezas (ej. 24)" aria-label="Piezas por paquete">
          <input name="cantidad" type="number" min="0" step="1" placeholder="¿Cuántos?" aria-label="Cantidad a comprar">
          <button type="submit" class="b b-pri"><i class="fa-solid fa-plus"></i> Cotización</button>
        </form>
        ${cot.length >= 2 ? bloqueReparto(pid, cot) : ''}
      </section>`;
  }

  /* ---------- repartir un presupuesto entre las cotizaciones (cerveza, refresco…) ---------- */
  function combinar(rangos, cb) {
    const c = new Array(rangos.length).fill(0);
    (function rec(i) {
      if (i === rangos.length) { cb(c); return; }
      for (let k = rangos[i][0]; k <= rangos[i][1]; k++) { c[i] = k; rec(i + 1); }
    }(0));
  }

  // Devuelve dos repartos: o1 = mismo dinero por marca, o2 = casi las mismas cajas por marca.
  // Reglas: al menos 1 caja de cada una, sin pasarse del presupuesto y, si se indica,
  // la marca "menos" lleva menos cajas que todas las demás.
  function repartir(items, presupuesto, menos) {
    const n = items.length;
    const precios = items.map((x) => Number(x.precio) || 0);
    if (n < 2 || presupuesto <= 0 || precios.some((p) => p <= 0)) return null;
    const maxP = Math.max(...precios);
    const valido = (c) => c.every((k) => k >= 1) && (menos < 0 || c.every((k, i) => i === menos || c[menos] < k));
    const buscar = (objetivo, puntaje) => {
      let mejor = null;
      for (const r of n <= 4 ? [3, 8] : [2, 4]) {
        combinar(objetivo.map((t) => [Math.max(1, Math.floor(t) - r), Math.ceil(t) + r]), (c) => {
          const costo = c.reduce((s, k, i) => s + k * precios[i], 0);
          if (costo > presupuesto || !valido(c)) return;
          const p = puntaje(c, presupuesto - costo);
          if (!mejor || p < mejor.p) mejor = { p, c: [...c], costo };
        });
        if (mejor) break;
      }
      if (!mejor) return null;
      const piezas = mejor.c.reduce((s, k, i) => s + k * Math.max(1, Number(items[i].piezas) || 1), 0);
      return { cajas: mejor.c, costo: mejor.costo, sobra: presupuesto - mejor.costo, piezas };
    };
    // 1) mismo dinero: que el gasto por marca quede parejo y sobre lo menos posible
    const o1 = buscar(precios.map((p) => presupuesto / n / p), (c, sobra) => {
      const gasto = c.map((k, i) => k * precios[i]);
      return sobra + Math.max(...gasto) - Math.min(...gasto);
    });
    // 2) mismas cajas: diferencia de cajas (cada caja de más pesa como la caja más cara) + lo que sobra
    const k = presupuesto / precios.reduce((s, p) => s + p, 0);
    const o2 = buscar(precios.map(() => k), (c, sobra) => {
      const otras = c.filter((_, i) => i !== menos);
      const dif = Math.max(...otras) - Math.min(...otras) + (menos >= 0 ? Math.min(...otras) - 1 - c[menos] : 0);
      return dif * maxP + sobra;
    });
    return o1 && o2 ? { o1, o2 } : null;
  }

  function tablaReparto(num, titulo, items, o, unidad, recomendada) {
    return `
      <div class="op ${recomendada ? 'recomendada' : ''}">
        <h5>Opción ${num} · ${titulo} ${recomendada ? '<span class="etq si">Recomendada</span>' : ''}</h5>
        <table class="tabla tabla-rep">
          <thead><tr><th class="izq">Marca</th><th>Cajas</th><th>${unidad}</th><th>Costo</th></tr></thead>
          <tbody>${items.map((x, i) => {
    const piezas = Math.max(1, Number(x.piezas) || 1);
    return `<tr><td class="izq">${esc(x.opcion)}</td><td>${o.cajas[i]}</td><td>${o.cajas[i] * piezas}</td><td>${dinero(o.cajas[i] * x.precio)}</td></tr>`;
  }).join('')}</tbody>
          <tfoot>
            <tr><td class="izq">Total</td><td>${o.cajas.reduce((s, k) => s + k, 0)}</td><td>${o.piezas}</td><td>${dinero(o.costo)}</td></tr>
            <tr class="sobra"><td class="izq" colspan="3">Te sobra</td><td>${dinero(o.sobra)}</td></tr>
          </tfoot>
        </table>
        <button type="button" class="b b-sec" data-usar-op="${num}"><i class="fa-solid fa-check"></i> Usar esta opción</button>
      </div>`;
  }

  function bloqueReparto(pid, cot) {
    const p = st.proveedores[pid];
    const cfg = p.reparto || {};
    const presupuesto = Number(cfg.presupuesto) || 0;
    const items = cot.map(([cid, x]) => ({ cid, ...x }));
    const menos = items.findIndex((x) => x.cid === cfg.menos);
    const unidad = /cerve/i.test(p.nombre) ? 'Cervezas' : 'Piezas';
    let res = '';
    if (presupuesto > 0) {
      const ops = repartir(items, presupuesto, menos);
      st.ultimoReparto = ops ? { pid, items, ops } : null;
      if (!ops) {
        res = '<p class="aviso">No alcanza el presupuesto para comprar al menos una caja de cada marca con esas reglas.</p>';
      } else {
        const { o1, o2 } = ops;
        const iguales = o1.cajas.join() === o2.cajas.join();
        const rec = o2.sobra < o1.sobra || (o2.sobra === o1.sobra && o2.piezas >= o1.piezas) ? 2 : 1;
        const [r, o] = rec === 2 ? [o2, o1] : [o1, o2];
        const baratas = items.reduce((a, x) => (x.precio / (x.piezas || 1) < a.precio / (a.piezas || 1) ? x : a));
        const masPiezas = o.piezas - r.piezas;
        const porque = iguales
          ? 'Las dos formas dan el mismo resultado.'
          : rec === 2
            ? `Te recomiendo la <b>opción 2</b>: las marcas quedan casi parejas (ninguna se acaba a media fiesta) y sobra solo <b>${dinero(r.sobra)}</b>.${masPiezas > 0 ? ` La opción 1 da ${masPiezas} ${unidad.toLowerCase()} más porque compra más ${esc(baratas.opcion)} (la más barata), pero sobra ${dinero(o.sobra)} y la mezcla queda dispareja.` : ''}`
            : `Te recomiendo la <b>opción 1</b>: aprovechas mejor el dinero (sobra solo <b>${dinero(r.sobra)}</b>) y le das el mismo peso a cada marca.${masPiezas < 0 ? ` Además te da ${-masPiezas} ${unidad.toLowerCase()} más.` : ''}`;
        res = `
          <div class="ops">
            ${tablaReparto(1, 'Mismo dinero por marca', items, o1, unidad, !iguales && rec === 1)}
            ${tablaReparto(2, 'Casi las mismas cajas', items, o2, unidad, !iguales && rec === 2)}
          </div>
          <p class="reco"><i class="fa-solid fa-lightbulb"></i> ${porque}</p>`;
      }
    }
    return `
      <div class="reparto">
        <h4><i class="fa-solid fa-calculator"></i> Repartir un presupuesto</h4>
        <form class="reparto-f" data-reparto>
          <label>Presupuesto $ <input name="presupuesto" type="number" min="1" step="1" inputmode="numeric" value="${presupuesto || ''}" required></label>
          <label>Menos cajas de
            <select name="menos"><option value="">Ninguna</option>${items.map((x) => `<option value="${esc(x.cid)}" ${x.cid === cfg.menos ? 'selected' : ''}>${esc(x.opcion)}</option>`).join('')}</select>
          </label>
          <button type="submit" class="b b-pri"><i class="fa-solid fa-calculator"></i> Calcular</button>
        </form>
        ${res}
      </div>`;
  }

  /* ---------- eventos ---------- */
  $('#gastos-buscar').addEventListener('input', (e) => { st.q = e.target.value; pintar(); });
  $('#gastos-filtros').addEventListener('click', (e) => {
    const b = e.target.closest('[data-gf]');
    if (!b) return;
    st.filtro = b.dataset.gf;
    document.querySelectorAll('#gastos-filtros .chip').forEach((x) => x.classList.toggle('activo', x === b));
    pintar();
  });
  $('#gastos-vista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-gv]');
    if (!b) return;
    st.vista = b.dataset.gv;
    document.querySelectorAll('#gastos-vista .chip').forEach((x) => x.classList.toggle('activo', x === b));
    pintar();
  });
  $('#btn-nuevo-gasto').addEventListener('click', () => abrirProveedor(null));

  $('#gastos-lista').addEventListener('click', (e) => {
    const ab = e.target.closest('[data-abono]');
    if (ab) { abrirAbono(ab.dataset.abono, ab.dataset.id); return; }
    const v = e.target.closest('[data-ver]');
    if (v) abrirProveedor(v.dataset.ver);
  });

  $('#form-gasto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const datos = {
      nombre: f.nombre.value.trim(),
      total: num(f.total.value),
      padrino: f.padrino.value.trim(),
      presupuesto: num(f.presupuesto.value),
      consigue: f.consigue.value,
      descripcion: f.descripcion.value.trim(),
    };
    if (!datos.nombre) return;
    try {
      if (st.abierto) {
        await update(ref(db, `gastos/proveedores/${st.abierto}`), datos);
        $('#dlg-gasto').close();
        toast('Proveedor guardado');
      } else {
        const orden = Math.max(0, ...Object.values(st.proveedores).map((p) => p.orden || 0)) + 1;
        const nuevo = push(ref(db, 'gastos/proveedores'));
        await set(nuevo, { ...datos, orden });
        st.abierto = nuevo.key;
        $('#dlg-gasto-t').textContent = datos.nombre;
        $('#eliminar-gasto').hidden = false;
        pintarDetalle();
        toast('Proveedor agregado. Ya puedes registrar pagos y abonos.');
      }
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });
  $('#cerrar-gasto').addEventListener('click', () => $('#dlg-gasto').close());
  $('#eliminar-gasto').addEventListener('click', async () => {
    const pid = st.abierto;
    const p = st.proveedores[pid];
    if (!pid || !confirm(`¿Eliminar "${p.nombre}" con todos sus pagos, abonos y cotizaciones?`)) return;
    const cambios = { [`proveedores/${pid}`]: null };
    ['pagos', 'aportes', 'cotizaciones'].forEach((n) => {
      Object.entries(st[n]).forEach(([mid, m]) => { if (m.proveedor === pid) cambios[`${n}/${mid}`] = null; });
    });
    try {
      await update(ref(db, 'gastos'), cambios);
      $('#dlg-gasto').close();
      toast('Proveedor eliminado');
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });

  // Pagos, abonos y cotizaciones dentro del detalle
  $('#gasto-detalle').addEventListener('submit', async (e) => {
    e.preventDefault();
    const rf = e.target.closest('[data-reparto]');
    if (rf && st.abierto) {
      try {
        await update(ref(db, `gastos/proveedores/${st.abierto}/reparto`), { presupuesto: num(rf.presupuesto.value), menos: rf.menos.value });
      } catch (err) { toast(`Error: ${err.code || err.message}`); }
      return;
    }
    const f = e.target.closest('[data-nuevo]');
    if (!f || !st.abierto) return;
    const nodo = f.dataset.nuevo;
    let datos;
    if (nodo === 'cotizaciones') {
      datos = {
        proveedor: st.abierto,
        opcion: f.opcion.value.trim(),
        precio: num(f.precio.value),
        piezas: Math.max(1, Math.round(num(f.piezas.value)) || 1),
        cantidad: Math.max(0, Math.round(num(f.cantidad.value))),
        elegida: false,
        creado: serverTimestamp(),
      };
      if (!datos.opcion) return;
    } else {
      datos = {
        proveedor: st.abierto, monto: num(f.monto.value), fecha: f.fecha.value || '', nota: f.nota.value.trim(), creado: serverTimestamp(),
      };
      if (datos.monto <= 0) return;
    }
    f.reset();
    if (f.fecha) f.fecha.value = hoy();
    try {
      await set(push(ref(db, `gastos/${nodo}`)), datos);
      toast(nodo === 'pagos' ? 'Pago registrado' : nodo === 'aportes' ? 'Abono registrado' : 'Cotización agregada');
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });
  $('#gasto-detalle').addEventListener('click', async (e) => {
    const borrar = e.target.closest('[data-borrar]');
    const elegir = e.target.closest('[data-elegir]');
    const usar = e.target.closest('[data-usar]');
    const usarOp = e.target.closest('[data-usar-op]');
    try {
      if (usarOp && st.ultimoReparto?.pid === st.abierto) {
        const { pid, items, ops } = st.ultimoReparto;
        const o = ops[`o${usarOp.dataset.usarOp}`];
        const p = st.proveedores[pid];
        if (!confirm(`¿Guardar las cajas de la opción ${usarOp.dataset.usarOp} y poner ${dinero(o.costo)} como costo total de ${p.nombre}?`)) return;
        const cambios = { [`proveedores/${pid}/total`]: o.costo };
        items.forEach((x, i) => { cambios[`cotizaciones/${x.cid}/cantidad`] = o.cajas[i]; });
        await update(ref(db, 'gastos'), cambios);
        $('#form-gasto').total.value = o.costo;
        toast('Opción guardada');
      } else if (borrar) {
        if (!confirm('¿Borrar este registro?')) return;
        await remove(ref(db, `gastos/${borrar.dataset.borrar}/${borrar.dataset.mid}`));
        toast('Borrado');
      } else if (elegir) {
        const cid = elegir.dataset.elegir;
        const ya = st.cotizaciones[cid]?.elegida;
        const cambios = {};
        cotizacionesDe(st.abierto).forEach(([id]) => { cambios[`${id}/elegida`] = !ya && id === cid; });
        await update(ref(db, 'gastos/cotizaciones'), cambios);
      } else if (usar) {
        $('#form-gasto').total.value = usar.dataset.usar;
        toast('Costo total actualizado: presiona Guardar para conservarlo');
      }
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });

  /* ---------- abono rápido desde la tarjeta ---------- */
  function abrirAbono(nodo, pid) {
    const p = st.proveedores[pid];
    const c = calc(pid);
    st.abono = { nodo, pid };
    $('#dlg-abono-t').textContent = nodo === 'pagos' ? `Pago a ${p.nombre}` : `Abono de ${p.padrino || 'padrino'} para ${p.nombre}`;
    $('#dlg-abono-info').textContent = nodo === 'pagos'
      ? `Pagado ${dinero(c.pagado)} de ${dinero(c.total)} · falta ${dinero(c.faltaPagar)}`
      : `Nos ha dado ${dinero(c.recibido)} de ${dinero(c.presupuesto)} · falta ${dinero(c.faltaRecibir)}`;
    const f = $('#form-abono');
    f.reset();
    f.fecha.value = hoy();
    $('#dlg-abono').showModal();
    f.monto.focus();
  }
  $('#form-abono').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const monto = num(f.monto.value);
    if (!st.abono || monto <= 0) return;
    const { nodo, pid } = st.abono;
    const datos = { proveedor: pid, monto, fecha: f.fecha.value || '', nota: f.nota.value.trim(), creado: serverTimestamp() };
    $('#dlg-abono').close();
    try {
      await set(push(ref(db, `gastos/${nodo}`)), datos);
      toast(nodo === 'pagos' ? 'Pago registrado' : 'Abono registrado');
    } catch (err) { toast(`Error: ${err.code || err.message}`); }
  });
  $('#cerrar-abono').addEventListener('click', () => $('#dlg-abono').close());

  /* ---------- Excel ---------- */
  $('#exportar-gastos').addEventListener('click', () => {
    const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const fila = (arr) => arr.map(celda).join(',');
    const filas = [fila(['Proveedor', 'Total', 'Pagado', 'Faltante', 'Padrino', 'Presupuesto', 'Abono', 'Sobra', 'Falta', 'Quién lo consigue', 'Descripción'])];
    ordenados().forEach(([pid, p]) => {
      const c = calc(pid);
      filas.push(fila([p.nombre, c.total, c.pagado, c.faltaPagar, p.padrino, c.presupuesto, c.recibido, c.sobra, c.faltaRecibir, CONSIGUE[p.consigue] || 'Novios', p.descripcion]));
    });
    filas.push('', fila(['Movimientos']), fila(['Fecha', 'Tipo', 'Proveedor', 'Padrino', 'Monto', 'Nota']));
    [['pagos', 'Pago a proveedor'], ['aportes', 'Abono del padrino']].forEach(([n, tipo]) => {
      Object.values(st[n]).sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || ''))).forEach((m) => {
        const p = st.proveedores[m.proveedor] || {};
        filas.push(fila([m.fecha || '', tipo, p.nombre, p.padrino, m.monto, m.nota]));
      });
    });
    const blob = new Blob([`﻿${filas.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gastos-boda-${hoy()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  return () => subs.forEach((cancelar) => cancelar());
}
