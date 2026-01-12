/**
 * Popup explicativo "¿Qué es Zinema Kamikaze?"
 * Maneja la creación y visualización del popup informativo
 */

/**
 * Crea y muestra el popup explicativo
 */
function showAboutPopup(): void {
  // Crear el overlay del popup
  const popupOverlay = document.createElement("div");
  popupOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    backdrop-filter: blur(5px);
  `;

  // Crear el contenido del popup
  const popupContent = document.createElement("div");
  popupContent.style.cssText = `
    background: linear-gradient(135deg, #1a1a18 0%, #2b2317 100%);
    border: 3px solid rgba(107, 63, 47, 0.8);
    border-radius: 8px;
    padding: 2rem;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    color: #c9be9c;
    font-family: 'Special Elite', cursive;
    position: relative;
    box-shadow: 0 0 30px rgba(245, 215, 66, 0.3);
    text-align: left;
    line-height: 1.6;
  `;

  // Añadir el texto
  popupContent.innerHTML = `
    <h2 style="color: #f5d742; text-align: center; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 2px; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">
      ¿QUÉ ES ZINEMA KAMIKAZE?
    </h2>
    <div style="font-size: 1.1rem;">
      <p style="margin-bottom: 1rem;"><strong>Es darte la posibilidad de hacer sufrir al menda.</strong></p>
      <p style="margin-bottom: 1rem;">Pero quizás también de hacerle descubrir una joya oculta.</p>
      <p style="margin-bottom: 1rem;">Es, al fin y al cabo, dar la posibilidad al usuario de incrementar mi conocimiento audiovisual tanto para bien como para mal.</p>
      <p style="margin-bottom: 1rem;">Pero el criterio para la selección no es otro más que el puro azar.</p>
      <p style="margin-bottom: 1rem;">Un algoritmo se encarga de seleccionar un artefacto (puede ser un documental, un corto, un videoclip, ¡lo que sea!) entre una lista de más de 10000 títulos.</p>
      <p style="margin-bottom: 1rem;">Cada cierto tiempo otorgaré un código a un usuario con el cual disparará el evento que ejecute la ruleta rusa.</p>
      <p style="margin-bottom: 0;"><strong>Una vez vista, escribiré una crítica que, ya lo adelanto, no será ni sesuda ni técnica.</strong></p>
    </div>
    <button id="closePopup" style="
      background: #f5d742;
      color: #000;
      border: none;
      padding: 10px 25px;
      border-radius: 4px;
      cursor: pointer;
      font-family: 'Special Elite', cursive;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 1.5rem;
      display: block;
      margin-left: auto;
      margin-right: auto;
      transition: all 0.3s ease;
    ">ENTENDIDO</button>
  `;

  // Añadir efectos de grano de película al popup
  const filmGrain = document.createElement("div");
  filmGrain.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    background: url("/images/old_celluloid.png");
    background-size: cover;
    opacity: 0.1;
    border-radius: 5px;
  `;

  popupContent.appendChild(filmGrain);
  popupOverlay.appendChild(popupContent);
  document.body.appendChild(popupOverlay);

  // Función para cerrar el popup
  function closePopup() {
    document.body.removeChild(popupOverlay);
  }

  // Cerrar al hacer clic en el botón
  const closeButton = document.getElementById("closePopup");
  closeButton?.addEventListener("click", closePopup);

  // Cerrar al hacer clic fuera del contenido
  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      closePopup();
    }
  });

  // Cerrar con la tecla Escape
  document.addEventListener("keydown", function closeOnEscape(e) {
    if (e.key === "Escape") {
      closePopup();
      document.removeEventListener("keydown", closeOnEscape);
    }
  });
}

/**
 * Inicializa el popup "¿Qué es Zinema Kamikaze?"
 * Debe llamarse cuando el DOM esté listo
 */
export function initAboutPopup(): void {
  const cElement = document.querySelector(".c") as HTMLDivElement;

  if (cElement) {
    cElement.style.cursor = "pointer"; // Cambiar cursor para indicar que es clickeable

    cElement.addEventListener("click", showAboutPopup);

    // Efecto hover para .c
    cElement.addEventListener("mouseenter", function () {
      this.style.filter = "brightness(1.1) contrast(1.1)";
      this.style.transform = "scale(1.02)";
      this.style.transition = "all 0.3s ease";
    });

    cElement.addEventListener("mouseleave", function () {
      this.style.filter = "brightness(0.8) contrast(0.9)";
      this.style.transform = "scale(1)";
    });
  }
}
