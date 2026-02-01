import { initPosterSwitcher } from './posterSwitcher';
import { initScrollControls } from './scrollControls';
import { initLoadAnimations } from './animations';

/**
 * Inicializa todos los módulos de la página de vibe
 */
export function initVibePage(): void {
  document.addEventListener('DOMContentLoaded', () => {
    try {
      initPosterSwitcher();
      initScrollControls();
      initLoadAnimations();
      
      console.log('✓ Vibe page initialized');
    } catch (error) {
      console.error('Error initializing vibe page:', error);
    }
  });
}

// Auto-inicializar si no se importa como módulo
if (typeof window !== 'undefined') {
  initVibePage();
}
