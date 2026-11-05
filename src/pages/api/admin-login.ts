import type { APIRoute } from "astro";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_TTL,
  LEGACY_ADMIN_COOKIE,
  createAdminSession,
  safeCompare,
} from "../../lib/auth";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({
  request,
  cookies,
  locals,
  url,
}) => {
  try {
    const { password } = await request.json();
    const adminPassword = locals.adminPassword;

    if (!adminPassword) {
      return json(
        { success: false, message: "Administración no configurada" },
        503
      );
    }

    if (typeof password !== "string" || !safeCompare(password, adminPassword)) {
      return json({ success: false, message: "Contraseña incorrecta" }, 401);
    }

    const session = await createAdminSession(adminPassword);

    cookies.set(ADMIN_COOKIE, session, {
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "strict",
      maxAge: ADMIN_SESSION_TTL,
      path: "/",
    });

    // Cookie antigua: guardaba la contraseña en claro. Se elimina siempre.
    cookies.delete(LEGACY_ADMIN_COOKIE, { path: "/" });

    return json({ success: true }, 200);
  } catch (error) {
    console.error("Error en admin-login:", error);
    return json({ success: false, message: "Error en el servidor" }, 500);
  }
};
