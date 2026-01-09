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
