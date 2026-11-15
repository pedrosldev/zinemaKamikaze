/**
 * Taquilla pública: el botón que sustituye al formulario de token.
 *
 * No cambia el mecanismo de selección. Solo hace invisible el pase:
 *   1. Al pulsar, pregunta al servidor si sigue habiendo ronda abierta.
 *   2. Envía el pase a /api/validate-and-select, que ya existía.
 *   3. Traduce el 403 (token consumido) a «llegaste tarde».
 *
 * Sirve para los tres modos. En triple elección abre el selector de siempre
 * y el pase se consume al confirmar, igual que con el formulario antiguo.
 */

import { showMovieSelector } from "./tokenValidation";

interface SelectionState {
  open: boolean;
  openedAt?: string;
  token?: string;
}

interface SelectionResult {
  valid: boolean;
  mode?: "normal" | "triple_choice" | "catalog";
  movie?: { title: string; year: string | number };
  movies?: Array<{
    film_id: number;
    title: string;
    year: string | number;
    poster: string | null;
  }>;
  token?: string;
  message?: string;
}

function setMessage(el: HTMLElement, text: string, kind: "success" | "error" | "none"): void {
  el.textContent = text;
  el.className = kind === "none" ? "token-message" : `token-message token-${kind}`;
}

function reloadAfter(ms: number): void {
  window.setTimeout(() => {
    window.location.reload();
  }, ms);
}

async function getSelectionState(): Promise<SelectionState | null> {
  try {
    const response = await fetch("/api/selection-state", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as SelectionState;
  } catch {
    return null;
  }
}

export function initTaquilla(): void {
  const container = document.getElementById("taquillaContainer");
  if (!container) return;

  const button = document.getElementById("taquillaBtn") as HTMLButtonElement | null;
  const message = document.getElementById("taquillaMessage") as HTMLParagraphElement | null;
  if (!button || !message) return;

  const signInput = document.getElementById("selectedByInput") as HTMLInputElement | null;

  button.addEventListener("click", async () => {
    if (button.disabled) return;

    const label = button.textContent ?? "ENTRAR Y ELEGIR";
    button.disabled = true;
    button.textContent = "ABRIENDO TAQUILLA...";
    setMessage(message, "", "none");

    // 1. ¿Sigue abierta la ronda?
    const state = await getSelectionState();

    if (!state?.open || !state.token) {
      button.textContent = "TAQUILLA CERRADA";
      setMessage(message, "LA TAQUILLA YA ESTÁ CERRADA. Otro se ha llevado la entrada.", "error");
      reloadAfter(4000);
      return;
    }

    // 2. El pase interno viaja al endpoint de siempre.
    button.textContent = "SELECCIONANDO...";
    const selectedBy = signInput?.value.trim() || "Anónimo";

    try {
      const response = await fetch("/api/validate-and-select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: state.token, selected_by: selectedBy }),
      });

      const result = (await response.json()) as SelectionResult;

      if (response.ok && result.valid && result.movie) {
        button.textContent = "ENTRADA EMITIDA";
        setMessage(
          message,
          `ENTRADA EMITIDA: ${result.movie.title} (${result.movie.year})`,
          "success"
        );

        try {
          if (typeof (window as any).confetti === "function") {
            (window as any).confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
            });
          }
        } catch {
          // El confeti es decorativo: si falla, no se interrumpe nada.
        }

        reloadAfter(3000);
        return;
      }

      // ==== Triple elección: el pase no se consume hasta confirmar ====
      // Se reutiliza el selector que ya existía en el flujo del formulario.
      if (response.ok && result.valid && result.mode === "triple_choice" && result.movies?.length) {
        container.style.display = "none";
        showMovieSelector(result.movies, result.token ?? state.token, selectedBy);
        return;
      }

      // ==== Catálogo: se guarda el pase y se redirige, como antes ====
      if (response.ok && result.valid && result.mode === "catalog") {
        sessionStorage.setItem("catalogToken", result.token ?? state.token);
        sessionStorage.setItem("catalogSelectedBy", selectedBy);
        button.textContent = "REDIRIGIENDO...";
        setMessage(message, "REDIRIGIENDO AL CATÁLOGO...", "success");
        window.setTimeout(() => {
          window.location.href = "/catalog";
        }, 1200);
        return;
      }

      if (response.status === 403) {
        button.textContent = "ENTRADA EMITIDA";
        setMessage(message, "LLEGASTE TARDE. La entrada ya está emitida.", "error");
        reloadAfter(4000);
        return;
      }

      if (result.valid && !result.movie) {
        // El modo de selección cambió entre el render y el clic.
        button.textContent = "RECARGA LA PÁGINA";
        setMessage(message, "EL SORTEO HA CAMBIADO. Recarga para continuar.", "error");
        reloadAfter(4000);
        return;
      }

      // Error recuperable (sin película válida, fallo del servidor…):
      // se deja volver a intentarlo.
      button.disabled = false;
      button.textContent = label;
      setMessage(message, result.message || "NO SE PUDO COMPLETAR. Inténtalo otra vez.", "error");
    } catch (error) {
      console.error("Error en la taquilla:", error);
      button.disabled = false;
      button.textContent = label;
      setMessage(message, "ERROR DE CONEXIÓN. Inténtalo otra vez.", "error");
    }
  });
}
