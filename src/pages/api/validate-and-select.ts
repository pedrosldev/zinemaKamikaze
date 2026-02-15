import type { APIRoute } from 'astro';
import { pool, getSelectionMode } from '../../lib/db';
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

/**
 * Función para seleccionar múltiples películas únicas
 */
function selectMultipleRandomFilms(titlesData: any[], count: number): any[] {
  const selectedFilms: any[] = [];
  const selectedIds = new Set<number>();
  let attempts = 0;
  const maxAttempts = count * 10; // Intentos máximos para evitar bucle infinito

  while (selectedFilms.length < count && attempts < maxAttempts) {
    attempts++;
    
    const selection = selectRandomValidFilm(titlesData);
    
    if (selection.success && selection.film) {
      const filmId = selection.film.id;
      
      // Solo añadir si no está duplicada
      if (!selectedIds.has(filmId)) {
        selectedIds.add(filmId);
        selectedFilms.push(selection.film);
      }
    }
  }
  
  return selectedFilms;
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

    // 3. Obtener el modo de selección actual
    const selectionMode = await getSelectionMode();

    // ===== MODO NORMAL: Seleccionar 1 película y registrar directamente =====
    if (selectionMode === 'normal') {
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

      // Guardar la review en la base de datos
      await connection.execute(
        'INSERT INTO reviews (film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, selected_by, youtube_id, watched_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [filmId, title, year, null, null, poster, true, null, selected_by || 'Anónimo', null, watchedDate]
      );

      // Marcar el token como usado
      await connection.execute(
        'UPDATE trigger_tokens SET is_active = false, used_by = ? WHERE token = ?',
        [selected_by || 'Anónimo', token]
      );

      // Confirmar transacción
      await connection.commit();

      // Devolver la película seleccionada
      return new Response(
        JSON.stringify({
          valid: true,
          mode: 'normal',
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
    }

    // ===== MODO TRIPLE CHOICE: Devolver 3 opciones sin registrar =====
    if (selectionMode === 'triple_choice') {
      const selectedFilms = selectMultipleRandomFilms(validMovies, 3);

      if (selectedFilms.length < 3) {
        await connection.rollback();
        return new Response(
          JSON.stringify({ 
            valid: false, 
            message: 'No se pudieron seleccionar 3 películas únicas. Intenta de nuevo.' 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // NO marcamos el token como usado todavía
      // NO insertamos película en BD todavía
      // El usuario elegirá y confirm-selection hará eso
      
      await connection.commit();

      // Devolver las 3 opciones
      return new Response(
        JSON.stringify({
          valid: true,
          mode: 'triple_choice',
          message: 'Elige una de estas 3 películas',
          token: token, // Devolver token para confirm-selection
          movies: selectedFilms.map(film => ({
            film_id: film.id,
            title: film.title,
            year: film.year || 'Unknown',
            poster: film.poster_path || ''
          }))
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ===== MODO CATALOG: Redirigir al catálogo =====
    if (selectionMode === 'catalog') {
      await connection.commit();
      
      return new Response(
        JSON.stringify({
          valid: true,
          mode: 'catalog',
          message: 'Redirigiendo al catálogo completo',
          token: token
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fallback (no debería llegar aquí)
    await connection.rollback();
    return new Response(
      JSON.stringify({ valid: false, message: 'Modo de selección desconocido' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
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
