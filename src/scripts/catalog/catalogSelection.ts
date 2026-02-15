// scripts/catalog/catalogSelection.ts
// Maneja la selección de películas desde el catálogo cuando hay un token activo

interface CatalogMovie {
  film_id: number;
  title: string;
  year: string | number;
  poster: string;
}

/**
 * Verifica si hay un token activo de catálogo en sessionStorage
 */
export function hasCatalogToken(): boolean {
  return !!sessionStorage.getItem('catalogToken');
}

/**
 * Obtiene los datos del token de catálogo
 */
export function getCatalogTokenData(): { token: string; selectedBy: string } | null {
  const token = sessionStorage.getItem('catalogToken');
  const selectedBy = sessionStorage.getItem('catalogSelectedBy');

  if (!token) return null;

  return {
    token,
    selectedBy: selectedBy || 'Anónimo'
  };
}

/**
 * Limpia los datos del token de catálogo de sessionStorage
 */
export function clearCatalogToken() {
  sessionStorage.removeItem('catalogToken');
  sessionStorage.removeItem('catalogSelectedBy');
}

/**
 * Confirma la selección de una película desde el catálogo
 */
export async function confirmCatalogSelection(movie: CatalogMovie): Promise<void> {
  const tokenData = getCatalogTokenData();

  if (!tokenData) {
    alert('❌ No hay un token activo. Por favor genera uno nuevo.');
    window.location.href = '/';
    return;
  }

  const { token, selectedBy } = tokenData;

  try {
    const response = await fetch('/api/confirm-catalog-selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        film_id: movie.film_id,
        title: movie.title,
        year: movie.year,
        poster: movie.poster,
        selected_by: selectedBy
      })
    });

    const result = await response.json();

    if (result.success) {
      // Limpiar token usado
      clearCatalogToken();

      // Mostrar mensaje de éxito
      alert(`✅ ¡Película seleccionada!\n\n"${movie.title}" (${movie.year})\n\nTe redirigiremos al inicio.`);

      // Redirigir al inicio
      window.location.href = '/';
    } else {
      alert(`❌ Error: ${result.message}`);
      
      // Si el token ya fue usado, limpiar y redirigir
      if (response.status === 403 || response.status === 409) {
        clearCatalogToken();
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    }
  } catch (error) {
    console.error('Error al confirmar selección:', error);
    alert('❌ Error de conexión. Por favor intenta de nuevo.');
  }
}

/**
 * Inicializa el modo de selección en el catálogo
 */
export function initCatalogSelection() {
  // Verificar si hay un token activo
  if (!hasCatalogToken()) {
    return; // Modo normal de navegación
  }

  console.log('📚 Modo Catálogo: Token activo detectado');

  // Agregar mensaje informativo si no existe
  addSelectionBanner();

  // Modificar comportamiento de las tarjetas de películas
  const movieCards = document.querySelectorAll('.movie-card');
  
  movieCards.forEach(card => {
    const link = card.querySelector('.movie-link') as HTMLAnchorElement;
    if (!link) return;

    // Extraer datos de la película del DOM
    const titleElement = card.querySelector('.movie-title');
    const yearElement = card.querySelector('.movie-year');
    const posterUrl = card.getAttribute('data-poster-url') || '';
    
    if (!titleElement) return;

    const title = titleElement.textContent?.trim() || '';
    const yearText = yearElement?.textContent?.trim() || '';
    const year = yearText.replace(/[()]/g, '').trim();
    
    // Extraer film_id de la URL original
    const href = link.getAttribute('href') || '';
    const filmIdMatch = href.match(/\/movies\/(\d+)/);
    const filmId = filmIdMatch ? parseInt(filmIdMatch[1]) : 0;

    if (!filmId) return;

    // Prevenir navegación por defecto
    link.addEventListener('click', async (e) => {
      e.preventDefault();

      // Confirmar selección
      const confirmed = confirm(
        `¿Quieres seleccionar esta película?\n\n` +
        `"${title}" (${year})\n\n` +
        `Esta será tu próxima película a ver.`
      );

      if (confirmed) {
        await confirmCatalogSelection({
          film_id: filmId,
          title,
          year,
          poster: posterUrl
        });
      }
    });

    // Indicador visual de selección
    card.classList.add('selectable');
  });
}

/**
 * Añade un banner informativo en el catálogo
 */
function addSelectionBanner() {
  const existingBanner = document.getElementById('catalogSelectionBanner');
  if (existingBanner) return; // Ya existe

  const banner = document.createElement('div');
  banner.id = 'catalogSelectionBanner';
  banner.className = 'catalog-selection-banner';
  banner.innerHTML = `
    <div class="banner-content">
      <span class="banner-icon">🎬</span>
      <div class="banner-text">
        <strong>MODO SELECCIÓN ACTIVADO</strong>
        <p>Haz clic en cualquier película para seleccionarla</p>
      </div>
      <button id="cancelCatalogSelection" class="banner-cancel">✕ Cancelar</button>
    </div>
  `;

  // Insertar al principio del main
  const main = document.querySelector('main');
  if (main) {
    main.insertBefore(banner, main.firstChild);
  }

  // Botón de cancelar
  const cancelBtn = banner.querySelector('#cancelCatalogSelection');
  cancelBtn?.addEventListener('click', () => {
    const confirmed = confirm('¿Seguro que quieres cancelar? El token seguirá activo.');
    if (confirmed) {
      clearCatalogToken();
      window.location.href = '/';
    }
  });
}
