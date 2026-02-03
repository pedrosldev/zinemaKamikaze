// Módulo para manejar las flechas de scroll del catálogo

/**
 * Inicializa las flechas de scroll para el catálogo
 */
export function initCatalogScroll() {
  const scrollContainer = document.querySelector('.content-scrollable');
  const scrollUpBtn = document.querySelector('.scroll-up');
  const scrollDownBtn = document.querySelector('.scroll-down');

  if (!scrollContainer) return;

  // Scroll hacia arriba
  scrollUpBtn?.addEventListener('click', () => {
    scrollContainer.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  // Scroll hacia abajo
  scrollDownBtn?.addEventListener('click', () => {
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: 'smooth'
    });
  });
}
