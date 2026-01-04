// src/pages/api/register-review.ts
import type { APIRoute } from 'astro';
import { insertReview, getTokenData } from '../../lib/db';

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
    // Si se proporcionó un token, obtener el used_by de ahí
    let selected_by = 'Anónimo';
    if (body.token) {
      const tokenData = await getTokenData(body.token);
      selected_by = tokenData?.used_by || 'Anónimo';
    }

    // Establecer fecha actual si no se proporciona
    const watchedDate = body.watched_date || new Date().toISOString().split('T')[0];

    await insertReview(
      body.film_id, 
      body.title, 
      body.year, 
      body.review || null,  // Permitir null si solo hay video
      body.vibe, 
      body.poster,
      true,  // viewing_period
      null,  // expectation_mood
      selected_by,  // selected_by
      body.youtube_id || null,  // youtube_id
      watchedDate  // watched_date (automático si no se proporciona)
    );

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
