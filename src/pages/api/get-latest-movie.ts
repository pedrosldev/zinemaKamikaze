// src/pages/api/get-latest-movie.ts
import type { APIRoute } from 'astro';
import { getLatestMovie } from '../../lib/db';

export const GET: APIRoute = async () => {
    try {
        const latestMovie = await getLatestMovie();

        return new Response(JSON.stringify({
            success: true,
            movie: latestMovie
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            movie: null
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}