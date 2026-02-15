// src/pages/api/confirm-selection.ts
import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';

export const prerender = false;

/**
 * Endpoint para confirmar la selección de una película en modo triple_choice
 * Registra la película en BD y marca el token como usado
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { token, film_id, title, year, poster, selected_by } = body;

  // Validar datos requeridos
  if (!token || !film_id || !title) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Faltan datos requeridos: token, film_id, title' 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const connection = await pool.getConnection();

  try {
    // Iniciar transacción
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
          success: false,
          message: 'Token inválido, ya utilizado o expirado'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar que la película no esté ya registrada (evitar duplicados)
    const [existingReviews]: any = await connection.query(
      'SELECT id FROM reviews WHERE film_id = ? AND viewing_period = true AND review IS NULL',
      [film_id]
    );

    if (existingReviews.length > 0) {
      await connection.rollback();
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Esta película ya fue seleccionada anteriormente'
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const watchedDate = new Date().toISOString().split('T')[0];

    // 3. Insertar la review en la base de datos
    await connection.execute(
      `INSERT INTO reviews 
        (film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, selected_by, youtube_id, watched_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        film_id,
        title,
        year || 'Unknown',
        null,                      // review (se añadirá después)
        null,                      // vibe (se añadirá después)
        poster || '',
        true,                      // viewing_period
        null,                      // expectation_mood (se puede añadir después)
        selected_by || 'Anónimo',
        null,                      // youtube_id (se añadirá después)
        watchedDate
      ]
    );

    // 4. Marcar el token como usado
    await connection.execute(
      'UPDATE trigger_tokens SET is_active = false, used_by = ? WHERE token = ?',
      [selected_by || 'Anónimo', token]
    );

    // Confirmar transacción
    await connection.commit();

    // 5. Devolver confirmación
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Película registrada exitosamente',
        movie: {
          film_id,
          title,
          year: year || 'Unknown',
          poster: poster || ''
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Si algo falla, revertir TODO
    await connection.rollback();

    console.error('Error en confirm-selection:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      film_id,
      token: token?.substring(0, 8) + '...'
    });

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error al confirmar la selección. Por favor intenta de nuevo.'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );

  } finally {
    connection.release();
  }
};
