import { storeConfig } from "./storeConfig.js";

// Pregunta al asesor con IA. Devuelve { text, items } o null (entonces la tienda usa las respuestas por reglas).
export async function preguntarIA(pregunta, chat, productos, inventario, sugeridos = []) {
  if (!storeConfig.aiEndpoint) return null;
  const ver = (p) => ({ id: p.id, marca: p.marca, nombre: p.nombre, genero: p.genero, linea: p.linea, familiaAromatica: p.familiaAromatica, precioDetal: p.precioDetal, stock: Number(inventario?.[p.id] ?? p.stock ?? 0) });
  const todos = productos.map(ver);
  const usados = new Set(); const candidatos = [];
  const add = (p) => { if (!usados.has(p.id) && candidatos.length < 60) { usados.add(p.id); candidatos.push(p); } };
  sugeridos.forEach((p) => add(ver(p)));
  todos.filter((p) => p.stock > 0).forEach(add);
  for (const g of ["Hombre", "Mujer", "Unisex"]) for (const l of ["Comercial", "Árabe"]) todos.filter((p) => p.genero === g && p.linea === l).slice(0, 5).forEach(add);
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(storeConfig.aiEndpoint, {
      method: "POST", headers: { "content-type": "application/json" }, signal: ctrl.signal,
      body: JSON.stringify({ pregunta, historial: chat.slice(-6).map((m) => ({ role: m.role, text: m.text })), candidatos }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (!d?.texto) return null;
    return { text: d.texto, items: (d.ids || []).map((id) => productos.find((p) => p.id === id)).filter(Boolean) };
  } catch { return null; } finally { clearTimeout(t); }
}
