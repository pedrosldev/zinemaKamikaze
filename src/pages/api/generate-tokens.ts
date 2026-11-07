import type { APIRoute } from "astro";
import { createTriggerToken } from "../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.adminAuthenticated) {
    return new Response(
      JSON.stringify({ success: false, message: "No autorizado" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const token = await createTriggerToken();

    return new Response(
      JSON.stringify({
        token,
        triggerUrl: `${new URL(request.url).origin}/trigger/${token}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ message: "Error al generar el token" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
