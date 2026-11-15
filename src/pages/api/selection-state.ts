import type { APIRoute } from "astro";
import { getOpenSelection } from "../../lib/db";

export const prerender = false;

/**
 * Estado público de la taquilla.
 *
 * No crea ni consume nada: solo responde si hay una ronda abierta y, si
 * la hay, entrega el pase que el navegador enviará a /api/validate-and-select.
 * El token es el mismo que hasta ahora se publicaba en redes, así que su
 * exposición no cambia; lo que cambia es que ya no hay que teclearlo.
 */
export const GET: APIRoute = async () => {
  const headers = {
    "Content-Type": "application/json",
    // El estado cambia en cuanto alguien elige: nunca debe servirse de caché.
    "Cache-Control": "no-store",
  };

  try {
    const token = await getOpenSelection();

    if (!token) {
      return new Response(JSON.stringify({ open: false }), { status: 200, headers });
    }

    return new Response(
      JSON.stringify({
        open: true,
        openedAt: token.created_at,
        token: token.token,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Error en selection-state:", error);
    return new Response(JSON.stringify({ open: false }), { status: 200, headers });
  }
};
