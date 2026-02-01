/**
 * Actualiza el poster del sidebar con animación
 */
export function updateSidebar(poster: string | undefined): void {
  const sidebar = document.querySelector<HTMLElement>('.wide-sidebar');
  if (!sidebar) return;
  
  const posterUrl = poster 
    ? `https://image.tmdb.org/t/p/w500${poster}`
    : '/images/noImg.png';
  
  sidebar.style.backgroundImage = `url(${posterUrl})`;
  sidebar.style.backgroundSize = "cover";
  sidebar.style.backgroundPosition = "center";
  sidebar.style.filter = "brightness(0.8) contrast(0.9)";
  sidebar.style.opacity = "1";
  
  // Reiniciar animación de flicker
  sidebar.style.animation = "none";
  sidebar.offsetHeight; // Trigger reflow
  sidebar.style.animation = "flicker 3s infinite";
}

/**
 * Inicializa el cambio de posters al hover (escritorio)
 */
export function initDesktopPosterHover(): void {
  const reviewsList = document.querySelector('.reviews-list');
  if (!reviewsList) return;
  
  reviewsList.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    const li = target.closest<HTMLElement>('.review-item');
    if (li) {
      const poster = li.dataset.posterUrl;
      updateSidebar(poster);
    }
  });
}

/**
 * Inicializa el cambio de posters al click (móvil/tablet)
 */
export function initMobilePosterClick(): void {
  const sidebar = document.querySelector<HTMLElement>('.wide-sidebar');
  const mobileTip = document.getElementById('mobile-tip');
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  if (!sidebar || !mobileTip) return;
  
  document.querySelectorAll<HTMLElement>('.review-item').forEach(item => {
    item.addEventListener('click', function(e) {
      if (isTouchDevice || window.innerWidth <= 768) {
        const poster = this.dataset.posterUrl;
        
        if (sidebar.getAttribute('data-current-poster') !== poster) {
          e.preventDefault();
          updateSidebar(poster);
          sidebar.setAttribute('data-current-poster', poster || '');
          
          // Mostrar aviso visual
          mobileTip.classList.add('visible');
          
          setTimeout(() => {
            mobileTip.classList.remove('visible');
          }, 3000);
          
          // Feedback visual
          document.querySelectorAll<HTMLElement>('.review-item')
            .forEach(el => el.style.filter = 'brightness(1)');
          this.style.filter = 'brightness(1.5) contrast(1.1)';
        } else {
          mobileTip.classList.remove('visible');
        }
      }
    });
  });
}

/**
 * Inicializa el sistema de cambio de posters
 */
export function initPosterSwitcher(): void {
  initDesktopPosterHover();
  initMobilePosterClick();
}
