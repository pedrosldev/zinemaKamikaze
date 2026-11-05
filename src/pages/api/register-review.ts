// src/pages/api/register-review.ts
import type { APIRoute } from "astro";
import {
  insertReview,
  getTokenData,
  claimToken,
} from "../../lib/db";

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  const body = (await request.json()) as any;

  if (!body.film_id) {
    return json({ message: "El film_id es obligatorio" }, 400);
  }

  if (!body.title) {
    return json({ message: "El title es obligatorio" }, 400);
  }

  const isAdmin = locals.adminAuthenticated === true;
  let selectedBy =
    typeof body.selected_by === "string" && body.selected_by.trim()
      ? body.selected_by.trim().slice(0, 100)
      : isAdmin
        ? "Admin"
        : "Anónimo";

  try {
    // Un usuario anónimo SOLO puede registrar si canjea un token válido.
    if (!isAdmin) {
      if (!body.token) {
        return json({ message: "Token requerido" }, 401);
      }

      const tokenData = await getTokenData(String(body.token));
      if (!tokenData || !tokenData.is_active) {
        return json({ message: "Token inválido o ya utilizado" }, 403);
      }

      selectedBy = tokenData.used_by || selectedBy;

      // Canje atómico: solo una petición puede consumir el token.
      const claimed = await claimToken(String(body.token), selectedBy);
      if (!claimed) {
        return json({ message: "Token inválido o ya utilizado" }, 403);
      }
    }

    const watchedDate =
      body.watched_date || new Date().toISOString().split("T")[0];

    await insertReview(
      Number(body.film_id),
      String(body.title).slice(0, 255),
      Number(body.year) || 0,
      body.review || null,
      body.vibe || "pasable",
      String(body.poster || ""),
      true, // viewing_period
      null, // expectation_mood
      selectedBy,
      body.youtube_id || null,
      watchedDate
    );

    return json({ message: "Review guardada exitosamente" }, 200);
  } catch (error) {
    console.error(error);
    return json({ message: "Error al guardar la review" }, 500);
  }
};
