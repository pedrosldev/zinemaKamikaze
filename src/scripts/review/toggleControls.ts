/**
 * Módulo de controles de toggle para reviews
 * Maneja la animación de scroll y el cambio de pestañas
 */

/**
 * Inicializa el control de toggle de animación de scroll
 */
export function initToggleAnimation(): void {
  const creditsText = document.querySelector<HTMLDivElement>(".credits-text");
  const toggleBtn = document.getElementById("toggle-animation") as HTMLImageElement | null;
  const toggleText = toggleBtn?.querySelector<HTMLSpanElement>(".toggle-text");

  if (!creditsText || !toggleBtn || !toggleText) {
    console.warn("Toggle animation elements not found");
    return;
  }

  let isPlaying = true;

  toggleBtn.addEventListener("click", () => {
    if (isPlaying) {
      creditsText.style.animationPlayState = "paused";
      toggleBtn.src = "/images/play-square-svgrepo-com.svg";
      toggleText.textContent = "Seguir leyendo";
    } else {
      creditsText.style.animationPlayState = "running";
      toggleBtn.src = "/images/pause-square-svgrepo-com.svg";
      toggleText.textContent = "Pausar crítica";
    }
    isPlaying = !isPlaying;
  });
}

/**
 * Inicializa el sistema de pestañas (texto/video)
 */
export function initTabSwitch(): void {
  const tabButtons = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
  const tabContents = document.querySelectorAll<HTMLDivElement>(".tab-content");

  if (tabButtons.length === 0 || tabContents.length === 0) {
    console.warn("Tab elements not found");
    return;
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab");
      if (!tabId) return;

      // Remove active class from all buttons
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      // Add active class to clicked button
      button.classList.add("active");

      // Hide all tab contents
      tabContents.forEach((content) => {
        content.style.display = "none";
      });

      // Show selected tab content
      const selectedTab = document.getElementById(tabId);
      if (selectedTab) {
        selectedTab.style.display = "flex";
      }
    });
  });
}
