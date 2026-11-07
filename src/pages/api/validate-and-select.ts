import type { APIRoute } from "astro";
import { pool, TOKEN_USABLE_SQL } from "../../lib/db";
import titlesData from "../../data/all_titles_with_id.json";

export const prerender = false;

const films = titlesData as any[];

/**
 * Selecciona una película válida al azar, excluyendo las que ya están
 * pendientes de crítica (viewing_period = true y review IS NULL).
 */
function selectRandomValidFilm(
  data: any[],
  excludedIds: Set<number>,
  maxAttempts = 10
): { success: boolean; film: any | null } {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomIndex = Math.floor(Math.random() * data.length);
    const pelicula = data[randomIndex];

    if (!pelicula?.films || pelicula.films.length === 0) {
      continue;
    }

    const filmIndex = Math.floor(Math.random() * pelicula.films.length);
    const selectedFilm = pelicula.films[filmIndex];

    if (
      selectedFilm?.id &&
      selectedFilm?.title &&
      !excludedIds.has(Number(selectedFilm.id))
    ) {
      return { success: true, film: selectedFilm };
    }
  }

  return { success: false, film: null };
}

/** Selecciona varias películas únicas, excluyendo las ya pendientes. */
function selectMultipleRandomFilms(
  data: any[],
  count: number,
  excludedIds: Set<number>
): any[] {
  const selectedFilms: any[] = [];
  const selectedIds = new Set<number>(excludedIds);
  let attempts = 0;
  const maxAttempts = count * 10;

  while (selectedFilms.length < count && attempts < maxAttempts) {
    attempts++;

    const selection = selectRandomValidFilm(data, selectedIds);

    if (selection.success && selection.film) {
      const filmId = Number(selection.film.id);

      if (!selectedIds.has(filmId)) {
        selectedIds.add(filmId);
        selectedFilms.push(selection.film);
      }
    }
  }

  return selectedFilms;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { token, selected_by } = body;

  if (!token) {
    return json({ valid: false, message: "Token requerido" }, 400);
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verificar que el token existe, está activo y no ha caducado.
    const [tokenRows]: any = await connection.query(
      `SELECT * FROM trigger_tokens WHERE token = ? AND ${TOKEN_USABLE_SQL}`,
      [token]
    );

    if (tokenRows.length === 0) {
      await connection.rollback();
      return json(
        { valid: false, message: "Token inválido o ya utilizado" },
        403
      );
    }

    // 2. Películas válidas del catálogo (importado como módulo, no leído de disco).
    const validMovies = films.filter(
      (movie) =>
        movie?.films &&
        Array.isArray(movie.films) &&
        movie.films.length > 0 &&
        movie.films.some((f: any) => f?.id && f?.title)
    );

    if (validMovies.length === 0) {
      await connection.rollback();
      return json(
        { valid: false, message: "No hay películas disponibles con datos válidos" },
        500
      );
    }

    // 3. Evitar elegir una película que ya está pendiente de crítica.
    const [pendingRows]: any = await connection.query(
      "SELECT film_id FROM reviews WHERE viewing_period = true AND review IS NULL"
    );
    const excludedIds = new Set<number>(
      pendingRows.map((row: any) => Number(row.film_id))
    );

    // 4. Leer el modo de selección dentro de la misma conexión.
    const [modeRows]: any = await connection.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'selection_mode' LIMIT 1"
    );
    const selectionMode = modeRows.length
      ? modeRows[0].setting_value
      : "normal";

    const selectedBy = selected_by || "Anónimo";

    // ===== MODO NORMAL: seleccionar 1 película y registrar directamente =====
    if (selectionMode === "normal") {
      const selection = selectRandomValidFilm(validMovies, excludedIds);

      if (!selection.success || !selection.film) {
        await connection.rollback();
        return json(
          {
            valid: false,
            message:
              "No se pudo seleccionar una película válida. Por favor intenta de nuevo.",
          },
          409
        );
      }

      const selectedFilm = selection.film;
      const filmId = Number(selectedFilm.id);
      const title = selectedFilm.title;
      const year = selectedFilm.year || "Unknown";
      const poster = selectedFilm.poster_path || "";
      const watchedDate = new Date().toISOString().split("T")[0];

      // Consumir el token de forma atómica antes de insertar.
      const [tokenUpdate]: any = await connection.execute(
        `UPDATE trigger_tokens SET is_active = false, used_by = ? WHERE token = ? AND ${TOKEN_USABLE_SQL}`,
        [selectedBy, token]
      );

      if (tokenUpdate.affectedRows !== 1) {
        await connection.rollback();
        return json(
          { valid: false, message: "Token inválido o ya utilizado" },
          403
        );
      }

      await connection.execute(
        "INSERT INTO reviews (film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, selected_by, youtube_id, watched_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [filmId, title, year, null, null, poster, true, null, selectedBy, null, watchedDate]
      );

      await connection.commit();

      return json(
        {
          valid: true,
          mode: "normal",
          message: "Película seleccionada exitosamente",
          movie: {
            film_id: filmId,
            title,
            year,
            poster,
          },
        },
        200
      );
    }

    // ===== MODO TRIPLE CHOICE: devolver 3 opciones sin registrar =====
    if (selectionMode === "triple_choice") {
      const selectedFilms = selectMultipleRandomFilms(
        validMovies,
        3,
        excludedIds
      );

      if (selectedFilms.length < 3) {
        await connection.rollback();
        return json(
          {
            valid: false,
            message:
              "No se pudieron seleccionar 3 películas únicas. Intenta de nuevo.",
          },
          409
        );
      }

      // No se consume el token hasta que el usuario confirme.
      await connection.commit();

      return json(
        {
          valid: true,
          mode: "triple_choice",
          message: "Elige una de estas 3 películas",
          token,
          movies: selectedFilms.map((film) => ({
            film_id: film.id,
            title: film.title,
            year: film.year || "Unknown",
            poster: film.poster_path || "",
          })),
        },
        200
      );
    }

    // ===== MODO CATALOG: redirigir al catálogo =====
    if (selectionMode === "catalog") {
      await connection.commit();

      return json(
        {
          valid: true,
          mode: "catalog",
          message: "Redirigiendo al catálogo completo",
          token,
        },
        200
      );
    }

    await connection.rollback();
    return json(
      { valid: false, message: "Modo de selección desconocido" },
      500
    );
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignorar errores de rollback para no enmascarar el error original.
    }

    console.error("Error en validate-and-select:", {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      token: typeof token === "string" ? token.substring(0, 8) + "..." : undefined,
      selected_by,
    });

    return json(
      {
        valid: false,
        message: "Error al procesar la selección. Por favor intenta de nuevo.",
      },
      500
    );
  } finally {
    await connection.release();
  }
};
