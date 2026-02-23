import type { APIRoute } from 'astro';
import { pool } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { token, film_id, title, year, poster, selected_by } = body;

  // Validaciones básicas
  if (!token || !film_id || !title) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Faltan datos requeridos (token, film_id, title)' 
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const connection = await pool.getConnection();

  try {
    // Iniciar transacción para operación atómica
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
          message: 'Token inválido o ya utilizado' 
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Verificar si ya existe una review con este film_id
    const [existingReviews]: any = await connection.query(
      'SELECT id, title, review FROM reviews WHERE film_id = ?',
      [film_id]
    );

    const posterUrl = poster || '';
    const movieYear = year || new Date().getFullYear();

    console.log(`🔍 Verificando película film_id=${film_id}, existe=${existingReviews.length > 0}`, 
      existingReviews.length > 0 ? { id: existingReviews[0].id, title: existingReviews[0].title, hasReview: existingReviews[0].review !== null } : 'nueva');

    if (existingReviews.length > 0) {
      // Si ya existe, resetear la review para un nuevo viewing period
      const reviewId = existingReviews[0].id;
      
      const [updateResult]: any = await connection.query(
        `UPDATE reviews 
         SET viewing_period = true, 
             selected_by = ?,
             poster_url = ?,
             year = ?,
             review = NULL,
             vibe = NULL,
             expectation_mood = NULL,
             youtube_id = NULL,
             watched_date = NULL
         WHERE film_id = ?`,
        [selected_by || 'Anónimo', posterUrl, movieYear, film_id]
      );
      
      console.log(`📝 UPDATE ejecutado: affectedRows=${updateResult.affectedRows}, changedRows=${updateResult.changedRows}`);
      
      // Limpiar comentarios de expectativas anteriores
      await connection.query(
        'DELETE FROM expectation_comments WHERE film_id = ?',
        [film_id]
      );
      
      // Limpiar comentarios de la crítica anterior
      await connection.query(
        'DELETE FROM comments WHERE review_id = ?',
        [reviewId]
      );
      
      console.log(`✅ Película RE-seleccionada: ${title} (${film_id}) por ${selected_by || 'Anónimo'}`);
    } else {
      // Si no existe, insertar nueva review
      await connection.query(
        `INSERT INTO reviews 
         (film_id, title, year, poster_url, selected_by, review, vibe, viewing_period, expectation_mood, youtube_id, watched_date) 
         VALUES (?, ?, ?, ?, ?, NULL, NULL, true, NULL, NULL, NULL)`,
        [film_id, title, movieYear, posterUrl, selected_by || 'Anónimo']
      );
      console.log(`✅ Película seleccionada: ${title} (${film_id}) por ${selected_by || 'Anónimo'}`);
    }

    // 3. Marcar el token como usado
    await connection.query(
      'UPDATE trigger_tokens SET is_active = false WHERE token = ?',
      [token]
    );

    // Commit de la transacción
    await connection.commit();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Película seleccionada exitosamente',
        film_id,
        title
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    await connection.rollback();
    
    console.error('Error en confirm-catalog-selection:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      film_id,
      title
    });

    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Error al procesar la selección' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    connection.release();
  }
};
