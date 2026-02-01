/**
 * Inicializa las animaciones de carga de la página
 */
export function initLoadAnimations(): void {
  const header = document.querySelector<HTMLElement>('.full-width-header');
  const sidebar = document.querySelector<HTMLElement>('.wide-sidebar');
  
  // Reiniciar animación del header
  if (header) {
    header.style.animation = 'none';
    header.offsetHeight; // Trigger reflow
    header.style.animation = '';
  }
  
  // Animar entrada del sidebar
  if (sidebar) {
    sidebar.style.animation = 'none';
    sidebar.offsetWidth; // Trigger reflow
    sidebar.style.animation = 'slideInFromTop 1.5s';
    sidebar.style.opacity = '1';
  }
}
