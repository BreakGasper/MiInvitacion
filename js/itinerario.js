/* Panel › Itinerario: programa de la boda, hora por hora, con la canción de cada momento.
   /itinerario/{id}  { hora: "19:15" (24 h), momento, cancion?, enlace?, notas?, hecho, creado } */
import {
  ref, onValue, set, update, remove, push,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

// Plantilla de ejemplo: la recepción arranca a las 6:30 PM (la misa y las entradas con los papás son aparte). Las canciones las llenas tú.
const PLANTILLA = [
  ['18:30', 'Llegada de invitados', 'Música ambiental suave', 'Registro y que cada quien encuentre su mesa'],
  ['19:15', 'Entrada de los novios', '', ''],
  ['19:20', 'Palabras de bienvenida', '', ''],
  ['19:25', 'Brindis', '', ''],
  ['19:35', 'Cena y banquete', 'Música ambiental', 'Los novios saludan mesa por mesa'],
  ['20:25', 'Vals de los novios', '', ''],
  ['20:35', 'Vals de la novia con su papá', '', ''],
  ['20:40', 'Vals del novio con su mamá', '', ''],
  ['20:45', 'Vals de los papás', '', ''],
  ['20:55', 'Pastel', '', ''],
  ['21:05', 'Ramo y liga', '', 'Opcional'],
  ['21:15', 'Baile abierto', '', ''],
  ['22:10', 'Hora loca', '', 'Opcional'],
  ['23:10', 'Despedida', '', ''],
];

export function iniciarItinerario({ db, esc, toast }) {
  const $ = (s, r = document) => r.querySelector(s);
  const st = { items: {}, canciones: {}, sub: 'prog', soloPend: false, vista: 'lista' };
  try { if (localStorage.getItem('itinVista') === 'linea') st.vista = 'linea'; } catch { /* sin almacenamiento */ }

  /* ---------- diálogo para editar un momento ---------- */
  const dlg = document.createElement('dialog');
  dlg.id = 'dlg-itin';
  dlg.innerHTML = `
    <form id="form-itin">
      <h2>Editar momento</h2>
      <div class="dos">
        <label>Hora <input type="time" name="hora" required></label>
        <label>Momento <input name="momento" maxlength="80" required autocomplete="off"></label>
      </div>
      <label>Canción (título y artista) <input name="cancion" maxlength="120" autocomplete="off"></label>
      <label>Enlace de la canción (YouTube / Spotify) <input type="url" name="enlace" maxlength="300" placeholder="https://…" autocomplete="off"></label>
      <label>Notas (quién lo hace, qué se necesita) <input name="notas" maxlength="160" autocomplete="off"></label>
      <div class="dlg-botones">
        <button type="button" class="b b-sec b-peligro" data-d="quitar"><i class="fa-solid fa-trash"></i> Quitar</button>
        <button type="button" class="b b-sec" data-d="cancelar">Cancelar</button>
        <button type="submit" class="b b-pri">Guardar</button>
      </div>
    </form>`;
  document.body.appendChild(dlg);
  const form = dlg.querySelector('form');
  let editandoId = null;
  const abrir = (id) => {
    const x = st.items[id];
    if (!x) return;
    editandoId = id;
    form.hora.value = x.hora || '';
    form.momento.value = x.momento || '';
    form.cancion.value = x.cancion || '';
    form.enlace.value = x.enlace || '';
    form.notas.value = x.notas || '';
    dlg.showModal();
    document.activeElement?.blur?.(); // sin teclado ni selector de hora al abrir
  };
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // tocar fuera cierra
  dlg.querySelector('[data-d="cancelar"]').addEventListener('click', () => dlg.close());
  dlg.querySelector('[data-d="quitar"]').addEventListener('click', () => {
    const id = editandoId;
    if (id && confirm(`¿Quitar "${st.items[id]?.momento}" del itinerario?`)) { dlg.close(); guardar(() => remove(ref(db, `itinerario/${id}`)), 'Momento quitado'); }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const momento = form.momento.value.trim();
    if (!momento || !form.hora.value || !editandoId) return;
    const v = (k, n) => form[k].value.trim().slice(0, n) || null; // vacío = se borra el campo
    const enlace = v('enlace', 300);
    const id = editandoId;
    dlg.close();
    guardar(() => update(ref(db, `itinerario/${id}`), {
      hora: form.hora.value, momento: momento.slice(0, 80), cancion: v('cancion', 120), enlace: urlOk(enlace) ? enlace : null, notas: v('notas', 160),
    }), 'Guardado');
  });

  onValue(ref(db, 'itinerario'), (snap) => {
    st.items = snap.val() || {};
    pintar();
  });

  onValue(ref(db, 'canciones'), (snap) => {
    st.canciones = snap.val() || {};
    pintar();
  });

  const orden = () => Object.entries(st.items).sort(([, a], [, b]) => (a.hora || '').localeCompare(b.hora || '') || (a.creado || 0) - (b.creado || 0));
  const hora12 = (h) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(h || '');
    if (!m) return '';
    const n = +m[1];
    return `${n % 12 || 12}:${m[2]} ${n < 12 ? 'AM' : 'PM'}`;
  };
  const sumar = (h, min) => {
    const [a, b] = h.split(':').map(Number);
    const t = (((a * 60 + b + min) % 1440) + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };
  // Ícono de cada momento según lo que dice (Font Awesome)
  const ICONOS = [
    [/llegada|bienvenida a|registro/, 'fa-door-open'], [/palabras|bienvenida|discurso|mensaje/, 'fa-microphone'],
    [/brindis/, 'fa-champagne-glasses'], [/cena|banquete|comida|taco|recena/, 'fa-utensils'],
    [/pastel/, 'fa-cake-candles'], [/ramo|liga/, 'fa-seedling'], [/hora loca|cotill/, 'fa-masks-theater'],
    [/baile abierto|pista/, 'fa-music'], [/vals|baile|bailar/, 'fa-heart'], [/entrada|entran|cortejo/, 'fa-people-arrows'],
    [/foto/, 'fa-camera'], [/despedida|fin|cierre|recuerdo/, 'fa-moon'], [/musica|música|dj|canci/, 'fa-music'],
  ];
  const icono = (t) => (ICONOS.find(([re]) => re.test((t || '').toLowerCase())) || [0, 'fa-star'])[1];
  const urlOk = (u) => /^https?:\/\//i.test(u || '');
  const nombreCancion = (c) => `${c.titulo}${c.artista ? ` – ${c.artista}` : ''}`;
  // Canciones asignadas a un momento (en el orden en que se agregaron)
  const cancionesDe = (mid) => Object.entries(st.canciones).filter(([, c]) => c.momento === mid).sort(([, a], [, b]) => (a.creado || 0) - (b.creado || 0));
  const tieneCancion = (id, x) => !!x.cancion || cancionesDe(id).length > 0;

  function fila(id, x) {
    return `
      <li class="it-item ${x.hecho ? 'hecho' : ''}" data-id="${esc(id)}">
        <label class="it-check" title="Marcar como hecho">
          <input type="checkbox" data-a="marcar" data-i="${esc(id)}" ${x.hecho ? 'checked' : ''} aria-label="Marcar como hecho">
        </label>
        <div class="it-hora">${esc(hora12(x.hora))}</div>
        <div class="it-cuerpo">
          <div class="it-momento">${esc(x.momento)}</div>
          ${x.cancion ? `<div class="it-cancion"><i class="fa-solid fa-music"></i> ${urlOk(x.enlace) ? `<a href="${esc(x.enlace)}" target="_blank" rel="noopener">${esc(x.cancion)}</a>` : esc(x.cancion)}</div>` : ''}
          ${cancionesDe(id).map(([, c]) => `<div class="it-cancion"><i class="fa-solid fa-music"></i> ${urlOk(c.enlace) ? `<a href="${esc(c.enlace)}" target="_blank" rel="noopener">${esc(nombreCancion(c))}</a>` : esc(nombreCancion(c))}</div>`).join('')}
          ${x.notas ? `<div class="it-notas">${esc(x.notas)}</div>` : ''}
        </div>
        <button type="button" class="b b-sec b-ico" data-a="editar" data-i="${esc(id)}" title="Editar" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
        <button type="button" class="b b-sec b-ico" data-a="quitar" data-i="${esc(id)}" title="Quitar" aria-label="Quitar"><i class="fa-solid fa-xmark"></i></button>
      </li>`;
  }

  function filaLinea(id, x, sig) {
    return `
      <li class="tl-item ${x.hecho ? 'hecho' : ''} ${sig ? 'sigue' : ''}" data-id="${esc(id)}">
        <div class="tl-hora">${esc(hora12(x.hora))}</div>
        <div class="tl-punto"><i class="fa-solid ${icono(x.momento)}"></i></div>
        <button type="button" class="tl-tarjeta" data-a="abrir" data-i="${esc(id)}" title="Editar">
          <span class="tl-momento">${esc(x.momento)}</span>
          ${x.cancion ? `<span class="tl-cancion"><i class="fa-solid fa-music"></i> ${esc(x.cancion)}</span>` : ''}
          ${cancionesDe(id).map(([, c]) => `<span class="tl-cancion"><i class="fa-solid fa-music"></i> ${esc(nombreCancion(c))}</span>`).join('')}
          ${x.notas ? `<span class="tl-notas">${esc(x.notas)}</span>` : ''}
        </button>
      </li>`;
  }

  function pintar() {
    const todos = orden();
    const hechos = todos.filter(([, x]) => x.hecho).length;
    const conCancion = todos.filter(([id, x]) => tieneCancion(id, x)).length;
    const sig = todos.find(([, x]) => !x.hecho);
    $('#it-resumen').innerHTML = `
      <div class="dato"><div class="dato-n">${todos.length}</div><div class="dato-t">Momentos</div></div>
      <div class="dato"><div class="dato-n">${todos.length ? esc(hora12(todos[0][1].hora)) : '—'}</div><div class="dato-t">Inicia</div></div>
      <div class="dato si"><div class="dato-n">${conCancion}/${todos.length}</div><div class="dato-t">Con canción</div></div>
      <div class="dato pend"><div class="dato-n">${hechos}/${todos.length}</div><div class="dato-t">Hechos</div></div>`;
    $('#it-siguiente').innerHTML = sig ? `<i class="fa-solid fa-forward"></i> Sigue: <b>${esc(hora12(sig[1].hora))}</b> · ${esc(sig[1].momento)}` : '';
    $('#it-solo-pend').classList.toggle('activo', st.soloPend);
    document.querySelectorAll('[data-sub]').forEach((c) => c.classList.toggle('activo', c.dataset.sub === st.sub));
    $('#it-sub-prog').hidden = st.sub !== 'prog';
    $('#it-sub-can').hidden = st.sub !== 'can';
    pintarCanciones(todos);

    document.querySelectorAll('[data-vista]').forEach((c) => c.classList.toggle('activo', c.dataset.vista === st.vista));
    const vis = st.soloPend ? todos.filter(([, x]) => !x.hecho) : todos;
    if (st.vista === 'linea' && todos.length) {
      $('#it-lista').innerHTML = `<ol class="tl">${vis.map(([id, x]) => filaLinea(id, x, sig && sig[0] === id)).join('') || '<li class="vacio it-vacio">¡Todo hecho! 🎉</li>'}</ol>`;
      return;
    }
    $('#it-lista').innerHTML = todos.length
      ? `<ul class="it-items">${vis.map(([id, x]) => fila(id, x)).join('') || '<li class="vacio it-vacio">¡Todo hecho! 🎉</li>'}</ul>`
      : '<p class="vacio">Todavía no hay momentos. Agrega el primero arriba o carga la plantilla de ejemplo.</p>';
  }

  /* ---------- submenú Canciones ---------- */
  const etiquetaMomento = ([, x]) => `${hora12(x.hora)} · ${x.momento}`;
  function opcionesMomento(sel) {
    return `<option value="">Sin asignar</option>${orden().map(([id, x]) => `<option value="${esc(id)}" ${sel === id ? 'selected' : ''}>${esc(etiquetaMomento([id, x]))}</option>`).join('')}`;
  }
  function filaCancion(id, c) {
    return `
      <li class="ca-item" data-id="${esc(id)}">
        <i class="fa-solid fa-music ca-ico"></i>
        <div class="ca-cuerpo">
          <div class="ca-titulo">${urlOk(c.enlace) ? `<a href="${esc(c.enlace)}" target="_blank" rel="noopener">${esc(c.titulo)}</a>` : esc(c.titulo)}</div>
          ${c.artista ? `<div class="ca-artista">${esc(c.artista)}</div>` : ''}
        </div>
        <button type="button" class="b b-sec b-ico" data-a="editar-ca" data-i="${esc(id)}" title="Editar" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
        <button type="button" class="b b-sec b-ico" data-a="quitar-ca" data-i="${esc(id)}" title="Quitar" aria-label="Quitar"><i class="fa-solid fa-xmark"></i></button>
      </li>`;
  }
  function pintarCanciones(todos) {
    const f = $('#ca-nuevo');
    const actual = f.momento.value; // conserva el momento elegido al llegar cambios
    f.momento.innerHTML = opcionesMomento(actual);
    const huerfanas = Object.entries(st.canciones).filter(([, c]) => !c.momento || !st.items[c.momento]).sort(([, a], [, b]) => (a.creado || 0) - (b.creado || 0));
    const grupos = todos.map(([id, x]) => ({ titulo: etiquetaMomento([id, x]), ico: icono(x.momento), lista: cancionesDe(id) })).filter((g) => g.lista.length);
    if (huerfanas.length) grupos.unshift({ titulo: 'Sin asignar', ico: 'fa-circle-question', lista: huerfanas, sin: true });
    $('#ca-lista').innerHTML = grupos.length ? grupos.map((g) => `
      <section class="caja ca-grupo ${g.sin ? 'sin' : ''}">
        <h3 class="ca-grupo-t"><i class="fa-solid ${g.ico}"></i> ${esc(g.titulo)} <span class="etq pend">${g.lista.length}</span></h3>
        <ul class="ca-items">${g.lista.map(([id, c]) => filaCancion(id, c)).join('')}</ul>
      </section>`).join('')
      : '<section class="caja"><p class="vacio">Todavía no hay canciones. Agrega la primera arriba y elige en qué momento suena.</p></section>';
  }

  // diálogo para editar una canción
  const dlgC = document.createElement('dialog');
  dlgC.id = 'dlg-cancion';
  dlgC.innerHTML = `
    <form id="form-cancion">
      <h2>Editar canción</h2>
      <label>Canción (título) <input name="titulo" maxlength="100" required autocomplete="off"></label>
      <label>Artista <input name="artista" maxlength="80" autocomplete="off"></label>
      <label>Momento en que suena <select name="momento"></select></label>
      <label>Enlace (YouTube / Spotify) <input type="url" name="enlace" maxlength="300" placeholder="https://…" autocomplete="off"></label>
      <div class="dlg-botones">
        <button type="button" class="b b-sec b-peligro" data-d="quitar"><i class="fa-solid fa-trash"></i> Quitar</button>
        <button type="button" class="b b-sec" data-d="cancelar">Cancelar</button>
        <button type="submit" class="b b-pri">Guardar</button>
      </div>
    </form>`;
  document.body.appendChild(dlgC);
  const formC = dlgC.querySelector('form');
  let editandoCa = null;
  const abrirCa = (id) => {
    const c = st.canciones[id];
    if (!c) return;
    editandoCa = id;
    formC.titulo.value = c.titulo || '';
    formC.artista.value = c.artista || '';
    formC.momento.innerHTML = opcionesMomento(st.items[c.momento] ? c.momento : '');
    formC.enlace.value = c.enlace || '';
    dlgC.showModal();
    document.activeElement?.blur?.();
  };
  dlgC.addEventListener('click', (e) => { if (e.target === dlgC) dlgC.close(); });
  dlgC.querySelector('[data-d="cancelar"]').addEventListener('click', () => dlgC.close());
  dlgC.querySelector('[data-d="quitar"]').addEventListener('click', () => {
    const id = editandoCa;
    if (id && confirm(`¿Quitar la canción "${st.canciones[id]?.titulo}"?`)) { dlgC.close(); guardar(() => remove(ref(db, `canciones/${id}`)), 'Canción quitada'); }
  });
  formC.addEventListener('submit', (e) => {
    e.preventDefault();
    const titulo = formC.titulo.value.trim();
    if (!titulo || !editandoCa) return;
    const v = (k, n) => formC[k].value.trim().slice(0, n) || null;
    const enlace = v('enlace', 300);
    const id = editandoCa;
    dlgC.close();
    guardar(() => update(ref(db, `canciones/${id}`), { titulo: titulo.slice(0, 100), artista: v('artista', 80), momento: formC.momento.value || null, enlace: urlOk(enlace) ? enlace : null }), 'Guardado');
  });

  $('#ca-nuevo').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const titulo = f.titulo.value.trim();
    if (!titulo) return;
    const dato = { titulo: titulo.slice(0, 100), creado: Date.now() };
    const artista = f.artista.value.trim();
    if (artista) dato.artista = artista.slice(0, 80);
    if (f.momento.value) dato.momento = f.momento.value;
    guardar(async () => {
      await set(push(ref(db, 'canciones')), dato);
      f.titulo.value = ''; f.artista.value = '';
      f.titulo.focus(); // deja el cursor listo para la siguiente canción (el momento se queda igual)
    }, 'Canción agregada');
  });
  $('#ca-lista').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]');
    if (!b) return;
    if (b.dataset.a === 'editar-ca') abrirCa(b.dataset.i);
    else if (b.dataset.a === 'quitar-ca' && confirm(`¿Quitar la canción "${st.canciones[b.dataset.i]?.titulo}"?`)) guardar(() => remove(ref(db, `canciones/${b.dataset.i}`)));
  });
  $('#it-sub').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sub]');
    if (!b) return;
    st.sub = b.dataset.sub;
    pintar();
  });

  const guardar = async (fn, ok) => {
    try { await fn(); if (ok) toast(ok); } catch (err) { toast(`Error: ${err.code || err.message}`); }
  };

  /* ---------- agregar ---------- */
  $('#it-nuevo').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const momento = f.momento.value.trim();
    if (!momento || !f.hora.value) return;
    const dato = { hora: f.hora.value, momento: momento.slice(0, 80), hecho: false, creado: Date.now() };
    const cancion = f.cancion.value.trim();
    if (cancion) dato.cancion = cancion.slice(0, 120);
    guardar(async () => {
      await set(push(ref(db, 'itinerario')), dato);
      f.momento.value = ''; f.cancion.value = '';
      f.momento.focus();
    }, 'Momento agregado');
  });

  /* ---------- plantilla, mover horarios, ver solo pendientes, compartir ---------- */
  $('#it-plantilla').addEventListener('click', () => {
    const hay = Object.keys(st.items).length;
    if (!confirm(hay ? `Ya tienes ${hay} momentos. ¿Agregar también la plantilla de ejemplo (${PLANTILLA.length} momentos)?` : `¿Cargar la plantilla de ejemplo (${PLANTILLA.length} momentos, desde las 6:30 PM)? Después cambias horas y canciones.`)) return;
    const ahora = Date.now();
    const lote = {};
    PLANTILLA.forEach(([hora, momento, cancion, notas], n) => {
      const d = { hora, momento, hecho: false, creado: ahora + n };
      if (cancion) d.cancion = cancion;
      if (notas) d.notas = notas;
      lote[push(ref(db, 'itinerario')).key] = d;
    });
    guardar(() => update(ref(db, 'itinerario'), lote), 'Plantilla cargada');
  });

  $('#it-mover').addEventListener('click', () => {
    if (!Object.keys(st.items).length) { toast('Todavía no hay momentos'); return; }
    const r = prompt('¿Cuántos minutos mover TODOS los horarios?\n(+15 los atrasa 15 minutos, -10 los adelanta 10)', '15');
    const min = parseInt(r, 10);
    if (!r || Number.isNaN(min) || min === 0) return;
    const cambios = {};
    Object.entries(st.items).forEach(([id, x]) => { if (x.hora) cambios[`${id}/hora`] = sumar(x.hora, min); });
    guardar(() => update(ref(db, 'itinerario'), cambios), 'Horarios movidos');
  });

  /* ---------- vaciar todo ---------- */
  $('#it-vaciar').addEventListener('click', () => {
    const n = Object.keys(st.items).length;
    if (!n) { toast('El itinerario ya está vacío'); return; }
    if (confirm(`¿Vaciar el itinerario? Se borrarán los ${n} momentos con sus canciones. No se puede deshacer.`)) {
      guardar(() => remove(ref(db, 'itinerario')), 'Itinerario vaciado');
    }
  });

  /* ---------- lista / línea del tiempo ---------- */
  document.querySelector('#it-vistas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-vista]');
    if (!b) return;
    st.vista = b.dataset.vista;
    try { localStorage.setItem('itinVista', st.vista); } catch { /* sin almacenamiento */ }
    pintar();
  });

  $('#it-solo-pend').addEventListener('click', () => { st.soloPend = !st.soloPend; pintar(); });

  const textoCompartir = () => {
    const l = orden().map(([id, x]) => `${hora12(x.hora)} · ${x.momento}${x.cancion ? ` 🎵 ${x.cancion}${urlOk(x.enlace) ? ` (${x.enlace})` : ''}` : ''}${cancionesDe(id).map(([, c]) => ` 🎵 ${nombreCancion(c)}${urlOk(c.enlace) ? ` (${c.enlace})` : ''}`).join('')}${x.notas ? ` — ${x.notas}` : ''}`);
    return `Itinerario de la boda\n\n${l.join('\n')}`;
  };
  $('#it-compartir').addEventListener('click', async () => {
    if (!Object.keys(st.items).length) { toast('Todavía no hay momentos'); return; }
    const txt = textoCompartir();
    if (navigator.share) { try { await navigator.share({ text: txt }); return; } catch { /* cancelado */ } }
    try { await navigator.clipboard.writeText(txt); toast('Itinerario copiado: pégalo en WhatsApp'); } catch { window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank', 'noopener'); }
  });

  /* ---------- marcar / editar / quitar ---------- */
  $('#it-lista').addEventListener('change', (e) => {
    const c = e.target.closest('[data-a="marcar"]');
    if (c) guardar(() => update(ref(db, `itinerario/${c.dataset.i}`), { hecho: c.checked }));
  });

  $('#it-lista').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]');
    if (!b) return;
    const { a, i } = b.dataset;
    if (a === 'editar' || a === 'abrir') abrir(i);
    else if (a === 'quitar' && confirm(`¿Quitar "${st.items[i]?.momento}" del itinerario?`)) guardar(() => remove(ref(db, `itinerario/${i}`)));
  });
}
