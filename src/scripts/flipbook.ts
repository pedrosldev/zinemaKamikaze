/**
 * Sistema de Flipbook / Moviola
 * Maneja la animación tipo flipbook con controles de velocidad
 */

/**
 * Actualiza la velocidad del flipbook
 * @param speedControl - Input range para la velocidad
 * @param speedValue - Span para mostrar el valor
 * @param flipbookImages - NodeList con las imágenes
 * @param imageSequenceLength - Número total de imágenes en la secuencia
 */
function updateSpeed(
  speedControl: HTMLInputElement,
  speedValue: HTMLSpanElement,
  flipbookImages: NodeListOf<HTMLElement>,
  imageSequenceLength: number
): void {
  if (!speedControl || !speedValue || flipbookImages.length === 0) return;

  const speed = parseFloat(speedControl.value);
  speedValue.textContent = `${speed.toFixed(1)}x`;

  // Usar el número real de imágenes
  const frameDuration = 0.7; // segundos por frame
  const baseDuration = imageSequenceLength * frameDuration;
  const newDuration = baseDuration / speed;

  flipbookImages.forEach((img, index) => {
    img.style.animationDuration = `${newDuration}s`;
    const delayPerFrame = frameDuration / speed;
    img.style.animationDelay = `${delayPerFrame * index}s`;
  });
}

/**
 * Crea y muestra el popup del flipbook/moviola
 * @param imageSequence - Array con las URLs de las imágenes
 */
function showFlipbookPopup(imageSequence: string[]): void {
  // Crear el overlay del popup
  const popupOverlay = document.createElement("div");
  popupOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.92);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    backdrop-filter: blur(3px);
  `;

  // Crear el contenido del popup
  const popupContent = document.createElement("div");
  popupContent.style.cssText = `
    position: relative;
    width: 95%;
    max-width: 1000px;
    height: 90vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 0;
    padding: 0;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
  `;

  // PANTALLA DE CINE (parte principal)
  const cinemaScreen = document.createElement("div");
  cinemaScreen.style.cssText = `
    position: relative;
    width: 100%;
    height: 70%;
    background: 
      radial-gradient(ellipse at center top, 
        rgba(120, 0, 0, 0.1) 0%, 
        transparent 70%),
      linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1;
  `;

  // MARCO DE PANTALLA DE CINE
  const screenFrame = document.createElement("div");
  screenFrame.style.cssText = `
    width: 85%;
    max-width: 700px;
    aspect-ratio: 16 / 9;
    background: #0a0a0a;
    border: 4px solid rgba(107, 63, 47, 0.9);
    position: relative;
    overflow: hidden;
    box-shadow: 
      inset 0 0 20px rgba(0, 0, 0, 0.9),
      0 5px 20px rgba(0, 0, 0, 0.7);
    border-radius: 2px;
    z-index: 2;
  `;

  // CONTENEDOR DE IMÁGENES DEL FLIPBOOK
  const flipbookImages = document.createElement("div");
  flipbookImages.style.cssText = `
    width: 100%;
    height: 100%;
    position: relative;
    background: #121212;
  `;
  
  // AÑADIR LAS IMÁGENES DEL FLIPBOOK
  imageSequence.forEach((src: string, index: number) => {
    const img = document.createElement("div");
    // Calcular delay dinámicamente según el número total de imágenes
    const totalImages = imageSequence.length;
    const frameDuration = 0.7; // segundos por frame
    const totalDuration = totalImages * frameDuration;
    const delay = index * frameDuration;
    
    img.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-size: 110% 110%;
      background-position: center;
      background-repeat: no-repeat;
      background-image: url(${src});
      opacity: 0;
      filter: brightness(0.85) contrast(1.2) saturate(0.8) sepia(0.2);
      animation: fastFlipbook ${totalDuration}s infinite;
      animation-delay: ${delay}s;
      filter: drop-shadow(0px 0px 12px #4444dd) drop-shadow(5px 5px 15px #000000);
    `;
    flipbookImages.appendChild(img);
  });

  // EFECTO DE PARPADEO DE PROYECTOR
  const flickerOverlay = document.createElement("div");
  flickerOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      ellipse at center,
      transparent 30%,
      rgba(0, 0, 0, 0.3) 100%
    );
    pointer-events: none;
    z-index: 3;
    animation: projectorFlicker 1s ease-in-out infinite;
  `;

  // PÚBLICO SUPERPUESTO (parte inferior que se solapa)
  const audienceOverlay = document.createElement("div");
  audienceOverlay.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 40%;
    background-image: url('/images/cinema_audience.png');
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
    filter: brightness(0.4) contrast(1.2) grayscale(30%);
    z-index: 4;
    mask-image: linear-gradient(to top, 
      transparent 0%,
      black 20%,
      black 100%
    );
  `;

  // CONTROLES
  const controlsContainer = document.createElement("div");

  // Detectar si estamos en landscape en pantalla pequeña
  const isSmallLandscape = window.matchMedia("(max-width: 896px) and (orientation: landscape)").matches;

  controlsContainer.style.cssText = `
    position: absolute;
    bottom: ${isSmallLandscape ? '80px' : '190px'};
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    padding: ${isSmallLandscape ? '5px 10px' : 'clamp(10px, 2vw, 15px) clamp(15px, 3vw, 25px)'};
    border: 2px solid rgba(255, 215, 0, 0.5);
    border-radius: 10px;
    backdrop-filter: blur(10px);
    z-index: 10;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
    width: ${isSmallLandscape ? '80%' : '90%'};
    max-width: ${isSmallLandscape ? '350px' : '500px'};
    min-width: ${isSmallLandscape ? '200px' : '280px'};
    box-sizing: border-box;
  `;

  controlsContainer.innerHTML = `
    <div style="display: flex; flex-direction: ${isSmallLandscape ? 'row' : 'column'}; align-items: center; gap: ${isSmallLandscape ? '8px' : 'clamp(8px, 1.5vw, 10px)'}; width: 100%;">
      <label for="speedControlPopup" style="color: #FFD700; font-family: 'Special Elite', cursive; font-size: ${isSmallLandscape ? '0.5rem' : 'clamp(0.7rem, 2vw, 0.9rem)'}; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5); text-align: center; line-height: 1; white-space: nowrap; ${isSmallLandscape ? 'display: none;' : ''}">    
        🎬 VELOCIDAD PROYECTOR 🎬
      </label>
      <div style="display: flex; flex-direction: row; align-items: center; gap: ${isSmallLandscape ? '5px' : 'clamp(8px, 1.5vw, 10px)'}; width: 100%; justify-content: center;">
        <div style="display: flex; justify-content: center; align-items: center; gap: ${isSmallLandscape ? '5px' : 'clamp(8px, 2vw, 15px)'}; flex: 1;">
          <span style="color: #FFD700; font-size: ${isSmallLandscape ? '0.5rem' : 'clamp(0.6rem, 1.8vw, 0.8rem)'}; font-family: 'Special Elite', cursive; white-space: nowrap;">
            LENTO
          </span>
          <input
            type="range"
            id="speedControlPopup"
            style="width: ${isSmallLandscape ? '100px' : 'min(200px, 50vw)'}; height: ${isSmallLandscape ? '4px' : '6px'}; background: linear-gradient(to right, #8B4513, #FFD700, #8B4513); border-radius: 4px; outline: none; -webkit-appearance: none; flex: 1; min-width: ${isSmallLandscape ? '80px' : '120px'};"
            min="0.3"
            max="2"
            step="0.1"
            value="0.3"
          />
          <span style="color: #FFD700; font-size: ${isSmallLandscape ? '0.5rem' : 'clamp(0.6rem, 1.8vw, 0.8rem)'}; font-family: 'Special Elite', cursive; white-space: nowrap;">
            RÁPIDO
          </span>
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <span id="speedValueDisplay" style="color: #FFD700; font-family: 'Special Elite', cursive; font-size: ${isSmallLandscape ? '0.6rem' : 'clamp(0.8rem, 2.5vw, 1rem)'}; font-weight: bold; background: rgba(139, 69, 19, 0.8); padding: ${isSmallLandscape ? '2px 6px' : 'clamp(3px, 1vw, 5px) clamp(8px, 2vw, 12px)'}; border-radius: 8px; border: 2px solid #FFD700; line-height: 1; display: inline-block; text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);">
            1.0x
          </span>
        </div>
      </div>
    </div>
  `;

  // BOTÓN DE CERRAR
  const closeButton = document.createElement("button");
  closeButton.textContent = "SALIR DEL CINE";
  closeButton.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #8B4513, #D4AF37);
    color: #000;
    border: none;
    padding: 12px 25px;
    border-radius: 25px;
    cursor: pointer;
    font-family: 'Special Elite', cursive;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: all 0.3s ease;
    z-index: 10001;
    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.5);
    border: 2px solid #FFD700;
  `;

  // ENSAMBLAJE
  screenFrame.appendChild(flipbookImages);
  screenFrame.appendChild(flickerOverlay);
  
  cinemaScreen.appendChild(screenFrame);
  
  popupContent.appendChild(cinemaScreen);
  popupContent.appendChild(audienceOverlay);
  popupContent.appendChild(controlsContainer);
  
  popupOverlay.appendChild(closeButton);
  popupOverlay.appendChild(popupContent);
  document.body.appendChild(popupOverlay);

  // AÑADIR ESTILOS CSS
  const style = document.createElement('style');
  style.textContent = `
    /* ANIMACIÓN DEL FLIPBOOK - Dinámica según número de imágenes */
    @keyframes fastFlipbook {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      12% {
        opacity: 1;
        transform: scale(1.02);
      }
      ${100 / imageSequence.length}% {
        opacity: 0;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(1);
      }
    }

    /* EFECTO DE PARPADEO */
    @keyframes projectorFlicker {
      0%, 100% {
        opacity: 0.7;
      }
      25% {
        opacity: 0.5;
      }
      50% {
        opacity: 0.8;
      }
      75% {
        opacity: 0.6;
      }
    }

    /* ESTILOS DEL SLIDER */
    #speedControlPopup::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: #FFD700;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid #8B4513;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
      transition: all 0.2s ease;
    }
    #speedControlPopup::-webkit-slider-thumb:hover {
      background: #FFFFFF;
      transform: scale(1.2);
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.9);
    }
    #speedControlPopup::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: #FFD700;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid #8B4513;
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
    }
  `;
  document.head.appendChild(style);

  // FUNCIONALIDAD DE CONTROLES
  const speedControlPopup = document.getElementById("speedControlPopup") as HTMLInputElement;
  const speedValuePopup = document.getElementById("speedValueDisplay") as HTMLSpanElement;
  const flipbookImagesPopup = flipbookImages.querySelectorAll("div") as NodeListOf<HTMLElement>;

  if (speedControlPopup && speedValuePopup && flipbookImagesPopup.length > 0) {
    const updateSpeedHandler = () => updateSpeed(
      speedControlPopup, 
      speedValuePopup, 
      flipbookImagesPopup, 
      imageSequence.length
    );
    
    speedControlPopup.addEventListener("input", updateSpeedHandler);
    updateSpeedHandler(); // Inicializar
  }

  // FUNCIONES DE CIERRE
  function closePopup() {
    document.body.removeChild(popupOverlay);
  }

  closeButton.addEventListener("click", closePopup);
  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      closePopup();
    }
  });

  document.addEventListener("keydown", function closeOnEscape(e) {
    if (e.key === "Escape") {
      closePopup();
      document.removeEventListener("keydown", closeOnEscape);
    }
  });

  // EFECTOS HOVER
  closeButton.addEventListener("mouseenter", function() {
    this.style.background = "linear-gradient(135deg, #D4AF37, #FFD700)";
    this.style.transform = "scale(1.1)";
    this.style.boxShadow = "0 6px 20px rgba(255, 215, 0, 0.8)";
  });

  closeButton.addEventListener("mouseleave", function() {
    this.style.background = "linear-gradient(135deg, #8B4513, #D4AF37)";
    this.style.transform = "scale(1)";
    this.style.boxShadow = "0 4px 15px rgba(255, 215, 0, 0.5)";
  });
}

/**
 * Inicializa el sistema de flipbook/moviola
 * Debe llamarse cuando el DOM esté listo
 */
export function initFlipbook(): void {
  const flipbookTrigger = document.getElementById("flipbookTrigger");
  
  // Obtener secuencia de imágenes desde el atributo data
  const flipbookData = document.getElementById('flipbook-data');
  const imageSequence: string[] = flipbookData 
    ? JSON.parse(flipbookData.dataset.sequence || '[]')
    : [];

  if (flipbookTrigger && imageSequence.length > 0) {
    flipbookTrigger.style.cursor = "pointer";
    flipbookTrigger.addEventListener("click", () => showFlipbookPopup(imageSequence));
  }
}
