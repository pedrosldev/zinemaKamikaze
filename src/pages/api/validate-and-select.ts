import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

export const prerender = false;

/**
 * Función auxiliar para seleccionar una película válida con retry automático
 */
function selectRandomValidFilm(titlesData: any[], maxAttempts = 5): { success: boolean; film: any | null } {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomIndex = Math.floor(Math.random() * titlesData.length);
    const pelicula = titlesData[randomIndex];
    
    // Validar que tenga films
    if (!pelicula?.films || pelicula.films.length === 0) {
      continue; // Intentar con otra película
    }
    
    const filmIndex = Math.floor(Math.random() * pelicula.films.length);
    const selectedFilm = pelicula.films[filmIndex];
    
    // Validar que el film tenga los datos necesarios
    if (selectedFilm?.id && selectedFilm?.title) {
      return {
        success: true,
        film: selectedFilm
      };
    }
  }
  
  return {
    success: false,
    film: null
  };
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { token, selected_by } = body;

  if (!token) {
    return new Response(
      JSON.stringify({ valid: false, message: 'Token requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const connection = await pool.getConnection();
  
  try {
    // Iniciar transacción para que todo sea atómico
    await connection.beginTransaction();

    // 1. Verificar que el token existe y está activo
    const [tokenRows]: any = await connection.query(
      'SELECT * FROM trigger_tokens WHERE token = ? AND is_active = true',
      [token]
    );

    if (tokenRows.length === 0) {
      await connection.rollback();
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'Token inválido o ya utilizado'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Leer el archivo de películas desde el servidor
    const titlesPath = join(process.cwd(), 'src', 'data', 'all_titles_with_id.json');
    const titlesData = JSON.parse(readFileSync(titlesPath, 'utf-8'));

    if (!Array.isArray(titlesData) || titlesData.length === 0) {
      await connection.rollback();
      return new Response(
        JSON.stringify({ valid: false, message: 'Error al cargar películas' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filtrar películas con datos válidos
    const validMovies = titlesData.filter(movie => 
      movie?.films && 
      Array.isArray(movie.films) && 
      movie.films.length > 0 &&
      movie.films.some((f: any) => f?.id && f?.title)
    );

    if (validMovies.length === 0) {
      await connection.rollback();
      return new Response(
        JSON.stringify({ valid: false, message: 'No hay películas disponibles con datos válidos' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Seleccionar película aleatoria con validación
    const selection = selectRandomValidFilm(validMovies);

    if (!selection.success || !selection.film) {
      await connection.rollback();
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'No se pudo seleccionar una película válida. Por favor intenta de nuevo.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const selectedFilm = selection.film;
    const filmId = selectedFilm.id;
    const title = selectedFilm.title;
    const year = selectedFilm.year || 'Unknown';
    const poster = selectedFilm.poster_path || '';
    const watchedDate = new Date().toISOString().split('T')[0];

    // 4. Guardar la review en la base de datos
    await connection.execute(
      'INSERT INTO reviews (film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, selected_by, youtube_id, watched_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [filmId, title, year, null, null, poster, true, null, selected_by || 'Anónimo', null, watchedDate]
    );

    // 5. Marcar el token como usado
    await connection.execute(
      'UPDATE trigger_tokens SET is_active = false, used_by = ? WHERE token = ?',
      [selected_by || 'Anónimo', token]
    );

    // Confirmar transacción
    await connection.commit();

    // 6. Devolver la película seleccionada
    return new Response(
      JSON.stringify({
        valid: true,
        message: 'Película seleccionada exitosamente',
        movie: {
          film_id: filmId,
          title: title,
          year: year,
          poster: poster
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Si algo falla, revertir TODO
    await connection.rollback();
    
    // Logging estructurado para debugging
    console.error('Error en validate-and-select:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      token: token?.substring(0, 8) + '...', // Solo primeros chars por seguridad
      selected_by
    });
    
    return new Response(
      JSON.stringify({ 
        valid: false, 
        message: 'Error al procesar la selección. Por favor intenta de nuevo.' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    connection.release();
  }
};
