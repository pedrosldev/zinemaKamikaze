// Módulo de inicialización del panel de administración
import { initTokenGeneration } from './tokenGeneration';
import { initReviewSelection, initMoodOnlyUpdate, initUpdateReviewForm, initNewReviewForm } from './reviewForms';
import { initAdminLogout } from './auth';

/**
 * Inicializa el control de modo de selección de películas
 */
function initSelectionModeToggle() {
  const saveButton = document.getElementById('saveSelectionMode');
  const messageDiv = document.getElementById('modeMessage');

  if (!saveButton || !messageDiv) return;

  saveButton.addEventListener('click', async () => {
    try {
      // Obtener el modo seleccionado
      const selectedRadio = document.querySelector('input[name="selection_mode"]:checked') as HTMLInputElement;
      
      if (!selectedRadio) {
        showMessage(messageDiv, 'Selecciona un modo', 'error');
        return;
      }

      const mode = selectedRadio.value;

      // Deshabilitar botón mientras procesa
      saveButton.setAttribute('disabled', 'true');
      saveButton.textContent = '⏳ GUARDANDO...';

      // Enviar al servidor
      const response = await fetch('/api/set-selection-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });

      const data = await response.json();

      if (data.success) {
        showMessage(messageDiv, `✅ ${data.message}`, 'success');
      } else {
        showMessage(messageDiv, `❌ ${data.message}`, 'error');
      }

    } catch (error) {
      console.error('Error al guardar modo:', error);
      showMessage(messageDiv, '❌ Error al guardar cambios', 'error');
    } finally {
      // Rehabilitar botón
      saveButton.removeAttribute('disabled');
      saveButton.textContent = '💾 GUARDAR CAMBIOS';
    }
  });
}

/**
 * Muestra un mensaje temporal
 */
function showMessage(element: HTMLElement, message: string, type: 'success' | 'error') {
  element.textContent = message;
  element.className = `mode-message ${type}`;
  
  // Limpiar mensaje después de 5 segundos
  setTimeout(() => {
    element.textContent = '';
    element.className = 'mode-message';
  }, 5000);
}

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
  initSelectionModeToggle();
}
