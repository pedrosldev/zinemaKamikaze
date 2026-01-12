/**
 * Sistema de validación de tokens y selección de películas
 * Maneja la lógica de tokens, conexión, y generación de películas
 */

// Tipos auxiliares
interface MovieData {
  films: Array<{
    id: number;
    title: string;
    year: string | number;
    poster_path: string | null;
  }>;
}

interface MovieResult {
  valid: boolean;
  movie?: {
    title: string;
    year: string | number;
    poster: string | null;
  };
  message?: string;
}

/**
 * Verifica si hay una conexión estable con el servidor
 * @returns Promise<boolean> - true si la conexión es buena
 */
async function checkConnection(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 3000); // 3 segundos para verificar conexión
  
  try {
    // Intenta hacer fetch a un endpoint ligero
    const response = await fetch("/api/titles.json?test=1", {
      method: "HEAD", // Solo headers, no descarga todo el JSON
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      return true;
    } else {
      console.warn("⚠️ Respuesta del servidor no OK:", response.status);
      return false;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error("❌ Timeout verificando conexión (>3s)");
    } else {
      console.error("❌ Error verificando conexión:", error);
    }
    return false;
  }
}

/**
 * Genera una película aleatoria del catálogo
 * @param validatedToken - Token validado para asociar con la película
 */
export function generateMovie(validatedToken: string | null): void {
  console.log("🎬🎬🎬 GENERATEMOVIE EJECUTÁNDOSE 🎬🎬🎬");
  console.log("🎬 Token validado guardado:", validatedToken);
  
  const btnLeer = document.getElementById("btnLeer") as HTMLButtonElement;
  const contenidoDiv = document.getElementById("contenido") as HTMLDivElement;
  const surpriseDiv = document.querySelector(".surprise") as HTMLDivElement;
  const validateTokenBtn = document.getElementById("validateToken") as HTMLButtonElement;
  
  // Mostrar el botón "Y LA ELEGIDA ES..."
  if (btnLeer) {
    try {
      btnLeer.style.display = "block";
      console.log("✅ Botón mostrado");
    } catch (e) {
      console.error("❌ Error mostrando botón:", e);
    }
  }

  // Confetti opcional - no debe detener la ejecución si falla
  try {
    if (typeof (window as any).confetti === 'function') {
      (window as any).confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  } catch (confettiError) {
    // Ignorar errores de confetti
  }

  // Crear AbortController para timeout (15 segundos)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 15000);

  console.log("🌐 Iniciando fetch de /api/titles.json");

  fetch("/api/titles.json", { signal: controller.signal })
    .then((response) => {
      console.log("✅ Respuesta recibida de /api/titles.json");
      clearTimeout(timeoutId);
      if (!response.ok)
        throw new Error("Error al cargar el archivo: " + response.status);
      return response.json();
    })
    .then((data: MovieData[]) => {
      console.log("✅ JSON parseado, datos recibidos:", Array.isArray(data));
      if (!Array.isArray(data))
        throw new Error("El JSON no tiene el formato correcto.");

      const randomIndex = Math.floor(Math.random() * data.length);
      const pelicula = data[randomIndex];
      const film = Math.floor(Math.random() * pelicula.films.length);
      const filmId = pelicula.films[film].id;
      const poster = pelicula.films[film].poster_path || "";
      const year = pelicula.films[film].year || "Unknown";
      const review = null;
      const vibe = null;
      const title = pelicula.films[film].title;
      
      console.log("🎥 Película seleccionada:", title, "ID:", filmId);

      // Timeout para el registro de la review (10 segundos)
      const reviewController = new AbortController();
      const reviewTimeoutId = setTimeout(() => {
        reviewController.abort();
      }, 10000);

      console.log("💾 Registrando review en BD...");

      fetch("/api/register-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          film_id: filmId,
          title: title,
          year: year,
          review: review,
          vibe: vibe,
          poster: poster,
          token: validatedToken,  // Enviar el token para asociar el used_by
        }),
        signal: reviewController.signal
      })
        .then((response) => {
          clearTimeout(reviewTimeoutId);
          if (!response.ok) {
            throw new Error(
              "Error al guardar la review en la base de datos."
            );
          }
          return response.json();
        })
        .then(() => {
          // Review guardada exitosamente
        })
        .catch((error: any) => {
          clearTimeout(reviewTimeoutId);
          if (error.name === 'AbortError') {
            console.error("❌ Timeout guardando review. El token puede haberse consumido.");
            if (contenidoDiv) {
              contenidoDiv.innerHTML = "<strong style='color: #ff6b6b;'>Error: Conexión lenta. Verifica si la película se guardó.</strong>";
            }
          } else {
            console.error("❌ Error al guardar la review:", error.message);
          }
        });

      // Limpiar el contenido interno del surpriseDiv antes de mostrar el poster
      try {
        if (surpriseDiv) {
          surpriseDiv.innerHTML = "";
        }
      } catch (e) {
        console.error("❌ Error limpiando surpriseDiv:", e);
      }

      // Aplicar el poster
      try {
        if (!poster) {
          if (surpriseDiv) {
            surpriseDiv.style.backgroundImage = "url(/images/noImg.png)";
            surpriseDiv.style.backgroundSize = "100% 100%";
            surpriseDiv.style.backgroundPosition = "center";
            surpriseDiv.style.backgroundRepeat = "no-repeat";
            surpriseDiv.style.filter = "blur(0px)";
          }
        } else {
          const posterUrl = "https://image.tmdb.org/t/p/w500" + poster;
          if (surpriseDiv) {
            surpriseDiv.style.backgroundImage = "url(" + posterUrl + ")";
            surpriseDiv.style.backgroundSize = "100% 100%";
            surpriseDiv.style.backgroundPosition = "center";
            surpriseDiv.style.backgroundRepeat = "no-repeat";
          }
        }
      } catch (e) {
        console.error("❌ Error aplicando poster:", e);
      }

      // Actualizar contenido
      try {
        if (contenidoDiv) {
          contenidoDiv.innerHTML = "<strong>" + title + " (" + year + ")</strong>";
        }
      } catch (e) {
        console.error("❌ Error actualizando contenido:", e);
      }

      // Recargar página con try-catch
      try {
        setTimeout(() => {
          try {
            window.location.reload();
          } catch (reloadError) {
            console.error("❌ Error recargando:", reloadError);
            window.location.href = window.location.href;
          }
        }, 3000);
      } catch (timeoutError) {
        console.error("❌ Error en setTimeout de recarga:", timeoutError);
      }
    })
    .catch((error: any) => {
      clearTimeout(timeoutId);
      console.error("❌ Error en generateMovie:", error);
      
      let errorMessage = "Error desconocido";
      if (error.name === 'AbortError') {
        errorMessage = "⏱️ La conexión está muy lenta. Por favor, intenta de nuevo.";
        console.error("❌ Timeout: La petición tardó más de 15 segundos");
      } else if (error.message) {
        errorMessage = "Error: " + error.message;
      }
      
      if (contenidoDiv) {
        try {
          contenidoDiv.innerHTML = "<strong style='color: #ff6b6b;'>" + errorMessage + "</strong>";
        } catch (e) {
          console.error("❌ No se pudo mostrar el error en contenidoDiv:", e);
        }
      }
      
      // Reactivar el botón de validación si existe
      if (validateTokenBtn) {
        validateTokenBtn.disabled = false;
        validateTokenBtn.textContent = "VALIDAR CÓDIGO";
      }
    });
}

/**
 * Valida un token y selecciona una película si es válido
 * @param token - Token a validar
 */
async function validateToken(token: string): Promise<void> {
  const validateTokenBtn = document.getElementById("validateToken") as HTMLButtonElement;
  const tokenMessage = document.getElementById("tokenMessage") as HTMLParagraphElement;
  const tokenContainer = document.getElementById("tokenContainer") as HTMLDivElement;
  const surpriseDiv = document.querySelector(".surprise") as HTMLDivElement;
  const contenidoDiv = document.getElementById("contenido") as HTMLDivElement;
  const btnLeer = document.getElementById("btnLeer") as HTMLButtonElement;

  try {
    validateTokenBtn!.disabled = true;
    validateTokenBtn!.textContent = "VERIFICANDO CONEXIÓN...";
    tokenMessage!.textContent = "";
    tokenMessage!.className = "token-message";

    // PRIMERO: Verificar que hay buena conexión
    const hasGoodConnection = await checkConnection();
    
    if (!hasGoodConnection) {
      tokenMessage!.textContent = "⚠️ TU CONEXIÓN ES LENTA. Por favor, conéctate a mejor WiFi antes de validar el código para evitar perderlo.";
      tokenMessage!.className = "token-message token-error";
      validateTokenBtn!.disabled = false;
      validateTokenBtn!.textContent = "VALIDAR CÓDIGO";
      return; // NO continuar si la conexión es mala
    }

    // Si llegamos aquí, la conexión es buena
    validateTokenBtn!.textContent = "VALIDANDO Y SELECCIONANDO...";

    // Obtener el nombre/usuario opcional
    const selectedByInput = document.getElementById("selectedByInput") as HTMLInputElement;
    const selectedBy = selectedByInput?.value.trim() || "Anónimo";

    console.log("🔐 Llamando a validate-and-select (endpoint atómico)");

    // NUEVO: Un solo endpoint que hace todo de forma atómica
    const response = await fetch("/api/validate-and-select", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        token: token.trim(),
        selected_by: selectedBy 
      }),
    });

    const result: MovieResult = await response.json();
    console.log("📡 Respuesta del servidor:", result);

    if (response.ok && result.valid && result.movie) {
      // ¡TODO HECHO! El servidor ya validó, eligió película y guardó en BD
      tokenMessage!.textContent = "¡PELÍCULA SELECCIONADA!";
      tokenMessage!.className = "token-message token-success";
      tokenContainer!.style.display = "none";

      // Efecto de confeti
      try {
        if (typeof (window as any).confetti === 'function') {
          (window as any).confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      } catch (confettiError) {
        // Ignorar errores de confetti
      }

      // Mostrar la película en la UI
      try {
        if (surpriseDiv) {
          const posterUrl = result.movie.poster 
            ? "https://image.tmdb.org/t/p/w500" + result.movie.poster
            : "/images/noImg.png";
          
          surpriseDiv.style.backgroundImage = "url(" + posterUrl + ")";
          surpriseDiv.style.backgroundSize = "100% 100%";
          surpriseDiv.style.backgroundPosition = "center";
          surpriseDiv.style.backgroundRepeat = "no-repeat";
          console.log("🖼️ Poster aplicado:", posterUrl);
        }

        if (contenidoDiv) {
          contenidoDiv.innerHTML = "<strong>" + result.movie.title + " (" + result.movie.year + ")</strong>";
          console.log("📝 Título mostrado");
        }

        if (btnLeer) {
          btnLeer.style.display = "block";
          console.log("✅ Botón mostrado");
        }
      } catch (displayError) {
        console.error("❌ Error mostrando película:", displayError);
      }

      // Recargar página después de 3 segundos
      setTimeout(() => {
        try {
          window.location.reload();
        } catch (reloadError) {
          console.error("❌ Error recargando:", reloadError);
          window.location.href = window.location.href;
        }
      }, 3000);

    } else {
      // Token inválido o error
      tokenMessage!.textContent =
        result.message || "ERROR. Inténtalo de nuevo.";
      tokenMessage!.className = "token-message token-error";
    }
  } catch (error) {
    console.error("❌ Error al validar el token:", error);
    tokenMessage!.textContent = "ERROR DE CONEXIÓN. Inténtalo más tarde.";
    tokenMessage!.className = "token-message token-error";
  } finally {
    validateTokenBtn!.disabled = false;
    validateTokenBtn!.textContent = "VALIDAR CÓDIGO";
  }
}

/**
 * Inicializa el sistema de validación de tokens
 * Debe llamarse cuando el DOM esté listo
 */
export function initTokenValidation(): void {
  // Solo ejecutar si no estamos en periodo de visionado
  const tokenContainer = document.getElementById("tokenContainer");
  if (!tokenContainer) {
    return;
  }

  const tokenInput = document.getElementById("tokenInput") as HTMLInputElement;
  const validateTokenBtn = document.getElementById("validateToken") as HTMLButtonElement;
  const tokenMessage = document.getElementById("tokenMessage") as HTMLParagraphElement;
  const btnLeer = document.getElementById("btnLeer") as HTMLButtonElement;
  const contenidoDiv = document.getElementById("contenido") as HTMLDivElement;
  const surpriseDiv = document.querySelector(".surprise") as HTMLDivElement;

  // Variable para guardar el token validado
  let validatedToken: string | null = null;

  if (
    !tokenInput ||
    !validateTokenBtn ||
    !tokenMessage ||
    !btnLeer ||
    !contenidoDiv ||
    !surpriseDiv
  ) {
    console.error("❌ Error: No se encontraron algunos elementos del DOM");
    const missing = [];
    if (!tokenInput) missing.push("tokenInput");
    if (!validateTokenBtn) missing.push("validateTokenBtn");
    if (!tokenMessage) missing.push("tokenMessage");
    if (!btnLeer) missing.push("btnLeer");
    if (!contenidoDiv) missing.push("contenidoDiv");
    if (!surpriseDiv) missing.push("surpriseDiv");
    console.error("❌ Elementos faltantes:", missing.join(", "));
    return;
  }

  // Event listener para el botón de validar
  validateTokenBtn.addEventListener("click", () => {
    const token = tokenInput.value.trim();
    if (!token) {
      tokenMessage.textContent = "POR FAVOR, INTRODUCE UN CÓDIGO.";
      tokenMessage.className = "token-message token-error";
      return;
    }
    validateToken(token);
  });

  // También validar al presionar Enter
  tokenInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const token = tokenInput.value.trim();
      if (token) {
        validateToken(token);
      }
    }
  });

  // Función para generar la crítica (mantener por si acaso)
  btnLeer.addEventListener("click", () => {
    generateMovie(validatedToken);
  });
}
