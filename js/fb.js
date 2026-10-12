/* Conexión de la invitación con Firebase Realtime Database.
   Cada invitado solo puede leer y responder su propio pase (ver database.rules.json). */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, get, set, onValue, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const listo = window.__fbListo;
try {
  const app = initializeApp(window.INVITACION.firebase);
  const db = getDatabase(app);

  listo.resolver({
    async obtener(id) {
      const [inv, resp] = await Promise.all([get(ref(db, `invitados/${id}`)), get(ref(db, `respuestas/${id}`))]);
      if (!inv.exists()) return null;
      const r = resp.val();
      return {
        ...inv.val(),
        id,
        respuesta: r ? { ...r, fecha: new Date(r.fecha).toISOString() } : null,
      };
    },
    // Escucha cambios en vivo del pase y de su respuesta (p. ej. si el admin cambia los lugares)
    escuchar(id, alCambiar) {
      let inv;
      let resp;
      const cargado = { inv: false, resp: false };
      const avisar = () => {
        if (!cargado.inv || !cargado.resp) return;
        alCambiar(inv ? {
          ...inv,
          id,
          respuesta: resp ? { ...resp, fecha: new Date(resp.fecha).toISOString() } : null,
        } : null);
      };
      onValue(ref(db, `invitados/${id}`), (s) => { inv = s.val(); cargado.inv = true; avisar(); });
      onValue(ref(db, `respuestas/${id}`), (s) => { resp = s.val(); cargado.resp = true; avisar(); });
    },
    async guardar(id, datos) {
      await set(ref(db, `respuestas/${id}`), {
        asistencia: datos.asistencia,
        confirmados: datos.confirmados,
        asistentes: datos.asistentes || '',
        comentario: datos.comentario || '',
        fecha: serverTimestamp(),
      });
      return { ...datos, fecha: new Date().toISOString() };
    },
    // Invitación general: un registro por teléfono (el invitado no puede leer ni sobrescribir)
    async guardarGeneral(datos) {
      try {
        await set(ref(db, `generales/${datos.telefono}`), {
          nombre: datos.nombre,
          telefono: datos.telefono,
          asistencia: datos.asistencia,
          confirmados: datos.confirmados,
          asistentes: datos.asistentes || '',
          comentario: datos.comentario || '',
          fecha: serverTimestamp(),
        });
      } catch (e) {
        if (String(e.code || e.message).toUpperCase().includes('PERMISSION')) throw Object.assign(new Error('duplicado'), { code: 'duplicado' });
        throw e;
      }
    },
  });
} catch (e) {
  listo.fallar(e);
}
