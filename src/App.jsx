import { useEffect, useMemo, useRef, useState } from "react";
import { storeConfig } from "./storeConfig.js";
import { productos } from "./catalogo.js";
import { LegalModal, textoVendedor } from "./Legal.jsx";
import { preguntarIA } from "./asesorIA.js";

const ENVIO_POPAYAN = storeConfig.envioPopayan;
const DESCUENTO_SEPARE = storeConfig.descuentoSepare;
const WHATSAPP = storeConfig.whatsapp;
// Número compartido para contacto y transferencias; cámbialo si tus cuentas usan otro.
const NUMERO_PAGOS = storeConfig.numeroPagos;
const filtros = ["Todos", "Hombre", "Mujer", "Línea Árabe", "Línea Comercial"];
const aromas = ["Todos los estilos", "Dulce", "Floral", "Fresco", "Cítrico", "Amaderado", "Oriental", "Versátil"];
const catalogos = [
  { label: "Catálogo Caballeros", file: "/catalogos/catalogo-caballeros-2026-portada-novascents.pdf" },
  { label: "Catálogo Damas", file: "/catalogos/catalogo-damas-2026-portada-novascents.pdf" },
  { label: "Catálogo Árabe", file: "/catalogos/catalogo-arabe-2026-portada-novascents.pdf" },
];
const particulasBruma = Array.from({ length: 30 }, (_, i) => ({ left: `${(i * 37 + 9) % 100}%`, top: `${(i * 61 + 7) % 100}%`, size: `${2 + (i % 4)}px`, delay: `${-((i * 7) % 19)}s`, duration: `${14 + (i % 13)}s`, drift: `${18 + ((i * 11) % 50)}px` }));
const cop = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
const pedidoCancelado = (p) => ["cancelado", "cancelado_inasistencia"].includes(p?.estado);
const pedidoTieneEncargo = (p) => (p?.lineas || []).some((x) => Number(x.cantidadEncargo) > 0) || /plan separe|encargo/i.test(p?.modalidad || "");
const estadoPagoPedido = (p) => p?.pagoCompletoConfirmado || p?.estadoPago === "pagado" || (p?.pagoAbonoConfirmado && !(Number(p?.saldo) > 0)) ? "pagado" : p?.estadoPago === "abono" || (p?.pagoAbonoConfirmado && Number(p?.saldo) > 0) ? "abono" : "pendiente";
const pagoFueAnticipado = (p) => Boolean(p?.pagoCompletoAnticipado ?? (p?.estado !== "entregado" && p?.estadoEnvio !== "entregado"));
const fechaLimiteInicial = () => { const fecha = new Date(Date.now() + 4 * 60 * 60 * 1000); fecha.setMinutes(0, 0, 0); const zona = fecha.getTimezoneOffset() * 60000; return new Date(fecha.getTime() - zona).toISOString().slice(0, 16); };
const fechaLocalInput = (valor) => { if (!valor) return ""; const fecha = new Date(valor); return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const ImagenProducto = ({ className = "", ...props }) => <img {...props} onError={(e) => { if (!e.currentTarget.dataset.respaldo) { e.currentTarget.dataset.respaldo = "1"; e.currentTarget.src = "/catalog-images/placeholder.svg"; } }} draggable={false} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} className={`select-none ${className}`} />;
function ConfetiCristal() {
  const canvasRef = useRef(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: true });
    if (!gl) { setFallback(true); return undefined; }
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, `attribute vec2 a_position; attribute float a_seed; uniform float u_time; uniform vec2 u_resolution; varying float v_alpha; void main(){ float drift=mod(u_time*0.10+a_seed,2.0); vec2 p=a_position; p.x+=sin(u_time*0.55+a_seed*31.0)*0.035; p.y=mod(p.y+drift+1.0,2.0)-1.0; gl_Position=vec4(p,0.0,1.0); gl_PointSize=2.5+mod(a_seed*19.0,5.0); v_alpha=0.35+0.65*abs(sin(u_time+a_seed*17.0)); }`);
    const fragment = compile(gl.FRAGMENT_SHADER, `precision mediump float; varying float v_alpha; void main(){ vec2 d=gl_PointCoord-0.5; float crystal=step(abs(d.x)+abs(d.y),0.48); if(crystal<0.5) discard; gl_FragColor=vec4(0.95,0.80,0.42,v_alpha); }`);
    if (!vertex || !fragment) { setFallback(true); return undefined; }
    const program = gl.createProgram();
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { setFallback(true); return undefined; }
    gl.useProgram(program);
    const count = 180;
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) { data[i * 3] = Math.random() * 2 - 1; data[i * 3 + 1] = Math.random() * 2 - 1; data[i * 3 + 2] = Math.random(); }
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position"); const seed = gl.getAttribLocation(program, "a_seed");
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 12, 0);
    gl.enableVertexAttribArray(seed); gl.vertexAttribPointer(seed, 1, gl.FLOAT, false, 12, 8);
    const time = gl.getUniformLocation(program, "u_time"); const resolution = gl.getUniformLocation(program, "u_resolution");
    let frame = 0; const start = performance.now();
    const draw = (now) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); const width = Math.floor(window.innerWidth * dpr); const height = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      gl.viewport(0, 0, width, height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(time, (now - start) / 1000); gl.uniform2f(resolution, width, height); gl.drawArrays(gl.POINTS, 0, count);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); };
  }, []);
  return <><canvas ref={canvasRef} aria-hidden="true" className="nova-thanks-canvas"/>{fallback && <div aria-hidden="true" className="nova-crystal-fallback">{Array.from({ length: 42 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-((i * 7) % 12)}s`, animationDuration: `${8 + (i % 7)}s` }}/>)}</div>}</>;
}
const estadosPedido = [
  ["recibido", "Pedido recibido"], ["confirmado", "Pedido confirmado"], ["esperando_producto", "En espera del perfume"],
  ["preparando", "Preparando pedido"], ["enviado", "Enviado"], ["listo_recogida", "Listo para recoger"], ["entregado", "Entregado"], ["cancelado", "Cancelado"], ["cancelado_inasistencia", "Cancelado por inasistencia"],
];
const etiquetaEstado = (estado) => estadosPedido.find(([id]) => id === estado)?.[1] || "Pedido recibido";
const cumpleAromaNova = (p, estilo) => {
  if (estilo === "Todos los estilos") return true;
  const texto = `${p.familiaAromatica || ""} ${p.notas || ""} ${p.nombre || ""}`.toLocaleLowerCase("es");
  const palabras = estilo === "Dulce" ? /dulce|vainilla|caramelo|gourmand|tonka|miel|frutal/ : estilo === "Fresco" ? /fresco|cítrico|citrico|acuático|acuatico|marino|verde|limón|limon/ : /amaderado|oriental|especiado|oud|cuero|intenso|fuerte|ámbar|ambar/;
  return palabras.test(texto);
};
const normalizarNova = (valor = "") => valor.toLocaleLowerCase("es-CO").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const resolverConsultaNova = (consulta, inventario = {}) => {
  const q = normalizarNova(consulta);
  const catalogoActual = productos.map((p) => ({ ...p, stock: Number(inventario[p.id] ?? p.stock ?? 0), disponible: Number(inventario[p.id] ?? p.stock ?? 0) > 0 }));
  const stop = new Set("quiero busco busca recomiendame recomiendame recomiendas recomendarme algun alguno una uno para con que cual cuales perfume perfumes aroma aromas olor huele tiene sobre dime hay tienes vender venden precio cuesta vale es del de la el un una por favor gracias nova".split(" "));
  const tokens = q.split(/[^a-z0-9]+/).filter((x) => x.length > 2 && !stop.has(x));
  const estilo = /dulce|vainilla|caramelo|gourmand/.test(q) ? "Dulce" : /fresco|citrico|acuatico|marino|limon/.test(q) ? "Fresco" : /fuerte|intenso|amaderado|oud|especiado|oriental/.test(q) ? "Fuerte" : "Todos los estilos";
  const genero = /\b(hombre|masculino|el)\b/.test(q) ? "Hombre" : /\b(mujer|femenino|ella)\b/.test(q) ? "Mujer" : "Todos";
  const linea = /arabe|lattafa|armaf/.test(q) ? "Árabe" : "Todos";
  const quiereStock = /disponible|inmediata|stock|hoy/.test(q);
  if (/plan separe|separar|abono|encargo/.test(q)) return { text: "Los perfumes agotados en Popayán siguen disponibles por encargo: los separas con un abono del 50% y el checkout aplica el descuento de $5.000 COP.", items: catalogoActual.filter((p) => !p.disponible).sort((a, b) => a.precioDetal - b.precioDetal).slice(0, 3) };
  if (/metodo.*pago|como pago|formas de pago/.test(q)) return { text: "Puedes coordinar el pago por Nequi, Daviplata, Bancolombia, Bre-B o pago contra entrega. Para Bre-B, solicita por WhatsApp la llave oficial antes de transferir.", items: [] };
  if (/envio|domicilio|entrega.*cuanto|recogida/.test(q)) return { text: "En Popayán puedes pedir domicilio por $5.000 COP o elegir recogida personal sin costo. La dirección o barrio se solicita al finalizar el pedido.", items: [] };
  const coincidenciasNombre = catalogoActual.filter((p) => tokens.length && tokens.some((token) => normalizarNova(`${p.marca} ${p.nombre}`).includes(token)));
  if (quiereStock) {
    const preguntado = coincidenciasNombre[0];
    if (preguntado?.stock > 0) return { text: `${preguntado.marca} ${preguntado.nombre} está disponible para entrega inmediata en Popayán (${preguntado.stock} en stock). Confirma la entrega por WhatsApp.`, items: [preguntado] };
    if (preguntado) return { text: `${preguntado.marca} ${preguntado.nombre} está agotado en Popayán. Puedes pedirlo por encargo con Plan Separe: abonas el 50% y te confirmamos el tiempo de llegada.`, items: [preguntado] };
    return { text: "Estos son los perfumes con entrega inmediata en Popayán. También puedo ayudarte a buscar una fragancia específica.", items: catalogoActual.filter((p) => p.stock > 0).slice(0, 3) };
  }
  let candidates = catalogoActual.filter((p) => (genero === "Todos" || p.genero === genero || p.genero === "Unisex") && (linea === "Todos" || p.linea === linea) && cumpleAromaNova(p, estilo));
  const ranked = candidates.map((p) => ({ p, score: tokens.reduce((n, token) => n + (normalizarNova(`${p.marca} ${p.nombre}`).includes(token) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score || Number(b.p.disponible) - Number(a.p.disponible) || a.p.precioDetal - b.p.precioDetal);
  const matchesByName = ranked.filter((x) => x.score > 0);
  const items = (matchesByName.length ? matchesByName : ranked).slice(0, 3).map((x) => x.p);
  if (!items.length) return { text: "No encontré una coincidencia clara con esos filtros. Prueba con ‘dulce’, ‘fresco’, ‘hombre’, ‘mujer’ o una marca. Si quieres, te conecto con el equipo por WhatsApp.", items: [] };
  const preguntanNotas = /nota|notas|ingrediente|ingredientes|composicion|composicion/.test(q);
  const preguntanPrecio = /precio|cuesta|vale|valor/.test(q);
  const preguntanStock = /disponible|stock|inmediata|hoy/.test(q);
  const exacto = matchesByName.length === 1 && tokens.some((token) => normalizarNova(`${matchesByName[0].p.marca} ${matchesByName[0].p.nombre}`).includes(token));
  if (exacto) {
    const p = items[0];
    const estado = p.disponible ? "está disponible para entrega inmediata en Popayán" : "está bajo pedido y se puede separar con el 50%";
    const extra = preguntanNotas ? ` Su estilo registrado es ${p.familiaAromatica || "versátil"}; el catálogo no detalla todas las notas, así que puedo confirmarlas por WhatsApp.` : ` Su estilo es ${p.familiaAromatica || "versátil"}.`;
    return { text: `${p.marca} ${p.nombre} cuesta ${cop(p.precioDetal)} y ${estado}.${extra}`, items };
  }
  const inicio = estilo !== "Todos los estilos" ? `Para un aroma ${estilo.toLowerCase()}${genero !== "Todos" ? ` ${genero === "Hombre" ? "masculino" : "femenino"}` : ""},` : genero !== "Todos" ? `Para ${genero === "Hombre" ? "hombre" : "mujer"},` : "Estas opciones del catálogo pueden servirte:";
  const extra = preguntanNotas ? " Las familias son orientativas; el catálogo no incluye las notas completas de cada fragancia." : preguntanPrecio ? ` Los precios de estas opciones van de ${cop(Math.min(...items.map((p) => p.precioDetal)))} a ${cop(Math.max(...items.map((p) => p.precioDetal)))}.` : preguntanStock ? " Estas opciones están marcadas para entrega inmediata." : " Te muestro opciones priorizando disponibilidad inmediata.";
  return { text: `${inicio} te recomiendo estas opciones.${extra}`, items };
};
const combosRegalo = [
  { id: "duo-oriental", nombre: "Dúo de aromas orientales", frase: "Dos favoritos árabes para compartir.", productos: ["arabe-12-02-asad", "arabe-10-02-yara"] },
  { id: "duo-para-compartir", nombre: "Dúo para compartir", frase: "Una opción para él y otra para ella.", productos: ["caballero-19-02-one-million", "dama-11-03-can-can-paris-hilton"] },
  { id: "duo-esencias", nombre: "Dúo de esencias", frase: "Dos clásicos para renovar tu colección.", productos: ["caballero-12-03-versace-eros", "dama-16-02-olympea"] },
].map((combo) => ({ ...combo, items: combo.productos.map((id) => productos.find((p) => p.id === id)).filter(Boolean) })).filter((combo) => combo.items.length === 2 && combo.items.every((p) => p.disponible));

function AdminDashboard({ pedidos, productosActuales, masVistos, onCambiarEnvio, onCambiarPago, onCambiarStock, onCancelar, onEliminar, onActualizarPedido, onTienda }) {
  const [seccion, setSeccion] = useState("resumen");
  const [busqueda, setBusqueda] = useState("");
  const [filtroPedido, setFiltroPedido] = useState("activos");
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setAhora(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const activos = pedidos.filter((p) => !pedidoCancelado(p));
  const ingresos = activos.reduce((total, p) => {
    const estadoPago = estadoPagoPedido(p);
    return total + (estadoPago === "pagado" ? Number(p.total) || 0 : estadoPago === "abono" ? Number(p.abono) || 0 : 0);
  }, 0);
  const porCobrar = activos.reduce((total, p) => {
    const esEncargo = pedidoTieneEncargo(p);
    const pagado = p.estadoPago === "pagado" || (p.pagoAbonoConfirmado && !(Number(p.saldo) > 0));
    return total + (esEncargo && !pagado ? Math.max(0, Number(p.saldo) || 0) : 0);
  }, 0);
  const pedidosFiltrados = pedidos.filter((p) => {
    const pago = estadoPagoPedido(p);
    const coincideFiltro = filtroPedido === "todos" || (filtroPedido === "activos" && !pedidoCancelado(p) && p.estado !== "entregado" && p.estadoEnvio !== "entregado") || (filtroPedido === "plan" && !pedidoCancelado(p) && p.estado !== "entregado" && p.estadoEnvio !== "entregado" && pedidoTieneEncargo(p) && pago !== "pagado") || (filtroPedido === "pagados" && pago === "pagado" && pagoFueAnticipado(p) && !pedidoCancelado(p)) || (filtroPedido === "cancelados" && pedidoCancelado(p));
    return coincideFiltro && `${p.id} ${p.nombreCliente || ""} ${p.telefonoCliente || ""} ${(p.lineas || []).map((x) => x.nombre).join(" ")}`.toLowerCase().includes(busqueda.toLowerCase());
  });
  const productosFiltrados = productosActuales.filter((p) => `${p.nombre} ${p.marca}`.toLowerCase().includes(busqueda.toLowerCase()));
  const panel = "rounded-2xl border border-white/10 bg-white/[0.035]";
  const input = "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none focus:border-violet-400/60";
  const nav = [["resumen", "◫", "Resumen"], ["pedidos", "▤", "Pedidos y pagos"], ["no_finalizados", "◷", "No finalizados"], ["inventario", "◈", "Inventario"]];
  const estadoPago = estadoPagoPedido;
  const envioActual = (p) => p.estadoEnvio || (p.estado === "enviado" ? "en_moto" : p.estado === "entregado" ? "entregado" : "pendiente");
  const etiquetaPago = (p) => estadoPago(p) === "pagado" ? (pagoFueAnticipado(p) ? "Pagado 100% - Prioridad" : "Pagado 100%") : pedidoTieneEncargo(p) && estadoPago(p) === "abono" ? "Pendiente saldo contra entrega" : estadoPago(p) === "abono" ? "Abono recibido · saldo pendiente" : pedidoTieneEncargo(p) ? "Abono 50% pendiente" : "Pago pendiente";
  const badgePago = (estado) => estado === "pagado" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_14px_#34d39918]" : estado === "abono" ? "border-amber-300/30 bg-amber-300/10 text-amber-200 shadow-[0_0_14px_#fbbf2418]" : "border-white/10 bg-white/[0.04] text-stone-300";
  return <main className="min-h-screen bg-[#07080b] text-white">
    <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col md:flex-row">
      <aside className="border-b border-white/10 bg-[#090a0e] p-4 md:w-64 md:border-b-0 md:border-r md:p-5">
        <button onClick={onTienda} className="flex items-center gap-3 text-left"><span className="grid size-10 place-items-center rounded-xl border border-violet-300/30 bg-violet-400/10 text-lg text-violet-200">N✳</span><span><strong className="block font-display text-sm">NovaScents</strong><small className="text-[10px] text-stone-500">PANEL DE CONTROL</small></span></button>
        <nav className="mt-6 flex gap-2 overflow-x-auto md:flex-col">{nav.map(([id, icon, label]) => <button key={id} onClick={() => { setSeccion(id); setBusqueda(""); }} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-xs transition ${seccion === id ? "bg-violet-400/10 text-violet-200 ring-1 ring-violet-300/20" : "text-stone-400 hover:bg-white/[0.04] hover:text-white"}`}><span className="text-base">{icon}</span>{label}</button>)}</nav>
        <div className="mt-8 hidden rounded-xl border border-white/10 p-3 text-[10px] leading-5 text-stone-500 md:block">Los datos de este panel se guardan localmente en este navegador.</div>
        <button onClick={onTienda} className="mt-4 hidden w-full rounded-xl border border-white/10 px-3 py-2.5 text-xs text-stone-400 hover:text-white md:block">← Volver a la tienda</button>
      </aside>
      <section className="min-w-0 flex-1 p-4 sm:p-7 lg:p-9">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[.24em] text-violet-300">NOVASCENTS · OPERACIONES</p><h1 className="mt-1 font-display text-2xl sm:text-3xl">{nav.find(([id]) => id === seccion)?.[2]}</h1><p className="mt-1 text-xs text-stone-500">Control local de ventas, pedidos y disponibilidad física.</p></div><div className="flex items-center gap-2"><span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2 text-[10px] text-emerald-300">● Admin activo</span><button onClick={onTienda} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-stone-300 md:hidden">Tienda</button></div></header>
        {seccion === "resumen" && <>
          <div className="grid gap-3 sm:grid-cols-3"><article className={`${panel} p-5`}><p className="text-xs text-stone-400">Ingresos registrados</p><strong className="mt-3 block font-display text-2xl text-emerald-300">{cop(ingresos)}</strong><small className="mt-2 block text-[10px] text-stone-500">Abonos confirmados y pedidos pagados</small></article><article className={`${panel} p-5`}><p className="text-xs text-stone-400">Cuentas por cobrar</p><strong className="mt-3 block font-display text-2xl text-amber-200">{cop(porCobrar)}</strong><small className="mt-2 block text-[10px] text-stone-500">Saldo pendiente de pedidos Plan Separe</small></article><article className={`${panel} p-5`}><p className="text-xs text-stone-400">Total de pedidos</p><strong className="mt-3 block font-display text-2xl text-violet-200">{pedidos.length}</strong><small className="mt-2 block text-[10px] text-stone-500">Incluye pedidos activos y cancelados</small></article></div>
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_1fr]"><article className={`${panel} p-5`}><h2 className="font-display text-lg">Pedidos recientes</h2><div className="mt-4 space-y-2">{activos.slice(0, 5).map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] px-3 py-3"><div className="min-w-0"><p className="text-[10px] text-violet-200">{p.id}</p><p className="mt-1 truncate text-xs font-medium">{p.nombreCliente} · {(p.lineas || []).map((x) => x.nombre).join(", ")}</p></div><span className={`rounded-full border px-2.5 py-1 text-[9px] ${badgePago(estadoPago(p))}`}>{etiquetaPago(p)}</span></div>)}{!activos.length && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-stone-500">Aún no hay pedidos registrados.</p>}</div></article><article className={`${panel} p-5`}><h2 className="font-display text-lg">Más consultados</h2><div className="mt-4 space-y-4">{masVistos.map((p, index) => <div key={p.id} className="flex items-center justify-between gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-400/10 text-xs text-violet-200">{index + 1}</span><span className="min-w-0 flex-1 truncate text-xs">{p.marca} · {p.nombre}</span><span className="text-[10px] text-stone-500">{p.clics}</span></div>)}</div></article></div>
        </>}
        {seccion === "pedidos" && <article className={panel + " overflow-hidden"}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5"><div><h2 className="font-display text-lg">Pedidos y pagos</h2><p className="mt-1 text-[10px] text-stone-500">El saldo Plan Separe se cobra contra entrega.</p></div><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar pedido, cliente o producto" className={input + " w-full sm:max-w-xs"}/></div>
          <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">{[["activos", "Pedidos activos"], ["plan", "Plan Separe (Pendiente entrega)"], ["pagados", "Pagados adelantados"], ["cancelados", "Cancelados / expirados"], ["todos", "Todos"]].map(([id, label]) => <button key={id} onClick={() => setFiltroPedido(id)} className={"rounded-full border px-3 py-2 text-[10px] " + (filtroPedido === id ? "border-violet-300/40 bg-violet-300/10 text-violet-100" : "border-white/10 text-stone-400")}>{label}</button>)}</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[1260px] text-left text-xs"><thead className="bg-white/[0.025] text-[9px] uppercase tracking-wider text-stone-500"><tr>{["ID Pedido", "Cliente", "Producto", "Método de pago", "Hora límite acordada", "Estado de envío", "Estado de pago", "Acciones"].map((x) => <th key={x} className="px-4 py-3 font-medium">{x}</th>)}</tr></thead><tbody className="divide-y divide-white/[0.06]">{pedidosFiltrados.map((p) => <tr key={p.id} className="align-top hover:bg-white/[0.02]"><td className="px-4 py-4 font-mono text-[10px] text-violet-200">{p.id}<small className="mt-1 block text-stone-600">{new Date(p.creado).toLocaleDateString("es-CO")}</small></td><td className="px-4 py-4"><strong className="block">{p.nombreCliente || "Cliente"}</strong><span className="mt-1 block text-[10px] text-stone-500">{p.telefonoCliente}</span></td><td className="max-w-[230px] px-4 py-4">{(p.lineas || []).map((x) => x.cantidad + " × " + x.nombre).join(" · ")}<small className="mt-1 block text-stone-500">Total {cop(p.total)} · Saldo contra entrega {cop(p.saldo)}</small></td><td className="px-4 py-4 text-[10px]">{p.metodoPago || "Por confirmar"}</td><td className="px-4 py-4 text-[10px]"><input type="datetime-local" aria-label="Editar hora límite acordada" value={fechaLocalInput(p.horaLimiteEntrega)} onChange={(e) => e.target.value && onActualizarPedido(p, { horaLimiteEntrega: new Date(e.target.value).toISOString() })} className="max-w-44 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[10px] text-stone-200"/>{p.horaLimiteEntrega && ahora >= new Date(p.horaLimiteEntrega).getTime() && p.estado !== "entregado" && estadoPago(p) !== "pagado" && <small className="mt-1 block text-rose-300">Hora vencida</small>}</td><td className="px-4 py-4"><select value={envioActual(p)} disabled={pedidoCancelado(p)} onChange={(e) => onCambiarEnvio(p, e.target.value)} className={input + " min-w-32 disabled:opacity-50"}><option value="pendiente">Pendiente</option><option value="en_moto">En Moto</option><option value="entregado">Entregado</option><option value="cancelado">Cancelado por inasistencia</option></select></td><td className="px-4 py-4"><select value={estadoPago(p)} disabled={pedidoCancelado(p)} onChange={(e) => onCambiarPago(p, e.target.value)} className={input + " min-w-40 disabled:opacity-50"}><option value="pendiente">Pago pendiente</option><option value="abono">Abono recibido · saldo contra entrega</option><option value="pagado">100% Pagado · Prioridad</option></select><span className={"mt-2 inline-flex rounded-full border px-2.5 py-1 text-[9px] " + badgePago(estadoPago(p))}>{etiquetaPago(p)}</span></td><td className="space-y-2 px-4 py-4"><button disabled={!p.horaLimiteEntrega || ahora < new Date(p.horaLimiteEntrega).getTime() || p.estado === "entregado" || estadoPago(p) === "pagado" || pedidoCancelado(p)} onClick={() => onCancelar(p)} className="block w-40 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-2 py-2 text-[9px] text-rose-200 hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-30">Expirado / No concretó</button><button onClick={() => { if (window.confirm("¿Eliminar definitivamente el pedido " + p.id + "?")) onEliminar(p.id); }} className="block w-40 rounded-lg border border-white/10 px-2 py-2 text-[9px] text-stone-400 hover:border-rose-400/30 hover:text-rose-200">Eliminar registro</button></td></tr>)}</tbody></table>{!pedidosFiltrados.length && <p className="p-10 text-center text-xs text-stone-500">No hay pedidos que coincidan con este filtro.</p>}</div>
        </article>}
        {seccion === "no_finalizados" && <article className={panel + " overflow-hidden"}><div className="border-b border-white/10 p-4 sm:p-5"><h2 className="font-display text-lg">No Finalizados / Cancelados</h2><p className="mt-1 text-[10px] text-stone-500">Archivo local de clientes y pedidos que no se concretaron.</p></div><div className="divide-y divide-white/[0.06]">{pedidos.filter(pedidoCancelado).map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"><div className="min-w-0"><p className="font-mono text-[10px] text-rose-200">{p.id} · {p.estado === "cancelado_inasistencia" ? "Cancelado por inasistencia" : "Cancelado"}</p><p className="mt-1 text-sm font-semibold">{p.nombreCliente} <span className="font-normal text-stone-500">· {p.telefonoCliente}</span></p><p className="mt-1 text-xs text-stone-400">{(p.lineas || []).map((x) => x.nombre).join(" · ")}</p><p className="mt-1 text-[10px] text-stone-600">Límite: {p.horaLimiteEntrega ? new Date(p.horaLimiteEntrega).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }) : "No registrado"} · {p.motivoCancelacion || "No finalizó"}</p></div><button onClick={() => { if (window.confirm("¿Eliminar definitivamente el pedido " + p.id + "?")) onEliminar(p.id); }} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] text-stone-400 hover:border-rose-400/30 hover:text-rose-200">Eliminar registro</button></div>)}{!pedidos.some(pedidoCancelado) && <p className="p-10 text-center text-xs text-stone-500">Aún no hay pedidos no finalizados.</p>}</div></article>}
        {seccion === "inventario" && <article className={`${panel} overflow-hidden`}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5"><div><h2 className="font-display text-lg">Control de inventario</h2><p className="mt-1 text-[10px] text-stone-500">El interruptor cambia el stock entre 1 unidad física y 0 por encargo.</p></div><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar perfume o marca" className={`${input} w-full sm:max-w-xs`}/></div><div className="max-h-[68vh] overflow-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="sticky top-0 bg-[#0b0c10] text-[9px] uppercase tracking-wider text-stone-500"><tr><th className="px-4 py-3 font-medium">Producto</th><th className="px-4 py-3 font-medium">Precio</th><th className="px-4 py-3 font-medium">Disponibilidad</th><th className="px-4 py-3 text-right font-medium">Stock</th></tr></thead><tbody className="divide-y divide-white/[0.06]">{productosFiltrados.map((p) => <tr key={p.id} className="hover:bg-white/[0.02]"><td className="px-4 py-3"><strong>{p.nombre}</strong><small className="mt-1 block text-[10px] text-stone-500">{p.marca} · {p.linea}</small></td><td className="px-4 py-3 text-stone-300">{cop(p.precioDetal)}</td><td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[9px] ${p.stock > 0 ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200" : "border-amber-300/20 bg-amber-300/[0.06] text-amber-100"}`}>{p.stock > 0 ? "En Popayán" : "Plan Separe"}</span></td><td className="px-4 py-3 text-right"><button role="switch" aria-checked={p.stock > 0} aria-label={`${p.nombre}: ${p.stock > 0 ? "marcar agotado" : "marcar disponible"}`} onClick={() => onCambiarStock(p, p.stock > 0 ? 0 : 1)} className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${p.stock > 0 ? "border-emerald-400/40 bg-emerald-400/20" : "border-white/15 bg-white/[0.06]"}`}><span className={`size-5 rounded-full transition ${p.stock > 0 ? "translate-x-6 bg-emerald-300 shadow-[0_0_12px_#34d39970]" : "translate-x-1 bg-stone-500"}`}/></button></td></tr>)}</tbody></table></div></article>}
        <p className="mt-5 text-[9px] leading-5 text-stone-600">El panel y las órdenes se guardan en el almacenamiento local de este navegador; los cambios no se sincronizan entre dispositivos.</p>
      </section>
    </div>
  </main>;
}

function App() {
  const [oscuro, setOscuro] = useState(() => localStorage.getItem("nova-theme") !== "light");
  const [adminMode, setAdminMode] = useState(() => localStorage.getItem("nova-admin-mode") === "1");
  const [vistaGracias, setVistaGracias] = useState(() => window.location.pathname === "/gracias");
  const [rutaActual, setRutaActual] = useState(() => window.location.pathname);
  const [nombrePerfil, setNombrePerfil] = useState(() => localStorage.getItem("nova-profile-name") || "Amante de las fragancias");
  const [contadorClics, setContadorClics] = useState(() => { try { return JSON.parse(localStorage.getItem("nova-perfume-clicks") || "{}"); } catch { return {}; } });
  const [audioActivo, setAudioActivo] = useState(false);
  const audioContextRef = useRef(null);
  const audioOscillatorsRef = useRef([]);
  const perfilCardRef = useRef(null);
  const logoClicksRef = useRef([]);
  const [gracias, setGracias] = useState(() => new URLSearchParams(window.location.search).get("pedido") || "");
  const [busqueda, setBusqueda] = useState("");
  const buscadorDesktopRef = useRef(null);
  const buscadorMovilRef = useRef(null);
  const workerBusquedaRef = useRef(null);
  const [resultadosWorker, setResultadosWorker] = useState(() => ({ query: "", ids: productos.map((p) => p.id) }));
  const [escuchando, setEscuchando] = useState(false);
  const [filtro, setFiltro] = useState("Todos");
  const [interaccionesCategoria, setInteraccionesCategoria] = useState(() => { try { return JSON.parse(localStorage.getItem("nova-category-clicks") || "{}"); } catch { return {}; } });
  const [aroma, setAroma] = useState("Todos los estilos");
  const [novaAromaFiltro, setNovaAromaFiltro] = useState("Todos los estilos");
  const [orden, setOrden] = useState("recomendados");
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [favoritos, setFavoritos] = useState(() => { try { return JSON.parse(localStorage.getItem("nova-favs") || "[]"); } catch { return []; } });
  const [vistosIds, setVistosIds] = useState(() => { try { return JSON.parse(localStorage.getItem("nova-recent") || "[]"); } catch { return []; } });
  const [inventarioStock, setInventarioStock] = useState(() => { const base = Object.fromEntries(productos.map((p) => [p.id, Number(p.stock) || 0])); return base; });
  const inventarioStockRef = useRef(inventarioStock);
  const [bolsa, setBolsa] = useState(() => { try { return JSON.parse(localStorage.getItem("nova-bag") || "{}"); } catch { return {}; } });
  const [bolsaInmediata, setBolsaInmediata] = useState(() => { try { return JSON.parse(localStorage.getItem("nova-bag-immediate") || "{}"); } catch { return {}; } });
  const [abierta, setAbierta] = useState(false);
  const [entrega, setEntrega] = useState("domicilio");
  const [metodoPago, setMetodoPago] = useState("Pago Contra Entrega");
  const [reservaSegundos, setReservaSegundos] = useState(15 * 60);
  const [direccion, setDireccion] = useState("");
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [legalAbierto, setLegalAbierto] = useState(null);
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [horaLimiteEntrega, setHoraLimiteEntrega] = useState(fechaLimiteInicial);
  const [error, setError] = useState("");
  const [bienvenida, setBienvenida] = useState(() => !localStorage.getItem("nova-welcome-seen") && !["/gracias", "/rastreo", "/admin", "/perfil", "/wishlist"].includes(window.location.pathname));
  const [detalle, setDetalle] = useState(null);
  const mistRef = useRef(null);
  const [comparacion, setComparacion] = useState([]);
  const [comparacionAbierta, setComparacionAbierta] = useState(false);
  const [retencionAbierta, setRetencionAbierta] = useState(false);
  const [rastreoAbierto, setRastreoAbierto] = useState(false);
  const [codigoRastreo, setCodigoRastreo] = useState("");
  const [rastreoConsultado, setRastreoConsultado] = useState(false);
  const [busquedaVisualAbierta, setBusquedaVisualAbierta] = useState(false);
  const [busquedaVisualCargando, setBusquedaVisualCargando] = useState(false);
  const [busquedaVisualUrl, setBusquedaVisualUrl] = useState("");
  const [resultadosVisuales, setResultadosVisuales] = useState([]);
  const inputVisualRef = useRef(null);
  const visualTimerRef = useRef(null);
  const [visorARAbierto, setVisorARAbierto] = useState(false);
  const [arCamaraActiva, setArCamaraActiva] = useState(false);
  const [arCamaraError, setArCamaraError] = useState("");
  const videoARRef = useRef(null);
  const botellaARRef = useRef(null);
  const streamARRef = useRef(null);
  const orientacionRef = useRef({ gamma: 0, beta: 0 });
  const [biometriaEstado, setBiometriaEstado] = useState("");
  const [avisoPushActivo, setAvisoPushActivo] = useState(false);
  const [personasViendo, setPersonasViendo] = useState(5);
  const [swipeCelebrado, setSwipeCelebrado] = useState("");
  const swipeInicioRef = useRef(0);
  const tituloPrincipalRef = useRef(null);
  const islaTimeoutRef = useRef(null);
  const [islaMensaje, setIslaMensaje] = useState("");
  const [mensajeComparar, setMensajeComparar] = useState("");
  const [quizAbierto, setQuizAbierto] = useState(false);
  const [chatNova, setChatNova] = useState([{ role: "assistant", text: "¡Hola! Soy Nova, la asistente de NovaScents. Cuéntame qué aroma buscas, para quién es o pregúntame por un perfume del catálogo." }]);
  const [consultaNova, setConsultaNova] = useState("");
  const [novaEscribiendo, setNovaEscribiendo] = useState(false);
  const [regaloAbierto, setRegaloAbierto] = useState(false);
  const [regaloPara, setRegaloPara] = useState("Todos");
  const [regaloPresupuesto, setRegaloPresupuesto] = useState(150000);
  const [regaloEstilo, setRegaloEstilo] = useState("Todos los estilos");
  const [regaloBusqueda, setRegaloBusqueda] = useState("");
  const [esRegalo, setEsRegalo] = useState(false);
  const [mensajeRegalo, setMensajeRegalo] = useState("");
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [toast, setToast] = useState("");
  const [recomendacionIds, setRecomendacionIds] = useState([]);
  const [pedidos, setPedidos] = useState(() => { try { return JSON.parse(localStorage.getItem("nova-orders") || "[]"); } catch { return []; } });
  const [seguimientoAbierto, setSeguimientoAbierto] = useState(false);
  const [codigoConsulta, setCodigoConsulta] = useState("");
  const [telefonoConsulta, setTelefonoConsulta] = useState("");
  const [pedidoConsultado, setPedidoConsultado] = useState(null);
  const [errorSeguimiento, setErrorSeguimiento] = useState("");
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [adminAutenticado, setAdminAutenticado] = useState(false);
  const [pinAdmin, setPinAdmin] = useState("");
  const [errorAdmin, setErrorAdmin] = useState("");
  const [adminBusqueda, setAdminBusqueda] = useState("");
  const [adminFiltroEstado, setAdminFiltroEstado] = useState("todos");

  const registrarFiltro = (valor) => {
    setFiltro(valor);
    const categoria = valor === "Línea Árabe" ? "Árabe" : ["Hombre", "Mujer"].includes(valor) ? valor : null;
    if (!categoria) return;
    setInteraccionesCategoria((actual) => {
      const siguiente = { ...actual, [categoria]: (actual[categoria] || 0) + 1 };
      localStorage.setItem("nova-category-clicks", JSON.stringify(siguiente));
      return siguiente;
    });
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const refs = [buscadorDesktopRef.current, buscadorMovilRef.current];
        const visible = refs.find((input) => input && input.getClientRects().length > 0);
        visible?.focus();
      }
      if (event.key !== "Escape") return;
      if (retencionAbierta) setRetencionAbierta(false);
      else if (rastreoAbierto) cerrarRastreo();
      else if (busquedaVisualAbierta) cerrarBusquedaVisual();
      else if (visorARAbierto) setVisorARAbierto(false);
      else if (abierta) setAbierta(false);
      else if (detalle) setDetalle(null);
      else if (quizAbierto) setQuizAbierto(false);
      else if (regaloAbierto) setRegaloAbierto(false);
      else if (seguimientoAbierto) setSeguimientoAbierto(false);
      else if (comparacionAbierta) setComparacionAbierta(false);
      else if (panelAbierto) setPanelAbierto(false);
      else if (bienvenida) cerrarBienvenida();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [retencionAbierta, rastreoAbierto, busquedaVisualAbierta, visorARAbierto, abierta, detalle, quizAbierto, regaloAbierto, seguimientoAbierto, comparacionAbierta, panelAbierto, bienvenida]);

  useEffect(() => {
    const onPointerExit = (event) => {
      if (event.clientY >= 0 || event.relatedTarget || window.innerWidth < 768) return;
      if (!Object.values(bolsa).some((cantidad) => cantidad > 0) || sessionStorage.getItem("nova-exit-intent-seen")) return;
      if (abierta || detalle || quizAbierto || regaloAbierto || seguimientoAbierto || comparacionAbierta || panelAbierto || bienvenida || rastreoAbierto || busquedaVisualAbierta || visorARAbierto) return;
      sessionStorage.setItem("nova-exit-intent-seen", "1");
      setRetencionAbierta(true);
    };
    document.addEventListener("mouseout", onPointerExit);
    return () => document.removeEventListener("mouseout", onPointerExit);
  }, [bolsa, abierta, detalle, quizAbierto, regaloAbierto, seguimientoAbierto, comparacionAbierta, panelAbierto, bienvenida, rastreoAbierto, busquedaVisualAbierta, visorARAbierto]);

  useEffect(() => {
    const worker = new Worker(new URL("./searchWorker.js", import.meta.url), { type: "module" });
    workerBusquedaRef.current = worker;
    worker.onmessage = ({ data }) => setResultadosWorker(data);
    worker.postMessage({ type: "index", products: productos });
    return () => { worker.terminate(); workerBusquedaRef.current = null; };
  }, []);
  useEffect(() => { workerBusquedaRef.current?.postMessage({ query: busqueda }); }, [busqueda]);

  useEffect(() => {
    if (["/rastreo", "/gracias", "/admin", "/perfil", "/wishlist"].includes(window.location.pathname)) { setBienvenida(false); localStorage.setItem("nova-welcome-seen", "1"); }
    if (window.location.pathname === "/rastreo") setRastreoAbierto(true);
    const onPopState = () => {
      const path = window.location.pathname;
      setRutaActual(path);
      setRastreoAbierto(path === "/rastreo");
      setVistaGracias(path === "/gracias");
      if (["/gracias", "/admin", "/perfil", "/wishlist"].includes(path)) { setBienvenida(false); localStorage.setItem("nova-welcome-seen", "1"); }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => { localStorage.setItem("nova-admin-mode", adminMode ? "1" : "0"); }, [adminMode]);
  useEffect(() => { localStorage.setItem("nova-perfume-clicks", JSON.stringify(contadorClics)); }, [contadorClics]);
  useEffect(() => { localStorage.setItem("nova-profile-name", nombrePerfil); }, [nombrePerfil]);

  useEffect(() => {
    if (!audioActivo || !detalle) return undefined;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) { setAudioActivo(false); return undefined; }
    const context = audioContextRef.current || new AudioCtx();
    audioContextRef.current = context;
    if (context.state === "suspended") context.resume().catch(() => {});
    const isFresh = /cítric|citr|fresc|acuát|marin/i.test(`${detalle.familiaAromatica || ""} ${detalle.nombre || ""}`);
    const isDark = /árabe|arabe|amader|oriental|oud|especiad/i.test(`${detalle.linea || ""} ${detalle.familiaAromatica || ""} ${detalle.nombre || ""}`);
    const tones = isDark ? [110, 146.83] : isFresh ? [392, 523.25, 659.25] : [261.63, 329.63, 392];
    audioOscillatorsRef.current.forEach((osc) => { try { osc.stop(); } catch {} });
    audioOscillatorsRef.current = tones.map((frequency, index) => {
      const oscillator = context.createOscillator(); const volume = context.createGain(); const filter = context.createBiquadFilter();
      oscillator.type = isDark ? "triangle" : "sine"; oscillator.frequency.value = frequency;
      filter.type = "lowpass"; filter.frequency.value = isDark ? 420 : 1600;
      volume.gain.value = index === 0 ? 0.035 : 0.018;
      oscillator.connect(filter); filter.connect(volume); volume.connect(context.destination);
      oscillator.start(); return oscillator;
    });
    return () => { audioOscillatorsRef.current.forEach((osc) => { try { osc.stop(); } catch {} }); audioOscillatorsRef.current = []; };
  }, [audioActivo, detalle]);

  useEffect(() => {
    const animarTitulo = () => {
      const scroll = Math.min(window.scrollY / 1000, 1);
      if (tituloPrincipalRef.current) {
        tituloPrincipalRef.current.style.letterSpacing = `${-0.035 + scroll * 0.022}em`;
        tituloPrincipalRef.current.style.fontVariationSettings = `"wght" ${520 + Math.round(scroll * 180)}`;
      }
      const { gamma = 0, beta = 0 } = orientacionRef.current;
      if (mistRef.current) mistRef.current.style.transform = `translate3d(${gamma * -0.16}px, ${Math.min(window.scrollY * -0.055, 180) + beta * -0.12}px, 0)`;
    };
    window.addEventListener("scroll", animarTitulo, { passive: true });
    animarTitulo();
    return () => window.removeEventListener("scroll", animarTitulo);
  }, []);

  useEffect(() => {
    const onOrientation = (event) => {
      const gamma = Math.max(-35, Math.min(35, event.gamma || 0));
      const beta = Math.max(-35, Math.min(35, (event.beta || 0) - 45));
      orientacionRef.current = { gamma, beta };
      if (botellaARRef.current) botellaARRef.current.style.transform = `translate3d(${gamma * 0.3}px, ${beta * -0.25}px, 0) rotateY(${gamma * 0.25}deg)`;
      if (mistRef.current) mistRef.current.style.transform = `translate3d(${gamma * -0.16}px, ${Math.min(window.scrollY * -0.055, 180) + beta * -0.12}px, 0)`;
    };
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []);

  useEffect(() => {
    if (!busquedaVisualUrl) return undefined;
    return () => URL.revokeObjectURL(busquedaVisualUrl);
  }, [busquedaVisualUrl]);

  useEffect(() => {
    if (visorARAbierto || !streamARRef.current) return;
    streamARRef.current.getTracks().forEach((track) => track.stop());
    streamARRef.current = null;
    setArCamaraActiva(false);
  }, [visorARAbierto]);

  useEffect(() => () => streamARRef.current?.getTracks().forEach((track) => track.stop()), []);

  useEffect(() => {
    let timer;
    const onVisibility = () => {
      window.clearTimeout(timer);
      if (!document.hidden || !Object.values(bolsa).some((cantidad) => cantidad > 0) || !("Notification" in window) || Notification.permission !== "granted") return;
      timer = window.setTimeout(() => {
        navigator.serviceWorker?.ready.then((registration) => registration.active?.postMessage({ type: "SHOW_CART_REMINDER" })).catch(() => {});
      }, 60000);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { document.removeEventListener("visibilitychange", onVisibility); window.clearTimeout(timer); };
  }, [bolsa]);

  useEffect(() => {
    const timer = window.setInterval(() => setPersonasViendo(4 + Math.floor(Math.random() * 13)), 11000);
    return () => window.clearInterval(timer);
  }, []);

  const enviarConsultaNova = async (texto = consultaNova) => {
    const consulta = texto.trim();
    if (!consulta || novaEscribiendo) return;
    const local = resolverConsultaNova(consulta, inventarioStock);
    const previo = chatNova;
    setChatNova((anterior) => [...anterior, { role: "user", text: consulta }]);
    setNovaEscribiendo(true);
    setConsultaNova("");
    const ia = await preguntarIA(consulta, previo, productos, inventarioStock, local.items || []);
    setChatNova((anterior) => [...anterior, { role: "assistant", ...(ia || local) }]);
    setNovaEscribiendo(false);
  };

  const buscarPorVoz = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setToast("La búsqueda por voz no está disponible en este navegador"); return; }
    if (escuchando) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "es-CO";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setEscuchando(true);
    recognition.onresult = (event) => { const texto = event.results?.[0]?.[0]?.transcript || ""; setBusqueda(texto); setFiltro("Todos"); setSoloFavoritos(false); };
    recognition.onerror = () => { setEscuchando(false); setToast("No logramos escuchar. Intenta de nuevo."); };
    recognition.onend = () => setEscuchando(false);
    try { recognition.start(); } catch { setEscuchando(false); }
  };

  useEffect(() => localStorage.setItem("nova-theme", oscuro ? "dark" : "light"), [oscuro]);
  useEffect(() => localStorage.setItem("nova-bag", JSON.stringify(bolsa)), [bolsa]);
  useEffect(() => localStorage.setItem("nova-bag-immediate", JSON.stringify(bolsaInmediata)), [bolsaInmediata]);
  useEffect(() => localStorage.setItem("nova-stock", JSON.stringify(inventarioStock)), [inventarioStock]);
  useEffect(() => localStorage.setItem("nova-favs", JSON.stringify(favoritos)), [favoritos]);
  useEffect(() => localStorage.setItem("nova-recent", JSON.stringify(vistosIds)), [vistosIds]);
  useEffect(() => localStorage.setItem("nova-orders", JSON.stringify(pedidos)), [pedidos]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(""), 2800); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!abierta) return undefined;
    setReservaSegundos(15 * 60);
    const timer = setInterval(() => setReservaSegundos((restante) => Math.max(0, restante - 1)), 1000);
    return () => clearInterval(timer);
  }, [abierta]);
  useEffect(() => { if (abierta && (!horaLimiteEntrega || new Date(horaLimiteEntrega).getTime() <= Date.now())) setHoraLimiteEntrega(fechaLimiteInicial()); }, [abierta]);
  useEffect(() => {
    if (!abierta) return undefined;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflowAnterior; };
  }, [abierta]);
  useEffect(() => { const timer = setTimeout(() => setCargandoCatalogo(false), 650); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("perfume");
    const perfume = productos.find((p) => p.id === id);
    if (perfume) { localStorage.setItem("nova-welcome-seen", "1"); setBienvenida(false); abrirDetalle(perfume); }
  }, []);

  const productosActuales = useMemo(() => productos.map((p) => {
    const stock = Math.max(0, Number(inventarioStock[p.id] ?? p.stock ?? 0));
    return { ...p, stock, stockInicial: Number(p.stock) > 0, disponible: stock > 0 };
  }), [inventarioStock]);
  const q = busqueda.trim().toLocaleLowerCase("es-CO");
  const visibles = useMemo(() => {
    const lista = productosActuales.filter((p) =>
      (!q || (resultadosWorker.query === busqueda ? resultadosWorker.ids.includes(p.id) : true)) &&
      (filtro === "Todos" || p.genero === filtro || (filtro === "Línea Árabe" && p.linea === "Árabe") || (filtro === "Línea Comercial" && p.linea === "Comercial")) &&
      (aroma === "Todos los estilos" || p.familiaAromatica === aroma) &&
      cumpleAromaNova(p, novaAromaFiltro) &&
      (!soloFavoritos || favoritos.includes(p.id))
    );
    if (orden === "recomendados") {
      const top = Object.entries(interaccionesCategoria).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (top) lista.sort((a, b) => {
        const rank = (p) => top === "Árabe" ? p.linea === "Árabe" : p.genero === top;
        return Number(rank(b)) - Number(rank(a)) || Number(b.disponible) - Number(a.disponible);
      });
    }
    if (orden === "menor") lista.sort((a, b) => a.precioDetal - b.precioDetal);
    if (orden === "mayor") lista.sort((a, b) => b.precioDetal - a.precioDetal);
    return lista;
  }, [busqueda, resultadosWorker, filtro, aroma, orden, soloFavoritos, favoritos, interaccionesCategoria, productosActuales]);

  const inmediatos = visibles.filter((p) => p.stockInicial);
  const porEncargo = visibles.filter((p) => !p.stockInicial);
  const lineas = Object.entries(bolsa).map(([id, cantidad]) => ({ p: productosActuales.find((x) => x.id === id), cantidad, cantidadInmediata: Math.min(cantidad, Number(bolsaInmediata[id]) || 0) })).filter((x) => x.p && x.cantidad > 0);
  useEffect(() => { if (detalle) { const actual = productosActuales.find((p) => p.id === detalle.id); if (actual && (detalle.stock !== actual.stock || detalle.disponible !== actual.disponible)) setDetalle(actual); } }, [inventarioStock]);
  const unidades = lineas.reduce((n, x) => n + x.cantidad, 0);
  const subtotal = lineas.reduce((n, x) => n + x.cantidad * x.p.precioDetal, 0);
  const subtotalInmediato = lineas.reduce((n, x) => n + x.cantidadInmediata * x.p.precioDetal, 0);
  const subtotalEncargo = lineas.reduce((n, x) => n + (x.cantidad - x.cantidadInmediata) * x.p.precioDetal, 0);
  const envio = entrega === "domicilio" ? ENVIO_POPAYAN : 0;
  const descuento = subtotalEncargo > 0 ? DESCUENTO_SEPARE : 0;
  const combosEnBolsa = combosRegalo.map((combo) => ({ ...combo, cantidad: Math.min(...combo.productos.map((id) => bolsa[id] || 0)) })).filter((combo) => combo.cantidad > 0);
  const descuentoCombos = combosEnBolsa.reduce((n, combo) => n + 5000 * combo.cantidad, 0);
  const descuentosTotal = descuento + descuentoCombos;
  const total = Math.max(0, subtotal + envio - descuentosTotal);
  const abonoEncargo = Math.ceil(subtotalEncargo / 2);
  const abono = subtotalEncargo > 0 ? Math.max(0, subtotalInmediato + abonoEncargo + envio - descuentosTotal) : total;
  const saldo = Math.max(0, total - abono);

  const cambiarCantidad = (id, delta) => {
    setBolsa((prev) => { const siguiente = { ...prev, [id]: (prev[id] || 0) + delta }; if (siguiente[id] <= 0) delete siguiente[id]; return siguiente; });
    if (delta < 0) setBolsaInmediata((prev) => { const siguiente = { ...prev }; if ((siguiente[id] || 0) > 0) siguiente[id] -= 1; if (siguiente[id] <= 0) delete siguiente[id]; return siguiente; });
  };
  const copiarNumeroPago = async () => {
    try { await navigator.clipboard.writeText(NUMERO_PAGOS); setToast("Número de pago copiado"); }
    catch { setToast(`Copia manualmente el número ${NUMERO_PAGOS}`); }
  };
  const agregar = (p) => {
    const stock = Number(inventarioStockRef.current[p.id] ?? inventarioStock[p.id] ?? p.stock ?? 0);
    setBolsa((prev) => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }));
    if (stock > 0) {
      const nextStock = { ...inventarioStockRef.current, [p.id]: stock - 1 };
      inventarioStockRef.current = nextStock;
      setInventarioStock(nextStock);
      setBolsaInmediata((prev) => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }));
      setToast(`${p.nombre}: última unidad reservada para entrega inmediata`);
    } else setToast(`${p.nombre} se agregó como pedido por encargo`);
    setError(""); setAbierta(true);
  };
  const cambiarFavorito = (id) => setFavoritos((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const agregarCombo = (combo) => { combo.productos.forEach((id) => { const perfume = productosActuales.find((p) => p.id === id); if (perfume) agregar(perfume); }); setError(""); setToast(`${combo.nombre} se agregó a tu bolsa`); setAbierta(true); };
  const cambiarEstadoPedido = (id, cambios) => setPedidos((actuales) => actuales.map((p) => p.id === id ? { ...p, ...cambios, actualizado: new Date().toISOString() } : p));
  const cambiarEstadoEnvioAdmin = (pedido, estadoEnvio) => estadoEnvio === "cancelado" ? cancelarPorInasistencia(pedido) : cambiarEstadoPedido(pedido.id, { estadoEnvio, estado: estadoEnvio === "en_moto" ? "enviado" : estadoEnvio === "entregado" ? "entregado" : "recibido" });
  const cambiarEstadoPagoAdmin = (pedido, estadoPago) => {
    if (estadoPago === "pagado") cambiarEstadoPedido(pedido.id, { estadoPago, pagoAbonoConfirmado: true, pagoCompletoConfirmado: true, pagoCompletoAnticipado: pedido.estado !== "entregado" && pedido.estadoEnvio !== "entregado", saldo: 0 });
    else if (estadoPago === "abono") cambiarEstadoPedido(pedido.id, { estadoPago, pagoAbonoConfirmado: true, pagoCompletoConfirmado: false, pagoCompletoAnticipado: false });
    else cambiarEstadoPedido(pedido.id, { estadoPago: "pendiente", pagoAbonoConfirmado: false, pagoCompletoConfirmado: false, pagoCompletoAnticipado: false });
  };
  const cambiarStockAdmin = (producto, stock) => {
    const actualizado = { ...inventarioStockRef.current, [producto.id]: stock };
    inventarioStockRef.current = actualizado;
    setInventarioStock(actualizado);
  };
  const cancelarPorInasistencia = (pedido) => {
    if (pedidoCancelado(pedido) || pedido.estado === "entregado" || pedido.estadoEnvio === "entregado" || pedido.estadoPago === "pagado" || pedido.pagoCompletoConfirmado || (pedido.pagoAbonoConfirmado && !(Number(pedido.saldo) > 0))) return;
    if (!pedido.horaLimiteEntrega || Date.now() < new Date(pedido.horaLimiteEntrega).getTime()) return;
    const actualizado = { ...inventarioStockRef.current };
    (pedido.lineas || []).forEach((linea) => {
      const tieneUnidadFisica = Number(linea.cantidadInmediata) > 0 || (linea.cantidadInmediata == null && linea.disponible);
      if (tieneUnidadFisica && linea.id) actualizado[linea.id] = 1;
    });
    inventarioStockRef.current = actualizado;
    setInventarioStock(actualizado);
    cambiarEstadoPedido(pedido.id, { estado: "cancelado_inasistencia", estadoEnvio: "cancelado", motivoCancelacion: "No concretó antes de la hora límite", canceladoEn: new Date().toISOString() });
  };
  const eliminarPedidoAdmin = (id) => setPedidos((actuales) => actuales.filter((pedido) => pedido.id !== id));
  const buscarPedido = (e) => {
    e.preventDefault();
    const pedido = pedidos.find((p) => p.id.toLowerCase() === codigoConsulta.trim().toLowerCase() && p.telefonoCliente === telefonoConsulta.replace(/\D/g, ""));
    setPedidoConsultado(pedido || null);
    setErrorSeguimiento(pedido ? "" : "No encontramos una orden con ese código y teléfono en este navegador.");
  };
  const cerrarBienvenida = () => { localStorage.setItem("nova-welcome-seen", "1"); setBienvenida(false); };
  const abrirDetalle = (p) => {
    setDetalle(p);
    setContadorClics((actual) => ({ ...actual, [p.id]: (actual[p.id] || 0) + 1 }));
    setVistosIds((actuales) => [p.id, ...actuales.filter((id) => id !== p.id)].slice(0, 8));
    const candidatas = productos.filter((x) => x.id !== p.id && x.genero === p.genero);
    setRecomendacionIds(candidatas.sort(() => Math.random() - 0.5).slice(0, 3).map((x) => x.id));
  };
  const abrirRastreo = () => {
    window.history.pushState({}, "", "/rastreo");
    setCodigoRastreo("");
    setRastreoConsultado(false);
    setRastreoAbierto(true);
  };
  const cerrarRastreo = () => {
    setRastreoAbierto(false);
    if (window.location.pathname === "/rastreo") window.history.replaceState({}, "", "/#inicio");
  };
  const abrirGracias = () => {
    const query = gracias ? `?pedido=${encodeURIComponent(gracias)}` : "";
    window.history.pushState({}, "", `/gracias${query}`);
    setRutaActual("/gracias");
    setVistaGracias(true);
    setBienvenida(false);
  };
  const salirGracias = () => {
    window.history.pushState({}, "", "/#inicio");
    setRutaActual("/");
    setVistaGracias(false);
  };
  const navegarA = (ruta) => {
    window.history.pushState({}, "", ruta);
    setRutaActual(ruta);
    setVistaGracias(ruta === "/gracias");
    setBienvenida(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const compartirWishlist = async () => {
    const lista = productos.filter((p) => favoritos.includes(p.id));
    if (!lista.length) { setToast("Guarda algunos perfumes con ♡ para crear tu lista"); return; }
    const texto = `Mira mi lista de regalos ideales en NovaScents: ${lista.map((p) => p.nombre).join(", ")}`;
    try {
      if (navigator.share) await navigator.share({ title: "Mi wishlist NovaScents", text: texto });
      else window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
    } catch (error) { if (error.name !== "AbortError") window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer"); }
  };
  const alternarAudio = () => {
    if (audioActivo) { setAudioActivo(false); return; }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) { setToast("Este navegador no admite el paisaje sonoro"); return; }
    if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
    audioContextRef.current.resume().catch(() => {});
    setAudioActivo(true);
  };
  const registrarTapLogo = (event) => {
    event.preventDefault();
    const ahora = performance.now();
    logoClicksRef.current = [...logoClicksRef.current.filter((momento) => ahora - momento < 2000), ahora];
    if (logoClicksRef.current.length >= 5) {
      logoClicksRef.current = [];
      const siguiente = !adminMode;
      setAdminMode(siguiente);
      setToast(siguiente ? "Modo Piloto activado · alto contraste" : "Modo Piloto desactivado");
    }
  };
  const buscarVisualmente = (archivo) => {
    if (!archivo) return;
    window.clearTimeout(visualTimerRef.current);
    const url = URL.createObjectURL(archivo);
    setBusquedaVisualUrl(url);
    setResultadosVisuales([]);
    setBusquedaVisualAbierta(true);
    setBusquedaVisualCargando(true);
    visualTimerRef.current = window.setTimeout(() => {
      const base = productos[Math.floor(Math.random() * productos.length)];
      const relacionados = productos.filter((p) => p.familiaAromatica === base.familiaAromatica && p.id !== base.id).sort(() => Math.random() - 0.5).slice(0, 3);
      setResultadosVisuales(relacionados.length ? relacionados : [base]);
      setBusquedaVisualCargando(false);
    }, 2000);
  };
  const cerrarBusquedaVisual = () => {
    window.clearTimeout(visualTimerRef.current);
    setBusquedaVisualAbierta(false);
    setBusquedaVisualUrl("");
    setBusquedaVisualCargando(false);
  };
  const hablarAroma = (p) => {
    if (!("speechSynthesis" in window)) { setToast("La lectura de voz no está disponible en este navegador"); return; }
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(`${p.nombre}, de ${p.marca}. Estilo aromático sugerido: ${p.familiaAromatica || "versátil"}. ${p.notas || "Consulta las notas específicas con NovaScents."}`);
    voz.lang = "es-CO";
    window.speechSynthesis.speak(voz);
  };
  const abrirCamaraAR = async () => {
    setArCamaraError("");
    if (!navigator.mediaDevices?.getUserMedia) { setArCamaraError("La cámara requiere un navegador compatible y una conexión HTTPS."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamARRef.current = stream;
      if (videoARRef.current) { videoARRef.current.srcObject = stream; await videoARRef.current.play(); }
      setArCamaraActiva(true);
    } catch { setArCamaraError("No pudimos abrir la cámara. Revisa el permiso del navegador e inténtalo de nuevo."); }
  };
  const activarParallax = async () => {
    const requestPermission = window.DeviceOrientationEvent?.requestPermission;
    if (typeof requestPermission === "function") {
      try { const permiso = await requestPermission(); setToast(permiso === "granted" ? "Movimiento del dispositivo activado" : "No se autorizó el movimiento del dispositivo"); }
      catch { setToast("No pudimos activar el movimiento del dispositivo"); }
    } else setToast("Inclina suavemente tu dispositivo para explorar el efecto de profundidad");
  };
  const checkoutRapido = async () => {
    setBiometriaEstado("");
    if (!window.isSecureContext || !navigator.credentials?.create || !window.PublicKeyCredential) {
      setBiometriaEstado("Tu dispositivo o conexión no admite esta demostración biométrica.");
      return;
    }
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));
      const credential = await navigator.credentials.create({ publicKey: {
        challenge,
        rp: { name: "NovaScents", id: window.location.hostname },
        user: { id: userId, name: "cliente@novascents.local", displayName: "Cliente NovaScents" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "discouraged", userVerification: "preferred" },
        timeout: 60000,
        attestation: "none",
      } });
      setBiometriaEstado(credential ? "Verificación local de demostración completada. Confirma tu dirección en el formulario." : "No se completó la verificación.");
    } catch (error) {
      setBiometriaEstado(error.name === "NotAllowedError" ? "Verificación cancelada o no disponible." : "No se pudo iniciar la verificación. Puedes completar el checkout normalmente.");
    }
  };
  const activarAvisoPush = async () => {
    if (!("Notification" in window)) { setToast("Este navegador no admite notificaciones"); return; }
    const permiso = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setAvisoPushActivo(permiso === "granted");
    setToast(permiso === "granted" ? "Aviso de bolsa activado" : "No se autorizó el aviso de bolsa");
  };
  const compartirPerfume = async (p) => {
    const link = new URL(window.location.href);
    link.searchParams.set("perfume", p.id);
    link.hash = "inicio";
    const datos = { title: `${p.marca} ${p.nombre} | NovaScents`, text: `${p.nombre} de ${p.marca} · ${cop(p.precioDetal)} en NovaScents`, url: link.toString() };
    try {
      if (navigator.share) await navigator.share(datos);
      else window.open(`https://wa.me/?text=${encodeURIComponent(`${datos.text}\n${datos.url}`)}`, "_blank", "noopener,noreferrer");
    } catch (e) { if (e.name !== "AbortError") setToast("No se pudo compartir el perfume"); }
  };
  const cambiarComparacion = (id) => {
    setComparacion((actual) => {
      if (actual.includes(id)) return actual.filter((x) => x !== id);
      if (actual.length >= 3) { setMensajeComparar("Compara hasta 3 perfumes a la vez."); return actual; }
      setMensajeComparar("");
      return [...actual, id];
    });
  };

  function pedir(e) {
    e.preventDefault();
    if (!lineas.length) { setError("Agrega al menos un perfume a la bolsa."); return; }
    if (nombreCliente.trim().length < 2) { setError("Escribe el nombre de quien recibirá el pedido."); return; }
    if (telefonoCliente.replace(/\D/g, "").length < 7) { setError("Escribe un teléfono válido para consultar el seguimiento."); return; }
    if (entrega === "domicilio" && !direccion.trim()) { setError("Escribe tu dirección o barrio en Popayán."); return; }
    if (!aceptaDatos) { setError("Debes aceptar los términos y el tratamiento de datos para continuar."); return; }
    if (!horaLimiteEntrega || new Date(horaLimiteEntrega).getTime() <= Date.now()) { setError("Acuerda una hora límite futura para la entrega o recogida."); return; }
    setError("");
    const productosPedido = lineas.map(({ p, cantidad, cantidadInmediata }) => `- ${cantidad}x ${p.nombre} (${p.marca}) — ${cop(p.precioDetal * cantidad)} · ${cantidadInmediata ? `${cantidadInmediata} inmediata${cantidadInmediata > 1 ? "s" : ""}` : "Por encargo / Plan Separe"}${cantidad > cantidadInmediata && cantidadInmediata ? ` + ${cantidad - cantidadInmediata} por encargo` : ""}`).join("\n");
    const entregaTexto = entrega === "domicilio" ? `Domicilio en Popayán — ${direccion.trim()}` : "Recogida personal";
    const modalidad = subtotalEncargo > 0 && subtotalInmediato > 0 ? "Pedido mixto: entrega inmediata + Plan Separe" : subtotalEncargo > 0 ? "Plan Separe para productos por encargo" : "Compra inmediata";
    const pago = subtotalEncargo > 0 ? `Abono requerido ahora: ${cop(abono)}\nSaldo restante contra entrega: ${cop(saldo)}` : `Total a pagar ahora: ${cop(total)}`;
    const resumenCombos = combosEnBolsa.map((combo) => `- ${combo.nombre} x${combo.cantidad}: ahorro ${cop(5000 * combo.cantidad)}`).join("\n");
    const notaRegalo = esRegalo ? `\nRegalo: Sí${mensajeRegalo.trim() ? `\nNota de regalo: ${mensajeRegalo.trim()}` : ""}` : "";
    let codigo;
    do { codigo = `#NS-${Math.floor(1000 + Math.random() * 9000)}`; } while (pedidos.some((p) => p.id === codigo));
    const pedidoNuevo = { id: codigo, creado: new Date().toISOString(), nombreCliente: nombreCliente.trim(), telefonoCliente: telefonoCliente.replace(/\D/g, ""), lineas: lineas.map(({ p, cantidad, cantidadInmediata }) => ({ id: p.id, nombre: p.nombre, marca: p.marca, cantidad, cantidadInmediata, cantidadEncargo: cantidad - cantidadInmediata, precio: p.precioDetal, disponible: cantidadInmediata > 0 })), entrega, metodoPago, direccion: entrega === "domicilio" ? direccion.trim() : "", horaLimiteEntrega: new Date(horaLimiteEntrega).toISOString(), modalidad, subtotal, envio, descuento, descuentoCombos, total, abono, saldo, esRegalo, mensajeRegalo: esRegalo ? mensajeRegalo.trim() : "", estado: "recibido", estadoEnvio: "pendiente", estadoPago: "pendiente", notaCliente: "", pagoAbonoConfirmado: false, pagoCompletoConfirmado: false, pagoCompletoAnticipado: false };
    setPedidos((actuales) => [pedidoNuevo, ...actuales]);
    setBolsa({});
    setBolsaInmediata({});
    setAbierta(false);
    setPedidoConsultado(pedidoNuevo);
    setCodigoConsulta(codigo);
    setTelefonoConsulta(pedidoNuevo.telefonoCliente);
    setSeguimientoAbierto(true);
    const horaLocal = new Date().getHours();
    const saludo = horaLocal < 12 ? "Buenos días" : horaLocal < 19 ? "Buenas tardes" : "Buenas noches";
    const horaLimiteTexto = new Date(horaLimiteEntrega).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
    const mensaje = `${saludo}, NovaScents. 📦 *Orden de Compra:* ${codigo}\n\n*Cliente:* ${pedidoNuevo.nombreCliente}\n*Teléfono:* ${pedidoNuevo.telefonoCliente}\n\n*Productos:*\n${productosPedido}${resumenCombos ? `\n\n*Combos:*\n${resumenCombos}` : ""}\n\n*Tipo de entrega:* ${entregaTexto}\n*Hora límite acordada:* ${horaLimiteTexto}\n*Modalidad:* ${modalidad}\n*Método de pago seleccionado:* ${metodoPago}${notaRegalo}\n\n*Resumen:*\nSubtotal: ${cop(subtotal)}\nDomicilio Popayán: ${cop(envio)}\nDescuento Plan Separe: ${cop(descuento)}\nDescuento combos: ${cop(descuentoCombos)}\n*Total a pagar:* ${cop(total)}\n${pago}\n\n✅ Aceptó términos, derecho de retracto y tratamiento de datos personales (Ley 1581 de 2012)`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
  }

  const t = adminMode
    ? { page: "bg-black text-white", header: "bg-black/95 border-lime-400/50", muted: "text-lime-100/80", soft: "bg-lime-400/10", card: "bg-black border-lime-400/60", input: "bg-black border-lime-400/60 text-white", divider: "border-lime-400/50", drawer: "bg-black/98" }
    : oscuro
    ? { page: "bg-[#050505] text-stone-100", header: "bg-[#080808]/75 border-white/10", muted: "text-stone-400", soft: "bg-white/[0.04]", card: "bg-white/[0.055] backdrop-blur-md border-white/15", input: "bg-white/[0.06] backdrop-blur-md border-white/15 text-white", divider: "border-white/10", drawer: "bg-[#0b0a0c]/90 backdrop-blur-2xl" }
    : { page: "bg-[#f7f5ef] text-[#28251e]", header: "bg-[#fbfaf7]/80 border-black/10", muted: "text-stone-500", soft: "bg-white/55 backdrop-blur-md", card: "bg-white/55 backdrop-blur-md border-white/70", input: "bg-white/65 backdrop-blur-md border-black/10 text-stone-900", divider: "border-black/10", drawer: "bg-[#fbfaf7]/90 backdrop-blur-2xl" };
  const acentoDetalle = !detalle ? "#D4AF37" : detalle.linea === "Árabe" ? "#D99B48" : detalle.genero === "Mujer" ? "#D98FA9" : "#B6C8D9";

  const tarjetas = (lista, bajoPedido = false) => cargandoCatalogo ? (
    <div aria-label="Cargando perfumes" aria-busy="true" className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={`skeleton-${bajoPedido ? "pedido" : "stock"}-${i}`} className="animate-pulse"><div className={`aspect-[.83] rounded-2xl ${t.soft}`} /><div className="px-1 pt-3"><div className={`h-2 w-1/3 rounded ${t.soft}`} /><div className={`mt-2 h-4 w-4/5 rounded ${t.soft}`} /><div className={`mt-2 h-3 w-1/2 rounded ${t.soft}`} /><div className={`mt-4 h-11 rounded-full ${t.soft}`} /></div></div>)}</div>
  ) : lista.length ? (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
      {lista.map((p) => { const agotado = p.stockInicial && p.stock === 0; const esPedido = bajoPedido || agotado; return <article key={p.id} onMouseMove={(event) => { if (window.innerWidth < 768) return; const bounds = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`); event.currentTarget.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`); }} onTouchStart={(event) => { if (!bajoPedido) swipeInicioRef.current = event.changedTouches[0].clientX; }} onTouchEnd={(event) => { if (bajoPedido || window.innerWidth >= 768) return; const delta = event.changedTouches[0].clientX - swipeInicioRef.current; if (delta > 72) { agregar(p); setSwipeCelebrado(p.id); window.setTimeout(() => setSwipeCelebrado(""), 900); } else if (delta < -72) event.currentTarget.nextElementSibling?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className={`group nova-product ${oscuro ? "nova-product-dark" : "nova-product-light"} ${swipeCelebrado === p.id ? "nova-swipe-added" : ""}`}>
        <div className={`relative aspect-[.83] overflow-hidden rounded-2xl border ${t.card}`}>
          <ImagenProducto src={p.imagen} alt={`${p.marca} ${p.nombre}`} loading="lazy" onError={(e) => { e.currentTarget.src = "/catalog-images/placeholder.svg"; }} className={`size-full object-cover transition duration-500 group-hover:scale-110 group-active:scale-110 ${agotado ? "brightness-[.3] grayscale" : ""}`} />
          <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2.5 py-1.5 text-[9px] text-white">{p.linea}</span>
          <button onClick={() => cambiarFavorito(p.id)} aria-label={favoritos.includes(p.id) ? "Quitar de favoritos" : "Añadir a favoritos"} className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/65 text-lg text-white">{favoritos.includes(p.id) ? "♥" : "♡"}</button>
          {esPedido ? <span className={`absolute bottom-2 left-2 rounded-full px-2.5 py-1.5 text-[9px] font-bold ${agotado ? "bg-red-600 text-white" : "bg-[#D4AF37] text-stone-950"}`}>{agotado ? "Agotado en Popayán" : "Bajo Pedido"}</span> : <span className="absolute bottom-2 left-2 animate-pulse rounded-full bg-red-600 px-2.5 py-1.5 text-[9px] font-bold text-white shadow-[0_0_18px_rgba(255,0,40,.75)]">🔥 ¡ÚLTIMA UNIDAD en Popayán!</span>}
          <button onClick={() => abrirDetalle(p)} className="absolute bottom-2 right-2 rounded-full bg-white/90 px-3 py-2 text-[10px] font-semibold text-stone-900">Ver detalles</button>
        </div>
        <div className="px-1 pt-3">
          <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#D4AF37]">{p.marca}</p>
          <h3 className="mt-1 line-clamp-2 min-h-10 font-display text-sm sm:text-lg">{p.nombre}</h3>
          <div className="mt-1 flex items-center gap-1.5"><span aria-hidden="true" className="text-[11px] tracking-tight text-[#D4AF37]">★★★★★</span><span className={`text-[9px] ${t.muted}`}>Selección NovaScents</span></div>
          <p className={`mt-1 text-[10px] ${t.muted}`}>Estilo sugerido: {p.familiaAromatica || "Versátil"}</p>
          <div className="mt-2 flex items-center justify-between"><span className="text-sm font-semibold">{cop(p.precioDetal)}</span><span className={`text-[9px] ${t.muted}`}>{p.genero}</span></div>
          {!bajoPedido && <p className={`mt-1 text-[9px] font-bold ${agotado ? "text-red-500" : "animate-pulse text-red-500"}`}>{agotado ? "Agotado en Popayán · Disponible por encargo" : "🔥 ¡ÚLTIMA UNIDAD en Popayán!"}</p>}
          <button onClick={() => agregar(p)} className={`nova-cta mt-3 min-h-11 w-full rounded-full px-2 text-[11px] font-bold text-white sm:text-xs ${esPedido ? "bg-[#a98016] hover:bg-[#927013]" : "bg-emerald-600 hover:bg-emerald-700"}`}>{esPedido ? "Separar con el 50%" : "Comprar Ahora"}</button>
          <button onClick={() => cambiarComparacion(p.id)} className={`mt-2 w-full rounded-full py-2 text-[10px] ${comparacion.includes(p.id) ? "text-[#D4AF37]" : t.muted}`}>{comparacion.includes(p.id) ? "✓ En comparador" : "+ Comparar perfume"}</button>
        </div>
      </article>; })}
    </div>
  ) : <p className={`rounded-2xl border border-dashed p-8 text-center text-sm ${t.muted} ${t.divider}`}>No hay perfumes en esta sección con los filtros elegidos.</p>;

  const recomendaciones = productos.filter((p) => recomendacionIds.includes(p.id));
  const perfumesComparacion = productos.filter((p) => comparacion.includes(p.id));
  const progresoRastreo = new Date().getHours() < 10 ? 0 : new Date().getHours() < 16 ? 1 : 2;
  const resultadosRegalo = productos.filter((p) => p.precioDetal <= Number(regaloPresupuesto) && (regaloPara === "Todos" || p.genero === regaloPara || (regaloPara === "Unisex" && p.genero === "Unisex")) && (regaloEstilo === "Todos los estilos" || p.familiaAromatica === regaloEstilo) && (!regaloBusqueda.trim() || `${p.nombre} ${p.marca} ${p.notas || ""}`.toLocaleLowerCase("es").includes(regaloBusqueda.trim().toLocaleLowerCase("es")))).sort((a, b) => Number(b.disponible) - Number(a.disponible) || a.precioDetal - b.precioDetal).slice(0, 8);
  const pedidosAdmin = pedidos.filter((p) => (adminFiltroEstado === "todos" || p.estado === adminFiltroEstado) && (!adminBusqueda.trim() || `${p.id} ${p.nombreCliente} ${p.telefonoCliente} ${p.lineas.map((x) => x.nombre).join(" ")}`.toLocaleLowerCase("es").includes(adminBusqueda.trim().toLocaleLowerCase("es"))));
  const masVistos = productos.map((p) => ({ ...p, clics: Number(contadorClics[p.id]) || 0 })).sort((a, b) => b.clics - a.clics).slice(0, 3);
  const unidadesHistorial = pedidos.reduce((total, pedido) => total + (pedidoCancelado(pedido) ? 0 : (pedido.lineas || []).reduce((suma, linea) => suma + (Number(linea.cantidad) || 0), 0)), 0);
  const energiaClub = Math.min(unidadesHistorial * 12, 100);
  const nivelClub = unidadesHistorial >= 10 ? "Ícono de las esencias" : unidadesHistorial >= 5 ? "Coleccionista" : unidadesHistorial >= 2 ? "Explorador" : "Curioso";
  const favoritosProductos = productos.filter((p) => favoritos.includes(p.id));

  if (rutaActual === "/perfil") return <main className={`min-h-screen ${t.page} px-5 py-10`}><section className="mx-auto max-w-3xl"><div className="flex items-center justify-between"><div><p className="text-[10px] tracking-[.3em] text-[#D4AF37]">MEMBRESÍA NOVASCENTS</p><h1 className="mt-2 font-display text-4xl">NovaClub</h1></div><button onClick={() => navegarA("/")} className={`rounded-full border px-4 py-2 text-xs ${t.divider}`}>← Tienda</button></div><label className="mt-6 block text-xs">Tu nombre<input value={nombrePerfil} onChange={(e) => setNombrePerfil(e.target.value)} maxLength={32} className={`mt-2 w-full rounded-xl border p-3 sm:max-w-sm ${t.input}`}/></label><article ref={perfilCardRef} onMouseMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--club-x", `${(event.clientX - box.left) / box.width - .5}`); event.currentTarget.style.setProperty("--club-y", `${(event.clientY - box.top) / box.height - .5}`); }} onMouseLeave={(event) => { event.currentTarget.style.setProperty("--club-x", "0"); event.currentTarget.style.setProperty("--club-y", "0"); }} className="nova-club-card mt-7 overflow-hidden rounded-[2rem] border border-white/25 p-6 text-white sm:p-8"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl border border-white/30 bg-white/10 font-display text-xl">N✳</span><span className="text-[9px] tracking-[.25em] text-[#f5e7aa]">MEMBER · NOVASCENTS</span></div><p className="mt-12 text-[9px] tracking-[.24em] text-white/65">MIEMBRO NOVACLUB</p><h2 className="mt-1 truncate font-display text-2xl sm:text-3xl">{nombrePerfil}</h2><div className="mt-6 flex items-end justify-between gap-3"><div><p className="text-[9px] tracking-[.2em] text-white/65">NIVEL DE ENERGÍA</p><p className="mt-1 text-lg font-semibold">{nivelClub}</p></div><strong className="font-display text-4xl">{energiaClub}<span className="text-base text-white/60">/100</span></strong></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30"><span className="block h-full rounded-full bg-gradient-to-r from-amber-100 via-[#D4AF37] to-cyan-100 transition-all" style={{ width: `${energiaClub}%` }}/></div><div className="mt-5 flex justify-between text-[9px] tracking-widest text-white/65"><span>NOVA CLUB</span><span>UNLOCK YOUR SCENT</span></div></article><div className="mt-5 grid gap-3 sm:grid-cols-2"><article className={`rounded-2xl border p-4 ${t.card}`}><p className={`text-xs ${t.muted}`}>Unidades en historial local</p><strong className="mt-1 block text-2xl text-[#D4AF37]">{unidadesHistorial}</strong></article><article className={`rounded-2xl border p-4 ${t.card}`}><p className={`text-xs ${t.muted}`}>Pedidos guardados en este navegador</p><strong className="mt-1 block text-2xl text-[#D4AF37]">{pedidos.length}</strong></article></div><p className={`mt-4 text-[10px] ${t.muted}`}>La tarjeta no representa un método de pago. Tu energía se calcula con pedidos locales guardados en este navegador.</p></section></main>;

  if (rutaActual === "/wishlist") return <main className={`min-h-screen ${t.page} px-4 py-8 sm:px-7`}><section className="mx-auto max-w-7xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] tracking-[.3em] text-[#D4AF37]">SOCIAL COMMERCE</p><h1 className="mt-2 font-display text-4xl">Mi wishlist</h1><p className={`mt-2 text-sm ${t.muted}`}>{favoritosProductos.length} perfumes guardados como ideas de regalo.</p></div><div className="flex gap-2"><button onClick={compartirWishlist} className="rounded-full bg-[#D4AF37] px-5 py-3 text-xs font-bold text-stone-950">Compartir mi lista ↗</button><button onClick={() => navegarA("/")} className={`rounded-full border px-4 py-3 text-xs ${t.divider}`}>← Tienda</button></div></div>{favoritosProductos.length ? <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{favoritosProductos.map((p) => <article key={p.id} className={`rounded-2xl border p-3 ${t.card}`}><ImagenProducto src={p.imagen} alt={p.nombre} className="aspect-square w-full rounded-xl object-cover"/><p className="mt-3 text-[9px] uppercase text-[#D4AF37]">{p.marca}</p><h2 className="mt-1 min-h-10 font-display text-sm">{p.nombre}</h2><p className="mt-1 text-xs font-semibold">{cop(p.precioDetal)}</p><div className="mt-3 flex gap-2"><button onClick={() => { navegarA("/"); abrirDetalle(p); }} className="flex-1 rounded-full border border-[#D4AF37]/50 py-2 text-[10px]">Ver perfume</button><button onClick={() => cambiarFavorito(p.id)} aria-label={`Quitar ${p.nombre} de favoritos`} className="grid size-9 place-items-center rounded-full border border-rose-400/50 text-rose-400">♥</button></div></article>)}</div> : <div className={`mt-8 rounded-3xl border border-dashed p-12 text-center ${t.divider}`}><p className="text-3xl">♡</p><h2 className="mt-3 font-display text-2xl">Tu lista está esperando su primera esencia.</h2><button onClick={() => navegarA("/")} className="mt-5 rounded-full bg-[#D4AF37] px-5 py-3 text-xs font-bold text-stone-950">Explorar perfumes</button></div>}</section></main>;

  if (rutaActual === "/admin") return !adminMode ? <main className="grid min-h-screen place-items-center bg-[#07080b] px-5 text-white"><section className="max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-7 text-center"><span className="text-xs tracking-[.3em] text-violet-300">NOVASCENTS · ADMIN</span><h1 className="mt-3 font-display text-3xl">Panel privado</h1><p className="mt-3 text-sm text-stone-400">Activa el Modo Piloto con cinco toques rápidos en el logo para abrir tu panel de gestión.</p><button onClick={() => navegarA("/")} className="mt-5 rounded-full bg-violet-300 px-5 py-3 text-sm font-bold text-stone-950">Volver a la tienda</button></section></main> : <AdminDashboard pedidos={pedidos} productosActuales={productosActuales} masVistos={masVistos} onCambiarEnvio={cambiarEstadoEnvioAdmin} onCambiarPago={cambiarEstadoPagoAdmin} onCambiarStock={cambiarStockAdmin} onCancelar={cancelarPorInasistencia} onEliminar={eliminarPedidoAdmin} onActualizarPedido={(pedido, cambios) => cambiarEstadoPedido(pedido.id, cambios)} onTienda={() => navegarA("/")}/>;

  if (vistaGracias) return <main className="nova-thanks-page relative isolate grid min-h-screen place-items-center overflow-hidden bg-[#050505] px-5 py-16 text-center text-white">
    <ConfetiCristal/><div className="nova-thanks-glow" aria-hidden="true"/>
    <section className="relative z-10 mx-auto max-w-xl">
      <span className="mx-auto grid size-20 place-items-center rounded-full border border-[#D4AF37]/60 bg-[#D4AF37]/10 text-4xl text-[#f1d887] shadow-[0_0_60px_#d4af3735]">✦</span>
      <p className="mt-7 text-[10px] tracking-[.35em] text-[#D4AF37]">NOVA SCENTS · POPAYÁN</p>
      <h1 className="mt-3 font-display text-4xl leading-tight sm:text-6xl">Gracias por elegir tu esencia.</h1>
      <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-stone-300">Tu compra ya hace parte de una historia especial. Disfruta el momento de abrir tu fragancia y cuéntanos cómo fue tu experiencia.</p>
      {gracias && <p className="mt-4 text-xs text-stone-400">Pedido asociado: <strong className="text-[#D4AF37]">{gracias}</strong></p>}
      <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola NovaScents, quiero dejar una reseña de mi experiencia${gracias ? ` con el pedido ${gracias}` : ""}.`)}`} target="_blank" rel="noreferrer" className="nova-cta mt-8 inline-flex min-h-14 items-center justify-center rounded-full bg-gradient-to-r from-[#d9b642] via-[#f0d77d] to-[#c49a27] px-8 py-4 text-sm font-bold text-stone-950 shadow-[0_0_32px_#d4af3740]">Dejar una reseña ↗</a>
      <p className="mt-4 text-[10px] text-stone-500">Se abrirá WhatsApp para compartir tu opinión directamente con NovaScents.</p>
      <button onClick={salirGracias} className="mt-8 block w-full text-xs text-stone-400 underline decoration-stone-700 underline-offset-4">Volver a la tienda</button>
    </section>
  </main>;

  return <div className={`relative isolate min-h-screen ${t.page} ${adminMode ? "nova-admin-mode" : ""}`}>
    <div className={`nova-ambient ${oscuro ? "nova-ambient-dark" : "nova-ambient-light"}`} style={{ "--nova-accent": acentoDetalle }} aria-hidden="true"><div ref={mistRef} className="nova-mist">{particulasBruma.map((particula, i) => <i key={i} className="nova-particle" style={{ left: particula.left, top: particula.top, width: particula.size, height: particula.size, animationDelay: particula.delay, animationDuration: particula.duration, "--drift": particula.drift }} />)}</div><span className="nova-blob nova-blob-gold"/><span className="nova-blob nova-blob-violet"/><span className="nova-blob nova-blob-amber"/></div>
    <div className="overflow-hidden bg-[#D4AF37] py-2 text-[10px] font-semibold tracking-wide text-stone-950 sm:text-xs"><div className="nova-marquee"><span>🛵 Envíos a todo Popayán&nbsp; | &nbsp;💎 Fragancias de Alta Gama&nbsp; | &nbsp;🎁 Opción de empaque para regalo&nbsp; | &nbsp;</span><span aria-hidden="true">🛵 Envíos a todo Popayán&nbsp; | &nbsp;💎 Fragancias de Alta Gama&nbsp; | &nbsp;🎁 Opción de empaque para regalo&nbsp; | &nbsp;</span></div></div>
    <input ref={inputVisualRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Selecciona una foto de perfume" onChange={(e) => { buscarVisualmente(e.target.files?.[0]); e.target.value = ""; }}/>{(toast || abierta) && <div role="status" aria-live="polite" className="nova-island nova-island-expanded"><span className="text-[#D4AF37]">{toast ? "✦" : "🛍️"}</span><span className="nova-island-message">{toast || `${unidades} en tu bolsa`}</span></div>}<header className={`sticky top-0 z-50 border-b backdrop-blur-xl ${t.header}`}><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pb-3 pt-10 sm:px-7 sm:py-3">
      <a href="#inicio" onClick={registrarTapLogo} aria-label="NovaScents. Toca cinco veces rápidamente para activar el modo piloto" title="NovaScents" className="flex items-center gap-2 font-display text-xl"><span className="grid size-10 place-items-center rounded-full border border-[#D4AF37] text-[#D4AF37]">N✳</span>NovaScents</a>
      <div className={`hidden max-w-sm flex-1 items-center gap-2 rounded-full border border-[#D4AF37]/40 px-4 py-2.5 backdrop-blur-md md:flex ${oscuro ? "bg-white/[0.055]" : "bg-white/55"}`}><span className="text-xl text-[#D4AF37]">⌕</span><input ref={buscadorDesktopRef} data-nova-search value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Busca una fragancia" className="w-full bg-transparent text-sm outline-none" /><button type="button" onClick={() => inputVisualRef.current?.click()} aria-label="Buscar por imagen" title="Buscar perfume por imagen" className="grid size-9 shrink-0 place-items-center rounded-full text-[#D4AF37] hover:bg-[#D4AF37]/15">📷</button><button type="button" onClick={buscarPorVoz} aria-label={escuchando ? "Escuchando" : "Buscar por voz"} title={escuchando ? "Escuchando…" : "Buscar por voz"} className={`grid size-9 shrink-0 place-items-center rounded-full transition ${escuchando ? "animate-pulse bg-rose-500 text-white" : "text-[#D4AF37] hover:bg-[#D4AF37]/15"}`}><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></svg></button></div>
      <div className="flex gap-2">{adminMode && <><button onClick={() => { setPanelAbierto(true); setAdminAutenticado(false); setErrorAdmin(""); }} className="rounded-full border border-lime-400 px-3 py-2 text-xs font-bold text-lime-300">Gestión</button><button onClick={() => navegarA("/admin")} className="hidden rounded-full border border-lime-400 px-3 py-2 text-xs text-lime-300 xl:block">Métricas</button><button onClick={abrirGracias} className="hidden rounded-full border border-lime-400 px-3 py-2 text-xs text-lime-300 lg:block">Vista QR</button></>}<button onClick={() => setOscuro(!oscuro)} className={`size-10 rounded-full border ${t.divider}`} aria-label="Cambiar tema">{oscuro ? "☼" : "☾"}</button><button onClick={() => setAbierta(true)} className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-stone-950">Bolsa ({unidades})</button></div>
    </div><div className="px-4 pb-3 md:hidden"><div className={`flex items-center gap-2 rounded-full border px-4 py-1 ${t.input}`}><span className="text-xl text-[#D4AF37]">⌕</span><input ref={buscadorMovilRef} data-nova-search value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar perfumes" className="w-full bg-transparent py-2 text-sm outline-none"/><button type="button" onClick={() => inputVisualRef.current?.click()} aria-label="Buscar por imagen" className="grid size-9 shrink-0 place-items-center rounded-full text-[#D4AF37]">📷</button><button type="button" onClick={buscarPorVoz} aria-label={escuchando ? "Escuchando" : "Buscar por voz"} className={`grid size-9 shrink-0 place-items-center rounded-full ${escuchando ? "animate-pulse bg-rose-500 text-white" : "text-[#D4AF37]"}`}><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8"/></svg></button></div></div></header>

    <main id="inicio" className="mx-auto max-w-7xl px-4 sm:px-7">
      <nav aria-label="Accesos de cliente" className="pt-4 flex flex-wrap gap-2"><button onClick={() => navegarA("/perfil")} className={`rounded-full border px-4 py-2 text-xs ${t.divider}`}>✦ Mi Perfil · NovaClub</button><button onClick={() => navegarA("/wishlist")} className={`rounded-full border px-4 py-2 text-xs ${t.divider}`}>♡ Mi Wishlist ({favoritos.length})</button>{adminMode && <button onClick={() => navegarA("/admin")} className="rounded-full border border-lime-400 px-4 py-2 text-xs text-lime-300">▦ Dashboard</button>}</nav>
      {/* Ajustamos el padding superior (pt-28 sm:pt-36) para que el Navbar fijo no tape el contenido */}
<section className="pt-28 pb-8 sm:pt-36 sm:pb-12">
  <p className="text-[10px] tracking-[.3em] text-[#D4AF37] font-semibold">PERFUMERÍA · POPAYÁN, CAUCA</p>
  
  <h1 ref={tituloPrincipalRef} style={{ fontFamily: "Inter, sans-serif", fontVariationSettings: '"wght" 520' }} className="mt-4 max-w-3xl text-4xl font-bold leading-tight transition-[letter-spacing] duration-150 sm:text-6xl sm:leading-[1.1]">
    Encuentra tu próxima <span className="text-[#D4AF37]">esencia.</span>
  </h1>
  
  {/* Subimos ligeramente el contraste y tamaño del texto descriptivo para pantallas móviles */}
  <p className={`mt-5 max-w-xl text-sm sm:text-base leading-relaxed ${t.muted}`}>
    Perfumes para cada estilo, con entrega inmediata o por encargo.
  </p>
  
  <p className={`mt-4 inline-flex items-center gap-2 text-[11px] ${t.muted}`}>
    <span className="size-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true"/>
    Actividad simulada: {personasViendo} personas viendo la tienda ahora
  </p>
  
  <div className="mt-6 flex flex-wrap gap-3">
    <button onClick={() => setQuizAbierto(true)} className="rounded-full bg-[#D4AF37] px-6 py-3.5 text-sm font-bold text-stone-950 transition-transform duration-150 active:scale-95 hover:opacity-90">
      ✦ Asistente Nova · Encuentra tu aroma
    </button>
    <button onClick={() => { setRegaloBusqueda(""); setRegaloAbierto(true); }} className={`rounded-full border border-[#D4AF37]/60 px-6 py-3.5 text-sm font-semibold transition-transform duration-150 active:scale-95 ${t.muted}`}>
      🎁 Encuentra un regalo
    </button>
    
  </div>
</section>


      <aside className="mb-5 flex flex-col gap-2 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[#D4AF37]">✨ Plan Separe NovaScents</p><p className={`mt-1 text-xs ${t.muted}`}>En perfumes por encargo: separa con el 50% y recibe $5.000 de descuento en el pedido.</p></div><span className="text-xs font-semibold">Popayán · Atención por WhatsApp</span></aside>
      <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4"><article className={`rounded-2xl border p-4 ${t.card}`}><span className="text-xl">📍</span><h2 className="mt-2 text-xs font-semibold">Atención local</h2><p className={`mt-1 text-[10px] ${t.muted}`}>Estamos en Popayán</p></article><article className={`rounded-2xl border p-4 ${t.card}`}><span className="text-xl">🛵</span><h2 className="mt-2 text-xs font-semibold">Entrega clara</h2><p className={`mt-1 text-[10px] ${t.muted}`}>Domicilio o recogida</p></article><article className={`rounded-2xl border p-4 ${t.card}`}><span className="text-xl">💬</span><h2 className="mt-2 text-xs font-semibold">Asesoría por WhatsApp</h2><p className={`mt-1 text-[10px] ${t.muted}`}>Te ayudamos a elegir</p></article><article className={`rounded-2xl border p-4 ${t.card}`}><span className="text-xl">🎁</span><h2 className="mt-2 text-xs font-semibold">¿Es para regalo?</h2><p className={`mt-1 text-[10px] ${t.muted}`}>Cuéntanos la ocasión</p></article></section>

      <section className="mb-8"><div className="mb-4"><p className="text-[9px] tracking-[.2em] text-[#D4AF37]">COMBOS CON STOCK</p><h2 className="mt-1 font-display text-2xl sm:text-3xl">Dúos para compartir o regalar</h2><p className={`mt-1 text-xs ${t.muted}`}>Agrega ambos perfumes y ahorra $5.000 COP automáticamente.</p></div><div className="grid gap-3 sm:grid-cols-3">{combosRegalo.map((combo) => { const precio = combo.items.reduce((n, p) => n + p.precioDetal, 0); return <article key={combo.id} className={`rounded-2xl border p-4 ${t.card}`}><h3 className="font-display text-lg">{combo.nombre}</h3><p className={`mt-1 text-xs ${t.muted}`}>{combo.frase}</p><div className="mt-3 grid grid-cols-2 gap-2">{combo.items.map((p) => <div key={p.id}><ImagenProducto src={p.imagen} alt={`${p.marca} ${p.nombre}`} className="aspect-square w-full rounded-xl object-cover"/><p className="mt-1 line-clamp-2 text-[10px]">{p.nombre}</p></div>)}</div><div className="mt-3 flex items-end justify-between gap-2"><div><p className={`text-[10px] line-through ${t.muted}`}>{cop(precio)}</p><p className="font-semibold">{cop(precio - 5000)}</p><p className="text-[10px] text-emerald-500">Ahorras {cop(5000)}</p></div><button onClick={() => agregarCombo(combo)} className="rounded-full bg-[#D4AF37] px-4 py-2.5 text-xs font-bold text-stone-950">Elegir dúo</button></div></article>; })}</div></section>

      <section className={`mb-7 rounded-2xl border p-4 sm:p-5 ${t.card}`}><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><span className="text-[9px] tracking-[.2em] text-[#D4AF37]">COLECCIÓN NOVASCENTS</span><h2 className="mt-1 font-display text-xl">Catálogos</h2></div><div className="flex flex-wrap gap-2">{catalogos.map((c) => <a key={c.file} href={c.file} target="_blank" rel="noreferrer" className="rounded-full border border-[#D4AF37]/50 px-4 py-2 text-xs hover:bg-[#D4AF37]/10">Ver / Descargar {c.label} ↗</a>)}</div></div></section>

      <section id="catalogo-perfumes" className="pb-12"><div className="mb-6 flex flex-col gap-3"><div className="flex gap-2 overflow-x-auto pb-1">{filtros.map((f) => <button key={f} onClick={() => registrarFiltro(f)} className={`shrink-0 rounded-full px-4 py-2 text-xs ${filtro === f ? "bg-[#D4AF37] font-semibold text-stone-950" : `${t.soft} ${t.muted}`}`}>{f}</button>)}<button onClick={() => setSoloFavoritos(!soloFavoritos)} className={`shrink-0 rounded-full px-4 py-2 text-xs ${soloFavoritos ? "bg-rose-600 font-semibold text-white" : `${t.soft} ${t.muted}`}`}>♥ Favoritos ({favoritos.length})</button></div>
        <div className="flex flex-wrap items-center gap-2"><label className={`text-xs ${t.muted}`} htmlFor="aroma-filter">Estilo aromático sugerido</label><select id="aroma-filter" value={aroma} onChange={(e) => setAroma(e.target.value)} className={`rounded-full border px-3 py-2 text-xs ${t.input}`}>{aromas.map((a) => <option key={a}>{a}</option>)}</select><span className={`text-[10px] ${t.muted}`}>Orientativo; las notas exactas se confirman por WhatsApp.</span>{novaAromaFiltro !== "Todos los estilos" && <button onClick={() => setNovaAromaFiltro("Todos los estilos")} className="rounded-full border border-[#D4AF37]/40 px-3 py-1.5 text-[10px] text-[#D4AF37]">✦ Asistente: {novaAromaFiltro} · Quitar ×</button>}</div>
        <div className="flex items-center justify-between"><p className={`text-xs ${t.muted}`}>{visibles.length} perfumes · {productosActuales.filter((p) => p.stock > 0).length} unidades disponibles ahora</p><select value={orden} onChange={(e) => setOrden(e.target.value)} className={`rounded-full border px-3 py-2 text-xs ${t.input}`}><option value="recomendados">Orden recomendado</option><option value="menor">Menor a mayor precio</option><option value="mayor">Mayor a menor precio</option></select></div></div>
        <section className="mb-12"><div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[.18em] text-emerald-500">STOCK FÍSICO</p><h2 className="mt-1 font-display text-2xl sm:text-3xl">🔥 Entrega Inmediata (Stock en Popayán)</h2><p className={`mt-1 text-xs ${t.muted}`}>Últimas unidades físicas; cuando se agotan, puedes pedirlas por Plan Separe.</p><p className={`mt-1 text-[9px] ${t.muted}`}>En celular: desliza a la derecha para reservar la unidad inmediata.</p></div><span className="shrink-0 rounded-full bg-emerald-600/15 px-3 py-1.5 text-xs font-bold text-emerald-500">{inmediatos.filter((p) => p.stock > 0).length} / {inmediatos.length} disponibles</span></div>{tarjetas(inmediatos)}</section>
        <section><div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[.18em] text-[#D4AF37]">CATÁLOGO COMPLETO</p><h2 className="mt-1 font-display text-2xl sm:text-3xl">📦 Catálogo Completo (Por Encargo / Plan Separe)</h2><p className={`mt-1 text-xs ${t.muted}`}>Plazo de llegada por confirmar por WhatsApp según disponibilidad.</p></div><span className="shrink-0 rounded-full bg-[#D4AF37]/15 px-3 py-1.5 text-xs font-bold text-[#D4AF37]">{porEncargo.length}</span></div>{tarjetas(porEncargo, true)}</section>
      </section>
    </main>
    {vistosIds.length > 0 && <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-7"><div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] tracking-[.2em] text-[#D4AF37]">TU RECORRIDO</p><h2 className="mt-1 font-display text-2xl">Vistos recientemente</h2></div><button onClick={() => setVistosIds([])} className={`text-[10px] ${t.muted}`}>Limpiar</button></div><div className="flex gap-3 overflow-x-auto pb-2">{productos.filter((p) => vistosIds.includes(p.id)).map((p) => <button key={p.id} onClick={() => abrirDetalle(p)} className={`flex w-36 shrink-0 items-center gap-2 rounded-2xl border p-2 text-left ${t.card}`}><ImagenProducto src={p.imagen} alt="" className="size-14 rounded-xl object-cover"/><span className="min-w-0"><span className="block line-clamp-2 text-[10px] font-semibold">{p.nombre}</span><span className="mt-1 block text-[10px] text-[#D4AF37]">{cop(p.precioDetal)}</span></span></button>)}</div></section>}
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-7"><div className={`rounded-3xl border p-5 sm:p-7 ${t.card}`}><p className="text-[9px] tracking-[.2em] text-[#D4AF37]">INFORMACIÓN CLARA</p><h2 className="mt-1 font-display text-2xl">Preguntas frecuentes</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["¿Cómo funciona el Plan Separe?", "En perfumes por encargo se solicita un abono del 50% del valor de esos perfumes y se aplica $5.000 COP de descuento al pedido. La disponibilidad y el saldo se confirman por WhatsApp."], ["¿Cuánto tarda el envío en Popayán?", "El tiempo depende del barrio, la disponibilidad y la coordinación del domicilio. Escríbenos por WhatsApp y te confirmamos el estimado antes de cerrar el pedido."], ["¿Cuáles son los métodos de pago?", "Puedes pagar por Nequi, Daviplata o en efectivo. Confirma con nuestro equipo los datos y la forma de pago al enviar tu pedido por WhatsApp."]].map(([q, a]) => <details key={q} className={`rounded-xl border p-4 ${t.divider}`}><summary className="cursor-pointer text-sm font-semibold">{q}</summary><p className={`mt-2 text-xs leading-5 ${t.muted}`}>{a}</p></details>)}</div><a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola NovaScents, tengo una consulta sobre un perfume.")}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full bg-[#D4AF37] px-5 py-3 text-xs font-bold text-stone-950">Hablar con NovaScents ↗</a></div></section>
    <footer className={`border-t px-4 py-8 text-center text-[10px] tracking-[.15em] ${t.divider} ${t.muted}`}><p>NOVASCENTS · POPAYÁN, CAUCA · COLOMBIA</p><p className="mt-2 text-[9px] normal-case tracking-normal">{textoVendedor()}</p><div className="mt-2 flex flex-wrap justify-center gap-3 text-[9px] normal-case tracking-normal"><button onClick={() => setLegalAbierto("terminos")} className="underline">Términos y derecho de retracto</button><button onClick={() => setLegalAbierto("datos")} className="underline">Tratamiento de datos (Habeas Data)</button></div><div className="mt-3 flex flex-wrap justify-center gap-2"><button onClick={() => navegarA("/perfil")} className="rounded-full border px-3 py-1.5 text-[9px] tracking-normal">Mi Perfil · NovaClub</button><button onClick={() => navegarA("/wishlist")} className="rounded-full border px-3 py-1.5 text-[9px] tracking-normal">Mi Wishlist ({favoritos.length})</button>{adminMode && <><button onClick={() => navegarA("/admin")} className="rounded-full border border-lime-400 px-3 py-1.5 text-[9px] tracking-normal text-lime-300">Dashboard</button><button onClick={() => { setPanelAbierto(true); setAdminAutenticado(false); setErrorAdmin(""); }} className="rounded-full border border-lime-400 px-3 py-1.5 text-[9px] tracking-normal text-lime-300">Gestión de pedidos</button></>}</div></footer>

    {toast && <div role="status" aria-live="polite" className={`fixed bottom-24 right-4 z-[75] flex max-w-[min(90vw,22rem)] items-center gap-3 rounded-2xl border border-[#D4AF37]/50 px-4 py-3 shadow-2xl ${t.drawer}`}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">✓</span><div><p className="text-xs font-semibold">{toast.includes("se agregó a tu bolsa") ? "Agregado a tu bolsa" : "Aviso NovaScents"}</p><p className={`mt-0.5 truncate text-[10px] ${t.muted}`}>{toast.replace(" se agregó a tu bolsa", "")}</p></div></div>}
    <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola NovaScents, tengo una duda.")}`} target="_blank" rel="noreferrer" aria-label="Escribir al soporte de NovaScents por WhatsApp" className="fixed bottom-4 right-4 z-[45] grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105"><svg viewBox="0 0 24 24" className="size-7" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.8 11.8 0 0 0 12.1 0C5.55 0 .22 5.33.22 11.9c0 2.1.55 4.16 1.6 5.98L.1 24l6.28-1.65a11.9 11.9 0 0 0 5.7 1.45h.01C18.64 23.8 24 18.47 24 11.9a11.8 11.8 0 0 0-3.48-8.42ZM12.1 21.8a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.73.98.99-3.64-.24-.38a9.85 9.85 0 1 1 8.4 4.63Zm5.4-7.38c-.3-.15-1.77-.87-2.05-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.68-1.63-.93-2.23-.25-.58-.5-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.23 5.13 4.53.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.73 2.02-1.43.25-.7.25-1.3.18-1.43-.08-.12-.28-.2-.58-.35Z"/></svg></a>

    {legalAbierto && <LegalModal tipo={legalAbierto} onClose={() => setLegalAbierto(null)} />}{seguimientoAbierto && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3" onClick={() => setSeguimientoAbierto(false)}><section role="dialog" aria-modal="true" aria-label="Seguimiento de pedido" onClick={(e) => e.stopPropagation()} className={`max-h-[92vh] w-full max-w-xl overflow-auto rounded-3xl border p-5 sm:p-7 ${t.drawer} ${t.divider}`}><div className="flex items-start justify-between"><div><p className="text-[9px] tracking-[.2em] text-[#D4AF37]">SEGUIMIENTO NOVASCENTS</p><h2 className="mt-1 font-display text-2xl">¿Cómo va tu pedido?</h2><p className={`mt-2 text-xs ${t.muted}`}>Ingresa el código que recibiste y el teléfono registrado al comprar.</p></div><button onClick={() => setSeguimientoAbierto(false)} className="size-10 rounded-full border">×</button></div>{!pedidoConsultado ? <form onSubmit={buscarPedido} className="mt-5 space-y-3"><label className="block text-xs">Código del pedido<input required value={codigoConsulta} onChange={(e) => setCodigoConsulta(e.target.value.toUpperCase())} placeholder="NS-26-ABCDE" className={`mt-2 w-full rounded-xl border p-3 ${t.input}`}/></label><label className="block text-xs">Teléfono registrado<input required type="tel" value={telefonoConsulta} onChange={(e) => setTelefonoConsulta(e.target.value)} placeholder="El mismo del pedido" className={`mt-2 w-full rounded-xl border p-3 ${t.input}`}/></label>{errorSeguimiento && <p role="alert" className="text-xs text-red-500">{errorSeguimiento}</p>}<button className="w-full rounded-full bg-[#D4AF37] py-3 text-sm font-bold text-stone-950">Consultar estado</button><p className={`text-[10px] ${t.muted}`}>Por ahora, el seguimiento aparece en el navegador donde se creó el pedido. Si compraste desde otro dispositivo, escríbenos por WhatsApp para consultar.</p><a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola NovaScents, quiero consultar el estado de mi pedido ${codigoConsulta || ""}.`)}`} target="_blank" rel="noreferrer" className="block text-center text-xs text-[#D4AF37]">Consultar por WhatsApp ↗</a></form> : <div className="mt-5"><div className="rounded-2xl bg-[#D4AF37]/10 p-4"><p className="text-[10px] uppercase tracking-widest text-[#D4AF37]">{pedidoConsultado.id}</p><h3 className="mt-1 font-display text-xl">{etiquetaEstado(pedidoConsultado.estado)}</h3><p className={`mt-1 text-xs ${t.muted}`}>Actualizado: {new Date(pedidoConsultado.actualizado || pedidoConsultado.creado).toLocaleString("es-CO")}</p></div><div className="mt-4 space-y-3">{pedidoConsultado.lineas.map((p) => <div key={p.id} className="flex justify-between gap-3 text-xs"><span>{p.cantidad} × {p.nombre}</span><span>{cop(p.precio * p.cantidad)}</span></div>)}</div><div className={`mt-4 rounded-xl p-4 ${t.soft}`}><p className="text-xs font-semibold">Lo que falta / actualización</p><p className={`mt-1 text-xs leading-5 ${t.muted}`}>{pedidoConsultado.notaCliente || (pedidoConsultado.estado === "recibido" ? "Estamos revisando tu pedido. Te confirmaremos disponibilidad y el abono por WhatsApp." : pedidoConsultado.estado === "esperando_producto" ? "Estamos esperando la llegada del perfume. Te avisaremos cuando lo recibamos." : pedidoConsultado.estado === "preparando" ? "Estamos preparando tu pedido para la entrega." : pedidoConsultado.estado === "enviado" ? "Tu pedido fue enviado. Coordina la recepción por WhatsApp si lo necesitas." : pedidoConsultado.estado === "listo_recogida" ? "Tu pedido está listo para recoger. Confirma el horario por WhatsApp." : pedidoConsultado.estado === "entregado" ? "Pedido entregado. ¡Gracias por comprar en NovaScents!" : "Nuestro equipo actualizará aquí la información de tu pedido." )}</p>{pedidoConsultado.saldo > 0 && <p className="mt-2 text-xs font-semibold">Saldo estimado pendiente: {cop(pedidoConsultado.saldo)}</p>}<p className="mt-2 text-xs">Pago registrado: {pedidoConsultado.pagoAbonoConfirmado ? "Recibido" : "Pendiente de confirmación"}</p></div><button onClick={() => { setPedidoConsultado(null); setErrorSeguimiento(""); }} className="mt-4 w-full rounded-full border py-2.5 text-xs">Consultar otro pedido</button></div>}</section></div>}

    {panelAbierto && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-3" onClick={() => setPanelAbierto(false)}><section role="dialog" aria-modal="true" aria-label="Panel privado de pedidos" onClick={(e) => e.stopPropagation()} className={`max-h-[94vh] w-full max-w-5xl overflow-auto rounded-3xl border p-5 sm:p-7 ${t.drawer} ${t.divider}`}><div className="flex items-start justify-between"><div><p className="text-[9px] tracking-[.2em] text-[#D4AF37]">GESTIÓN INTERNA</p><h2 className="mt-1 font-display text-2xl">Panel de pedidos</h2></div><button onClick={() => setPanelAbierto(false)} className="size-10 rounded-full border">×</button></div>{!adminAutenticado ? <form onSubmit={(e) => { e.preventDefault(); const guardado = localStorage.getItem("nova-admin-pin"); if (!guardado) { if (pinAdmin.length < 6) { setErrorAdmin("Crea una clave de al menos 6 caracteres."); return; } localStorage.setItem("nova-admin-pin", pinAdmin); setAdminAutenticado(true); setErrorAdmin(""); } else if (pinAdmin === guardado) { setAdminAutenticado(true); setErrorAdmin(""); } else setErrorAdmin("Clave incorrecta."); }} className="mx-auto mt-8 max-w-sm space-y-3"><p className={`text-sm ${t.muted}`}>{localStorage.getItem("nova-admin-pin") ? "Ingresa tu clave para ver y gestionar las órdenes." : "Crea una clave privada para abrir este panel en este navegador."}</p><input required type="password" minLength={6} value={pinAdmin} onChange={(e) => setPinAdmin(e.target.value)} placeholder="Clave, mínimo 6 caracteres" className={`w-full rounded-xl border p-3 ${t.input}`}/>{errorAdmin && <p className="text-xs text-red-500">{errorAdmin}</p>}<button className="w-full rounded-full bg-[#D4AF37] py-3 text-sm font-bold text-stone-950">{localStorage.getItem("nova-admin-pin") ? "Entrar al panel" : "Crear clave"}</button><p className={`text-[10px] ${t.muted}`}>Este acceso protege el panel solo en este navegador; no equivale a una cuenta segura para una tienda publicada.</p></form> : <><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><p className={`text-xs ${t.muted}`}>{pedidos.length} pedidos guardados en este navegador</p><button onClick={() => setAdminAutenticado(false)} className="rounded-full border px-3 py-2 text-xs">Bloquear panel</button></div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className={`rounded-xl p-3 ${t.soft}`}><p className="text-lg font-semibold">{pedidos.length}</p><p className={`text-[9px] ${t.muted}`}>Total</p></div><div className={`rounded-xl p-3 ${t.soft}`}><p className="text-lg font-semibold">{pedidos.filter((p) => !pedidoCancelado(p) && p.estado !== "entregado").length}</p><p className={`text-[9px] ${t.muted}`}>Activos</p></div><div className={`rounded-xl p-3 ${t.soft}`}><p className="text-lg font-semibold">{pedidos.filter((p) => p.estado === "esperando_producto").length}</p><p className={`text-[9px] ${t.muted}`}>En espera</p></div></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={adminBusqueda} onChange={(e) => setAdminBusqueda(e.target.value)} placeholder="Buscar código, cliente, teléfono o perfume" className={`min-w-0 flex-1 rounded-xl border p-3 text-xs ${t.input}`}/><select value={adminFiltroEstado} onChange={(e) => setAdminFiltroEstado(e.target.value)} className={`rounded-xl border p-3 text-xs ${t.input}`}><option value="todos">Todos los estados</option>{estadosPedido.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>{pedidosAdmin.length ? <div className="mt-4 space-y-3">{pedidosAdmin.map((p) => <article key={p.id} className={`rounded-2xl border p-4 ${t.divider}`}><div className="flex flex-col justify-between gap-3 md:flex-row"><div><p className="text-[10px] uppercase tracking-wider text-[#D4AF37]">{p.id} · {new Date(p.creado).toLocaleString("es-CO")}</p><h3 className="mt-1 font-display text-lg">{p.nombreCliente}</h3><p className={`text-xs ${t.muted}`}>{p.telefonoCliente} · {p.entrega === "domicilio" ? p.direccion : "Recogida personal"}</p><p className="mt-2 text-xs">{p.lineas.map((x) => `${x.cantidad} × ${x.nombre}`).join(" · ")}</p><p className="mt-1 text-xs font-semibold">Total {cop(p.total)} · Abono registrado {cop(p.abono)} · Saldo {cop(p.saldo)}</p></div><div className="flex flex-col gap-2 md:w-56"><label className="text-[10px]">Estado<select value={p.estado} onChange={(e) => { const value = e.target.value; if (value === "cancelado" || value === "cancelado_inasistencia") cancelarPorInasistencia(p); else cambiarEstadoPedido(p.id, { estado: value }); }} className={`mt-1 w-full rounded-xl border p-2 text-xs ${t.input}`}>{estadosPedido.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><label className="flex items-center gap-2 text-[10px]"><input type="checkbox" checked={Boolean(p.pagoAbonoConfirmado)} onChange={(e) => cambiarEstadoPagoAdmin(p, e.target.checked ? (Number(p.saldo) > 0 ? "abono" : "pagado") : "pendiente")} className="accent-[#D4AF37]"/> {p.saldo > 0 ? "Abono recibido" : "Pago completo recibido"}</label></div></div><label className="mt-3 block text-[10px]">Actualización visible para el cliente<textarea value={p.notaCliente || ""} onChange={(e) => cambiarEstadoPedido(p.id, { notaCliente: e.target.value })} rows={2} placeholder="Ej. El perfume llega el viernes; falta confirmar el saldo." className={`mt-1 w-full rounded-xl border p-3 text-xs ${t.input}`}/></label><a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola ${p.nombreCliente}, actualización de tu pedido ${p.id}: ${etiquetaEstado(p.estado)}. ${p.notaCliente || "Escríbenos si tienes preguntas."}`)}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-full border border-[#D4AF37]/50 px-3 py-2 text-[10px] text-[#D4AF37]">Enviar actualización por WhatsApp ↗</a></article>)}</div> : <p className={`mt-6 rounded-2xl border border-dashed p-8 text-center text-sm ${t.muted} ${t.divider}`}>Todavía no hay pedidos. Las órdenes nuevas que se hagan desde este navegador aparecerán aquí.</p>}<p className={`mt-4 rounded-xl bg-amber-500/10 p-3 text-[10px] leading-5 ${t.muted}`}>Importante: los pedidos se guardan únicamente en este navegador. Para ver pedidos de clientes desde otros teléfonos o computadoras, necesitamos conectar la tienda a una base de datos en internet y proteger el panel con autenticación real.</p></>}</section></div>}

    {bienvenida && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4"><section role="dialog" aria-modal="true" aria-labelledby="welcome-title" className={`w-full max-w-md rounded-3xl border border-[#D4AF37]/50 p-7 text-center shadow-2xl ${t.drawer}`}><span className="mx-auto grid size-14 place-items-center rounded-full border border-[#D4AF37] font-display text-xl text-[#D4AF37]">N✳</span><p className="mt-5 text-[10px] tracking-[.3em] text-[#D4AF37]">POPAYÁN · CAUCA</p><h2 id="welcome-title" className="mt-2 font-display text-3xl">Bienvenido a NovaScents</h2><p className={`mt-3 text-sm leading-6 ${t.muted}`}>Encuentra tu próxima fragancia. Explora el stock disponible o separa tu perfume favorito por encargo.</p><button onClick={cerrarBienvenida} className="mt-6 w-full rounded-full bg-[#D4AF37] py-3 font-semibold text-stone-950">Explorar perfumes</button></section></div>}

    {rastreoAbierto && <div className="fixed inset-0 z-[95] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onClick={cerrarRastreo}><section role="dialog" aria-modal="true" aria-labelledby="rastreo-title" onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-3xl border p-5 shadow-2xl ${t.drawer} ${t.divider}`}><div className="flex items-start justify-between"><div><p className="text-[9px] tracking-[.2em] text-[#D4AF37]">ÚLTIMA MILLA · POPAYÁN</p><h2 id="rastreo-title" className="mt-1 font-display text-2xl">Rastrea tu pedido</h2><p className={`mt-2 text-xs ${t.muted}`}>Ingresa el código de orden para ver el recorrido.</p></div><button onClick={cerrarRastreo} aria-label="Cerrar rastreo" className="size-10 rounded-full border">×</button></div><form onSubmit={(e) => { e.preventDefault(); setRastreoConsultado(Boolean(codigoRastreo.trim())); }} className="mt-5 flex gap-2"><input required value={codigoRastreo} onChange={(e) => setCodigoRastreo(e.target.value)} placeholder="#NS-1234" className={`min-w-0 flex-1 rounded-xl border p-3 text-sm ${t.input}`}/><button className="rounded-xl bg-[#D4AF37] px-4 text-xs font-bold text-stone-950">Consultar</button></form>{rastreoConsultado && <div className={`mt-5 rounded-2xl border p-4 ${t.divider}`}><p className="text-xs font-semibold">Orden {codigoRastreo.trim()}</p><ol className="mt-4 space-y-4">{[["✓", "Recibido", "Tu solicitud llegó a NovaScents."], ["✦", "Preparando", "Estamos alistando tus fragancias."], ["🛵", "En camino por Popayán", "El mensajero lleva tu pedido."]].map(([icono, titulo, texto], i) => <li key={titulo} className="flex items-start gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-full ${i <= progresoRastreo ? "bg-emerald-500/15 text-emerald-500" : t.soft}`}>{icono}</span><span><strong className={`text-xs ${i <= progresoRastreo ? "text-emerald-500" : ""}`}>{titulo}</strong><span className={`mt-1 block text-[10px] ${t.muted}`}>{texto}</span></span></li>)}</ol><p className={`mt-4 text-[9px] ${t.muted}`}>Estado de demostración simulado según la hora local. Confirma el estado real por WhatsApp.</p></div>}</section></div>}
    {busquedaVisualAbierta && <div className="fixed inset-0 z-[96] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onClick={cerrarBusquedaVisual}><section role="dialog" aria-modal="true" aria-labelledby="visual-title" onClick={(e) => e.stopPropagation()} className={`w-full max-w-2xl rounded-3xl border p-5 shadow-2xl ${t.drawer} ${t.divider}`}><div className="flex items-start justify-between"><div><p className="text-[9px] tracking-[.2em] text-[#D4AF37]">BÚSQUEDA VISUAL</p><h2 id="visual-title" className="mt-1 font-display text-2xl">Encuentra un aroma parecido</h2></div><button onClick={cerrarBusquedaVisual} aria-label="Cerrar búsqueda visual" className="size-10 rounded-full border">×</button></div><div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr]"><div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/40"><ImagenProducto src={busquedaVisualUrl} alt="Imagen seleccionada para buscar" className="aspect-square w-full object-cover"/><span className={`nova-scan-frame absolute inset-3 rounded-xl border-2 border-[#D4AF37] ${busquedaVisualCargando ? "nova-scanning" : ""}`}/></div><div aria-live="polite" aria-busy={busquedaVisualCargando}>{busquedaVisualCargando ? <div className={`flex h-full min-h-28 items-center gap-3 rounded-2xl p-4 text-sm ${t.soft}`}><span className="nova-scan-ring"/>Análisis IA de demostración…</div> : <><p className={`text-xs ${t.muted}`}>Sugerencias de una familia olfativa seleccionada localmente. La foto no se sube a ningún servidor.</p><div className="mt-3 grid gap-2">{resultadosVisuales.map((p) => <div key={p.id} className={`flex items-center gap-3 rounded-xl border p-2 ${t.divider}`}><ImagenProducto src={p.imagen} alt={p.nombre} className="size-12 rounded-lg object-cover"/><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{p.marca} · {p.nombre}</p><p className={`text-[10px] ${t.muted}`}>{p.familiaAromatica} · {cop(p.precioDetal)}</p></div><button onClick={() => { setBusquedaVisualAbierta(false); abrirDetalle(p); }} className="rounded-full border px-3 py-2 text-[10px]">Ver</button></div>)}</div></>}</div></div></section></div>}
    {visorARAbierto && detalle && <div className="fixed inset-0 z-[97] grid place-items-center bg-black/90 p-4 backdrop-blur-md" onClick={() => setVisorARAbierto(false)}><section role="dialog" aria-modal="true" aria-labelledby="ar-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#D4AF37]/50 bg-[#090909] text-white shadow-2xl"><div className="flex items-center justify-between p-4"><div><p className="text-[9px] tracking-[.2em] text-[#D4AF37]">VISTA ESPACIAL · DEMO</p><h2 id="ar-title" className="font-display text-lg">{detalle.nombre}</h2></div><button onClick={() => setVisorARAbierto(false)} aria-label="Cerrar visor" className="size-10 rounded-full border border-white/20">×</button></div><div className="relative mx-4 grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_center,#765d3540,#111_70%)]">{arCamaraActiva && <video ref={videoARRef} autoPlay playsInline muted className="absolute inset-0 size-full object-cover"/>}<div className="absolute inset-0 bg-black/20"/><div ref={botellaARRef} className="nova-ar-bottle relative z-10 rounded-2xl border border-[#D4AF37]/30 bg-black/35 p-3 backdrop-blur-sm"><ImagenProducto src={detalle.imagen} alt={`Vista previa de ${detalle.nombre}`} className="size-36 rounded-xl object-contain sm:size-48"/><p className="mt-2 text-center text-[9px] text-[#D4AF37]">Modelo de muestra · {detalle.nombre}</p></div><span className="absolute inset-4 rounded-2xl border border-dashed border-white/30"/></div><div className="p-4"><p className="text-[10px] leading-5 text-stone-300">{navigator.xr && window.isSecureContext ? "WebXR está disponible en este dispositivo." : "Vista previa espacial en modo cámara."} Modelo .glTF/.USDZ pendiente; esta vista es demostrativa y no mide el tamaño real.</p>{arCamaraError && <p role="alert" className="mt-2 text-[10px] text-rose-300">{arCamaraError}</p>}<div className="mt-3 flex flex-wrap gap-2"><button onClick={abrirCamaraAR} className="rounded-full bg-[#D4AF37] px-4 py-2.5 text-xs font-bold text-stone-950">{arCamaraActiva ? "Cámara activada" : "Activar cámara"}</button><button onClick={activarParallax} className="rounded-full border border-white/20 px-4 py-2.5 text-xs">Activar movimiento 3D</button></div></div></section></div>}    {retencionAbierta && <div className="fixed inset-0 z-[110] grid place-items-center bg-black/75 p-4 backdrop-blur-md" onClick={() => setRetencionAbierta(false)}><section role="dialog" aria-modal="true" aria-labelledby="exit-intent-title" onClick={(e) => e.stopPropagation()} className={`w-full max-w-md rounded-3xl border border-[#D4AF37]/50 p-6 text-center shadow-2xl ${t.drawer}`}><span className="mx-auto grid size-14 place-items-center rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 text-2xl">✨</span><h2 id="exit-intent-title" className="mt-4 font-display text-2xl">¡No te vayas! Tus fragancias te están esperando.</h2><p className={`mt-2 text-sm ${t.muted}`}>Tu bolsa conserva los perfumes que elegiste. Puedes volver cuando quieras.</p><div className="mt-5 grid gap-2 sm:grid-cols-2"><button onClick={() => setRetencionAbierta(false)} className="rounded-full border border-[#D4AF37]/40 px-4 py-3 text-xs">Seguir explorando</button><button onClick={() => { setRetencionAbierta(false); setAbierta(true); }} className="rounded-full bg-[#D4AF37] px-4 py-3 text-xs font-bold text-stone-950">Ver mi bolsa ({unidades})</button></div></section></div>}\n    {detalle && <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/75 p-3 sm:p-6" onClick={() => setDetalle(null)}>
      <section role="dialog" aria-modal="true" aria-label={`Detalles de ${detalle.nombre}`} onClick={(e) => e.stopPropagation()} style={{ borderColor: `${acentoDetalle}88`, boxShadow: `0 0 42px ${acentoDetalle}20` }} className={`nova-detail-card my-auto max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl border ${t.card}`}>
        <div className="flex items-center justify-between border-b p-4"><div><p className="text-[9px] tracking-[.2em] text-[#D4AF37]">FICHA DE FRAGANCIA</p><h2 className="font-display text-xl">{detalle.nombre}</h2></div><button onClick={() => setDetalle(null)} className="size-10 rounded-full border">×</button></div>
        <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
          <ImagenProducto src={detalle.imagen} alt={`${detalle.marca} ${detalle.nombre}`} className="aspect-[.85] w-full rounded-2xl object-cover" />
          <div className="flex flex-col"><p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">{detalle.marca}</p><h3 className="mt-2 font-display text-3xl">{detalle.nombre}</h3><p className={`mt-2 text-sm ${t.muted}`}>{detalle.genero} · {detalle.linea}</p><p className="mt-5 text-2xl font-semibold">{cop(detalle.precioDetal)}</p>
            <div className={`mt-5 rounded-2xl p-4 ${t.soft}`}><p className="text-xs font-semibold">Estilo aromático sugerido: {detalle.familiaAromatica || "Versátil"}</p><p className={`mt-2 text-xs leading-5 ${t.muted}`}>El estilo es orientativo. Confirma notas, duración y concentración específicas por WhatsApp.</p></div>
            <p className={`mt-4 text-xs ${t.muted}`}>{detalle.disponible ? "En stock para entrega inmediata en Popayán." : "Por encargo. Tiempo de llegada por confirmar según disponibilidad."}</p>
            <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => cambiarFavorito(detalle.id)} className="rounded-full border px-4 py-3 text-sm">{favoritos.includes(detalle.id) ? "♥ Guardado" : "♡ Guardar"}</button><button onClick={() => cambiarComparacion(detalle.id)} className="rounded-full border px-4 py-3 text-sm">{comparacion.includes(detalle.id) ? "✓ Comparando" : "+ Comparar"}</button><button onClick={() => compartirPerfume(detalle)} className="rounded-full border border-[#D4AF37]/50 px-4 py-3 text-sm text-[#D4AF37]">↗ Compartir</button><button onClick={alternarAudio} className="rounded-full border border-[#D4AF37]/40 px-4 py-3 text-sm text-[#D4AF37]">{audioActivo ? "◼ Detener ambiente" : "♫ Escuchar ambiente"}</button><button onClick={() => setVisorARAbierto(true)} className="rounded-full border border-[#D4AF37]/40 px-4 py-3 text-sm text-[#D4AF37]">📱 Ver en tu espacio</button><button onClick={() => agregar(detalle)} className={`nova-cta flex-1 rounded-full px-4 py-3 text-sm font-bold text-white ${detalle.disponible ? "bg-emerald-600" : "bg-[#a98016]"}`}>{detalle.disponible ? "Comprar Ahora" : "Separar con el 50%"}</button></div>
            <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(detalle.disponible ? `Hola NovaScents, quiero consultar por ${detalle.nombre} de ${detalle.marca}.` : `Hola NovaScents, me interesa ${detalle.nombre} de ${detalle.marca}. ¿Me avisan cuando vuelva a estar disponible y me confirman el tiempo de llegada?`)}`} target="_blank" rel="noreferrer" className="mt-3 text-center text-xs text-[#D4AF37]">{detalle.disponible ? "Consultar este perfume" : "Consultar disponibilidad o pedir aviso"} por WhatsApp ↗</a>
          </div>
        </div>
        <div className="border-t p-4 sm:p-6"><h3 className="font-display text-xl">También te podría gustar</h3><div className="mt-3 grid grid-cols-3 gap-3">{recomendaciones.map((p) => <button key={p.id} onClick={() => abrirDetalle(p)} className={`rounded-xl border p-2 text-left ${t.divider}`}><ImagenProducto src={p.imagen} alt="" className="aspect-square w-full rounded-lg object-cover"/><p className="mt-2 line-clamp-2 text-[10px]">{p.nombre}</p><p className="mt-1 text-xs font-semibold">{cop(p.precioDetal)}</p></button>)}</div></div>
      </section>
    </div>}

    {regaloAbierto && <div className="fixed inset-0 z-[67] flex items-center justify-center bg-black/75 p-3" onClick={() => setRegaloAbierto(false)}><section role="dialog" aria-modal="true" aria-label="Encuentra un regalo" onClick={(e) => e.stopPropagation()} className={`max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl border p-5 sm:p-7 ${t.drawer} ${t.divider}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] tracking-[.2em] text-[#D4AF37]">DETALLE ESPECIAL</p><h2 className="mt-1 font-display text-2xl">Encuentra un regalo</h2><p className={`mt-2 text-xs ${t.muted}`}>Busca por nombre o marca, y combina presupuesto, destinatario y aroma.</p></div><button onClick={() => setRegaloAbierto(false)} className="size-10 shrink-0 rounded-full border">×</button></div><label className="mt-5 flex items-center gap-2 rounded-xl border border-[#D4AF37]/40 px-4 py-3"><span className="text-lg text-[#D4AF37]">⌕</span><input autoFocus value={regaloBusqueda} onChange={(e) => setRegaloBusqueda(e.target.value)} placeholder="Ej. Yara, Dior, Lattafa…" className="w-full bg-transparent text-sm outline-none"/><button type="button" onClick={() => setRegaloBusqueda("")} className="text-xs text-[#D4AF37]">Limpiar</button></label><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs">¿Para quién?<select value={regaloPara} onChange={(e) => setRegaloPara(e.target.value)} className={`mt-2 w-full rounded-xl border p-3 ${t.input}`}><option>Todos</option><option>Hombre</option><option>Mujer</option><option>Unisex</option></select></label><label className="text-xs">Presupuesto<select value={regaloPresupuesto} onChange={(e) => setRegaloPresupuesto(e.target.value)} className={`mt-2 w-full rounded-xl border p-3 ${t.input}`}><option value="60000">Hasta $60.000</option><option value="80000">Hasta $80.000</option><option value="120000">Hasta $120.000</option><option value="150000">Hasta $150.000</option><option value="250000">Hasta $250.000</option></select></label><label className="text-xs">Estilo<select value={regaloEstilo} onChange={(e) => setRegaloEstilo(e.target.value)} className={`mt-2 w-full rounded-xl border p-3 ${t.input}`}>{aromas.map((a) => <option key={a}>{a}</option>)}</select></label></div><div className="mt-6 flex items-baseline justify-between"><h3 className="font-display text-lg">Ideas para regalar</h3><span className={`text-[10px] ${t.muted}`}>{resultadosRegalo.length} sugerencias</span></div>{resultadosRegalo.length ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{resultadosRegalo.map((p) => <article key={p.id} className={`rounded-2xl border p-3 ${t.divider}`}><button type="button" onClick={() => { setRegaloAbierto(false); abrirDetalle(p); }} className="w-full text-left"><ImagenProducto src={p.imagen} alt={`${p.marca} ${p.nombre}`} className="aspect-square w-full rounded-xl object-cover"/><p className="mt-2 text-[9px] uppercase text-[#D4AF37]">{p.marca}</p><h4 className="line-clamp-2 min-h-9 text-xs font-semibold">{p.nombre}</h4></button><p className={`mt-1 text-[10px] ${t.muted}`}>{p.familiaAromatica} · {p.disponible ? "En stock" : "Por encargo"}</p><p className="mt-2 text-sm font-bold">{cop(p.precioDetal)}</p><button onClick={() => { setRegaloAbierto(false); agregar(p); }} className="mt-2 w-full rounded-full bg-[#D4AF37] py-2.5 text-xs font-bold text-stone-950">Agregar a mi bolsa</button></article>)}</div> : <p className={`mt-3 rounded-xl p-5 text-center text-sm ${t.soft} ${t.muted}`}>No encontramos perfumes con esos filtros. Prueba otro nombre, aroma o presupuesto.</p>}<p className={`mt-4 text-[10px] ${t.muted}`}>La disponibilidad de envoltura se confirma por WhatsApp.</p></section></div>}
    {quizAbierto && <div className="fixed inset-0 z-[66] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" onClick={() => setQuizAbierto(false)}><section role="dialog" aria-modal="true" aria-label="Chat con Asistente Nova" onClick={(e) => e.stopPropagation()} className={`flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl ${t.drawer} ${t.divider}`}><header className={`flex items-center justify-between border-b p-4 sm:p-5 ${t.divider}`}><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-2xl">🤖</div><div><p className="text-[9px] font-semibold tracking-[.2em] text-[#D4AF37]">ASISTENTE VIRTUAL · NOVASCENTS</p><h2 className="font-display text-xl">Nova</h2><p className={`text-[10px] ${t.muted}`}>Tu guía de aromas en Popayán</p></div></div><button onClick={() => setQuizAbierto(false)} aria-label="Cerrar asistente" className="grid size-10 place-items-center rounded-full border text-xl">×</button></header><div className="flex flex-wrap gap-2 border-b p-3 sm:px-5"><button disabled={novaEscribiendo} onClick={() => enviarConsultaNova("Recomiéndame un perfume dulce")} className={`rounded-full border px-3 py-2 text-[10px] ${t.divider}`}>🍯 Algo dulce</button><button disabled={novaEscribiendo} onClick={() => enviarConsultaNova("Busco un aroma fresco para hombre")} className={`rounded-full border px-3 py-2 text-[10px] ${t.divider}`}>🌿 Fresco para hombre</button><button disabled={novaEscribiendo} onClick={() => enviarConsultaNova("¿Qué perfumes hay disponibles para entrega inmediata?")} className={`rounded-full border px-3 py-2 text-[10px] ${t.divider}`}>🔥 Entrega inmediata</button><button disabled={novaEscribiendo} onClick={() => enviarConsultaNova("Recomiéndame un perfume árabe")} className={`rounded-full border px-3 py-2 text-[10px] ${t.divider}`}>✨ Línea árabe</button></div><div className="min-h-[220px] flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">{chatNova.map((mensaje, i) => <div key={`${i}-${mensaje.role}`} className={mensaje.role === "user" ? "ml-auto max-w-[88%]" : "mr-auto max-w-[96%]"}><div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${mensaje.role === "user" ? "rounded-br-sm bg-[#D4AF37] text-stone-950" : `rounded-bl-sm ${t.soft}`}`}>{mensaje.role === "assistant" && <span className="mr-1.5">🤖</span>}{mensaje.text}</div>{mensaje.items?.length > 0 && <div className="mt-2 grid gap-2 sm:grid-cols-3">{mensaje.items.map((p) => <article key={p.id} className={`flex items-center gap-2 rounded-xl border p-2 ${t.divider}`}><ImagenProducto src={p.imagen} alt={p.nombre} className="size-12 rounded-lg object-cover"/><div className="min-w-0 flex-1"><p className="truncate text-[9px] uppercase text-[#D4AF37]">{p.marca}</p><p className="truncate text-[10px] font-semibold">{p.nombre}</p><p className="text-[10px] font-bold">{cop(p.precioDetal)}</p><button onClick={() => hablarAroma(p)} className="mt-1 text-[9px] text-[#D4AF37]">🔊 Escuchar aroma</button></div><button onClick={() => { setQuizAbierto(false); abrirDetalle(p); }} className="rounded-full border px-2 py-1.5 text-[9px]">Ver</button></article>)}</div>}</div>)}</div>{novaEscribiendo && <div className="mr-auto max-w-[96%] rounded-2xl rounded-bl-sm bg-white/[0.04] px-4 py-3 text-xs text-stone-400">Nova está escribiendo <span className="nova-typing-dots" aria-label="Escribiendo"><i/><i/><i/></span></div>}<form onSubmit={(e) => { e.preventDefault(); enviarConsultaNova(); }} className={`border-t p-3 sm:p-4 ${t.divider}`}><div className={`flex items-center gap-2 rounded-2xl border p-2 ${t.input}`}><input value={consultaNova} onChange={(e) => setConsultaNova(e.target.value)} placeholder="Pregunta por aromas, precios o perfumes…" aria-label="Pregunta al asistente Nova" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"/><button type="submit" disabled={!consultaNova.trim() || novaEscribiendo} className="rounded-xl bg-[#D4AF37] px-4 py-2.5 text-xs font-bold text-stone-950 disabled:opacity-50">Enviar ↗</button></div><p className={`mt-2 text-center text-[9px] ${t.muted}`}>Asistente con IA basado en el catálogo; no escribas datos personales. Para confirmar notas, escríbenos por WhatsApp.</p></form></section></div>}    {comparacion.length > 0 && <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-[#D4AF37]/50 bg-[#171613] p-3 text-white shadow-2xl"><div><p className="text-xs font-semibold">Comparador de perfumes · {comparacion.length}/3</p>{mensajeComparar && <p className="mt-1 text-[10px] text-amber-300">{mensajeComparar}</p>}</div><div className="flex gap-2"><button onClick={() => { setComparacion([]); setMensajeComparar(""); }} className="rounded-full border border-white/20 px-3 py-2 text-[10px]">Limpiar</button><button onClick={() => { setComparacionAbierta(true); setMensajeComparar(""); }} className="rounded-full bg-[#D4AF37] px-4 py-2 text-xs font-bold text-stone-950">Comparar ahora</button></div></div>}
    {comparacionAbierta && <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/75 p-3" onClick={() => setComparacionAbierta(false)}><section role="dialog" aria-modal="true" aria-label="Comparar perfumes" onClick={(e) => e.stopPropagation()} className={`max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl border p-4 sm:p-6 ${t.drawer} ${t.divider}`}><div className="flex items-center justify-between"><div><p className="text-[9px] tracking-[.2em] text-[#D4AF37]">ELIGE CON CONFIANZA</p><h2 className="font-display text-2xl">Comparar perfumes</h2></div><button onClick={() => setComparacionAbierta(false)} className="size-10 rounded-full border">×</button></div><div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, perfumesComparacion.length)}, minmax(180px, 1fr))` }}>{perfumesComparacion.map((p) => <article key={p.id} className={`rounded-2xl border p-3 ${t.divider}`}><ImagenProducto src={p.imagen} alt="" className="aspect-square w-full rounded-xl object-cover"/><p className="mt-3 text-[9px] uppercase text-[#D4AF37]">{p.marca}</p><h3 className="mt-1 min-h-10 font-display">{p.nombre}</h3><p className="mt-2 text-lg font-semibold">{cop(p.precioDetal)}</p><dl className={`mt-3 space-y-2 text-xs ${t.muted}`}><div className="flex justify-between gap-2"><dt>Estilo</dt><dd>{p.familiaAromatica}</dd></div><div className="flex justify-between gap-2"><dt>Para</dt><dd>{p.genero}</dd></div><div className="flex justify-between gap-2"><dt>Disponibilidad</dt><dd>{p.disponible ? "Entrega inmediata" : "Por encargo"}</dd></div></dl><button onClick={() => { setComparacionAbierta(false); abrirDetalle(p); }} className="mt-4 w-full rounded-full border border-[#D4AF37]/50 py-2 text-xs">Ver detalles</button></article>)}</div><p className={`mt-4 text-[10px] ${t.muted}`}>Los estilos aromáticos son orientativos. Consulta notas y duración exactas con nuestro equipo.</p></section></div>}

    {abierta && <div className="fixed inset-0 z-[100] flex justify-end"><button onClick={() => setAbierta(false)} className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label="Cerrar bolsa"/><section role="dialog" aria-modal="true" aria-label="Bolsa y checkout" className={`relative flex h-full w-full max-w-2xl flex-col border-l shadow-2xl ${oscuro ? "border-white/10 bg-[#09090b]/95" : "border-black/10 bg-[#fbfaf7]/95"} backdrop-blur-2xl`}><div className={`border-b px-4 pb-4 pt-4 sm:px-6 ${t.divider}`}><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-semibold tracking-[.22em] text-[#D4AF37]">CHECKOUT · NOVASCENTS</p><h2 className="mt-1 font-display text-2xl sm:text-3xl">Tu bolsa <span className="text-sm font-medium text-[#D4AF37]">({unidades})</span></h2><p className={`mt-1 text-[10px] ${t.muted}`}>Entrega inmediata y perfumes por encargo</p></div><button onClick={() => setAbierta(false)} aria-label="Cerrar bolsa" className={`grid size-10 shrink-0 place-items-center rounded-full border text-xl transition hover:border-[#D4AF37] hover:text-[#D4AF37] ${t.divider}`}>×</button></div></div>{lineas.length === 0 ? <div className="m-auto flex max-w-xs flex-col items-center px-6 py-8 text-center"><div className={`grid size-24 place-items-center rounded-full ${t.soft}`}><svg viewBox="0 0 24 24" className="size-12 text-[#D4AF37]" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/><path d="M9 13v1m6-1v1"/></svg></div><h3 className="mt-5 font-display text-2xl">Tu bolsa está vacía</h3><p className={`mt-2 text-sm ${t.muted}`}>Explora el catálogo y encuentra una fragancia para ti.</p><button type="button" onClick={() => setAbierta(false)} className="mt-5 rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-stone-950">Explorar catálogo</button></div> : <form onSubmit={pedir} className="flex min-h-0 flex-1 flex-col"><div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">{lineas.map(({ p, cantidad, cantidadInmediata }) => <div key={p.id} className={`group flex gap-3 rounded-2xl border p-3 transition hover:border-[#D4AF37]/40 ${t.card}`}><ImagenProducto src={p.imagen} alt="" className="size-16 rounded-xl object-cover"/><div className="min-w-0 flex-1"><p className="text-[9px] uppercase text-[#D4AF37]">{cantidadInmediata > 0 ? "Entrega inmediata · " + cantidadInmediata : "Bajo Pedido · Plan Separe"}</p><p className="truncate font-display">{p.nombre}</p><p className={`text-xs ${t.muted}`}>{cop(p.precioDetal)} c/u</p><div className="mt-2 inline-flex items-center gap-3 rounded-full border border-[#D4AF37]/25 px-2 py-1"><button type="button" aria-label={`Quitar una unidad de ${p.nombre}`} onClick={() => cambiarCantidad(p.id, -1)} className="grid size-7 place-items-center rounded-full text-lg transition hover:bg-[#D4AF37]/15">−</button><span className="min-w-4 text-center text-xs font-semibold">{cantidad}</span><button type="button" aria-label={`Agregar una unidad de ${p.nombre}`} onClick={() => cambiarCantidad(p.id, 1)} className="grid size-7 place-items-center rounded-full bg-[#D4AF37] text-lg text-stone-950 transition hover:scale-105">+</button></div></div><span className="text-xs font-semibold">{cop(p.precioDetal * cantidad)}</span></div>)}
      <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs">Nombre para el pedido<input required value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} autoComplete="name" placeholder="Tu nombre" className={`mt-2 w-full rounded-xl border p-3 ${t.input}`}/></label><label className="block text-xs">Teléfono para seguimiento<input required type="tel" value={telefonoCliente} onChange={(e) => setTelefonoCliente(e.target.value)} autoComplete="tel" placeholder="Tu número de contacto" className={`mt-2 w-full rounded-xl border p-3 ${t.input}`}/></label></div>
      <label className="block text-xs">Hora límite acordada de entrega o recogida<input required type="datetime-local" value={horaLimiteEntrega} onChange={(e) => setHoraLimiteEntrega(e.target.value)} className={`mt-2 w-full rounded-xl border p-3 ${t.input}`}/><span className={`mt-1 block text-[9px] ${t.muted}`}>Acuerda este horario con el cliente. Si no se concreta, la reserva podrá expirar.</span></label><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={activarAvisoPush} className="rounded-xl border border-[#D4AF37]/40 p-3 text-left text-xs">🔔 {avisoPushActivo ? "Aviso de bolsa activado" : "Activar aviso si minimizas la tienda"}<span className="mt-1 block text-[9px] text-stone-400">Te avisaremos si dejas perfumes en la bolsa.</span></button></div>{biometriaEstado && <p role="status" className="text-[10px] text-[#D4AF37]">{biometriaEstado}</p>}      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={esRegalo} onChange={(e) => setEsRegalo(e.target.checked)} className="mt-0.5 accent-[#D4AF37]"/><span>Es para regalo <span className={t.muted}>· La envoltura se consulta por WhatsApp</span></span></label>{esRegalo && <label className="block text-xs">Mensaje u observación para el regalo<textarea value={mensajeRegalo} onChange={(e) => setMensajeRegalo(e.target.value)} maxLength={180} rows={2} placeholder="Ej. Es para un cumpleaños" className={`mt-2 w-full resize-none rounded-xl border p-3 ${t.input}`}/></label>}
      <fieldset><legend className="mb-2 text-xs font-semibold">Método de entrega</legend><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setEntrega("domicilio")} className={`rounded-xl border p-3 text-left text-xs ${entrega === "domicilio" ? "border-[#D4AF37]" : ""}`}>🛵 Domicilio en Popayán<span className="block">+{cop(ENVIO_POPAYAN)}</span></button><button type="button" onClick={() => setEntrega("recogida")} className={`rounded-xl border p-3 text-left text-xs ${entrega === "recogida" ? "border-[#D4AF37]" : ""}`}>🏪 Recogida personal<span className="block">Sin costo</span></button></div></fieldset>{entrega === "domicilio" && <label className="block text-xs">Dirección o barrio<input required value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej. Barrio El Recuerdo" className={`mt-2 w-full rounded-xl border p-3 ${t.input}`}/></label>}<fieldset><legend className="mb-2 text-xs font-semibold">Método de pago</legend><div className="grid grid-cols-2 gap-2">{["🟣 Nequi", "🔴 Daviplata", "🟡 Bancolombia", "🟢 Bre-B", "💵 Pago Contra Entrega"].map((metodo) => <label key={metodo} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs transition ${metodoPago === metodo ? "border-[#D4AF37] bg-[#D4AF37]/10" : t.divider}`}><input type="radio" name="metodoPago" value={metodo} checked={metodoPago === metodo} onChange={() => setMetodoPago(metodo)} className="accent-[#D4AF37]"/>{metodo}</label>)}</div></fieldset>{(metodoPago === "🟣 Nequi" || metodoPago === "🔴 Daviplata") && <div className={`rounded-2xl border border-[#D4AF37]/30 p-4 backdrop-blur-md ${oscuro ? "bg-white/[0.06]" : "bg-white/55"}`}><p className="text-xs font-semibold">Pago por {metodoPago.includes("Nequi") ? "Nequi" : "Daviplata"}: te confirmamos los datos por WhatsApp.</p><div className="mt-3 flex items-center justify-between gap-3"><span className="text-sm font-semibold tracking-wider">{NUMERO_PAGOS}</span><button type="button" onClick={copiarNumeroPago} className="rounded-full border border-[#D4AF37]/50 px-4 py-2 text-[10px] font-semibold text-[#D4AF37]">Copiar número</button></div><p className={`mt-2 text-[9px] ${t.muted}`}>Confirma que este número corresponde a la cuenta receptora antes de transferir.</p></div>}{metodoPago === "🟢 Bre-B" && <div className={`rounded-2xl border border-emerald-500/30 p-4 ${oscuro ? "bg-emerald-500/[0.06]" : "bg-emerald-50"}`}><p className="text-xs font-semibold">🟢 Pago por Bre-B</p><p className={`mt-1 text-[10px] leading-4 ${t.muted}`}>Pídenos la llave Bre-B oficial por WhatsApp antes de transferir. No uses el número de Nequi/Daviplata como llave sin confirmarlo con nosotros.</p></div>}<label className="flex items-start gap-2 text-xs"><input type="checkbox" required checked={aceptaDatos} onChange={(e) => setAceptaDatos(e.target.checked)} className="mt-0.5 accent-[#D4AF37]"/><span>Acepto los <button type="button" onClick={() => setLegalAbierto("terminos")} className="underline">términos y el derecho de retracto</button> y autorizo el tratamiento de mis datos personales para gestionar mi pedido (<button type="button" onClick={() => setLegalAbierto("datos")} className="underline">Ley 1581 de 2012</button>).</span></label><p className={`text-[9px] leading-4 ${t.muted}`}>El pedido se confirma por WhatsApp. Esta página no recibe ni procesa pagos.</p></div><div className={`border-t px-4 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:px-6 ${t.divider} ${oscuro ? "bg-[#09090b]/95" : "bg-[#fbfaf7]/95"}`}><div className="space-y-1 text-xs"><div className="flex justify-between"><span>Subtotal</span><span>{cop(subtotal)}</span></div>{envio > 0 && <div className="flex justify-between"><span>Domicilio en Popayán</span><span>{cop(envio)}</span></div>}{descuento > 0 && <div className="flex justify-between text-[#D4AF37]"><span>Descuento Plan Separe</span><span>−{cop(descuento)}</span></div>}{descuentoCombos > 0 && <div className="flex justify-between text-emerald-500"><span>Descuento de combos</span><span>−{cop(descuentoCombos)}</span></div>}<div className={`flex items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/30 px-3 py-2 ${oscuro ? "bg-[#D4AF37]/[0.07]" : "bg-[#D4AF37]/[0.08]"}`}><span className="text-xs font-semibold">Total</span><strong className="font-display text-lg text-[#D4AF37]">{cop(total)}</strong></div>{subtotalEncargo > 0 && <div className="flex justify-between text-[10px]"><span>Abono hoy: {cop(abono)}</span><span>Saldo contra entrega: {cop(saldo)}</span></div>}</div><p className={`mt-2 text-center text-[9px] ${t.muted}`}>🔒 Pago coordinado · Nequi · Daviplata · Bre-B · Bancolombia</p>{error && <p role="alert" className="mt-1 text-xs text-red-500">{error}</p>}<button type="submit" className="nova-cta mt-2 min-h-11 w-full rounded-full bg-gradient-to-r from-[#d9b642] via-[#f0d77d] to-[#c49a27] font-bold text-stone-950 shadow-[0_4px_22px_rgba(212,175,55,.22)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(212,175,55,.32)]">Pedir por WhatsApp ↗</button></div></form>}</section></div>}
  </div>;
}

export default App;
