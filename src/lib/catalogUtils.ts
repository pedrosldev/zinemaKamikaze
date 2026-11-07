import allTitlesData from '../data/all_titles_with_id.json';

export interface Movie {
  id: number;
  title: string;
  year: string;
  overview: string;
  poster_path: string;
}

export interface PaginatedMovies {
  movies: Movie[];
  currentPage: number;
  totalPages: number;
  totalMovies: number;
}

/**
 * Índice id → película, construido de forma perezosa.
 */
let movieIndex: Map<number, Movie> | null = null;

function buildMovieIndex(): Map<number, Movie> {
  const index = new Map<number, Movie>();
  for (const entry of allTitlesData) {
    if (!entry.films || !Array.isArray(entry.films)) continue;
    for (const movie of entry.films) {
      const id = Number(movie?.id);
      if (Number.isFinite(id) && movie?.title) {
        index.set(id, movie);
      }
    }
  }
  return index;
}

/**
 * Busca una película del catálogo por id.
 * Devuelve null si el id no existe (evita confiar en datos del cliente).
 */
export function getMovieById(id: number | string): Movie | null {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;
  movieIndex ??= buildMovieIndex();
  return movieIndex.get(numericId) ?? null;
}

/**
 * Aplana el JSON anidado y devuelve todas las películas como un array plano
 * Ordena alfabéticamente por título
 */
export function getAllMovies(): Movie[] {
  const flatMovies: Movie[] = [];

  // El JSON tiene estructura: [{ title: string, films: [...] }]
  for (const entry of allTitlesData) {
    if (entry.films && Array.isArray(entry.films)) {
      flatMovies.push(...entry.films);
    }
  }

  // Ordenar alfabéticamente por título
  return flatMovies.sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

/**
 * Obtiene todos los años únicos del catálogo (ordenados descendentemente)
 */
export function getUniqueYears(): string[] {
  const allMovies = getAllMovies();
  const years = new Set<string>();
  
  allMovies.forEach(movie => {
    if (movie.year && movie.year.trim() !== '') {
      years.add(movie.year);
    }
  });
  
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

/**
 * Busca películas por título raíz del grupo o título individual
 * Si coincide con el título raíz, devuelve todas las películas de ese grupo
 */
export function searchMovies(query: string, year: string = ''): Movie[] {
  if (query === '' && year === '') {
    return getAllMovies();
  }

  const queryLower = query.toLowerCase();
  const matchedMovies: Movie[] = [];
  const seenIds = new Set<number>();

  // Buscar en títulos raíz de grupos
  for (const entry of allTitlesData) {
    if (entry.title && entry.title.toLowerCase().includes(queryLower)) {
      // Si el título raíz coincide, agregar TODAS las películas del grupo
      if (entry.films && Array.isArray(entry.films)) {
        entry.films.forEach(movie => {
          if (!seenIds.has(movie.id)) {
            const matchYear = year === '' || movie.year === year;
            if (matchYear) {
              matchedMovies.push(movie);
              seenIds.add(movie.id);
            }
          }
        });
      }
    } else {
      // Si no coincide el título raíz, buscar en títulos individuales
      if (entry.films && Array.isArray(entry.films)) {
        entry.films.forEach(movie => {
          if (!seenIds.has(movie.id) && movie.title.toLowerCase().includes(queryLower)) {
            const matchYear = year === '' || movie.year === year;
            if (matchYear) {
              matchedMovies.push(movie);
              seenIds.add(movie.id);
            }
          }
        });
      }
    }
  }

  return matchedMovies.sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

/**
 * Obtiene las películas para una página específica
 */
export function getMoviesForPage(page: number, perPage: number = 100): PaginatedMovies {
  const allMovies = getAllMovies();
  const totalMovies = allMovies.length;
  const totalPages = Math.ceil(totalMovies / perPage);

  // Validar página
  const currentPage = Math.max(1, Math.min(page, totalPages));

  // Calcular índices
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;

  // Extraer películas de la página
  const movies = allMovies.slice(startIndex, endIndex);

  return {
    movies,
    currentPage,
    totalPages,
    totalMovies,
  };
}

/**
 * Calcula el total de páginas necesarias
 */
export function getTotalPages(perPage: number = 100): number {
  const allMovies = getAllMovies();
  return Math.ceil(allMovies.length / perPage);
}

/**
 * Genera los paths para getStaticPaths() de Astro
 */
export function generateCatalogPaths(perPage: number = 100) {
  const totalPages = getTotalPages(perPage);
  
  return Array.from({ length: totalPages }, (_, i) => ({
    params: { page: String(i + 1) },
  }));
}

/**
 * Construye la URL completa del poster
 */
export function getPosterUrl(posterPath: string | null): string {
  if (!posterPath) {
    return '/images/noImg.jpg'; // Fallback para películas sin poster
  }
  return `https://image.tmdb.org/t/p/w500${posterPath}`;
}
