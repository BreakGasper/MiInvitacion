# Mi Invitación · Boda Carlos & Monse

Invitación digital de boda con confirmación por familia y panel privado para los novios.
HTML + CSS + JavaScript sin compilar; datos en Firebase Realtime Database y publicación en Firebase Hosting.

- Invitación: https://miinva-pgkvkj-d01c0.web.app/?p=ID_DE_LA_FAMILIA
- Panel: https://miinva-pgkvkj-d01c0.web.app/panel.html

## Qué hace

**Invitación (`index.html`)**: sobre animado con sello, música de fondo, cuenta regresiva, padres y padrinos,
itinerario, ceremonia y recepción con mapa, código de vestimenta, galería, mesa de regalos y confirmación de
asistencia. Cada familia tiene su enlace personal (`?p=ID`) con sus lugares y la lista de integrantes.

**Panel (`panel.html`)**, solo para los novios (teléfono + contraseña):

| Pestaña | Para qué |
|---|---|
| Familias | Enviar invitaciones por WhatsApp, ver respuestas, editar lugares e integrantes, Excel. |
| Mesas | Plano del salón con mesas y elementos que se arrastran, y acomodo de invitados por mesa. |
| Gastos | Proveedores, pagos a proveedores, abonos de padrinos, cotizaciones y reparto de presupuesto (cerveza, refresco…). |
| Calcular | Lista de compras contra el efectivo disponible; cotizaciones guardadas, unir, editar y recibo por WhatsApp. |

## Archivos

| Archivo | Qué es |
|---|---|
| `js/config.js` | **Todos los textos, fechas, lugares y fotos de la invitación.** |
| `js/app.js`, `js/fb.js` | Invitación y su conexión con Firebase. |
| `js/panel.js`, `js/mesas.js`, `js/gastos.js`, `js/calculadora.js` | Panel y cada una de sus pestañas. |
| `css/estilos.css`, `css/panel.css` | Estilos de la invitación y del panel. |
| `database.rules.json` | Reglas de seguridad: los invitados solo leen/escriben lo suyo; el resto es solo para administradores. |
| `publicar/` | Lo que se sube a Hosting (copia de los archivos de arriba + `img/` + `musica/`). |
| `herramientas/` | Scripts de apoyo (no se publican): servidor local, carga de familias/mesas/gastos y pantallas de prueba con datos falsos. |

## Verla en tu computadora

```bash
python herramientas/servidor.py
```

Abre http://localhost:5510/index.html?p=ID o http://localhost:5510/panel.html

Pantallas de prueba del panel (sin iniciar sesión, con datos falsos):
`herramientas/prueba-mesas.html`, `prueba-gastos.html`, `prueba-calc.html`.

## Publicar

1. Copia a `publicar/` los archivos que cambiaste (misma ruta).
2. Sube el número `?v=` en las etiquetas `<script>`/`<link>` que cambiaron, para que no se quede la versión vieja en caché.
3. Ejecuta:

```bash
firebase deploy --only hosting --project newagent-pgkvkj
```

Para las reglas de la base de datos: `firebase deploy --only database --project newagent-pgkvkj`
