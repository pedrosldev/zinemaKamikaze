import type { APIRoute } from "astro";
import {
  closeOpenSelection,
  createTriggerToken,
  getReviewsWithNullReview,
} from "../../lib/db";

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Abre o cierra la taquilla pública.
 *
 * Abrir = crear el token de la ronda (el pase sigue existiendo, pero deja de
 * ser algo que el admin tenga que copiar y repartir). Cerrar = desactivar el
 * token usable.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // El middleware ya exige sesión, pero comprobamos de nuevo aquí.
    if (!locals.adminAuthenticated) {
      return json({ success: false, message: "No autorizado" }, 401);
    }

    const body = await request.json();
    const open = body?.open === true;

    if (!open) {
      const closed = await closeOpenSelection();
      return json(
        {
          success: true,
          open: false,
          message: closed > 0 ? "Taquilla cerrada" : "La taquilla ya estaba cerrada",
        },
        200
      );
    }

    // No tiene sentido abrir mientras hay una película esperando crítica:
    // el botón no aparecería en la portada y la ronda quedaría abierta en
    // silencio hasta publicarla.
    const pending = await getReviewsWithNullReview();
    if (pending.length > 0) {
      return json(
        {
          success: false,
          message:
            "Hay una película pendiente de crítica. Publica la crítica antes de abrir la taquilla.",
        },
        409
      );
    }

    await createTriggerToken();

    return json(
      { success: true, open: true, message: "Taquilla abierta" },
      200
    );
  } catch (error) {
    console.error("Error al cambiar el estado de la taquilla:", error);
    return json(
      { success: false, message: "Error al cambiar el estado de la taquilla" },
      500
    );
  }
};
