import type { APIRoute } from 'astro';
import { pool, TOKEN_USABLE_SQL } from '../../lib/db';

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

    try {
        // PRIMERO: Verificar que el token existe y NO ha sido usado
        const [rows]: any = await pool.query(
            `SELECT * FROM trigger_tokens WHERE token = ? AND ${TOKEN_USABLE_SQL}`,
            [token]
        );

        if (rows.length > 0) {
            const name = typeof selected_by === 'string' && selected_by.trim()
                ? selected_by.trim().slice(0, 100)
                : 'Anónimo';

            // Token válido - Guardar el selected_by pero NO marcar como usado todavía
            await pool.execute(
                'UPDATE trigger_tokens SET used_by = ? WHERE token = ?',
                [name, token]
            );
            
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