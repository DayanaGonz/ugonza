# UGONZA Presupuestos

Aplicación web estática para crear, guardar y descargar presupuestos profesionales de construcción para UGONZA Construcciones S.A.

## Qué incluye

- Dashboard de presupuestos guardados en el navegador.
- Editor responsive para celular, tablet y computadora.
- Catálogo local de clientes habituales.
- Partidas con tipo, categoría, unidad, cantidad, precio, IVA y moneda por línea.
- Conversión entre colones y dólares usando tipo de cambio venta.
- Campo manual de tipo de cambio y opción de consulta BCCR con credenciales.
- Cálculo de subtotal, descuento, IVA, total general y monto en letras.
- Vista previa y descarga de PDF con diseño corporativo.

## Cómo probar localmente

Opción rápida:

1. Abre `index.html` en el navegador.

Opción recomendada para que la descarga PDF y los archivos locales funcionen igual que en producción:

```bash
python3 -m http.server 4173
```

Luego abre:

```text
http://127.0.0.1:4173/
```

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub.
2. Sube todos los archivos de esta carpeta.
3. En GitHub, entra a `Settings > Pages`.
4. En `Build and deployment`, selecciona:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Guarda los cambios.

GitHub generará una URL similar a:

```text
https://usuario.github.io/nombre-del-repositorio/
```

## Datos y privacidad

La aplicación guarda presupuestos, clientes y ajustes en `localStorage`, es decir, dentro del navegador de cada usuario.

Esto significa:

- Cada usuario verá solo los datos creados en su propio navegador.
- Si se borra el historial/datos del navegador, se pueden perder los presupuestos.
- No hay sincronización entre varias personas.

Para uso multiusuario con historial compartido, conviene agregar backend, base de datos y login.

## Tipo de cambio BCCR

El campo de tipo de cambio puede llenarse manualmente.

La consulta automática al BCCR requiere correo y token de suscripción. En una app publicada solo con GitHub Pages, esas credenciales quedarían en el navegador del usuario. Para producción, lo más seguro es consultar BCCR desde un backend o función serverless.

## Archivos principales

- `index.html`: estructura de la aplicación.
- `styles.css`: diseño responsive y estilos del PDF preview.
- `app.js`: lógica de presupuestos, clientes, cálculos y PDF.
- `logo.png`: logo corporativo.
- `pdf-lib.min.js`: librería local para generar PDF.
