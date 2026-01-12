// Módulo para manejo de formularios de críticas

interface ReviewData {
  id: number;
  film_id: number;
  title: string;
  year: number;
  poster_url?: string;
  youtube_id?: string;
  vibe?: string;
  expectation_mood?: string;
}

const MOOD_LABELS: Record<string, string> = {
  excitement: "🎉 EMOCIÓN",
  fear: "😱 MIEDO",
  curiosity: "🤔 CURIOSIDAD",
  dread: "😩 HORROR",
  surprise: "😲 SORPRESA",
  boredom: "😴 ABURRIMIENTO"
};

function fillFormWithReviewData(reviewData: ReviewData) {
  (document.getElementById("review_id") as HTMLInputElement).value = String(reviewData.id);
  (document.getElementById("film_id") as HTMLInputElement).value = String(reviewData.film_id);
  (document.getElementById("title") as HTMLInputElement).value = reviewData.title || "";
  (document.getElementById("year") as HTMLInputElement).value = String(reviewData.year || "");
  (document.getElementById("poster") as HTMLInputElement).value = reviewData.poster_url || "";
  (document.getElementById("youtube_id") as HTMLInputElement).value = reviewData.youtube_id || "";
  (document.getElementById("vibe") as HTMLSelectElement).value = reviewData.vibe || "pasable";
  
  const expectationMoodSelect = document.getElementById("expectation_mood") as HTMLSelectElement;
  const expectationMoodHelp = document.getElementById("expectation_mood_help");
  const expectationMood = reviewData.expectation_mood || "";
  
  expectationMoodSelect.value = expectationMood;
  
  // Si ya tiene valor, hacerlo readonly y actualizar mensaje
  if (expectationMood) {
    expectationMoodSelect.disabled = true;
    expectationMoodSelect.style.background = "rgba(107, 63, 47, 0.3)";
    expectationMoodSelect.style.color = "#999";
    expectationMoodSelect.style.cursor = "not-allowed";
    
    const moodLabel = MOOD_LABELS[expectationMood] || expectationMood.toUpperCase();
    if (expectationMoodHelp) {
      expectationMoodHelp.innerHTML = `✅ <strong>Ya definiste tu expectativa inicial como: ${moodLabel}</strong><br>Este valor no se puede modificar al completar la crítica`;
      expectationMoodHelp.style.color = "#4CAF50";
    }
  } else {
    // Si es null/vacío, permitir edición
    expectationMoodSelect.disabled = false;
    expectationMoodSelect.style.background = "";
    expectationMoodSelect.style.color = "";
    expectationMoodSelect.style.cursor = "";
    if (expectationMoodHelp) {
      expectationMoodHelp.textContent = "👉 Selecciona tu expectativa inicial al enterarte de esta película";
      expectationMoodHelp.style.color = "#999";
    }
  }
  
  (document.getElementById("review") as HTMLTextAreaElement).value = "";
}

export function initReviewSelection() {
  const selectReview = document.getElementById("selectReview");
  const updateReviewForm = document.getElementById("updateReviewForm");

  if (selectReview) {
    selectReview.addEventListener("change", function () {
      const selectedOption = (this as HTMLSelectElement).options[(this as HTMLSelectElement).selectedIndex];

      if (selectedOption.value) {
        const reviewData = JSON.parse(selectedOption.dataset.review || "{}") as ReviewData;
        fillFormWithReviewData(reviewData);
        if (updateReviewForm) {
          updateReviewForm.style.display = "block";
        }
      } else {
        if (updateReviewForm) {
          updateReviewForm.style.display = "none";
        }
      }
    });
  }
}

export function initMoodOnlyUpdate() {
  const updateMoodOnlyBtn = document.getElementById("updateMoodOnly");
  
  if (updateMoodOnlyBtn) {
    updateMoodOnlyBtn.addEventListener("click", async function () {
      const reviewId = (document.getElementById("review_id") as HTMLInputElement).value;
      const expectationMood = (document.getElementById("expectation_mood") as HTMLSelectElement).value;

      if (!reviewId) {
        alert("ERROR: No hay una crítica seleccionada");
        return;
      }

      try {
        const button = this as HTMLButtonElement;
        button.disabled = true;
        button.textContent = "ACTUALIZANDO...";

        const response = await fetch("/api/update-expectation-mood", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: reviewId,
            expectation_mood: expectationMood
          }),
        });

        if (response.ok) {
          alert("EXPECTATIVA ACTUALIZADA EXITOSAMENTE\n\nLa película seguirá visible en la página principal hasta que completes la crítica.");
          location.reload();
        } else {
          const error = await response.json();
          alert("ERROR AL ACTUALIZAR LA EXPECTATIVA: " + (error.message || "Error desconocido"));
        }
      } catch (error) {
        console.error("Error:", error);
        alert("ERROR AL ACTUALIZAR LA EXPECTATIVA");
      } finally {
        const button = this as HTMLButtonElement;
        button.disabled = false;
        button.textContent = "ACTUALIZAR SOLO EXPECTATIVA (sin completar crítica)";
      }
    });
  }
}

export function initUpdateReviewForm() {
  const reviewForm = document.getElementById("reviewForm");
  const updateReviewForm = document.getElementById("updateReviewForm");
  const selectReview = document.getElementById("selectReview") as HTMLSelectElement;

  if (reviewForm) {
    reviewForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("📝 Formulario de actualización enviado");

      // Habilitar temporalmente expectation_mood si está disabled para que se envíe
      const expectationMoodSelect = document.getElementById("expectation_mood") as HTMLSelectElement;
      const wasDisabled = expectationMoodSelect.disabled;
      if (wasDisabled) {
        expectationMoodSelect.disabled = false;
      }

      const formData = new FormData(this as HTMLFormElement);
      const reviewData = Object.fromEntries(formData);

      // Restaurar el estado disabled
      if (wasDisabled) {
        expectationMoodSelect.disabled = true;
      }

      try {
        const response = await fetch("/api/update-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewData),
        });

        if (response.ok) {
          alert("CRÍTICA ACTUALIZADA EXITOSAMENTE");
          (this as HTMLFormElement).reset();
          if (updateReviewForm) {
            updateReviewForm.style.display = "none";
          }
          if (selectReview) {
            selectReview.value = "";
          }
          location.reload();
        } else {
          const error = await response.json();
          alert(
            "ERROR AL ACTUALIZAR LA CRÍTICA: " +
              (error.message || "Error desconocido")
          );
        }
      } catch (error) {
        console.error("Error:", error);
        alert("ERROR AL ACTUALIZAR LA CRÍTICA");
      }
    });
  }
}

export function initNewReviewForm() {
  const newReviewForm = document.getElementById("newReviewForm");

  if (newReviewForm) {
    newReviewForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("📝 Formulario nueva review enviado");

      const formData = new FormData(this as HTMLFormElement);
      const reviewData = Object.fromEntries(formData);

      try {
        const response = await fetch("/api/register-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewData),
        });

        if (response.ok) {
          alert("CRÍTICA GUARDADA EXITOSAMENTE");
          (this as HTMLFormElement).reset();
        } else {
          alert("ERROR AL GUARDAR LA CRÍTICA");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("ERROR AL GUARDAR LA CRÍTICA");
      }
    });
  }
}
