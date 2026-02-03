// Módulo de inicialización del panel de administración
import { initTokenGeneration } from './tokenGeneration';
import { initReviewSelection, initMoodOnlyUpdate, initUpdateReviewForm, initNewReviewForm } from './reviewForms';
import { initAdminLogout } from './auth';

/**
 * Inicializa todos los módulos del panel de administración
 */
export function initAdminPanel() {
  console.log("🔄 DOM cargado - Configurando event listeners...");

  // Inicializar todos los módulos
  initReviewSelection();
  initMoodOnlyUpdate();
  initUpdateReviewForm();
  initNewReviewForm();
  initTokenGeneration();
  initAdminLogout();
}
