# Planificación: Sistema de 3 Opciones de Película

## Contexto Actual
Actualmente el flujo es:
1. Usuario introduce token
2. Sistema valida token
3. **Sistema selecciona automáticamente 1 película aleatoria**
4. Se crea review en BD y se marca token como usado

## Propuesta: Sistema Dual con Control desde Admin

**IMPORTANTE**: NO se reemplaza el sistema actual. Se mantienen AMBOS sistemas:
- **Sistema Normal (Default)**: Asignación aleatoria directa (como funciona ahora)
- **Sistema Especial (Ocasional)**: Usuario elige entre 3 opciones

**Control**: El ADMIN decide qué sistema se activa para cada token o periodo.
**Uso**: El modo "3 opciones" será un evento extraordinario ocasional.

---

## Flujo Propuesto

### 1. Usuario Introduce Token
- Input de token
- Input de nombre (opcional)
- Botón "VALIDAR CÓDIGO"

### 2. Sistema Valida Token y Genera 3 Opciones
- Valida que el token sea correcto y esté activo
- **Genera 3 películas aleatorias**
- **NO marca el token como usado todavía**
- **NO crea review todavía**
- Guarda temporalmente las 3 opciones (en sesión o caché)
- Muestra las 3 opciones al usuario

### 3. Usuario Selecciona una de las 3
- Ve posters, títulos y años de las 3 películas
- Hace click en la que prefiere
- Confirma su selección

### 4. Sistema Confirma la Selección
- Crea la review con la película elegida
- Marca el token como usado
- Redirige a la película seleccionada

---

## Arquitectura Propuesta

### Opción A: Estado en Frontend (Recomendada)

**Ventaja**: Más simple, sin estado en servidor
**Desventaja**: Posible (pero improbable) manipulación del cliente

#### Flujo:
```
1. POST /api/validate-token-and-generate-options
   ├─ Input: { token, selected_by }
   ├─ Valida token (sin marcarlo como usado)
   ├─ Genera 3 películas aleatorias
   └─ Output: { valid: true, options: [movie1, movie2, movie3], token }

2. Usuario ve las 3 opciones en el frontend

3. POST /api/confirm-movie-selection
   ├─ Input: { token, selected_by, chosen_film_id }
   ├─ Valida token (por segunda vez, seguridad)
   ├─ Crea review con la película elegida
   ├─ Marca token como usado
   └─ Output: { success: true, movie: {...} }
```

#### Archivos a modificar/crear:

**Nuevo:**
- `src/pages/api/validate-token-and-generate-options.ts`
- `src/pages/api/confirm-movie-selection.ts`
- `src/components/MovieSelector.astro` (modal o sección)

**Modificar:**
- `src/components/Principal.astro` (lógica de validación)
- Estilos para mostrar las 3 opciones

---

### Opción B: Estado en Servidor (Más Robusta)

**Ventaja**: Más segura, evita manipulación
**Desventaja**: Requiere sesiones o tabla temporal en BD

#### Flujo:
```
1. POST /api/validate-token-and-generate-options
   ├─ Input: { token, selected_by }
   ├─ Valida token
   ├─ Genera 3 películas aleatorias
   ├─ Guarda en tabla `token_pending_selections`:
   │  - token
   │  - option_1_id
   │  - option_2_id
   │  - option_3_id
   │  - expires_at (timestamp + 5 minutos)
   └─ Output: { valid: true, options: [movie1, movie2, movie3] }

2. Usuario ve las 3 opciones

3. POST /api/confirm-movie-selection
   ├─ Input: { token, chosen_film_id }
   ├─ Busca en `token_pending_selections`
   ├─ Valida que chosen_film_id esté entre las 3 opciones
   ├─ Valida que no haya expirado
   ├─ Crea review
   ├─ Marca token como usado
   ├─ Elimina entrada de `token_pending_selections`
   └─ Output: { success: true, movie: {...} }
```

#### Nueva tabla necesaria:
```sql
CREATE TABLE token_pending_selections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(255) NOT NULL,
  option_1_id INT NOT NULL,
  option_2_id INT NOT NULL,
  option_3_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  UNIQUE KEY (token)
);
```

---

## Comparación de Opciones

| Aspecto | Opción A (Frontend) | Opción B (Servidor) |
|---------|---------------------|---------------------|
| Complejidad | Baja | Media |
| Seguridad | Media | Alta |
| Escalabilidad | Alta | Media |
| Migración BD | No necesaria | Nueva tabla |
| Mantenimiento | Fácil | Medio |
| Expiración | No controlada | Sí (5 min) |
| Posible fraude | Bajo riesgo* | Ninguno |

*Bajo riesgo porque el usuario igual necesita un token válido. En el peor caso, podría enviar un `film_id` de una película no generada, pero es detectarble y bloqueável fácilmente.

---

## Recomendación: **Opción A** (Estado en Frontend)

**Razones:**
1. Más simple de implementar
2. No requiere cambios en BD
3. El riesgo de manipulación es mínimo (token ya es la validación clave)
4. Mejor experiencia de usuario (sin límite de tiempo)
5. Menos carga en servidor

**Seguridad adicional (opcional):**
- Firmar las 3 opciones con un hash en el servidor
- Validar el hash al confirmar selección
- Así se evita que el usuario "invente" un film_id

---

## Diseño UI/UX

### Pantalla de Selección

```
┌───────────────────────────────────────────────────┐
│        ¡TOKEN VÁLIDO! ELIGE TU PELÍCULA          │
├───────────────────────────────────────────────────┤
│                                                   │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐      │
│   │ POSTER  │   │ POSTER  │   │ POSTER  │      │
│   │         │   │         │   │         │      │
│   │  IMG 1  │   │  IMG 2  │   │  IMG 3  │      │
│   │         │   │         │   │         │      │
│   └─────────┘   └─────────┘   └─────────┘      │
│                                                   │
│   Título 1      Título 2      Título 3          │
│   (1972)        (1985)        (1998)            │
│                                                   │
│   [ELEGIR]      [ELEGIR]      [ELEGIR]          │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Variantes de Diseño:

#### 1. **Modal Centrado** (Recomendado)
- Aparece sobre la pantalla principal
- Background blur
- Focus en las 3 opciones
- Botones grandes "ELEGIR ESTA"

#### 2. **Sección Expandible**
- Se expande desde el input del token
- Animación suave
- Grid de 3 columnas (desktop) o carrusel (móvil)

#### 3. **Página Dedicada**
- Redirect a `/select-movie?token=xxx`
- Más espacio para mostrar info
- Permite agregar sinopsis

---

## Implementación Detallada (Opción A)

### 1. `src/pages/api/validate-token-and-generate-options.ts`

```typescript
import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { token, selected_by } = body;

  if (!token) {
    return new Response(
      JSON.stringify({ valid: false, message: 'Token requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 1. Validar token (sin marcar como usado)
    const [rows]: any = await pool.query(
      'SELECT * FROM trigger_tokens WHERE token = ? AND is_active = true',
      [token]
    );

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'Token inválido o ya utilizado'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Guardar el selected_by (pero NO marcar como usado)
    await pool.execute(
      'UPDATE trigger_tokens SET used_by = ? WHERE token = ?',
      [selected_by || 'Anónimo', token]
    );

    // 3. Leer todas las películas
    const titlesPath = join(process.cwd(), 'src', 'data', 'all_titles_with_id.json');
    const titlesData = JSON.parse(readFileSync(titlesPath, 'utf-8'));

    if (!Array.isArray(titlesData) || titlesData.length === 0) {
      return new Response(
        JSON.stringify({ valid: false, message: 'Error al cargar películas' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Generar 3 películas aleatorias únicas
    const options = [];
    const usedIndices = new Set();

    while (options.length < 3) {
      const randomIndex = Math.floor(Math.random() * titlesData.length);
      
      // Evitar duplicados
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        
        const pelicula = titlesData[randomIndex];
        const filmIndex = Math.floor(Math.random() * pelicula.films.length);
        const selectedFilm = pelicula.films[filmIndex];

        options.push({
          film_id: selectedFilm.id,
          title: selectedFilm.title,
          year: selectedFilm.year || 'Unknown',
          poster: selectedFilm.poster_path || '',
          overview: selectedFilm.overview || ''
        });
      }
    }

    // 5. Devolver las 3 opciones
    return new Response(
      JSON.stringify({
        valid: true,
        message: 'Elige una película',
        options: options
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en validate-token-and-generate-options:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        message: 'Error al generar opciones' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

### 2. `src/pages/api/confirm-movie-selection.ts`

```typescript
import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { token, chosen_film_id, selected_by } = body;

  if (!token || !chosen_film_id) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Token y película requeridos' 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. Re-validar token (doble verificación)
    const [tokenRows]: any = await connection.query(
      'SELECT * FROM trigger_tokens WHERE token = ? AND is_active = true',
      [token]
    );

    if (tokenRows.length === 0) {
      await connection.rollback();
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Token inválido o ya utilizado'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar la película elegida en el JSON
    const titlesPath = join(process.cwd(), 'src', 'data', 'all_titles_with_id.json');
    const titlesData = JSON.parse(readFileSync(titlesPath, 'utf-8'));

    let chosenMovie = null;
    for (const pelicula of titlesData) {
      for (const film of pelicula.films) {
        if (film.id === chosen_film_id) {
          chosenMovie = {
            film_id: film.id,
            title: film.title,
            year: film.year || 'Unknown',
            poster: film.poster_path || ''
          };
          break;
        }
      }
      if (chosenMovie) break;
    }

    if (!chosenMovie) {
      await connection.rollback();
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Película no encontrada' 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Crear la review
    const watchedDate = new Date().toISOString().split('T')[0];
    
    await connection.execute(
      `INSERT INTO reviews 
       (film_id, title, year, review, vibe, poster_url, viewing_period, 
        expectation_mood, selected_by, youtube_id, watched_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chosenMovie.film_id,
        chosenMovie.title,
        chosenMovie.year,
        null,
        null,
        chosenMovie.poster,
        true,
        null,
        selected_by || 'Anónimo',
        null,
        watchedDate
      ]
    );

    // 4. Marcar token como usado
    await connection.execute(
      'UPDATE trigger_tokens SET is_active = false WHERE token = ?',
      [token]
    );

    await connection.commit();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Película seleccionada exitosamente',
        movie: chosenMovie
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    await connection.rollback();
    console.error('Error en confirm-movie-selection:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error al confirmar selección' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    connection.release();
  }
};
```

---

### 3. Modificaciones en `src/components/Principal.astro`

#### HTML - Agregar sección de opciones:

```astro
<!-- Después del input del token, agregar: -->
<div id="movieOptions" class="movie-options hidden">
  <h3>¡ELIGE TU PELÍCULA!</h3>
  <div class="options-grid">
    <!-- Se llenarán dinámicamente con JavaScript -->
  </div>
</div>
```

#### JavaScript - Nueva lógica:

```javascript
// Variable global para almacenar opciones
let currentOptions = null;

// Función modificada de validación
async function validateToken(token) {
  try {
    validateTokenBtn.disabled = true;
    validateTokenBtn.textContent = "VERIFICANDO...";

    const hasGoodConnection = await checkConnection();
    if (!hasGoodConnection) {
      // ... (mismo código de error de conexión)
      return;
    }

    validateTokenBtn.textContent = "GENERANDO OPCIONES...";

    const selectedByInput = document.getElementById("selectedByInput");
    const selectedBy = selectedByInput?.value.trim() || "Anónimo";

    // NUEVO: Llamar al endpoint de opciones
    const response = await fetch("/api/validate-token-and-generate-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        token: token.trim(),
        selected_by: selectedBy 
      }),
    });

    const data = await response.json();

    if (data.valid && data.options) {
      // Guardar opciones y mostrarlas
      currentOptions = data.options;
      showMovieOptions(data.options, token, selectedBy);
      
      // Ocultar input de token
      tokenContainer.style.display = 'none';
    } else {
      tokenMessage.textContent = data.message || "Token inválido";
      tokenMessage.className = "token-message token-error";
    }

  } catch (error) {
    console.error("Error:", error);
    tokenMessage.textContent = "Error de conexión";
    tokenMessage.className = "token-message token-error";
  } finally {
    validateTokenBtn.disabled = false;
    validateTokenBtn.textContent = "VALIDAR CÓDIGO";
  }
}

// Nueva función para mostrar las opciones
function showMovieOptions(options, token, selectedBy) {
  const optionsContainer = document.getElementById("movieOptions");
  const optionsGrid = optionsContainer.querySelector(".options-grid");
  
  // Limpiar grid
  optionsGrid.innerHTML = "";
  
  // Crear card para cada opción
  options.forEach((movie, index) => {
    const card = document.createElement("div");
    card.className = "movie-option-card";
    card.innerHTML = `
      <img 
        src="https://image.tmdb.org/t/p/w500${movie.poster}" 
        alt="${movie.title}"
        loading="lazy"
      />
      <h4>${movie.title}</h4>
      <p class="year">${movie.year}</p>
      <button class="choose-btn" data-film-id="${movie.film_id}">
        ELEGIR ESTA
      </button>
    `;
    
    optionsGrid.appendChild(card);
  });
  
  // Mostrar contenedor
  optionsContainer.classList.remove("hidden");
  
  // Event listeners para los botones
  const chooseButtons = optionsGrid.querySelectorAll(".choose-btn");
  chooseButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const filmId = parseInt(btn.dataset.filmId);
      confirmMovieSelection(token, filmId, selectedBy);
    });
  });
}

// Nueva función para confirmar selección
async function confirmMovieSelection(token, filmId, selectedBy) {
  try {
    const response = await fetch("/api/confirm-movie-selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        token: token,
        chosen_film_id: filmId,
        selected_by: selectedBy
      }),
    });

    const data = await response.json();

    if (data.success && data.movie) {
      // Redirigir a la película
      window.location.href = `/movies/${data.movie.film_id}`;
    } else {
      alert(data.message || "Error al confirmar selección");
    }

  } catch (error) {
    console.error("Error:", error);
    alert("Error de conexión al confirmar");
  }
}
```

---

### 4. Estilos CSS

```css
/* Contenedor de opciones */
.movie-options {
  margin-top: 2rem;
  text-align: center;
}

.movie-options.hidden {
  display: none;
}

.movie-options h3 {
  font-family: 'Sigmar', cursive;
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #ff6b35;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

/* Grid de opciones */
.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

/* Card de película */
.movie-option-card {
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid #ff6b35;
  border-radius: 10px;
  padding: 1rem;
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
}

.movie-option-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(255, 107, 53, 0.3);
}

.movie-option-card img {
  width: 100%;
  height: 350px;
  object-fit: cover;
  border-radius: 5px;
  margin-bottom: 1rem;
}

.movie-option-card h4 {
  font-size: 1.2rem;
  margin: 0.5rem 0;
  color: white;
}

.movie-option-card .year {
  color: #ccc;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

/* Botón de elegir */
.choose-btn {
  background: linear-gradient(135deg, #ff6b35 0%, #ff4500 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: bold;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;
}

.choose-btn:hover {
  background: linear-gradient(135deg, #ff4500 0%, #ff6b35 100%);
  transform: scale(1.05);
}

.choose-btn:active {
  transform: scale(0.95);
}

/* Responsive */
@media (max-width: 768px) {
  .options-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .movie-option-card img {
    height: 400px;
  }
}
```

---

## Mejoras Opcionales

### 1. **Añadir Sinopsis**
Mostrar un resumen breve de cada película al hacer hover o expandir.

### 2. **Botón "No me gusta ninguna, dame otras 3"**
Permite al usuario regenerar opciones (máximo 2-3 veces).

### 3. **Animaciones**
- Entrada de las cards con stagger
- Efecto flip para revelar el poster
- Confetti al seleccionar

### 4. **Guardar las opciones descartadas**
Crear una tabla `token_rejected_options` para analítica:
- Qué películas se rechazan más
- Patrones de elección

### 5. **Timer Visual**
Si implementas la Opción B con expiración, mostrar cuenta regresiva.

### 6. **Modo Comparación**
Vista lado a lado para comparar las 3 películas.

---

## Migración desde Sistema Actual

### Paso 1: Mantener Compatibilidad
- Crear ambos endpoints (nuevo y viejo)
- Añadir flag en BD para habilitar el nuevo sistema por token

### Paso 2: Testing
- Probar con tokens de prueba
- Verificar que no se pierdan tokens por errores

### Paso 3: Deploy Gradual
- Activar para un % de usuarios
- Monitorizar errores
- Rollback fácil si hay problemas

### Paso 4: Migración Completa
- Deprecar endpoint viejo
- Documentar nuevo flujo

---

## Consideraciones Importantes

### Seguridad
✅ Token se valida dos veces (generación y confirmación)
✅ Film_id se verifica contra el JSON completo
⚠️ Sin expiración en Opción A (considerar timeout en frontend)

### UX
✅ Usuario tiene control sobre su película
✅ Reduce frustración de "no me gustó la aleatoria"
⚠️ Añade un paso extra (puede cansar en móvil)

### Rendimiento
✅ Solo 3 películas se procesan (muy ligero)
✅ Imágenes lazy load
⚠️ Si muchos usuarios validan a la vez, carga en BD igual que antes

### Analítica
📊 Puedes trackear:
- Qué posición se elige más (1ª, 2ª, 3ª)
- Qué películas se rechazan
- Tiempo hasta decidir
- Patrones por tipo de usuario

---

## Timeline de Implementación

### Fase 1: MVP (4-6 horas)
- ✅ Crear endpoints
- ✅ Modificar Principal.astro
- ✅ Estilos básicos
- ✅ Testing básico

### Fase 2: Pulido (2-3 horas)
- ✅ Animaciones
- ✅ Responsive perfecto
- ✅ Loading states
- ✅ Error handling robusto

### Fase 3: Mejoras (Opcional, 3-5 horas)
- ⭐ Sinopsis expandible
- ⭐ Botón "Otras 3 opciones"
- ⭐ Analítica de selecciones
- ⭐ A/B testing vs sistema viejo

---

## Sistema de Control desde Admin (IMPLEMENTACIÓN REAL)

### Opción 1: Flag por Token (Recomendado para uso ocasional)

Añadir columna en la tabla `trigger_tokens`:

```sql
ALTER TABLE trigger_tokens 
ADD COLUMN selection_mode ENUM('random', 'choose_from_3') DEFAULT 'random';
```

**Flujo**:
1. Admin genera tokens en `/admin`
2. Al generar, puede marcar algunos tokens como "especiales" (modo `choose_from_3`)
3. Token normal → asignación aleatoria directa (actual)
4. Token especial → usuario ve 3 opciones

**Ventajas**:
- Control granular por token
- Puedes hacer tokens "premium" o de evento
- Fácil A/B testing
- No afecta tokens ya generados

---

### Opción 2: Flag Global Temporal

Crear tabla de configuración:

```sql
CREATE TABLE system_config (
  config_key VARCHAR(50) PRIMARY KEY,
  config_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO system_config (config_key, config_value) 
VALUES ('selection_mode', 'random');
```

**Flujo**:
1. Admin activa modo "3 opciones" desde panel admin
2. TODOS los tokens validados mientras está activo usan ese modo
3. Admin desactiva cuando quiere volver al modo normal

**Ventajas**:
- Toggle rápido para eventos
- Afecta a todos los usuarios simultáneamente
- Perfecto para "días especiales"

---

### Opción 3: Híbrido (Mejor de ambos mundos)

Combinar ambas opciones:
1. Flag global para eventos especiales
2. Flag por token para casos individuales
3. Prioridad: `token.selection_mode` > `global.selection_mode`

**Ventajas**:
- Máxima flexibilidad
- Eventos globales + tokens VIP
- Control total

---

## Modificaciones Necesarias

### 1. Migración BD (Opción 1 - Recomendada)

```sql
-- add_selection_mode_column.sql
ALTER TABLE trigger_tokens 
ADD COLUMN selection_mode ENUM('random', 'choose_from_3') 
DEFAULT 'random'
AFTER used_by;
```

### 2. Panel Admin: Generación de Tokens

Modificar `/admin/index.astro` para incluir opción:

```html
<form id="generateTokensForm">
  <label>
    Cantidad de tokens:
    <input type="number" name="quantity" value="10" />
  </label>
  
  <!-- NUEVO -->
  <label>
    Modo de selección:
    <select name="selectionMode">
      <option value="random">Normal (Aleatorio)</option>
      <option value="choose_from_3">Especial (Elegir entre 3)</option>
    </select>
  </label>
  
  <button type="submit">Generar Tokens</button>
</form>
```

### 3. Endpoint de Validación Inteligente

Modificar el endpoint para detectar el modo:

```typescript
// src/pages/api/validate-token-smart.ts (nuevo endpoint unificado)

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { token, selected_by } = body;

  // Validar token
  const [rows]: any = await pool.query(
    'SELECT * FROM trigger_tokens WHERE token = ? AND is_active = true',
    [token]
  );

  if (rows.length === 0) {
    return new Response(
      JSON.stringify({ valid: false, message: 'Token inválido' }),
      { status: 403 }
    );
  }

  const tokenData = rows[0];
  const selectionMode = tokenData.selection_mode || 'random';

  // DECISIÓN: ¿Qué modo usar?
  if (selectionMode === 'choose_from_3') {
    // Generar 3 opciones (código de validate-token-and-generate-options)
    const options = generateThreeRandomMovies();
    
    return new Response(
      JSON.stringify({
        valid: true,
        mode: 'choose_from_3',
        options: options
      }),
      { status: 200 }
    );
  } else {
    // Modo normal: asignar directamente (código actual)
    const movie = selectRandomMovie();
    await createReview(movie, token, selected_by);
    
    return new Response(
      JSON.stringify({
        valid: true,
        mode: 'random',
        movie: movie
      }),
      { status: 200 }
    );
  }
};
```

### 4. Frontend Adaptativo

Modificar `Principal.astro` para manejar ambas respuestas:

```javascript
async function validateToken(token) {
  // ... verificación de conexión ...

  const response = await fetch("/api/validate-token-smart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, selected_by }),
  });

  const data = await response.json();

  if (!data.valid) {
    showError(data.message);
    return;
  }

  // DECISIÓN BASADA EN RESPUESTA DEL SERVIDOR
  if (data.mode === 'choose_from_3') {
    // Mostrar modal de 3 opciones
    showMovieOptions(data.options, token, selectedBy);
  } else if (data.mode === 'random') {
    // Redirect directo (comportamiento actual)
    window.location.href = `/movies/${data.movie.film_id}`;
  }
}
```

---

## UI del Panel Admin

### Visualización de Tokens Generados

```
┌─────────────────────────────────────────────────────────┐
│  TOKENS GENERADOS                                       │
├─────────────────────────────────────────────────────────┤
│  Token            | Modo              | Estado | Usado  │
│ ──────────────────┼───────────────────┼────────┼─────── │
│  ABC123          | 🎲 Aleatorio      | ✅     | Pedro  │
│  XYZ789          | 🎯 3 Opciones     | ⏳     | -      │
│  DEF456          | 🎲 Aleatorio      | ❌     | Ana    │
└─────────────────────────────────────────────────────────┘
```

### Toggle Global (Opción 2)

```
┌──────────────────────────────────────────┐
│  CONFIGURACIÓN GLOBAL                    │
├──────────────────────────────────────────┤
│                                          │
│  Modo actual: 🎲 Aleatorio              │
│                                          │
│  [Cambiar a Modo "3 Opciones"]          │
│                                          │
│  ⚠️ Afectará a TODOS los nuevos tokens  │
│                                          │
└──────────────────────────────────────────┘
```

---

## Resumen

**Recomendación Final**: Implementar Opción A (estado en frontend) con:
- Modal centrado para las 3 opciones
- Lazy loading de imágenes
- Animaciones suaves
- Posibilidad de volver atrás sin perder el token

¿Te interesa que profundice en algún aspecto específico o tienes dudas sobre la implementación?
