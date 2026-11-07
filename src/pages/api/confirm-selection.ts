// src/pages/api/confirm-selection.ts
import type { APIRoute } from "astro";
import { pool, TOKEN_USABLE_SQL } from "../../lib/db";
import { getMovieById } from "../../lib/catalogUtils";

export const prerender = false;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Confirma la selección de una película en modo triple_choice.
 * Registra la película en BD y marca el token como usado.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { token, film_id, selected_by } = body;

  if (!token || !film_id) {
    return json(
      {
        success: false,
        message: "Faltan datos requeridos: token, film_id",
      },
      400
    );
  }

  // Solo se aceptan películas que existan en el catálogo: no se confía en
  // title/year/poster enviados por el cliente.
  const catalogFilm = getMovieById(film_id);
  if (!catalogFilm) {
    return json({ success: false, message: "Película no válida" }, 400);
  }

  const filmId = Number(catalogFilm.id);
  const filmTitle = catalogFilm.title;
  const filmYear = catalogFilm.year || "Unknown";
  const filmPoster = catalogFilm.poster_path || "";

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Token activo y no caducado.
    const [tokenRows]: any = await connection.query(
      `SELECT * FROM trigger_tokens WHERE token = ? AND ${TOKEN_USABLE_SQL}`,
      [token]
    );

    if (tokenRows.length === 0) {
      await connection.rollback();
      return json(
        { success: false, message: "Token inválido, ya utilizado o expirado" },
        403
      );
    }

    // 2. Evitar duplicar una selección pendiente de la misma película.
    const [existingReviews]: any = await connection.query(
      "SELECT id FROM reviews WHERE film_id = ? AND viewing_period = true AND review IS NULL",
      [filmId]
    );

    if (existingReviews.length > 0) {
      await connection.rollback();
      return json(
        {
          success: false,
          message: "Esta película ya fue seleccionada anteriormente",
        },
        409
      );
    }

    const selectedBy = selected_by || "Anónimo";
    const watchedDate = new Date().toISOString().split("T")[0];

    // 3. Consumir el token de forma atómica.
    const [tokenUpdate]: any = await connection.execute(
      `UPDATE trigger_tokens SET is_active = false, used_by = ? WHERE token = ? AND ${TOKEN_USABLE_SQL}`,
      [selectedBy, token]
    );

    if (tokenUpdate.affectedRows !== 1) {
      await connection.rollback();
      return json(
        { success: false, message: "Token inválido, ya utilizado o expirado" },
        403
      );
    }

    // 4. Insertar la nueva crítica con los datos canónicos del catálogo.
    await connection.execute(
      `INSERT INTO reviews
        (film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, selected_by, youtube_id, watched_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        filmId,
        filmTitle,
        filmYear,
        null, // review
        null, // vibe
        filmPoster,
        true, // viewing_period
        null, // expectation_mood
        selectedBy,
        null, // youtube_id
        watchedDate,
      ]
    );

    await connection.commit();

    return json(
      {
        success: true,
        message: "Película registrada exitosamente",
        movie: {
          film_id: filmId,
          title: filmTitle,
          year: filmYear,
          poster: filmPoster,
        },
      },
      200
    );
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignorar errores de rollback.
    }

    console.error("Error en confirm-selection:", {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      film_id,
      token: typeof token === "string" ? token.substring(0, 8) + "..." : undefined,
    });

    return json(
      {
        success: false,
        message: "Error al confirmar la selección. Por favor intenta de nuevo.",
      },
      500
    );
  } finally {
    await connection.release();
  }
};
