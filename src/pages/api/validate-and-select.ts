import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

export const prerender = false;

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

    // 3. Seleccionar película aleatoria
    const randomIndex = Math.floor(Math.random() * titlesData.length);
    const pelicula = titlesData[randomIndex];
    const film = Math.floor(Math.random() * pelicula.films.length);
    const selectedFilm = pelicula.films[film];

    const filmId = selectedFilm.id;
    const title = selectedFilm.title;
    const year = selectedFilm.year || 'Unknown';
    const poster = selectedFilm.poster_path || '';
    const watchedDate = new Date().toISOString().split('T')[0];

    // 4. Guardar la review en la base de datos
    await connection.execute(
      'INSERT INTO test_reviews (film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, selected_by, youtube_id, watched_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
    console.error('Error en validate-and-select:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        message: 'Error al procesar la selección' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    connection.release();
  }
};
