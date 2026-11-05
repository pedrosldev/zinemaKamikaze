// src/pages/api/confirm-selection.ts
import type { APIRoute } from "astro";
import { pool, TOKEN_USABLE_SQL } from "../../lib/db";

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
  const { token, film_id, title, year, poster, selected_by } = body;

  if (!token || !film_id || !title) {
    return json(
      {
        success: false,
        message: "Faltan datos requeridos: token, film_id, title",
      },
      400
    );
  }

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
      [film_id]
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

    // 4. Insertar la nueva crítica.
    await connection.execute(
      `INSERT INTO reviews
        (film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, selected_by, youtube_id, watched_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(film_id),
        String(title),
        year || "Unknown",
        null, // review
        null, // vibe
        poster || "",
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
          film_id,
          title,
          year: year || "Unknown",
          poster: poster || "",
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
