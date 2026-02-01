/**
 * Inicializa las flechas de scroll
 */
export function initScrollControls(): void {
  const scrollContainer = document.querySelector<HTMLElement>('.content-scrollable');
  const scrollUp = document.querySelector<HTMLElement>('.scroll-up');
  const scrollDown = document.querySelector<HTMLElement>('.scroll-down');
  
  if (!scrollContainer) return;
  
  // Scroll con flechas
  scrollUp?.addEventListener('click', () => {
    scrollContainer.scrollBy({ top: -200, behavior: 'smooth' });
  });
  
  scrollDown?.addEventListener('click', () => {
    scrollContainer.scrollBy({ top: 200, behavior: 'smooth' });
  });
  
  // Scroll con rueda del ratón
  scrollContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    scrollContainer.scrollTop += e.deltaY;
  });
}
