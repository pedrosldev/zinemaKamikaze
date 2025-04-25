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
    await insertReview(body.film_id, body.title, body.year);

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
