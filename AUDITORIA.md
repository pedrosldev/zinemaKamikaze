# Auditoría técnica — ZinemaKamikaze

**Repositorio:** `pedrosldev/zinemaKamikaze` (público en GitHub)
**Commit auditado:** `1b60a8d` (`fix(db): import createConnection for hyperdrive`)
**Fecha:** 2026-11-05
**Alcance:** código fuente en `src/`, configuración (`astro.config.mjs`, `wrangler.toml`, `package.json`), migraciones, scripts de build/despliegue, historial de Git y artefactos de `dist/`.
**Método:** revisión estática, análisis de historial, comprobación de artefactos y de exposición de secretos. No se ejecutó build ni pentest contra producción (el dominio no respondió desde este entorno).

---

## 1. Veredicto

**No desplegar en su estado actual.** Hay fallos que rompen la funcionalidad principal (selección por token) y agujeros de seguridad explotables sin autenticación:

1. Los 3 endpoints que gestionan la selección de película llaman a `pool.getConnection()`, que **no existe** en el pool exportado → error 500 garantizado.
2. Todos los endpoints bajo `/api/` están exentos del middleware de autenticación → cualquiera puede generar tokens, reescribir críticas o cambiar el modo de selección.
3. La contraseña de admin tiene un valor por defecto conocido (`tu-password-segura`) y se gestiona de forma inconsistente entre build, runtime y cookie.
4. Hay XSS almacenado: `set:html` sobre el texto de la crítica + endpoint de edición sin autenticar.
5. `confirm-catalog-selection` hace `UPDATE ... WHERE film_id = ?`, lo que **borra todas las críticas anteriores de esa película**.

Nota positiva: el uso de SQL parametrizado es correcto en casi todo el código, no hay secretos de producción en el historial de Git y la separación de componentes/scripts es razonable para el tamaño del proyecto.

---

## 2. Hallazgos críticos (P0)

### P0-1. `pool.getConnection()` no existe: el flujo de tokens está roto

**Evidencia**

- `src/lib/db.ts:76-79` exporta un objeto con solo `query` y `execute`:
  ```ts
  export const pool = {
    query: (...args: any[]) => (getPool() as any).query(...args),
    execute: (...args: any[]) => (getPool() as any).query(...args),
  };
  ```
- El mock de Hyperdrive (`src/lib/db.ts:20-52`) tampoco implementa `getConnection`, `beginTransaction`, `commit` ni `rollback`.
- Sin embargo:
  - `src/pages/api/validate-and-select.ts:78` → `await pool.getConnection()`
  - `src/pages/api/confirm-selection.ts:26` → `await pool.getConnection()`
  - `src/pages/api/confirm-catalog-selection.ts:21` → `await pool.getConnection()`

**Impacto:** `TypeError: pool.getConnection is not a function` en el 100 % de las selecciones. El botón "VALIDAR CÓDIGO" y los modos `triple_choice` y `catalog` no pueden funcionar en ningún entorno (ni local ni Cloudflare), porque el wrapper exportado nunca reenvía `getConnection` al pool real.

**Solución:** exponer `getConnection` en el wrapper y, en Cloudflare, crear una conexión por petición con `createConnection` (Hyperdrive) y pasarla a las funciones que necesitan transacción. No simular transacciones con conexiones distintas por query.

---

### P0-2. `readFileSync` + `process.cwd()` en un endpoint de Cloudflare Workers

**Evidencia:** `src/pages/api/validate-and-select.ts:3,102-103`

```ts
import { readFileSync } from 'fs';
const titlesPath = join(process.cwd(), 'src', 'data', 'all_titles_with_id.json');
const titlesData = JSON.parse(readFileSync(titlesPath, 'utf-8'));
```

**Impacto:** en Cloudflare Workers no existe un sistema de archivos real; `src/` tampoco se despliega. Aunque se arregle P0-1, el endpoint seguirá fallando. Además se relee y parsea un JSON de **7,8 MB** en cada intento.

**Solución:** importar el JSON como módulo (`import titlesData from '../../data/all_titles_with_id.json'`) y cachearlo en memoria del isolate. Eliminar imports de `fs`/`path` del runtime SSR.

---

### P0-3. `/api/*` está completamente fuera del middleware de autenticación

**Evidencia:** `src/middleware.ts:37-39`

```ts
if (url.pathname.startsWith("/api/")) {
  return next(); // ← sale antes de cualquier comprobación
}
```

**Impacto:** los únicos endpoints con control propio son `set-selection-mode` (comprobación débil, ver P0-4) y los que validan token. Quedan **abiertos a Internet**:

| Endpoint | Acción | Debería requerir |
|---|---|---|
| `POST /api/generate-tokens` | Crear códigos de selección ilimitados | Admin |
| `POST /api/register-review` | Insertar críticas arbitrarias | Admin o token |
| `POST /api/update-review` | Reescribir cualquier crítica | Admin |
| `GET /api/update-review` | Listar críticas pendientes | Admin |
| `POST /api/update-expectation-mood` | Cambiar expectativas | Admin |
| `POST /api/set-selection-mode` | Cambiar modo global | Admin |

**Solución:** proteger `/api/admin-*` y los endpoints de escritura en el middleware (lista blanca explícita de endpoints públicos: login, comentarios, títulos, validación con token). Añadir comprobación de rol/autenticación **dentro de cada handler** como defensa en profundidad, no solo en middleware.

---

### P0-4. Autenticación de admin: contraseña por defecto, cookie con la contraseña y fuentes inconsistentes

**Evidencia**

- Fallback conocido repetido en 5 sitios:
  - `src/middleware.ts:6`
  - `src/pages/api/admin-login.ts:6`
  - `src/pages/api/set-selection-mode.ts:11`
  - `src/pages/admin/index.astro:12`
  - `src/pages/admin/login.astro:7`
  ```ts
  const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || "tu-password-segura";
  ```
- El login guarda **la propia contraseña** como valor de cookie (`src/pages/api/admin-login.ts:9-16`), con `secure: false`.
- El middleware lee el secreto de Cloudflare (`env.ADMIN_PASSWORD`, `src/middleware.ts:21-22`), pero el login y `set-selection-mode` usan `import.meta.env`, que se **inlinea en el build**.
- La contraseña de producción aparece embebida en el bundle: `dist/server/.dev.vars`, `dist/server/chunks/admin-login_*.mjs`, `dist/server/chunks/login_*.mjs`, etc.

**Impacto**

- Si el build se hizo sin `.env.production` (por ejemplo en CI), la contraseña efectiva es `tu-password-segura`, pública en el repositorio.
- Si se rota el secreto en Cloudflare, el login sigue aceptando la contraseña antigua inlineada (y `set-selection-mode` también), mientras el middleware compara con la nueva → o bypass o bucle de redirección.
- Cualquier XSS puede usar la sesión de admin para llamar a las APIs (la cookie es `httpOnly`, pero las peticiones same-origin van autenticadas).
- `dist/server/.dev.vars` contiene **todas** las credenciales de producción en texto plano (host, usuario, contraseña, `ADMIN_PASSWORD`, API key). El `post-build.js` publica `dist/` como output de Pages; si se sirve como assets (modo `_worker.js`), esos archivos podrían ser descargables. **Verificar en el despliegue real y eliminar `.dev.vars`/source maps del output.**
- Sin rate limiting en `/api/admin-login` → fuerza bruta trivial.

**Solución**

- Eliminar todos los fallbacks: si no hay secreto, fallar cerrado (503), no abrir con una clave conocida.
- Usar una única fuente (`Astro.locals.runtime.env` / `cloudflare:workers`) también en login y set-mode.
- No guardar la contraseña en la cookie: firmar un token de sesión (HMAC/JWT corto) o guardar un hash de sesión en servidor/KV, con `Secure`, `HttpOnly`, `SameSite=Strict`, `__Host-`.
- Añadir rate limit y comparación en tiempo constante (`crypto.timingSafeEqual`).
- Sacar `.dev.vars` de `dist/` en `post-build.js` y desactivar `upload_source_maps` o revisar su exposición.

---

### P0-5. XSS almacenado + edición de críticas sin autenticar

**Evidencia**

- `src/components/movies/MovieReviewCard.astro:84`:
  ```astro
  <Fragment set:html={review.review.substring(0, 300) + "..."} />
  ```
- `src/pages/api/update-review.ts:9-34` acepta `body.review` y lo guarda **sin autenticación ni saneamiento**.
- `src/pages/api/register-review.ts:9-60` también acepta HTML arbitrario sin token obligatorio.

**Impacto:** cualquier visitante puede hacer `POST /api/update-review` con `<img src=x onerror=...>` y ejecutar JavaScript en el navegador de todos los visitantes de `/movies/[film_id]` (incluido el admin). Es una cadena explotable sin credenciales.

**Solución:** renderizar la crítica como texto (interpolar `{review.review}`) o sanear con una allowlist (p. ej. `sanitize-html`/DOMPurify en servidor). Cerrar los endpoints de escritura (P0-3). Validar longitudes y tipos.

---

### P0-6. Pérdida de datos al re-seleccionar una película en modo catálogo

**Evidencia:** `src/pages/api/confirm-catalog-selection.ts:56-86`

```sql
UPDATE reviews
SET viewing_period = true, ..., review = NULL, vibe = NULL, ...
WHERE film_id = ?   -- ← afecta a TODAS las filas de esa película
```

y después borra **todos** los comentarios de expectativa y los de `reviewId` (solo una fila).

**Impacto:** si una película tiene varias críticas (la página `/movies/[id]` está diseñada para mostrarlas en timeline), seleccionarla de nuevo borra el texto, vibe, moods, YouTube y fecha de **todas** ellas. Pérdida irreversible de contenido.

**Solución:** decidir el modelo: o una fila por visionado (nunca borrar; insertar nueva) o una sola fila por película con historial aparte. Si se quiere "reiniciar", hacer `WHERE id = ?` y archivar la anterior, nunca `WHERE film_id = ?`.

---

### P0-7. Tokens de selección débiles y sin caducidad

**Evidencia:** `src/lib/db.ts:175-184`

```ts
const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
```

- `Math.random()` no es criptográficamente seguro y es predecible.
- No hay `expires_at`; un token activo lo está para siempre.
- `generate-tokens` es público (P0-3) → se pueden crear tokens ilimitados.
- `validate-tokens` escribe `used_by` con valor del cliente sin límite de longitud (`src/pages/api/validate-tokens.ts:30-33`).

**Solución:** `crypto.randomUUID()` o `crypto.getRandomValues` (32+ bytes), campo `expires_at` (p. ej. 7 días), límite de tokens activos, y generación solo para admin.

---

## 3. Hallazgos altos (P1)

### P1-1. `register-review` permite inserciones sin token y el botón "Y LA ELEGIDA ES..." duplica selecciones

- `src/pages/api/register-review.ts`: el token es opcional; sin token inserta igualmente.
- `src/scripts/tokenValidation.ts:446` declara `validatedToken = null` y nunca lo asigna; `:490-491` llama a `generateMovie(validatedToken)`.
- Resultado: tras una selección válida, el botón visible ejecuta un `fetch` de 7,8 MB y registra **otra** película sin consumir token. Ventana de 3 s antes del reload, pero reproducible y automatizable.

**Solución:** exigir token (o sesión admin) en `register-review`; eliminar `generateMovie`/`btnLeer` del flujo público; asignar `validatedToken` si se mantiene.

### P1-2. Conexión por consulta y transacciones inexistentes

- `src/lib/db.ts:20-52`: cada `query` abre y cierra una conexión TCP. Una página puede abrir 3-5 conexiones; con Hyperdrive se pierde el beneficio del pooling y se dispara la latencia.
- `pool.execute` se implementa con `query` (protocolo de texto), no con prepared statements.
- `beginTransaction`/`commit`/`rollback` no existen en el mock → aunque se añada `getConnection`, las transacciones no serían reales.

**Solución:** un `getConnection()` real por petición que devuelva la conexión y se libere en `finally`; usar esa conexión para toda la transacción; pool real por isolate si el runtime lo permite. Unificar `execute` con `execute`.

### P1-3. Secretos y credenciales en el repositorio/artefactos

- `.env` fue commiteado en `e8585a0` y el repo es **público**. Contenía `PUBLIC_TMDB_API_KEY` (244 caracteres), `DB_HOST`, `DB_USER` (`root`) y `DB_PASSWORD` vacío. No había contraseña de producción, pero **sí una API key y datos de infraestructura**. Rotar la key si sigue vigente.
- `test-connection.cjs` (commiteado) expone IP pública (`200.234.227.110`), usuario (`netlify_user`) y base de datos. Eliminar el archivo y restringir el acceso remoto.
- `dist/server/.dev.vars` contiene credenciales de producción y está dentro del directorio de publicación.
- `wrangler.toml` expone el ID de Hyperdrive (no es secreto, pero conviene moverlo a variable de entorno/CI).

**Solución:** rotar `PUBLIC_TMDB_API_KEY` y la contraseña de BD; borrar `test-connection.cjs`; añadir `dist/server/.dev.vars` y `*.map` a una limpieza de `post-build.js`; usar `wrangler secret put` para todo.

### P1-4. `security.checkOrigin: false` desactiva la protección CSRF nativa de Astro

`astro.config.mjs:76-78`. La cookie `SameSite=Strict` mitiga parte del riesgo, pero no lo elimina (subdominios, navegadores antiguos, peticiones same-site). Dejar el valor por defecto (`true`) y añadir CSRF token en formularios sensibles.

### P1-5. Sin 404, `robots.txt`, `sitemap.xml`, cabeceras de seguridad ni metadatos

- No existe `src/pages/404.astro` ni `public/404.html`; `movies/[film_id].astro:18-20` redirige a `/404`, que no existe como página.
- No hay `public/_headers` (CSP, HSTS, X-Frame-Options, Referrer-Policy) ni `_redirects`.
- `Layout.astro` fija `<title>ZinemaKamikaze</title>` y no usa el prop `title` que pasan las páginas; `lang="en"` en un sitio en español; sin `description`, canonical ni Open Graph.
- `reviews/index.astro` depende de una colección vacía (`src/content/reviews` no tiene archivos).

### P1-6. Carreras en el canje de tokens

`validate-tokens` actualiza `used_by` sin transacción; `register-review` comprueba `is_active` y luego inserta y desactiva en dos pasos. Dos peticiones simultáneas pueden pasar ambas la comprobación y consumir el mismo token dos veces. Usar `UPDATE ... WHERE token = ? AND is_active = true` y comprobar `affectedRows` (patrón ya presente en `claimToken`), dentro de una transacción.

---

## 4. Hallazgos medios (P2)

### P2-1. Rendimiento del catálogo

- `src/pages/catalog/search.astro:22-38` renderiza **18.266 tarjetas** en el HTML de cada request SSR. Respuesta de varios MB, CPU y memoria altas en Workers.
- `src/lib/catalogUtils.ts:21-39`: `getAllMovies()` aplana y **ordena 18k elementos en cada llamada**, y se invoca varias veces por request (search, movies, index, paginación).
- `src/pages/api/titles.json.ts` sirve el JSON de **7,8 MB** sin `Cache-Control` ni compresión explícita; se usa incluso para "comprobar conexión" con `HEAD` (`tokenValidation.ts:48`) y para el flujo antiguo de selección.
- `movies/[film_id].astro:12-14` también llama a `getAllMovies()` por request.
- 26 MB en `public/` sin optimizar.

**Solución:** memoizar el catálogo a nivel de módulo (una sola vez por isolate), paginar/buscar en cliente con un índice ligero (título, año, id, poster) en vez del JSON completo, cachear `titles.json` con `Cache-Control: public, max-age`, y eliminar el render de 18k tarjetas (cargar bajo demanda o filtrar en servidor).

### P2-2. HTML inválido y `<head>` duplicados

- `src/layouts/Layout.astro:15-16`: se cierra `</html>` **antes** de abrir `<body>`. El documento es inválido y el navegador lo corrige de forma impredecible.
- `src/components/Principal.astro:22-31`, `src/pages/vibe/[vibe].astro:27-37` y `AdminLayout` inyectan `<head>` dentro del slot (dentro del body), duplicando etiquetas.
- `AdminLayout` pasa `title` a un `<title>` dentro del body.

**Solución:** un único `<html><head>…</head><body>` en `Layout.astro`, con `<slot name="head">` para metadatos por página; eliminar `<head>` de componentes/páginas.

### P2-3. Rutas y enlaces rotos

- `generate-tokens.ts:10` devuelve `triggerUrl: ${origin}/trigger/${token}`, pero **no existe** `src/pages/trigger/`. Los enlaces generados dan 404.
- `movies/[film_id].astro` redirige a `/404` inexistente.
- `/test-catalog` es una página de depuración pública en producción.
- `reviews/index.astro` lista una colección de contenido vacía.

### P2-4. Migraciones incompletas y esquema no reproducible

- Solo existen `001_create_migrations_table.sql` y `002_add_app_settings.sql`.
- Las tablas `reviews`, `comments`, `expectation_comments` y `trigger_tokens` **no están versionadas**; se crearon a mano. No hay FKs, índices ni constraints (`film_id`, `vibe`, `token`) en el repo.
- `scripts/migrate.cjs` ejecuta el SQL pero no envuelve cada migración en transacción; cada archivo debe auto-registrarse en `schema_migrations` (frágil).
- `multipleStatements: true` está bien para migraciones locales, pero no debe usarse con SQL de usuario.

**Solución:** volcar el esquema real a una migración base (`003_baseline_schema.sql`), añadir índices (`reviews.film_id`, `reviews.vibe`, `comments.review_id`, `trigger_tokens.token UNIQUE`), FKs y transacción por migración.

### P2-5. Build y despliegue frágiles

- `astro.config.mjs:66-75` elige adaptador según `NODE_ENV === 'development'`. Un `pnpm build` sin `NODE_ENV` usa Cloudflare aunque se pretenda Netlify; y al revés. Dos adaptadores instalados a la vez (`@astrojs/netlify` y `@astrojs/cloudflare`) más `@astrojs/node` sin usar.
- `post-build.js` copia `dist/client` a la raíz, crea `_worker.js` y borra `.wrangler/deploy/config.json`: mezcla el modelo Pages (`_worker.js`) con el modelo Workers del adaptador v14 (`dist/server/wrangler.json` con `assets.directory=../client`). Es una fuente probable de despliegues inconsistentes y de exposición de `dist/server/*`.
- `compatibility_date = "2024-09-23"` está desactualizada (2026) y falta `observability`/`[vars]`.
- `"deploy": "rm -rf dist .astro && pnpm run build && pm2 restart zinemakamikaze"` no funciona en Windows y es herencia del despliegue con Node/PM2.
- `dist/` actual es del 1 de noviembre, anterior a los commits de Hyperdrive (3 de noviembre): el artefacto local está obsoleto y contiene secretos.
- `upload_source_maps: true` publica mapas de origen.

**Solución:** fijar un solo target (Cloudflare Workers o Pages) y un solo adaptador; mover el deploy a CI; eliminar `post-build.js` si se usa `wrangler deploy`; limpiar `dist/` antes de publicar y excluir `.dev.vars`, `*.map` y `wrangler.json`.

### P2-6. Ausencia total de calidad automatizada

- No hay CI (`.github` solo contiene una carpeta vacía `appmod/appcat`).
- No hay tests, linter ni formateador.
- No hay `astro check` (ni `@astrojs/check` instalado), aunque `tsconfig` es `strict`; el código tiene 42 usos de `any` y varios `Map` sin tipar.
- `README.md` es el boilerplate del starter, sin instrucciones de despliegue, variables ni migraciones.
- No hay `.nvmrc` ni `engines`/`packageManager` pese a usar `pnpm-lock.yaml`.
- `pnpm-workspace.yaml:4` contiene un placeholder inválido: `workerd: set this to true or false`.
- Dependencias muertas: `openai`, `@astrojs/node`, `dotenv` solo para scripts locales.
- `pnpm audit` no pudo ejecutarse porque el registry está configurado en HTTP (`ERR_PNPM_AUDIT_BAD_RESPONSE`); corregir la configuración y audit periódicamente.

### P2-7. Accesibilidad y UX

- Modales sin `role="dialog"`, `aria-modal`, foco atrapado ni retorno de foco (`CommentsModal`, `ExpectationModal`, `MovieSelector`).
- Botones con solo emoji como texto (`✕`, `🎬`) sin `aria-label`.
- Uso intensivo de `alert()`/`confirm()` y `onclick` en HTML.
- 29 `console.log` en código de producción (incluye tokens parciales y datos de depuración).
- Imágenes de pósters sin `width`/`height` ni `loading="lazy"` en listados largos.

---

## 5. Hallazgos bajos (P3)

- `src/pages/catalog/index.astro` hardcodea `totalMovies = 18266`, que puede divergir del JSON real.
- `admin/index.astro:14-15` consulta la BD **antes** de comprobar la sesión (línea 17); mover la comprobación arriba.
- `admin-logout.ts` borra cookies para dominios hardcodeados (`zinemakamikaze.com`, `www`, `.`); simplificar y usar el dominio actual.
- `getReviewById`/`getReviewsByFilmId` usan `SELECT *`; conviene seleccionar columnas.
- `reviews/[id].astro` convierte el parámetro con `Number()` sin validar `NaN`.
- `vibe/[vibe].astro` agrupa con `new Map()` sin tipos y hace N+1 lógico en memoria.
- `content.config.ts` declara una colección `review` que no se usa realmente (los datos vienen de MySQL).
- `.netlify/db` contiene un PostgreSQL local con estado de desarrollo (ignorado por Git, pero ocupa espacio y confunde).
- `worker-configuration.d.ts` (640 KB generado) está commiteado; aceptable, pero conviene regenerarlo en CI y no versionarlo.

---

## 6. Matriz de autenticación de endpoints

| Endpoint | Middleware | Verificación propia | Riesgo |
|---|---|---|---|
| `POST /api/admin-login` | exento | contraseña build-time + fallback | Alto (default + brute force) |
| `POST /api/admin-logout` | exento | — | Bajo |
| `POST /api/generate-tokens` | exento | **ninguna** | **Crítico** |
| `POST /api/register-review` | exento | token opcional | **Crítico** |
| `POST /api/update-review` | exento | **ninguna** | **Crítico** |
| `GET /api/update-review` | exento | **ninguna** | Alto (fuga de borradores) |
| `POST /api/update-expectation-mood` | exento | **ninguna** | Alto |
| `POST /api/set-selection-mode` | exento | contraseña build-time | Alto |
| `POST /api/validate-and-select` | exento | token | Medio (roto por P0-1/2) |
| `POST /api/confirm-selection` | exento | token | Medio (roto por P0-1) |
| `POST /api/confirm-catalog-selection` | exento | token | Medio (roto + P0-6) |
| `POST /api/validate-tokens` | exento | token | Medio |
| `POST /api/add-comment` | exento | longitudes | Medio (spam) |
| `POST /api/add-expectation-comment` | exento | longitudes | Medio (spam) |
| `GET /api/get-latest-movie` | exento | — | Bajo |
| `GET /api/titles.json` | exento | — | Bajo (7,8 MB) |

---

## 7. Plan de remediación sugerido

### Fase 1 — Bloqueantes (24-48 h)

1. Arreglar el pool: `getConnection()` real + transacciones + conexión por petición en Hyperdrive.
2. Quitar `readFileSync`/`process.cwd()` de `validate-and-select`; importar el JSON.
3. Cerrar `/api/*`: lista blanca de endpoints públicos + comprobación de admin en cada handler sensible.
4. Eliminar el fallback `tu-password-segura`; unificar la fuente del secreto; cookie de sesión firmada, `Secure`, sin la contraseña dentro.
5. Sanear o escapar el texto de las críticas; eliminar `set:html`.
6. Cambiar el `UPDATE ... WHERE film_id` por `WHERE id` o rediseñar el historial.
7. Tokens con CSPRNG, caducidad y generación solo admin.

### Fase 2 — Alto (1 semana)

8. Rotar `PUBLIC_TMDB_API_KEY`, contraseña de BD y secreto de admin; borrar `test-connection.cjs`; limpiar `.dev.vars`/source maps de `dist/`.
9. Corregir `Layout.astro`, títulos, `lang`, 404, `robots.txt`, sitemap y cabeceras de seguridad.
10. Exigir token en `register-review`; eliminar el botón/flujo `generateMovie`.
11. Reintroducir `checkOrigin: true` y CSRF tokens.
12. Migración baseline del esquema + índices + FKs.

### Fase 3 — Medio plazo

13. Memoizar catálogo, paginar búsqueda, cachear `titles.json`, optimizar imágenes.
14. Un solo adaptador y un pipeline de deploy reproducible en CI.
15. Añadir `astro check`, ESLint/Prettier, tests de endpoints críticos y un smoke test post-deploy.
16. Accesibilidad de modales y limpieza de `console.log`/`alert`.

---

## 8. Checklist rápido de verificación post-arreglo

- [ ] `POST /api/generate-tokens` sin cookie → 401.
- [ ] `POST /api/update-review` sin cookie → 401 y no modifica la BD.
- [ ] `POST /api/register-review` sin token → 401/403.
- [ ] Flujo completo `normal`, `triple_choice` y `catalog` con token real → 200 y una sola fila creada.
- [ ] Re-seleccionar una película con 2 críticas → las 2 siguen intactas.
- [ ] Crítica con `<img src=x onerror=alert(1)>` → se muestra como texto.
- [ ] `/server/.dev.vars` y `/server/chunks/*.mjs` → 404 en producción.
- [ ] Login con `tu-password-segura` → 401.
- [ ] Rotar `ADMIN_PASSWORD` en Cloudflare sin rebuild → el login usa el valor nuevo y el antiguo deja de funcionar.
- [ ] `/admin` sin cookie → 302 a login sin consultar la BD.
- [ ] `grep -r "tu-password-segura"` → 0 resultados.
- [ ] `pnpm build` limpio desde cero y `astro check` sin errores.
