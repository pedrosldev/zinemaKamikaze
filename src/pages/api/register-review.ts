// src/pages/api/register-review.ts
import type { APIRoute } from "astro";
import { insertReview, getTokenData, claimToken } from "../../lib/db";
import { getMovieById } from "../../lib/catalogUtils";
import { sanitizeVibe } from "../../lib/vibes";

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, locals }) => {
  const body = (await request.json()) as any;

  const filmId = Number(body.film_id);
  if (!body.film_id || !Number.isFinite(filmId)) {
    return json({ message: "El film_id es obligatorio" }, 400);
  }

  const isAdmin = locals.adminAuthenticated === true;

  let selectedBy =
    typeof body.selected_by === "string" && body.selected_by.trim()
      ? body.selected_by.trim().slice(0, 100)
      : isAdmin
        ? "Admin"
        : "Anónimo";

  let title = String(body.title || "").slice(0, 255);
  let year = Number(body.year) || 0;
  let poster = String(body.poster || "");

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

      // Datos canónicos del catálogo: no se confía en title/year/poster
      // enviados por el cliente.
      const catalogFilm = getMovieById(filmId);
      if (!catalogFilm) {
        return json({ message: "Película no válida" }, 400);
      }

      title = catalogFilm.title;
      year = Number(catalogFilm.year) || 0;
      poster = catalogFilm.poster_path || "";
      selectedBy = tokenData.used_by || selectedBy;

      // Canje atómico: solo una petición puede consumir el token.
      const claimed = await claimToken(String(body.token), selectedBy);
      if (!claimed) {
        return json({ message: "Token inválido o ya utilizado" }, 403);
      }
    } else if (!title) {
      return json({ message: "El title es obligatorio" }, 400);
    }

    const watchedDate =
      typeof body.watched_date === "string" && body.watched_date
        ? body.watched_date
        : new Date().toISOString().split("T")[0];

    await insertReview(
      filmId,
      title,
      year,
      typeof body.review === "string" ? body.review.slice(0, 10000) : null,
      sanitizeVibe(body.vibe),
      poster,
      true, // viewing_period
      null, // expectation_mood
      selectedBy,
      typeof body.youtube_id === "string" ? body.youtube_id.slice(0, 50) : null,
      watchedDate
    );

    return json({ message: "Review guardada exitosamente" }, 200);
  } catch (error) {
    console.error(error);
    return json({ message: "Error al guardar la review" }, 500);
  }
};
