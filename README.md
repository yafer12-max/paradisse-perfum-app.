# NovaScents · Tienda React

## Abrir la tienda

1. Abre PowerShell dentro de esta carpeta.
2. Ejecuta `npm install` y espera a que termine.
3. Ejecuta `npm run dev`.
4. Abre en el navegador la dirección que aparece, normalmente `http://localhost:5173/`.
5. Para detener la tienda, vuelve a PowerShell y presiona `Ctrl + C`.

## Inventario y catálogo

La base contiene 311 perfumes en `src/productos.json`: 12 configurados para entrega inmediata y 299 por encargo. Las imágenes están en `public/catalog-images/` y los catálogos PDF en `public/catalogos/`.

## Pedidos y seguimiento

- Al enviar la bolsa por WhatsApp, la tienda crea un código de pedido y abre el seguimiento.
- El cliente puede consultar con el código y el teléfono registrado.
- En el pie de la tienda está el acceso al panel de pedidos. La primera vez se crea una clave de mínimo seis caracteres.
- El panel permite cambiar el estado, marcar el abono recibido y escribir una nota visible para el cliente.
- Los pedidos, la clave del panel y los estados se guardan en el almacenamiento local de ese navegador.

**Límite actual:** la aplicación no tiene todavía una base de datos compartida. El cliente y el panel deben abrir la tienda en el mismo navegador para ver actualizaciones sincronizadas. Para pedidos reales desde celulares distintos, se debe conectar un servicio de datos en internet y autenticación del administrador antes de publicar.

## Desarrollo

- `npm run dev`: abre la tienda en modo de desarrollo.
- `npm run build`: genera la versión de producción en `dist/`.
- `npm run preview`: muestra localmente la versión compilada.
