import type { APIRoute } from "astro";
import {
  updateReview,
  getReviewsWithNullReview,
} from "../../lib/db";
import { sanitizeVibe } from "../../lib/vibes";

export const prerender = false;

function unauthorized(): Response {
  return new Response(
    JSON.stringify({ success: false, message: "No autorizado" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.adminAuthenticated) return unauthorized();

  const body = await request.json();

  if (!body.id) {
    return new Response(
      JSON.stringify({ message: "El id de la review es obligatorio" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    await updateReview(
      Number(body.id),
      Number(body.film_id),
      String(body.title || ""),
      Number(body.year) || 0,
      body.review || null,
      sanitizeVibe(body.vibe),
      String(body.poster || ""),
      false, // viewing_period
      body.expectation_mood || null, // expectation_mood
      body.final_mood || null, // final_mood
      body.youtube_id || null, // youtube_id
      body.watched_date || null // watched_date
    );

    return new Response(
      JSON.stringify({ message: "Review actualizada exitosamente" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ message: "Error al actualizar la review" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.adminAuthenticated) return unauthorized();

  try {
    const reviews = await getReviewsWithNullReview();
    return new Response(JSON.stringify(reviews), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ message: "Error al obtener las reviews" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
