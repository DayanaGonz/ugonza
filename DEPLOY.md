# Guía de Publicación

## GitHub Pages

Esta app no necesita instalación ni compilación. Es un sitio estático.

### Pasos

1. Crear un repositorio en GitHub.
2. Subir estos archivos a la raíz del repositorio:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `assets/`
   - `.nojekyll`
   - `README.md`
3. Entrar a `Settings > Pages`.
4. Seleccionar `Deploy from a branch`.
5. Elegir rama `main` y carpeta `/root`.
6. Guardar.

### URL final

GitHub mostrará una URL pública cuando termine la publicación.

Ejemplo:

```text
https://tu-usuario.github.io/ugonza-presupuestos/
```

## Recomendación para terceros

Si un tercero va a usar la app con datos reales, hay dos caminos:

### Uso simple

Publicar en GitHub Pages, Netlify, Vercel o Cloudflare Pages.

Ventaja: rápido y barato.

Limitación: los datos quedan en el navegador de cada usuario.

### Uso profesional compartido

Agregar:

- Login.
- Base de datos.
- Respaldo de presupuestos.
- Servicio seguro para consultar BCCR.
- Roles de usuario.

Ventaja: varios usuarios pueden compartir historial y trabajar con datos centralizados.

## Seguridad del token BCCR

No subas tokens reales al repositorio.

En esta versión, los campos de correo y token BCCR se guardan localmente en el navegador del usuario. Para producción, lo ideal es mover esa consulta a un backend.

