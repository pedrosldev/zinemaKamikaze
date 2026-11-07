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

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { token, film_id, selected_by } = body;

  if (!token || !film_id) {
    return json(
      {
        success: false,
        message: "Faltan datos requeridos (token, film_id)",
      },
      400
    );
  }

  // Datos canónicos del catálogo: no se confía en title/year/poster del cliente.
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
        { success: false, message: "Token inválido o ya utilizado" },
        403
      );
    }

    // 2. Si ya hay una selección pendiente de esta película, no duplicarla.
    const [pendingReviews]: any = await connection.query(
      "SELECT id FROM reviews WHERE film_id = ? AND viewing_period = true AND review IS NULL LIMIT 1",
      [filmId]
    );

    if (pendingReviews.length > 0) {
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
        { success: false, message: "Token inválido o ya utilizado" },
        403
      );
    }

    // 4. Insertar un NUEVO visionado con los datos canónicos.
    //    No se tocan las críticas anteriores.
    await connection.execute(
      `INSERT INTO reviews
        (film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, selected_by, youtube_id, watched_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        filmId,
        filmTitle,
        filmYear,
        null,
        null,
        filmPoster,
        true,
        null,
        selectedBy,
        null,
        watchedDate,
      ]
    );

    await connection.commit();

    return json(
      {
        success: true,
        message: "Película seleccionada exitosamente",
        film_id: filmId,
        title: filmTitle,
      },
      200
    );
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignorar errores de rollback.
    }

    console.error("Error en confirm-catalog-selection:", {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      film_id,
    });

    return json(
      { success: false, message: "Error al procesar la selección" },
      500
    );
  } finally {
    await connection.release();
  }
};
