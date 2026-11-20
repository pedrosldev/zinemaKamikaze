# PENDIENTES

Ideas y mejoras acordadas. Las secciones marcadas como implementadas se conservan como
memoria de las decisiones, no como trabajo pendiente.

---

## 1. Taquilla pública: botón en lugar de input de token ✅

**Estado:** implementada y mergeada en `main` (PR #69).
**Principio:** no cambiar el mecanismo, solo hacerlo invisible. El token sigue existiendo
por dentro como pase de la ronda, pero el usuario ya no lo teclea ni el admin lo reparte.

### Cómo funciona

| Pieza | Archivo |
|---|---|
| Estado público de la ronda | `src/pages/api/selection-state.ts` (público, `Cache-Control: no-store`) |
| Abrir / cerrar desde admin | `src/pages/api/set-taquilla.ts` |
| Botón de la portada | `src/components/Taquilla.astro` + `src/scripts/taquilla.ts` |
| Panel de admin | `src/components/admin/TaquillaAdmin.astro` |
| Datos | `getOpenSelection()`, `closeOpenSelection()`, `createTriggerToken()` en `src/lib/db.ts` |

- **Taquilla abierta = existe un token usable.** No hay tabla ni migración nueva.
- Abrir taquilla crea el pase de la ronda y desactiva los anteriores: una ronda, un pase.
- Modo normal: el clic consume el pase y registra la película en la misma transacción.
- Modo triple elección: se abre el selector de siempre; el pase se consume al confirmar.
- Modo catálogo: guarda el pase en `sessionStorage` y redirige a `/catalog`.
- El panel se niega a abrir si hay una película pendiente de crítica, para que la ronda
  no quede abierta en silencio hasta que se publique.

### Decisiones abiertas

| Tema | Estado |
|---|---|
| **Triple elección sin reserva** | Dos personas pueden abrir el selector a la vez; gana la primera que confirma, no la primera que pulsa. Para eso hace falta `reserved_until` y una migración pequeña |
| **Token visible en el `GET`** | Sigue viajando al navegador, igual que cuando se publicaba en redes. Su exposición no empeora |
| **Firma del usuario** | Se mantiene el campo opcional, colocado debajo del botón para no frenar la carrera |
| **Reapertura** | Manual desde `/admin` (no automática al publicar la crítica) |
| **Restos del flujo antiguo** | `TokenInput.astro` está sin usar y `/api/generate-tokens` no lo llama nadie. Se pueden borrar cuando no molesten |

### Qué no hacer

- **No inyectar el token en el HTML de la portada.** Se pide en el momento del clic.

---

## 2. Otros pendientes

| Tema | Notas |
|---|---|
| Rate limiting en `/api/admin-login` | Riesgo aceptado y documentado en `AUDITORIA.md` |
| `ADMIN_PASSWORD` de 12 caracteres | Decisión del usuario, no cambiar |
| `astro check` en CI | No está instalado (`@astrojs/check`, `typescript`) |
| Borrar deployments antiguos de Pages | Siguen accesibles en su URL y ejecutan el código previo al fix de CPU |
| `noindex` en previews de Pages | Evitar que los previews se indexen (condicionar a `CF_PAGES_BRANCH`) |
| `wrangler` sin declarar en `package.json` | Entra como peer de `@astrojs/cloudflare`; la versión flota con el lockfile |
| Doble pipeline de deploy | Integración Git + `wrangler pages deploy` conviven |

## 3. Descartado / aparcado

- **Índice compacto del catálogo (opción C).** El arranque en frío de `/movies` (~236-410 ms)
  resultó no ser la causa de los 1102; el `sort` síncrono lo era. No hace falta mientras no
  vuelvan los avisos de CPU.
