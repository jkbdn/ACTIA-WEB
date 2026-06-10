# ACTIA WEB v2

Sitio web estático de ACTIA — construcción industrializada en madera.

## Estructura

```
index.html              Página principal
styles.css              Estilos globales
intro.js                Animación de intro
interactions.js         Scroll, contadores y micro-interacciones
mobile-nav.js           Navegación móvil
cookies.js              Banner de cookies
forjado-viewer.js       Visor 3D del panel de forjado (three.js)
tweaks-panel.jsx        Panel de ajustes de diseño (opcional, solo dev)
tweaks-app.jsx          Controles del panel de ajustes (opcional, solo dev)
proyectos/              Páginas de detalle de cada proyecto
assets/                 Imágenes y modelo 3D (forjado-panel.glb)
```

## Publicar con GitHub Pages

1. Crea un repositorio nuevo en GitHub y sube todos estos archivos a la raíz.
2. En el repositorio: **Settings → Pages**.
3. En *Source*, elige **Deploy from a branch**, rama `main`, carpeta `/ (root)` y guarda.
4. En 1–2 minutos la web estará en `https://<tu-usuario>.github.io/<nombre-repo>/`.

> No requiere build ni dependencias: es HTML/CSS/JS estático. Las librerías (three.js, React para el panel de ajustes) se cargan por CDN.

## Notas

- Todas las imágenes ya están en `assets/` — el sitio no depende de Framer para imágenes.
- **Vídeos**: son demasiado pesados para incluirlos aquí (30–42 MB cada uno). El HTML ya apunta a rutas locales con la URL de Framer como respaldo automático, así que la web funciona desde el primer momento. Para independencia total, descarga estos 3 archivos y súbelos a `assets/` con estos nombres exactos:
  - `assets/video-montaje.mp4` ← https://framerusercontent.com/assets/2TYxa4gFbwaBRVxdb93ArKvSR0.mp4
  - `assets/video-proceso.mp4` ← https://framerusercontent.com/assets/PZ68ioLjaeDhXstWlqnkCwS6o.mp4
  - `assets/video-lloret.mp4` ← https://framerusercontent.com/assets/7jMxuEvg4aHsWGSjP4slbA9ugHQ.mp4

  Una vez subidos, puedes borrar las líneas `<source src="https://framerusercontent...">` de los HTML si quieres eliminar el respaldo.
- El vídeo y póster del proyecto Mirador de Palau se cargan desde idealista.com (fuente externa original).
- `tweaks-panel.jsx` y `tweaks-app.jsx` son herramientas de diseño; se pueden eliminar junto con sus `<script>` al final de `index.html` para producción.
