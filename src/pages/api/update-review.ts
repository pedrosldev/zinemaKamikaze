import type { APIRoute } from 'astro';
import { updateReview, getReviewsWithNullReview } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    const body = await request.json();

    if (!body.id) {
        return new Response(
            JSON.stringify({ message: 'El id de la review es obligatorio' }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }

    try {
        await updateReview(
            body.id,
            body.film_id,
            body.title,
            body.year,
            body.review,
            body.vibe,
            body.poster,
            false, // viewing_period
            body.expectation_mood || null // expectation_mood
        );

        return new Response(
            JSON.stringify({ message: 'Review actualizada exitosamente' }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ message: 'Error al actualizar la review' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
};

export const GET: APIRoute = async () => {
    try {
        const reviews = await getReviewsWithNullReview();
        return new Response(
            JSON.stringify(reviews),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ message: 'Error al obtener las reviews' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
};