import type { APIRoute } from 'astro';
import { validateToken, deactivateToken } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    const body = await request.json();
    const { token } = body;

    if (!token) {
        return new Response(
            JSON.stringify({ valid: false, message: 'Token requerido' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const isValid = await validateToken(token);

        if (isValid) {
            // Desactivar el token después de usarlo (para un solo uso)
            await deactivateToken(token);

            return new Response(
                JSON.stringify({
                    valid: true,
                    message: 'Token válido'
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        } else {
            return new Response(
                JSON.stringify({
                    valid: false,
                    message: 'Token inválido o ya utilizado'
                }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }
    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ message: 'Error al validar el token' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};