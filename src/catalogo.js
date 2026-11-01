import base from "./productos.json";
import { storeConfig } from "./storeConfig.js";

const CLAVE = "nova-sheet-cache-v1";
export let productos = base; // enlace vivo: se actualiza antes de montar la app

const norm = (s = "") => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

function parseCSV(t) {
  const rows = []; let r = [], c = "", q = false;
  const cerrar = () => { r.push(c); c = ""; if (r.some((x) => x.trim() !== "")) rows.push(r); r = []; };
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { r.push(c); c = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; cerrar(); }
    else c += ch;
  }
  cerrar();
  const h = (rows.shift() || []).map(norm);
  return rows.map((f) => Object.fromEntries(h.map((k, i) => [k, (f[i] ?? "").trim()])));
}

function fusionar(filas) {
  const out = new Map(base.map((p) => [p.id, p]));
  for (const f of filas) {
    if (!f.id) continue;
    if (["no", "false", "0", "oculto"].includes((f.visible || "").toLowerCase())) { out.delete(f.id); continue; }
    const prev = out.get(f.id) || { genero: "Unisex", linea: "Comercial", familiaAromatica: "Versátil", imagen: "/catalog-images/placeholder.svg", notas: "Consulta sus notas y disponibilidad por WhatsApp." };
    const n = { ...prev, id: f.id };
    for (const k of ["marca", "nombre", "genero", "linea", "notas", "imagen"]) if (f[k]) n[k] = f[k];
    if (f.familiaaromatica) n.familiaAromatica = f.familiaaromatica;
    const precio = Number((f.preciodetal || "").replace(/[^\d]/g, ""));
    if (precio) n.precioDetal = precio;
    if (f.stock !== "" && f.stock !== undefined) n.stock = Math.max(0, Number(f.stock) || 0);
    n.disponible = Number(n.stock || 0) > 0;
    if (n.nombre && n.precioDetal) out.set(f.id, n);
  }
  return [...out.values()];
}

async function traerHoja(ms) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(storeConfig.sheetUrl, { signal: ctrl.signal, cache: "no-store" });
    if (!r.ok) throw new Error("hoja");
    const filas = parseCSV(await r.text());
    if (filas.length) { try { localStorage.setItem(CLAVE, JSON.stringify(filas)); } catch { /* sin almacenamiento */ } }
    return filas;
  } finally { clearTimeout(t); }
}

export async function cargarCatalogo() {
  if (!storeConfig.sheetUrl) return;
  let cache = null;
  try { cache = JSON.parse(localStorage.getItem(CLAVE) || "null"); } catch { /* ignorar */ }
  const red = traerHoja(cache?.length ? 5000 : 2500).catch(() => null);
  if (cache?.length) { productos = fusionar(cache); return; } // rápido ahora; la red actualiza para la próxima visita
  const filas = await red;
  if (filas?.length) productos = fusionar(filas);
}
