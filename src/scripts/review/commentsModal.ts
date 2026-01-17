/**
 * Módulo de gestión del modal de comentarios
 * Maneja la apertura/cierre del modal y el envío de comentarios
 */

interface CommentSubmitResponse {
  success: boolean;
  message?: string;
}

/**
 * Inicializa el modal de comentarios
 */
export function initCommentsModal(): void {
  const modal = document.getElementById("comments-modal");
  const openBtn = document.querySelector<HTMLButtonElement>(".comments-btn");
  const closeBtn = document.querySelector<HTMLButtonElement>(".close-modal-btn");
  const modalOverlay = document.querySelector<HTMLDivElement>(".modal-overlay");

  if (!modal || !openBtn || !closeBtn || !modalOverlay) {
    console.warn("Comments modal elements not found");
    return;
  }

  // Open modal
  openBtn.addEventListener("click", () => {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  // Close modal function
  const closeModal = () => {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  };

  // Close button click
  closeBtn.addEventListener("click", closeModal);

  // Click outside to close
  modalOverlay.addEventListener("click", closeModal);

  // ESC key to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) {
      closeModal();
    }
  });
}

/**
 * Inicializa el formulario de comentarios
 */
export function initCommentForm(): void {
  const form = document.getElementById("comment-form") as HTMLFormElement | null;
  const textarea = document.getElementById("comment-content") as HTMLTextAreaElement | null;
  const charCounter = document.getElementById("char-count") as HTMLSpanElement | null;
  const messageDiv = document.getElementById("form-message") as HTMLDivElement | null;

  if (!form || !textarea) {
    console.warn("Comment form elements not found");
    return;
  }

  // Character counter
  if (charCounter) {
    textarea.addEventListener("input", () => {
      const count = textarea.value.length;
      charCounter.textContent = count.toString();
    });
  }

  // Form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
      author_name: formData.get("author_name"),
      content: formData.get("content"),
      review_id: formData.get("review_id"),
    };

    // Validation
    if (!data.author_name || !data.content) {
      showMessage("Por favor, rellena todos los campos", "error");
      return;
    }

    try {
      const response = await fetch("/api/add-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result: CommentSubmitResponse = await response.json();

      if (result.success) {
        showMessage("¡Comentario publicado! Recargando...", "success");
        form.reset();
        if (charCounter) charCounter.textContent = "0";
        // Reload page after 2 seconds to show new comment
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showMessage(result.message || "Error al publicar el comentario", "error");
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      showMessage("Error de conexión. Inténtalo de nuevo.", "error");
    }
  });

  /**
   * Muestra un mensaje de estado del formulario
   */
  function showMessage(message: string, type: "success" | "error" | "info"): void {
    if (!messageDiv) return;

    messageDiv.textContent = message;
    messageDiv.className = `form-message ${type}`;
    messageDiv.style.display = "block";

    if (type !== "success") {
      setTimeout(() => {
        messageDiv.style.display = "none";
      }, 5000);
    }
  }
}
