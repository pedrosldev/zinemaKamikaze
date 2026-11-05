// src/pages/api/set-selection-mode.ts
import type { APIRoute } from "astro";
import { setSelectionMode } from "../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // El middleware ya exige sesión, pero comprobamos de nuevo aquí.
    if (!locals.adminAuthenticated) {
      return new Response(
        JSON.stringify({ success: false, message: "No autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { mode } = body;

    if (!["normal", "triple_choice", "catalog"].includes(mode)) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Modo inválido. Debe ser: normal, triple_choice o catalog",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await setSelectionMode(mode);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Modo de selección actualizado a: ${mode}`,
        mode,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error al actualizar modo de selección:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Error al actualizar el modo de selección",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
