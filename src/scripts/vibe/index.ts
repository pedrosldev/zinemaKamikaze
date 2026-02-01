import { initPosterSwitcher } from './posterSwitcher';
import { initScrollControls } from './scrollControls';
import { initLoadAnimations } from './animations';

/**
 * Inicializa todos los módulos de la página de vibe
 */
export function initVibePage(): void {
  try {
    initPosterSwitcher();
    initScrollControls();
    initLoadAnimations();
    
    console.log('✓ Vibe page initialized');
  } catch (error) {
    console.error('Error initializing vibe page:', error);
  }
}
