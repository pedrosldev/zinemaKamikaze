// src/pages/api/register-review.ts
import type { APIRoute } from 'astro';
import { insertReview } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();

  if (!body.film_id) {
    return new Response(
      JSON.stringify({ message: 'El film_id es obligatorio' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Obtener selected_by y validar token
    let selected_by = 'Anónimo';
    
    if (body.token) {
      // Verificar que el token existe y NO está usado
      const [tokenRows]: any = await pool.query(
        'SELECT * FROM trigger_tokens WHERE token = ? AND is_active = true',
        [body.token]
      );
      
      if (tokenRows.length === 0) {
        return new Response(
          JSON.stringify({ message: 'Token inválido o ya utilizado' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Usar el selected_by del frontend (ya lo guardamos en validateToken)
      selected_by = tokenRows[0].used_by || 'Anónimo';
    }

    // Establecer fecha actual si no se proporciona
    const watchedDate = body.watched_date || new Date().toISOString().split('T')[0];

    // Insertar la review
    await insertReview(
      body.film_id, 
      body.title, 
      body.year, 
      body.review || null,
      body.vibe, 
      body.poster,
      true,  // viewing_period
      null,  // expectation_mood
      selected_by,
      body.youtube_id || null,
      watchedDate
    );
    
    // AHORA SÍ marcar el token como usado (solo si la review se guardó exitosamente)
    if (body.token) {
      await pool.execute(
        'UPDATE trigger_tokens SET is_active = false WHERE token = ?',
        [body.token]
      );
    }

    return new Response(
      JSON.stringify({ message: 'Review guardada exitosamente' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ message: 'Error al guardar la review' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
