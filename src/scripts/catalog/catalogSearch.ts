// Módulo de búsqueda y filtrado del catálogo
import allTitlesData from '../../data/all_titles_with_id.json';
import type { Movie } from '../../lib/catalogUtils';

/**
 * Inicializa la funcionalidad de búsqueda del catálogo
 */
export function initCatalogSearch(): void {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  const yearFilter = document.getElementById('yearFilter') as HTMLSelectElement;
  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
  const moviesGrid = document.getElementById('moviesGrid') as HTMLDivElement;
  const resultsCount = document.getElementById('resultsCount') as HTMLParagraphElement;
  const noResults = document.getElementById('noResults') as HTMLDivElement;

  if (!searchInput || !yearFilter || !moviesGrid) {
    console.warn('Catalog search elements not found');
    return;
  }

  // Función para filtrar películas
  function filterMovies(): void {
    const query = searchInput.value.trim();
    const year = yearFilter.value;

    if (query === '' && year === '') {
      // Mostrar todas las películas
      const allMovies: Movie[] = [];
      for (const entry of allTitlesData) {
        if (entry.films && Array.isArray(entry.films)) {
          allMovies.push(...entry.films);
        }
      }
      displayMovies(allMovies.sort((a, b) => a.title.localeCompare(b.title, 'es')));
      updateResultsCount(allMovies.length, query, year);
      return;
    }

    const queryLower = query.toLowerCase();
    const matchedMovies: Movie[] = [];
    const seenIds = new Set<number>();

    // Para búsquedas muy cortas sin filtro de año, no filtrar aún
    if (query.length < 2 && !year) {
      displayMovies([]);
      updateResultsCount(0, query, year);
      return;
    }

    // Buscar en títulos raíz de grupos
    for (const entry of allTitlesData) {
      // Saltar grupos vacíos
      if (!entry.films || !Array.isArray(entry.films) || entry.films.length === 0) {
        continue;
      }

      const rootMatches = entry.title && entry.title.toLowerCase().includes(queryLower);
      
      if (rootMatches) {
        // Si el título raíz coincide, agregar todas las películas del grupo
        for (const movie of entry.films) {
          if (!seenIds.has(movie.id)) {
            const matchYear = year === '' || movie.year === year;
            if (matchYear) {
              matchedMovies.push(movie);
              seenIds.add(movie.id);
            }
          }
        }
      } else {
        // Si no coincide el título raíz, buscar en títulos individuales
        for (const movie of entry.films) {
          if (!seenIds.has(movie.id) && movie.title.toLowerCase().includes(queryLower)) {
            const matchYear = year === '' || movie.year === year;
            if (matchYear) {
              matchedMovies.push(movie);
              seenIds.add(movie.id);
            }
          }
        }
      }
    }

    const sorted = matchedMovies.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    displayMovies(sorted);
    updateResultsCount(sorted.length, query, year);
  }

  // Función para mostrar películas
  function displayMovies(movies: Movie[]): void {
    const movieCards = Array.from(document.querySelectorAll('.movie-card')) as HTMLElement[];
    const movieIds = new Set(movies.map(m => m.id));
    
    if (movies.length === 0) {
      movieCards.forEach(card => card.style.display = 'none');
      if (noResults) noResults.style.display = 'block';
      return;
    }

    if (noResults) noResults.style.display = 'none';
    
    // Mostrar/ocultar tarjetas según el filtro
    movieCards.forEach(card => {
      const link = card.querySelector('a');
      const href = link?.getAttribute('href') || '';
      const id = parseInt(href.replace('/movies/', ''));
      
      if (movieIds.has(id)) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // Actualizar contador de resultados
  function updateResultsCount(count: number, query: string, year: string): void {
    if (!resultsCount) return;

    let text = `${count.toLocaleString()} película${count !== 1 ? 's' : ''} encontrada${count !== 1 ? 's' : ''}`;
    
    if (query || year) {
      const filters = [];
      if (query) filters.push(`"${query}"`);
      if (year) filters.push(`año ${year}`);
      text += ` con ${filters.join(' y ')}`;
    }
    
    resultsCount.textContent = text;
  }

  // Función para limpiar filtros
  function clearFilters(): void {
    searchInput.value = '';
    yearFilter.value = '';
    filterMovies();
    searchInput.focus();
  }

  // Debounce para optimizar la búsqueda
  let debounceTimer: number;
  function debounce(func: Function, delay: number) {
    return function(...args: any[]) {
      clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => func.apply(null, args), delay);
    };
  }

  // Event listeners con debounce para el input
  const debouncedFilter = debounce(filterMovies, 300);
  searchInput.addEventListener('input', debouncedFilter);
  yearFilter.addEventListener('change', filterMovies);
  
  if (clearBtn) clearBtn.addEventListener('click', clearFilters);
  if (resetBtn) resetBtn.addEventListener('click', clearFilters);

  // Filtrar en carga inicial
  filterMovies();
}
