// src/pages/api/set-selection-mode.ts
import type { APIRoute } from 'astro';
import { setSelectionMode } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación de admin
    const authToken = cookies.get('admin_auth')?.value;
    const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || 'tu-password-segura';

    if (authToken !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ success: false, message: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener el modo del request
    const body = await request.json();
    const { mode } = body;

    // Validar que el modo sea válido
    if (!['normal', 'triple_choice', 'catalog'].includes(mode)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Modo inválido. Debe ser: normal, triple_choice o catalog' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Actualizar el modo en la base de datos
    await setSelectionMode(mode);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Modo de selección actualizado a: ${mode}`,
        mode
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error al actualizar modo de selección:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error al actualizar el modo de selección'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
