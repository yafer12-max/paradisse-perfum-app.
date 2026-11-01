import { storeConfig } from "./storeConfig.js";

const L = storeConfig.legal;
export const textoVendedor = () => [`Vendedor: ${L.titular}`, L.documento && `Documento: ${L.documento}`, L.correo && `Correo: ${L.correo}`, L.direccion || storeConfig.ciudad, `WhatsApp: +${storeConfig.whatsapp}`].filter(Boolean).join(" · ");

const TEXTOS = {
  terminos: {
    titulo: "Términos de compra y derecho de retracto",
    parrafos: [
      `${storeConfig.nombre} es un comercio de ${storeConfig.ciudad}. ${textoVendedor()}.`,
      "Precios: se muestran en pesos colombianos (COP). El domicilio en Popayán y los descuentos se muestran en el resumen antes de pedir.",
      "Pedido: la página arma tu pedido y lo envía por WhatsApp. La compra se confirma cuando te respondemos con disponibilidad y datos de pago. Esta página no recibe ni procesa pagos.",
      "Plan Separe: los perfumes por encargo se separan con un abono del 50% del valor de esos perfumes. El plazo de llegada se confirma por WhatsApp.",
      "Derecho de retracto (Ley 1480 de 2011): en compras a distancia puedes retractarte dentro de los 5 días hábiles siguientes a la entrega del producto, escribiéndonos por WhatsApp. El producto debe estar sin uso, sellado y en su empaque original. Los costos de la devolución los asume el consumidor y el dinero se devuelve dentro de los 30 días siguientes, según la ley. Existen excepciones legales.",
      "Garantía y reclamos: si recibes un producto distinto al pedido o defectuoso, escríbenos dentro de las 48 horas siguientes a la entrega, con fotos, para resolverlo. Tus derechos legales como consumidor no cambian por este texto.",
    ],
  },
  datos: {
    titulo: "Tratamiento de datos personales (Habeas Data)",
    parrafos: [
      `Responsable: ${L.titular}${L.documento ? `, documento ${L.documento}` : ""}. Contacto: ${L.correo || `WhatsApp +${storeConfig.whatsapp}`}.`,
      "Datos que recogemos: nombre, teléfono, dirección o barrio de entrega y el contenido de tu pedido.",
      "Para qué los usamos: gestionar tu pedido, coordinar entrega y pago, atender garantías o retracto y responderte por WhatsApp. No vendemos tus datos.",
      "Dónde quedan: el pedido se envía por WhatsApp y una copia queda guardada solo en tu navegador. Si usas el asistente con IA, tu pregunta y los perfumes consultados se procesan en un servicio externo de IA; no escribas datos personales en ese chat.",
      "Tus derechos (Ley 1581 de 2012): conocer, actualizar, rectificar y solicitar la supresión de tus datos, y revocar tu autorización, escribiéndonos por los canales de contacto.",
      "Al marcar la casilla del pedido autorizas este tratamiento. Es voluntario, pero sin él no podemos procesar el pedido.",
    ],
  },
};

export function LegalModal({ tipo, onClose }) {
  const t = TEXTOS[tipo];
  if (!t) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={t.titulo} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-3xl border border-white/10 bg-[#11110f] p-6 text-stone-200">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl text-[#D4AF37]">{t.titulo}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="size-10 shrink-0 rounded-full border border-white/20 text-xl">×</button>
        </div>
        <div className="mt-4 space-y-3 text-xs leading-6">{t.parrafos.map((p) => <p key={p}>{p}</p>)}</div>
      </section>
    </div>
  );
}
