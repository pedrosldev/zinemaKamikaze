# Planificación: Catálogo de Películas con Paginación

## Contexto
- **Total de películas**: 25,947
- **Fuente de datos**: `src/data/all_titles_with_id.json`
- **Inspiración de diseño**: `pages/vibe/[vibe].astro`

## Decisión: Paginación (Opción 2)
Con 26k películas, cargar todo en una página es inviable. Se implementará un sistema paginado.

---

## Estructura de Archivos Propuesta

```
src/
├── pages/
│   └── catalog/
│       ├── index.astro              # Landing del catálogo con búsqueda
│       └── [page].astro             # Páginas paginadas (1, 2, 3, etc.)
├── components/
│   └── catalog/
│       ├── MovieCard.astro          # Componente reutilizable para mostrar película
│       ├── Pagination.astro         # Navegación entre páginas
│       └── SearchBox.astro          # Buscador (opcional)
└── lib/
    └── catalogUtils.ts              # Utilidades para paginación y filtrado
```

---

## Configuración Recomendada

### Parámetros de Paginación
- **Películas por página**: 100
- **Total de páginas**: ~260 páginas
- **Pre-renderizado**: Sí (todas las páginas en build time)

### URLs resultantes
```
/catalog          → Página principal
/catalog/1        → Primera página (películas 1-100)
/catalog/2        → Segunda página (películas 101-200)
...
/catalog/260      → Última página
```

---

## Flujo de Implementación

### 1. `src/lib/catalogUtils.ts`
**Responsabilidad**: Lógica de paginación y procesamiento del JSON

**Funciones clave**:
```typescript
// Cargar y aplanar todas las películas del JSON
export function getAllMovies()

// Obtener películas para una página específica
export function getMoviesForPage(page: number, perPage: number)

// Calcular total de páginas
export function getTotalPages(perPage: number)

// Generar paths para getStaticPaths()
export function generateCatalogPaths(perPage: number)
```

**Detalles importantes**:
- Aplanar el array anidado de `all_titles_with_id.json`
- Cada película tiene: `id`, `title`, `year`, `overview`, `poster_path`
- Ordenar alfabéticamente o por ID (a decidir)

---

### 2. `src/pages/catalog/[page].astro`
**Responsabilidad**: Renderizar cada página del catálogo

**Estructura**:
```astro
---
import { generateCatalogPaths, getMoviesForPage } from '../../lib/catalogUtils'
import Layout from '../../layouts/Layout.astro'
import MovieCard from '../../components/catalog/MovieCard.astro'
import Pagination from '../../components/catalog/Pagination.astro'

export const prerender = true // Pre-generar en build

export async function getStaticPaths() {
  return generateCatalogPaths(100) // 100 películas por página
}

const { page } = Astro.params
const currentPage = parseInt(page)
const { movies, totalPages } = getMoviesForPage(currentPage, 100)
---
```

**Funcionalidades**:
- Mostrar grid/lista de películas
- Navegación anterior/siguiente
- Indicador de página actual
- Mantener el estilo visual de `vibe/[vibe].astro`

---

### 3. `src/components/catalog/MovieCard.astro`
**Responsabilidad**: Tarjeta individual de película

**Props**:
```typescript
interface Props {
  id: number
  title: string
  year: string
  posterPath: string
  overview?: string // Opcional, para tooltip/hover
}
```

**Renderizado**:
- Similar al `<li>` de la página vibe
- Imagen del poster (con lazy loading)
- Título y año
- Link a `/movies/[film_id]`

---

### 4. `src/components/catalog/Pagination.astro`
**Responsabilidad**: Navegación entre páginas

**Props**:
```typescript
interface Props {
  currentPage: number
  totalPages: number
  baseUrl: string // "/catalog"
}
```

**Funcionalidades**:
- Botones: Primera | Anterior | 1 2 3 ... 260 | Siguiente | Última
- Mostrar páginas cercanas (ej: si estás en 50, mostrar 48 49 [50] 51 52)
- Deshabilitar botones en límites (primera/última página)

---

### 5. `src/pages/catalog/index.astro` (Opcional pero recomendado)
**Responsabilidad**: Landing del catálogo

**Opciones de contenido**:
1. **Simple**: Redirect automático a `/catalog/1`
2. **Con búsqueda**: Formulario que llame a un API endpoint
3. **Con estadísticas**: Mostrar total de películas, categorías, etc.

**Recomendación**: Opción 2 o 3 para mejor UX

---

## Optimizaciones Importantes

### 1. Lazy Loading de Imágenes
```astro
<img 
  src={posterPath} 
  loading="lazy" 
  decoding="async"
  alt={title}
/>
```

### 2. Caché en Build
- Astro pre-renderizará todas las páginas
- Los usuarios recibirán HTML estático ultra-rápido
- No hay cálculos en runtime

### 3. Estilos Reutilizables
- Copiar CSS de `vibe/[vibe].astro`
- Adaptar para grid de posters
- Mantener efectos de film-grain y scratches

---

## Mejoras Futuras (Fase 2)

### A. Búsqueda con API Route
```
src/pages/api/search-catalog.ts
```
- Endpoint que busque en `all_titles_with_id.json`
- Búsqueda por título (case-insensitive)
- Retornar resultados paginados

### B. Filtros Avanzados
```
/catalog?year=1972
/catalog?sort=title
/catalog?sort=year
```

### C. Índice Alfabético
```
/catalog/a  → Películas que empiezan con A
/catalog/b  → Películas que empiezan con B
...
```
Esto reduciría las páginas por letra (más manejable)

### D. Virtual Scrolling (Alternativa)
Si prefieres scroll infinito en lugar de paginación tradicional:
- Usar Intersection Observer
- Cargar chunks vía fetch al hacer scroll
- Más moderno pero más complejo

---

## Consideraciones de Rendimiento

### Build Time
- Con 260 páginas, el build será más largo
- Estimación: +30-60 segundos
- Aceptable para un catálogo estático

### User Experience
- Carga inicial: <1 segundo (HTML estático)
- Navegación entre páginas: instantánea (pre-cargadas)
- Imágenes: lazy load evita saturar la red

### SEO
- Todas las películas indexables
- Cada página es una URL única
- Mejor que un scroll infinito para SEO

---

## Comparación con Alternativas

| Aspecto | Paginación (elegida) | Scroll Infinito | Todo en una página |
|---------|---------------------|-----------------|-------------------|
| Películas | 26k ✅ | 26k ✅ | ❌ Inviable |
| Build time | Medio (260 páginas) | Bajo | Bajo |
| Carga inicial | Rápida | Rápida | ❌ Muy lenta |
| SEO | ✅ Excelente | ⚠️ Regular | ⚠️ Regular |
| UX | ✅ Buena | ✅ Muy buena | ❌ Bloqueante |
| Complejidad | Media | Alta | Baja |
| Mantenimiento | Fácil | Medio | Fácil |

---

## Checklist de Implementación

### Fase 1 - MVP
- [ ] Crear `catalogUtils.ts` con funciones de paginación
- [ ] Crear `MovieCard.astro` componente
- [ ] Crear `Pagination.astro` componente
- [ ] Crear `catalog/[page].astro` con paginación
- [ ] Copiar estilos de `vibe/[vibe].astro`
- [ ] Añadir lazy loading a imágenes
- [ ] Probar build con todas las páginas
- [ ] Añadir link al catálogo en la navegación principal

### Fase 2 - Mejoras
- [ ] Crear `catalog/index.astro` como landing
- [ ] Implementar búsqueda básica
- [ ] Añadir ordenamiento (alfabético, año)
- [ ] Mejorar responsive design
- [ ] Optimizar tamaño de imágenes

### Fase 3 - Avanzado (Opcional)
- [ ] API endpoint para búsqueda
- [ ] Índice alfabético (`/catalog/a`, etc.)
- [ ] Filtros por década
- [ ] Estadísticas del catálogo

---

## Tiempo Estimado de Implementación

- **Fase 1 (MVP)**: 3-4 horas
- **Fase 2 (Mejoras)**: 2-3 horas
- **Fase 3 (Avanzado)**: 4-6 horas

**Total para MVP funcional**: ~4 horas

---

## Notas Finales

1. **Empezar simple**: Implementar MVP sin búsqueda primero
2. **Probar build**: Verificar que 260 páginas se generen correctamente
3. **Reutilizar código**: Mucho CSS/estructura de `vibe/[vibe].astro`
4. **Decidir ordenamiento**: ¿Alfabético, por ID, o por fecha de adición?
5. **Considerar URL amigables**: ¿`/catalog/1` o `/catalog/page-1`?

¿Quieres que ajuste algo en la planificación o te explique alguna parte con más detalle?
