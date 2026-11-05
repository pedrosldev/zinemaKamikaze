import type { APIRoute } from "astro";
import { ADMIN_COOKIE, LEGACY_ADMIN_COOKIE } from "../../lib/auth";

export const POST: APIRoute = async ({ cookies }) => {
  // Borra la sesión actual y la cookie antigua que contenía la contraseña.
  cookies.delete(ADMIN_COOKIE, { path: "/" });
  cookies.delete(LEGACY_ADMIN_COOKIE, { path: "/" });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
