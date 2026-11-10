/* Panel privado de los novios: invitados, confirmaciones y envío por WhatsApp. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getDatabase, ref, onValue, set, update, remove, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { iniciarMesas } from './mesas.js?v=5';
import { iniciarGastos } from './gastos.js?v=2';
import { iniciarCalculadora } from './calculadora.js?v=7';
import { iniciarFotos } from './fotos.js?v=1';
import { iniciarPendientes } from './pendientes.js?v=1';

const C = window.INVITACION;
const app = initializeApp(C.firebase);
const auth = getAuth(app);
const db = getDatabase(app);
// El teléfono se convierte en un usuario interno de Firebase (correo/contraseña).
const DOMINIO_USUARIO = 'boda.example.com';

// Administradores: teléfono → huella SHA-256 de "teléfono:contraseña".
// (La contraseña no está escrita aquí; solo su huella.)
// Para generar una huella nueva: node -e "console.log(require('crypto').createHash('sha256').update('TELEFONO:CONTRASEÑA').digest('hex'))"
const ADMINS = {
  3751274973: '0a395b10abeea84d5b3456e27116df85661bdebd04a4b6a795bf256d1e140e3e',
  3751241114: 'ccd8a7002785eca9a6424c63dbbeced4c5e71542952706e99db2eced35a9bf74',
};
async function huella(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const SITIO = 'https://miinva-pgkvkj-d01c0.web.app/';
const BASE = `${SITIO}?p=`;
const NODOS = ['invitados', 'respuestas', 'notas', 'enviados', 'generales'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, s, p) => `${n} ${Number(n) === 1 ? s : p}`;

const st = { invitados: {}, respuestas: {}, notas: {}, enviados: {}, generales: {}, modo: 'pases', filtroGen: 'todos', filtro: 'todos', q: '', subs: [], editando: null };

/* ---------- utilidades ---------- */
function fechaLarga(iso, conDia) {
  const [y, m, d] = iso.split('-').map(Number);
  const dia = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${conDia ? `${dia} ` : ''}${d} de ${MESES[m - 1]}${conDia ? ` de ${y}` : ''}`;
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.hidden = true; }, 2600);
}
function vista(v) { ['login', 'cargando', 'panel'].forEach((n) => { $(`#vista-${n}`).hidden = n !== v; }); }
const enlace = (id) => BASE + encodeURIComponent(id);
const cancelado = (inv) => String(inv.estado || 'Habilitado').toLowerCase() !== 'habilitado';
function tipo(id) {
  const r = st.respuestas[id];
  return r ? (r.asistencia === 'si' ? 'si' : 'no') : 'pend';
}
function mensajeWhatsApp(id, inv) {
  return [
    `¡Hola, ${inv.nombre}! 💌`,
    '',
    `Con mucha alegría, ${C.novios.nombre1} y ${C.novios.nombre2} te invitamos a nuestra boda el ${fechaLarga(C.evento.fecha, true)}.`,
    '',
    `Tenemos ${plural(inv.personas, 'lugar reservado', 'lugares reservados')} para ti. Abre tu invitación aquí:`,
    enlace(id),
    '',
    C.confirmacion.fechaLimite
      ? `Por favor confirma tu asistencia antes del ${fechaLarga(C.confirmacion.fechaLimite, false)}. ¡Te esperamos!`
      : '¡Te esperamos!',
  ].join('\n');
}

/* ---------- sesión ---------- */
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const tel = f.telefono.value.replace(/\D/g, '').slice(-10);
  $('#login-error').textContent = '';
  if (tel.length !== 10 || !f.clave.value) {
    $('#login-error').textContent = 'Escribe tu teléfono a 10 dígitos y tu contraseña.';
    return;
  }
  $('#entrar').disabled = true;
  try {
    if (!ADMINS[tel] || ADMINS[tel] !== await huella(`${tel}:${f.clave.value}`)) {
      throw Object.assign(new Error('clave'), { code: 'auth/invalid-credential' });
    }
    const correo = `${tel}@${DOMINIO_USUARIO}`;
    try {
      await signInWithEmailAndPassword(auth, correo, f.clave.value);
    } catch (err) {
      // Primera vez: el usuario aún no existe en Firebase → se crea con esta misma contraseña
      if (err.code !== 'auth/invalid-credential' && err.code !== 'auth/user-not-found') throw err;
      await createUserWithEmailAndPassword(auth, correo, f.clave.value);
    }
    f.clave.value = '';
  } catch (err) {
    $('#login-error').textContent = {
      'auth/invalid-credential': 'Teléfono o contraseña incorrectos.',
      'auth/wrong-password': 'Teléfono o contraseña incorrectos.',
      'auth/user-not-found': 'Teléfono o contraseña incorrectos.',
      'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
      'auth/operation-not-allowed': 'Falta activar "Correo electrónico/contraseña" en Firebase (Authentication → Método de acceso).',
      'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
      'auth/email-already-in-use': 'Ese teléfono ya tiene una cuenta con otra contraseña. Avísale a quien te hizo la invitación.',
    }[err.code] || `No se pudo iniciar sesión (${err.code || err.message}).`;
  } finally {
    $('#entrar').disabled = false;
  }
});
$('#salir').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (u) => {
  st.subs.forEach((cancelar) => cancelar());
  st.subs = [];
  if (!u) { $('#usuario').hidden = true; vista('login'); return; }
  $('#usuario').hidden = false;
  $('#usuario-correo').textContent = u.email;
  vista('cargando');
  const cargados = new Set();
  NODOS.forEach((nodo) => {
    st.subs.push(onValue(ref(db, nodo), (snap) => {
      st[nodo] = snap.val() || {};
      cargados.add(nodo);
      if (cargados.size === NODOS.length) {
        pintar();
        vista('panel');
        if (!st.mesasListas) { st.mesasListas = true; iniciarMesas({ db, esc, toast }); iniciarGastos({ db, esc, toast }); iniciarCalculadora({ db, esc, toast }); iniciarFotos({ db, esc, toast }); iniciarPendientes({ db, esc, toast }); }
      }
    }, () => {
      $('#login-error').textContent = `La cuenta ${u.email} no tiene permiso para ver este panel.`;
      signOut(auth);
    }));
  });
});

/* ---------- pintar ---------- */
function pintar() {
  if (['mesas', 'gastos', 'calc', 'fotos', 'pend'].includes(st.modo)) return;
  if (st.modo === 'gen') { pintarRegistros(); return; }
  const ids = Object.keys(st.invitados);
  const activos = ids.filter((id) => !cancelado(st.invitados[id]));
  const lugares = activos.reduce((a, id) => a + (Number(st.invitados[id].personas) || 0), 0);
  const si = activos.filter((id) => tipo(id) === 'si');
  const no = activos.filter((id) => tipo(id) === 'no');
  const pend = activos.filter((id) => tipo(id) === 'pend');
  const personasSi = si.reduce((a, id) => a + (Number(st.respuestas[id].confirmados) || 0), 0);
  const enviados = activos.filter((id) => st.enviados[id]).length;
  const avance = activos.length ? Math.round(((si.length + no.length) / activos.length) * 100) : 0;

  $('#resumen').innerHTML = `
    <div class="dato"><div class="dato-n">${activos.length}</div><div class="dato-t">Familias · ${lugares} lugares</div></div>
    <div class="dato si"><div class="dato-n">${personasSi}</div><div class="dato-t">Personas confirmadas (${si.length} familias)</div></div>
    <div class="dato no"><div class="dato-n">${no.length}</div><div class="dato-t">Familias que no asistirán</div></div>
    <div class="dato pend"><div class="dato-n">${pend.length}</div><div class="dato-t">Sin respuesta</div></div>
    <div class="dato"><div class="dato-n">${enviados}</div><div class="dato-t">Invitaciones enviadas</div></div>
    <div class="dato"><div class="dato-n">${avance}%</div><div class="dato-t">Han respondido</div><div class="barra-prog"><span style="width:${avance}%"></span></div></div>`;

  const q = st.q.trim().toLowerCase();
  const lista = ids
    .filter((id) => {
      const inv = st.invitados[id];
      const t = tipo(id);
      if (st.filtro === 'si' && (t !== 'si' || cancelado(inv))) return false;
      if (st.filtro === 'no' && (t !== 'no' || cancelado(inv))) return false;
      if (st.filtro === 'pend' && (t !== 'pend' || cancelado(inv))) return false;
      if (st.filtro === 'noenv' && (st.enviados[id] || cancelado(inv))) return false;
      if (st.filtro === 'rev' && !st.notas[id]) return false;
      if (!q) return true;
      return `${inv.nombre} ${inv.integrantes || ''} familia ${inv.familia} mesa ${inv.mesa} ${id}`.toLowerCase().includes(q);
    })
    .sort((a, b) => (Number(st.invitados[a].familia) || 999) - (Number(st.invitados[b].familia) || 999)
      || (Number(st.invitados[a].mesa) || 0) - (Number(st.invitados[b].mesa) || 0)
      || String(st.invitados[a].nombre).localeCompare(st.invitados[b].nombre));

  $('#conteo').textContent = `${plural(lista.length, 'familia', 'familias')} · ${lista.reduce((a, id) => a + (Number(st.invitados[id].personas) || 0), 0)} lugares`;
  $('#lista').innerHTML = lista.length ? lista.map(fila).join('') : '<p class="vacio">No hay familias con este filtro.</p>';
}

function pintarRegistros() {
  const todos = Object.entries(st.generales);
  const si = todos.filter(([, g]) => g.asistencia === 'si');
  const no = todos.filter(([, g]) => g.asistencia === 'no');
  const personas = si.reduce((a, [, g]) => a + (Number(g.confirmados) || 0), 0);
  const porMi = todos.filter(([, g]) => g.origen === 'admin').length;
  $('#resumen').innerHTML = `
    <div class="dato si"><div class="dato-n">${personas}</div><div class="dato-t">Personas que asistirán</div></div>
    <div class="dato"><div class="dato-n">${todos.length}</div><div class="dato-t">Registros</div></div>
    <div class="dato si"><div class="dato-n">${si.length}</div><div class="dato-t">Registros que asistirán</div></div>
    <div class="dato no"><div class="dato-n">${no.length}</div><div class="dato-t">No asistirán</div></div>
    <div class="dato"><div class="dato-n">${porMi}</div><div class="dato-t">Agregados por ti</div></div>`;

  const q = st.q.trim().toLowerCase();
  const filas = todos
    .filter(([, g]) => {
      if (st.filtroGen === 'si' && g.asistencia !== 'si') return false;
      if (st.filtroGen === 'no' && g.asistencia !== 'no') return false;
      if (st.filtroGen === 'admin' && g.origen !== 'admin') return false;
      return !q || `${g.nombre} ${g.asistentes || ''} ${g.telefono || ''}`.toLowerCase().includes(q);
    })
    .sort(([, a], [, b]) => (b.fecha || 0) - (a.fecha || 0));
  const pers = filas.reduce((a, [, g]) => a + (g.asistencia === 'si' ? Number(g.confirmados) || 0 : 0), 0);
  $('#conteo').textContent = `${plural(filas.length, 'registro', 'registros')} · ${plural(pers, 'persona asistirá', 'personas asistirán')}`;
  $('#lista').innerHTML = filas.length ? filas.map(([id, g]) => filaGeneral(id, g)).join('')
    : `<p class="vacio">${todos.length ? 'No hay registros con este filtro.' : 'Todavía nadie se ha registrado. Comparte la invitación con el botón verde.'}</p>`;
}

function fila(id) {
  const inv = st.invitados[id];
  const r = st.respuestas[id];
  const t = tipo(id);
  const etq = cancelado(inv)
    ? '<span class="etq">Cancelado</span>'
    : { si: `<span class="etq si">Asistirán ${esc(r?.confirmados)}/${esc(inv.personas)}</span>`,
      no: '<span class="etq no">No asistirán</span>',
      pend: '<span class="etq pend">Sin respuesta</span>' }[t];
  const env = st.enviados[id] ? '<span class="etq env"><i class="fa-solid fa-check"></i> Enviado</span>' : '';
  return `
    <article class="pase ${cancelado(inv) ? 'cancelado' : t}">
      <div>
        <div class="pase-nombre">${esc(inv.nombre)}</div>
        <div class="pase-meta">
          ${inv.familia ? `<span><i class="fa-solid fa-house-chimney"></i> Familia ${esc(inv.familia)}</span>` : ''}
          ${Number(inv.mesa) > 0 ? `<span><i class="fa-solid fa-chair"></i> Mesa ${esc(inv.mesa)}</span>` : ''}
          <span><i class="fa-solid fa-user-group"></i> ${plural(inv.personas, 'lugar', 'lugares')}</span>
          ${etq} ${env}
        </div>
      </div>
      ${r?.asistentes ? `<div class="pase-det"><b>Van:</b> ${esc(r.asistentes)}</div>` : ''}
      ${r?.comentario ? `<div class="pase-det"><b>Mensaje:</b> “${esc(r.comentario)}”</div>` : ''}
      ${r?.fecha ? `<div class="pase-det">Respondió el ${new Date(r.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>` : ''}
      ${inv.integrantes ? `<div class="pase-det"><b>Integrantes:</b> ${esc(inv.integrantes)}</div>` : ''}
      ${st.notas[id] ? `<div class="pase-nota"><i class="fa-solid fa-triangle-exclamation"></i> ${esc(st.notas[id])}</div>` : ''}
      <div class="pase-btns">
        <button type="button" class="b b-wsp" data-a="wsp" data-id="${esc(id)}"><i class="fa-brands fa-whatsapp"></i> Enviar</button>
        <button type="button" class="b b-sec b-ico" data-a="copiar" data-id="${esc(id)}" title="Copiar enlace" aria-label="Copiar enlace"><i class="fa-solid fa-link"></i></button>
        <a class="b b-sec b-ico" href="${esc(enlace(id))}" target="_blank" rel="noopener" title="Ver invitación" aria-label="Ver invitación"><i class="fa-solid fa-eye"></i></a>
        <button type="button" class="b b-sec b-ico" data-a="editar" data-id="${esc(id)}" title="Editar" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
        ${r ? `<button type="button" class="b b-sec b-ico" data-a="reiniciar" data-id="${esc(id)}" title="Borrar respuesta" aria-label="Borrar respuesta"><i class="fa-solid fa-rotate-left"></i></button>` : ''}
        <button type="button" class="b b-sec b-ico" data-a="eliminar" data-id="${esc(id)}" title="Eliminar pase" aria-label="Eliminar pase"><i class="fa-solid fa-trash"></i></button>
      </div>
    </article>`;
}

function filaGeneral(id, g) {
  const t = g.asistencia === 'si' ? 'si' : 'no';
  const tel = String(g.telefono || '').replace(/\D/g, '');
  return `
    <article class="pase ${t}">
      <div>
        <div class="pase-nombre">${esc(g.nombre)}</div>
        <div class="pase-meta">
          <span class="etq ${t}">${t === 'si' ? `Asistirán ${esc(g.confirmados)}` : 'No asistirán'}</span>
          ${g.telefono ? `<span><i class="fa-solid fa-phone"></i> ${esc(g.telefono)}</span>` : ''}
          ${g.origen === 'admin' ? '<span class="etq admin">Agregado por ti</span>' : ''}
        </div>
      </div>
      ${g.asistentes ? `<div class="pase-det"><b>Van:</b> ${esc(g.asistentes)}</div>` : ''}
      ${g.comentario ? `<div class="pase-det"><b>Mensaje:</b> “${esc(g.comentario)}”</div>` : ''}
      ${g.fecha ? `<div class="pase-det">Respondió el ${new Date(g.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>` : ''}
      <div class="pase-btns">
        ${tel.length >= 10 ? `<a class="b b-wsp b-ico" href="https://wa.me/52${esc(tel.slice(-10))}" target="_blank" rel="noopener" title="Escribirle por WhatsApp" aria-label="Escribirle por WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
        <button type="button" class="b b-sec b-ico" data-a="editar-general" data-id="${esc(id)}" title="Editar" aria-label="Editar"><i class="fa-solid fa-pen"></i></button>
        <button type="button" class="b b-sec b-ico" data-a="borrar-general" data-id="${esc(id)}" title="Borrar respuesta" aria-label="Borrar respuesta"><i class="fa-solid fa-trash"></i></button>
      </div>
    </article>`;
}

/* ---------- acciones de la lista ---------- */
$('#lista').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-a]');
  if (!b) return;
  const id = b.dataset.id;
  const inv = st.invitados[id];
  try {
    if (b.dataset.a === 'editar-general') { abrirGeneral(id); return; }
    if (b.dataset.a === 'borrar-general') {
      if (confirm(`¿Borrar la respuesta de "${st.generales[id]?.nombre}"?`)) {
        await remove(ref(db, `generales/${id}`));
        toast('Respuesta borrada');
      }
      return;
    }
    if (b.dataset.a === 'wsp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp(id, inv))}`, '_blank', 'noopener');
      await set(ref(db, `enviados/${id}`), serverTimestamp());
    } else if (b.dataset.a === 'copiar') {
      await navigator.clipboard.writeText(enlace(id));
      toast('Enlace copiado');
    } else if (b.dataset.a === 'editar') {
      abrirEditor(id);
    } else if (b.dataset.a === 'reiniciar') {
      if (confirm(`¿Borrar la respuesta de "${inv.nombre}"? Podrán volver a confirmar.`)) {
        await remove(ref(db, `respuestas/${id}`));
        toast('Respuesta borrada');
      }
    } else if (b.dataset.a === 'eliminar') {
      if (confirm(`¿Eliminar a "${inv.nombre}"? Su enlace dejará de funcionar.`)) {
        await update(ref(db), { [`invitados/${id}`]: null, [`respuestas/${id}`]: null, [`notas/${id}`]: null, [`enviados/${id}`]: null });
        toast('Familia eliminada');
      }
    }
  } catch (err) {
    toast(`Error: ${err.code || err.message}`);
  }
});

$('#pestanas').addEventListener('click', (e) => {
  const b = e.target.closest('[data-modo]');
  if (!b) return;
  st.modo = b.dataset.modo;
  document.querySelectorAll('.pestana').forEach((p) => p.classList.toggle('activo', p === b));
  document.querySelectorAll('[data-solo]').forEach((el) => { el.hidden = el.dataset.solo !== st.modo; });
  $('#buscar').placeholder = st.modo === 'gen' ? 'Buscar nombre o teléfono…' : 'Buscar familia o integrante…';
  pintar();
});
$('#filtros-gen').addEventListener('click', (e) => {
  const b = e.target.closest('[data-g]');
  if (!b) return;
  st.filtroGen = b.dataset.g;
  document.querySelectorAll('#filtros-gen .chip').forEach((c) => c.classList.toggle('activo', c === b));
  pintar();
});

/* ---------- agregar / editar registro (invitación general) ---------- */
const dlgG = $('#dlg-general');
const formG = $('#form-general');
let editandoG = null;
const syncG = () => {
  const va = formG.asistencia.value === 'si';
  formG.confirmados.disabled = !va;
  $('#g-asistentes').hidden = !va;
};
formG.asistencia.addEventListener('change', syncG);
function abrirGeneral(tel) {
  editandoG = tel || null;
  const g = tel ? st.generales[tel] : { asistencia: 'si', confirmados: 1 };
  $('#dlg-general-titulo').textContent = tel ? 'Editar registro' : 'Agregar registro';
  formG.nombre.value = g.nombre || '';
  formG.telefono.value = g.telefono || tel || '';
  formG.asistencia.value = g.asistencia || 'si';
  formG.confirmados.value = g.asistencia === 'no' ? 1 : (g.confirmados || 1);
  formG.asistentes.value = g.asistentes || '';
  formG.comentario.value = g.comentario || '';
  $('#general-error').textContent = '';
  syncG();
  dlgG.showModal();
}
$('#nuevo-general').addEventListener('click', () => abrirGeneral(null));
$('#cancelar-general').addEventListener('click', () => dlgG.close());
formG.addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = (m) => { $('#general-error').textContent = m; };
  const nombre = formG.nombre.value.trim();
  const tel = formG.telefono.value.replace(/\D/g, '').slice(-10);
  const va = formG.asistencia.value === 'si';
  const confirmados = va ? Number(formG.confirmados.value) : 0;
  const asistentes = va ? formG.asistentes.value.split(',').map((x) => x.trim()).filter(Boolean).join(', ') : '';
  if (nombre.length < 2) return err('Escribe el nombre.');
  if (tel.length !== 10) return err('El teléfono debe tener 10 dígitos.');
  if (va && !(confirmados >= 1 && confirmados <= 20)) return err('Personas: de 1 a 20.');
  if (tel !== editandoG && st.generales[tel]
    && !confirm(`El teléfono ${tel} ya está registrado a nombre de "${st.generales[tel].nombre}". ¿Reemplazar ese registro?`)) return;
  try {
    await update(ref(db), {
      [`generales/${tel}`]: {
        nombre,
        telefono: tel,
        asistencia: va ? 'si' : 'no',
        confirmados,
        asistentes: asistentes || (va ? nombre : ''),
        comentario: formG.comentario.value.trim(),
        origen: 'admin',
        fecha: serverTimestamp(),
      },
      ...(editandoG && editandoG !== tel ? { [`generales/${editandoG}`]: null } : {}),
    });
    dlgG.close();
    toast(editandoG ? 'Registro actualizado' : 'Registro agregado');
  } catch (e2) {
    err(`No se pudo guardar (${e2.code || e2.message}).`);
  }
});

$('#buscar').addEventListener('input', (e) => { st.q = e.target.value; pintar(); });
$('#filtros').addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]');
  if (!b) return;
  st.filtro = b.dataset.f;
  document.querySelectorAll('#filtros .chip').forEach((c) => c.classList.toggle('activo', c === b));
  pintar();
});

$('#compartir-general').addEventListener('click', () => {
  const texto = [
    '💌 ¡Nos casamos!',
    '',
    `Con mucha alegría, ${C.novios.nombre1} y ${C.novios.nombre2} te invitamos a nuestra boda el ${fechaLarga(C.evento.fecha, true)}.`,
    '',
    'Aquí está la invitación:',
    SITIO,
    '',
    C.confirmacion.fechaLimite
      ? `Por favor confirma tu asistencia antes del ${fechaLarga(C.confirmacion.fechaLimite, false)}. ¡Te esperamos!`
      : '¡Te esperamos!',
  ].join('\n');
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
});

/* ---------- editor ---------- */
const dlg = $('#dlg-pase');
const form = $('#form-pase');

// Lista de integrantes: [{ nombre, invitado }]
function leerLista(inv) {
  if (Array.isArray(inv.lista)) return inv.lista.map((x) => ({ nombre: x.nombre || '', invitado: x.invitado !== false }));
  if (inv.lista && typeof inv.lista === 'object') return Object.values(inv.lista).map((x) => ({ nombre: x.nombre || '', invitado: x.invitado !== false }));
  return String(inv.integrantes || '').split(',').map((x) => x.trim()).filter(Boolean).map((nombre) => ({ nombre, invitado: true }));
}
function filaIntegrante(p) {
  return `
    <div class="int-fila">
      <input type="checkbox" class="int-check" ${p.invitado ? 'checked' : ''} aria-label="Invitado">
      <input type="text" class="int-nombre" value="${esc(p.nombre)}" maxlength="80" placeholder="Nombre">
      <button type="button" class="b b-sec b-ico int-quitar" title="Quitar" aria-label="Quitar integrante"><i class="fa-solid fa-trash"></i></button>
    </div>`;
}
function pintarLista(lista) {
  $('#lista-integrantes').innerHTML = lista.length ? lista.map(filaIntegrante).join('')
    : '<p class="int-vacio">Sin integrantes. Agrega al menos uno.</p>';
}
function listaDelFormulario() {
  return [...document.querySelectorAll('#lista-integrantes .int-fila')]
    .map((f) => ({ nombre: f.querySelector('.int-nombre').value.trim(), invitado: f.querySelector('.int-check').checked }))
    .filter((p) => p.nombre);
}
function contarLugares() {
  const n = [...document.querySelectorAll('#lista-integrantes .int-fila')]
    .filter((f) => f.querySelector('.int-check').checked && f.querySelector('.int-nombre').value.trim()).length;
  if (n > 0) form.personas.value = n;
}
$('#lista-integrantes').addEventListener('change', (e) => { if (e.target.classList.contains('int-check')) contarLugares(); });
$('#lista-integrantes').addEventListener('input', (e) => { if (e.target.classList.contains('int-nombre')) contarLugares(); });
$('#lista-integrantes').addEventListener('click', (e) => {
  const b = e.target.closest('.int-quitar');
  if (!b) return;
  b.closest('.int-fila').remove();
  if (!document.querySelector('#lista-integrantes .int-fila')) pintarLista([]);
  contarLugares();
});
$('#agregar-integrante').addEventListener('click', () => {
  document.querySelector('#lista-integrantes .int-vacio')?.remove();
  $('#lista-integrantes').insertAdjacentHTML('beforeend', filaIntegrante({ nombre: '', invitado: true }));
  const nuevos = document.querySelectorAll('#lista-integrantes .int-nombre');
  nuevos[nuevos.length - 1].focus();
});
function abrirEditor(id) {
  st.editando = id || null;
  const inv = id ? st.invitados[id] : { personas: 2, estado: 'Habilitado' };
  $('#dlg-titulo').textContent = id ? 'Editar familia' : 'Nueva familia';
  form.nombre.value = inv.nombre || '';
  form.personas.value = inv.personas || 1;
  form.mesa.value = inv.mesa ?? '';
  pintarLista(leerLista(inv));
  form.mensaje.value = inv.mensaje || '';
  form.nota.value = (id && st.notas[id]) || '';
  form.estado.value = inv.estado || 'Habilitado';
  $('#pase-error').textContent = '';
  dlg.showModal();
}
$('#nuevo').addEventListener('click', () => abrirEditor(null));
$('#cancelar-pase').addEventListener('click', () => dlg.close());
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = form.nombre.value.trim();
  const personas = Number(form.personas.value);
  if (!nombre || !(personas >= 1)) { $('#pase-error').textContent = 'Escribe el nombre y al menos 1 lugar.'; return; }
  const yaConfirmo = st.editando && st.respuestas[st.editando];
  if (yaConfirmo && yaConfirmo.asistencia === 'si' && Number(yaConfirmo.confirmados) > personas
    && !confirm(`Esta familia ya confirmó ${yaConfirmo.confirmados} personas y ahora tendrá ${personas} lugares. `
      + '¿Guardar de todos modos? (Puedes borrar su respuesta para que vuelvan a confirmar.)')) return;
  let id = st.editando;
  if (!id) {
    do { id = [...crypto.getRandomValues(new Uint8Array(4))].map((x) => x.toString(16).padStart(2, '0')).join(''); }
    while (st.invitados[id]);
  }
  const nota = form.nota.value.trim();
  const lista = listaDelFormulario();
  try {
    await update(ref(db), {
      [`invitados/${id}`]: {
        familia: st.invitados[id]?.familia
          || Math.max(0, ...Object.values(st.invitados).map((x) => Number(x.familia) || 0)) + 1,
        nombre,
        personas,
        mesa: form.mesa.value === '' ? 0 : Number(form.mesa.value),
        lista,
        integrantes: lista.filter((p) => p.invitado).map((p) => p.nombre).join(', '),
        mensaje: form.mensaje.value.trim(),
        estado: form.estado.value,
      },
      [`notas/${id}`]: nota || null,
    });
    dlg.close();
    toast(st.editando ? 'Familia actualizada' : 'Familia agregada');
  } catch (err) {
    $('#pase-error').textContent = `No se pudo guardar (${err.code || err.message}).`;
  }
});

/* ---------- por mesa ---------- */
$('#ver-mesas').addEventListener('click', () => {
  const mesas = {};
  Object.entries(st.invitados).forEach(([id, inv]) => {
    if (cancelado(inv)) return;
    const m = (mesas[inv.mesa ?? 0] ||= { lugares: 0, si: 0, no: 0, pend: 0 });
    m.lugares += Number(inv.personas) || 0;
    const t = tipo(id);
    if (t === 'si') m.si += Number(st.respuestas[id].confirmados) || 0;
    if (t === 'no') m.no += 1;
    if (t === 'pend') m.pend += 1;
  });
  $('#tabla-mesas').innerHTML = `
    <table class="tabla">
      <thead><tr><th>Mesa</th><th>Lugares</th><th>Confirmados</th><th>Pases "no"</th><th>Sin respuesta</th></tr></thead>
      <tbody>${Object.keys(mesas).sort((a, b) => a - b).map((k) => `
        <tr><td>${esc(k)}</td><td>${mesas[k].lugares}</td><td>${mesas[k].si}</td><td>${mesas[k].no}</td><td>${mesas[k].pend}</td></tr>`).join('')}
      </tbody>
    </table>`;
  $('#dlg-mesas').showModal();
});
$('#cerrar-mesas').addEventListener('click', () => $('#dlg-mesas').close());

/* ---------- exportar ---------- */
$('#exportar').addEventListener('click', () => {
  const cab = ['Familia', 'Mesa', 'Nombre', 'Lugares', 'Estado del pase', 'Respuesta', 'Personas confirmadas', 'Quiénes van',
    'Mensaje del invitado', 'Fecha de respuesta', 'Invitación enviada', 'Integrantes', 'Nota', 'Código', 'Enlace'];
  const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = Object.entries(st.invitados)
    .sort(([, a], [, b]) => (Number(a.familia) || 999) - (Number(b.familia) || 999))
    .map(([id, inv]) => {
      const r = st.respuestas[id];
      return [inv.familia ?? '', Number(inv.mesa) > 0 ? inv.mesa : '', inv.nombre, inv.personas, inv.estado,
        r ? (r.asistencia === 'si' ? 'Asistirá' : 'No asistirá') : 'Sin respuesta',
        r?.confirmados ?? '', r?.asistentes ?? '', r?.comentario ?? '',
        r?.fecha ? new Date(r.fecha).toLocaleString('es-MX') : '',
        st.enviados[id] ? new Date(st.enviados[id]).toLocaleString('es-MX') : '',
        inv.integrantes, st.notas[id] || '', id, enlace(id)].map(celda).join(',');
    });
  Object.entries(st.generales).forEach(([id, g]) => {
    filas.push(['', '', `General: ${g.nombre}`, '', 'Invitación general',
      g.asistencia === 'si' ? 'Asistirá' : 'No asistirá', g.confirmados ?? '', g.asistentes ?? '', g.comentario ?? '',
      g.fecha ? new Date(g.fecha).toLocaleString('es-MX') : '', '', g.telefono ? `Tel. ${g.telefono}` : '', '', id, SITIO]
      .map(celda).join(','));
  });
  const blob = new Blob(['﻿' + [cab.map(celda).join(','), ...filas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `invitados-boda-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});
