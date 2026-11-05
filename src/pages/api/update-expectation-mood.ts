import type { APIRoute } from "astro";
import { updateExpectationMood } from "../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.adminAuthenticated) {
    return new Response(
      JSON.stringify({ success: false, message: "No autorizado" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

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
    await updateExpectationMood(Number(body.id), body.expectation_mood || null);

    return new Response(
      JSON.stringify({ message: "Expectativa actualizada exitosamente" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ message: "Error al actualizar la expectativa" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
