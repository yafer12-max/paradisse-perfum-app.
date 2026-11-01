const normalizar = (texto = "") => texto.toLocaleLowerCase("es-CO").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
let indice = [];

self.onmessage = ({ data }) => {
  if (data?.type === "index") {
    indice = data.products.map((product) => ({ id: product.id, text: normalizar(`${product.marca} ${product.nombre} ${product.notas || ""} ${product.familiaAromatica || ""}`) }));
    return;
  }
  const query = (typeof data === "string" ? data : data?.query || "").trim();
  const normalizada = normalizar(query);
  const tokens = normalizada.split(/\s+/).filter(Boolean);
  const ids = !tokens.length ? indice.map((item) => item.id) : indice.filter((item) => tokens.every((token) => item.text.includes(token))).map((item) => item.id);
  self.postMessage({ query, ids });
};
