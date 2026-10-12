// Base de datos falsa en memoria para probar el panel de mesas sin Firebase.
const datos = await fetch('mesas-firebase.json').then((r) => r.json());
datos.gastos = await fetch('gastos-firebase.json').then((r) => r.json());
const oyentes = [];
const partes = (p) => p.split('/').filter(Boolean);
function leer(p) { return partes(p).reduce((o, k) => (o == null ? o : o[k]), datos) ?? null; }
function escribir(p, v) {
  const ks = partes(p);
  let o = datos;
  ks.slice(0, -1).forEach((k) => { o[k] = o[k] ?? {}; o = o[k]; });
  if (v === null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v;
}
const avisar = () => oyentes.forEach(({ p, cb }) => cb({ val: () => structuredClone(leer(p)) }));
export const ref = (db, p = '') => ({ p, key: p.split('/').pop() });
export function onValue(r, cb) { const o = { p: r.p, cb }; oyentes.push(o); setTimeout(() => cb({ val: () => structuredClone(leer(r.p)) })); return () => {}; }
export async function set(r, v) { escribir(r.p, v); avisar(); }
export async function update(r, obj) { Object.entries(obj).forEach(([k, v]) => escribir(`${r.p}/${k}`, v)); avisar(); }
export function push(r) { const key = `n${Math.random().toString(36).slice(2, 8)}`; return { p: `${r.p}/${key}`, key }; }
export async function remove(r) { escribir(r.p, null); avisar(); }
export const serverTimestamp = () => Date.now();
window.__datos = datos;
