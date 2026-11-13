# PENDIENTES

Ideas y mejoras acordadas que **no están implementadas**. Esto no es un roadmap con fechas:
es memoria para no perder el trabajo de diseño que ya está pensado.

---

## 1. Taquilla pública: botón en lugar de input de token

**Estado:** idea validada, diseño técnico cerrado. Sin implementar.
**Rama propuesta:** `feature/taquilla-publica`, creada desde `main`.

### La idea

Hoy el derecho a elegir se ejerce escribiendo un token que se publica en redes: el primero
que lo pega, elige. Se quiere sustituir por un botón visible que hace exactamente lo mismo
sin que el usuario escriba nada: se abre la taquilla, el primero que pulsa elige, y la
taquilla se cierra hasta la siguiente ronda.

### El principio

**No cambiar el mecanismo, solo hacerlo invisible.** El token deja de ser algo que el
usuario teclea y pasa a ser el pase interno de la ronda. La transacción atómica, la tabla
`trigger_tokens`, la caducidad y `used_by` se quedan como están.

### Por qué no hace falta migración

La condición de token usable ya existe en `src/lib/db.ts`:

```sql
TOKEN_USABLE_SQL = "is_active = true AND (expires_at IS NULL OR expires_at > NOW())"
```

Por tanto:

> **Taquilla abierta = existe al menos un token usable.**

No hay tabla nueva, ni columna nueva, ni migración.

### Cambios previstos

| Pieza | Cambio |
|---|---|
| `GET /api/selection-state` | **Nuevo**, ~20 líneas. Devuelve si hay token usable y desde cuándo. Sin exponer el token |
| Portada (SSR) | Una consulta `COUNT(*)` para renderizar el botón en su estado correcto |
| Botón | Nuevo componente con estados: abierta / cerrada / llegaste tarde |
| Clic | Pide el token al endpoint y lo envía a `POST /api/validate-and-select`, que ya existe |
| Admin | «Abrir taquilla» = generar un token; «cerrar» = desactivar los activos |

### Lo que NO cambia

- La transacción de `src/pages/api/validate-and-select.ts`.
- El `UPDATE ... WHERE is_active = true` con comprobación de `affectedRows`.
- La exclusión de películas ya pendientes.
- La inserción de la review y `viewing_period = true`.
- La caducidad de tokens y el campo `used_by`.

### Flujo

```
1. Admin pulsa «Abrir taquilla»
   → se genera un token usable (= ronda abierta)

2. En la portada aparece «LA TAQUILLA ESTÁ ABIERTA»

3. Alguien pulsa
   → GET /api/selection-state        (token fresco, cache: no-store)
   → POST /api/validate-and-select   (endpoint existente)
   → token consumido + review insertada

4. El resto ve «ENTRADA EMITIDA»
   → hasta la siguiente ronda
```

### Atomicidad

Ya está resuelta por el mecanismo actual. Si dos personas llegan a la vez, ambas obtienen
el token, ambas lo envían, y el `UPDATE` atómico deja pasar a una. La otra recibe 403, que
la interfaz traduce a «llegaste tarde». **No hace falta código nuevo para la carrera.**

### Condición de apertura del botón

```ts
const taquillaAbierta = !isViewingPeriod && hayTokenUsable;
```

- Hay película en espera → cerrada, aunque queden tokens.
- No hay película y hay token → abierta.
- Ni una cosa ni otra → «cerrada hasta el próximo sorteo».

### Bordes conocidos y decisiones abiertas

| Tema | Estado |
|---|---|
| **Varios tokens activos** | Ambigüedad de ronda. Al abrir taquilla hay que desactivar los anteriores |
| **`triple_choice`** | No encaja: el token no se consume al validar, así que dos personas podrían tener las mismas tres opciones. Requiere reserva con caducidad. Con `normal` funciona directo |
| **Token visible en el `GET`** | Exposición idéntica a la actual (hoy está publicado en redes). Si molesta, un endpoint que haga todo en servidor y no devuelva el token |
| **Bots** | No empeora respecto al token público. Turnstile opcional si algún día hace falta |
| **Abandono** | No aplica en modo `normal`: el clic consume y registra en la misma transacción |
| **Firma del usuario** | Decidir si se mantiene el campo «¿Quieres firmar tu elección?» |
| **Reapertura** | Decidir: manual desde `/admin` o automática al publicar la crítica anterior |
| **¿Retirar tokens?** | Recomendado mantenerlos como modo alternativo (`selection_mode`) durante una temporada |

### Qué no hacer

- **No inyectar el token en el HTML de la portada.** Quedaría en el código fuente, cacheado
  y expuesto a bots. Hay que pedirlo en el momento del clic.
- **No mezclar este cambio con la rama de estilos.** Un fallo de selección y un fallo visual
  son indistinguibles si van juntos.

### Pruebas mínimas

1. Abrir taquilla en `/admin`.
2. Pulsar desde dos navegadores a la vez.
3. Verificar: una selección creada, un 403, y que la portada muestra la película.
4. Dejar caducar el token y comprobar que la taquilla vuelve a «cerrada».

### Archivos relevantes

- `src/pages/api/validate-and-select.ts` — transacción de selección (no se toca)
- `src/scripts/tokenValidation.ts` — flujo actual de token (se sustituye la entrada)
- `src/components/TokenInput.astro` — input a retirar de la portada
- `src/lib/db.ts` — `TOKEN_USABLE_SQL`, `createTriggerToken()`
- `src/pages/admin/index.astro` — gestión de tokens → abrir/cerrar taquilla
- `migrations/002_add_app_settings.sql`, `migrations/003_add_token_expiry.sql`

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
