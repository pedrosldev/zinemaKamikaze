/**
 * Sistema de comentarios de expectativas
 * Maneja el modal de comentarios y el envío de nuevos comentarios
 */

/**
 * Abre el modal de comentarios de expectativas
 */
function openExpectationCommentsModal(): void {
  const modal = document.getElementById('expectation-comments-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Cierra el modal de comentarios de expectativas
 */
function closeExpectationCommentsModal(): void {
  const modal = document.getElementById('expectation-comments-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Inicializa el contador de caracteres del textarea
 */
function initCharCounter(): void {
  const expectationTextarea = document.getElementById('expectation-comment-content') as HTMLTextAreaElement;
  const expectationCharCount = document.getElementById('expectation-char-count');
  
  if (expectationTextarea && expectationCharCount) {
    expectationTextarea.addEventListener('input', () => {
      expectationCharCount.textContent = expectationTextarea.value.length.toString();
    });
  }
}

/**
 * Inicializa el formulario de envío de comentarios
 */
function initCommentForm(): void {
  const expectationForm = document.getElementById('expectation-comment-form') as HTMLFormElement;
  const expectationFormMessage = document.getElementById('expectation-form-message');
  
  if (!expectationForm || !expectationFormMessage) {
    return;
  }

  expectationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const filmIdInput = document.getElementById('expectation-film-id') as HTMLInputElement;
    const authorNameInput = document.getElementById('expectation-author-name') as HTMLInputElement;
    const contentInput = document.getElementById('expectation-comment-content') as HTMLTextAreaElement;

    if (!filmIdInput || !authorNameInput || !contentInput) {
      return;
    }

    const filmId = filmIdInput.value;
    const authorName = authorNameInput.value;
    const content = contentInput.value;
    
    expectationFormMessage.textContent = 'Enviando comentario...';
    expectationFormMessage.className = 'form-message info';
    
    try {
      const response = await fetch('/api/add-expectation-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          film_id: filmId,
          author_name: authorName,
          content: content
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        expectationFormMessage.textContent = '✓ Comentario añadido. Recargando página...';
        expectationFormMessage.className = 'form-message success';
        
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        expectationFormMessage.textContent = '✗ ' + data.message;
        expectationFormMessage.className = 'form-message error';
      }
    } catch (error) {
      expectationFormMessage.textContent = '✗ Error al enviar el comentario. Inténtalo de nuevo.';
      expectationFormMessage.className = 'form-message error';
    }
  });
}

/**
 * Inicializa el sistema de comentarios de expectativas
 * Debe llamarse cuando el DOM esté listo
 */
export function initExpectationComments(): void {
  // Hacer las funciones globales para que puedan ser llamadas desde onclick en el HTML
  (window as any).openExpectationCommentsModal = openExpectationCommentsModal;
  (window as any).closeExpectationCommentsModal = closeExpectationCommentsModal;

  // Cerrar modal con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeExpectationCommentsModal();
    }
  });

  // Inicializar contador de caracteres
  initCharCounter();

  // Inicializar formulario
  initCommentForm();
}
