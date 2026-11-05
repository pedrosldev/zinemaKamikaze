import { defineMiddleware } from "astro:middleware";
import { ADMIN_PASSWORD } from "astro:env/server";
import { initDb } from "./lib/db";
import { ADMIN_COOKIE, verifyAdminSession } from "./lib/auth";

/**
 * Endpoints que pueden llamarse sin sesión de admin.
 * Cualquier otro `/api/*` exige sesión válida.
 *
 * `register-review` se valida dentro del propio handler porque admite tanto
 * sesión de admin como un token de selección válido.
 */
const PUBLIC_API = new Set<string>([
  "/api/admin-login",
  "/api/admin-logout",
  "/api/add-comment",
  "/api/add-expectation-comment",
  "/api/get-latest-movie",
  "/api/titles.json",
  "/api/validate-and-select",
  "/api/confirm-selection",
  "/api/confirm-catalog-selection",
  "/api/validate-tokens",
  "/api/register-review",
]);

async function resolveCloudflareEnv(): Promise<any | null> {
  try {
    const { env } = await import("cloudflare:workers");
    return env ?? null;
  } catch {
    // En local (Node/Netlify) este módulo no existe.
    return null;
  }
}

/**
 * Resuelve la contraseña de admin sin valores por defecto públicos.
 * - Cloudflare: secreto del binding en runtime.
 * - Node/local: variable de entorno.
 * - Dev: `astro:env/server` (cargado desde .env por Astro, sin inline en build).
 */
function resolveAdminPassword(cfEnv: any): string | null {
  return (
    cfEnv?.ADMIN_PASSWORD ||
    (typeof process !== "undefined" ? process.env?.ADMIN_PASSWORD : undefined) ||
    ADMIN_PASSWORD ||
    null
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const cfEnv = await resolveCloudflareEnv();

  // 1. Inicializar la base de datos (Hyperdrive en Cloudflare, pool local en dev).
  initDb(cfEnv ?? undefined);

  // 2. Resolver credenciales y validar la sesión firmada.
  const adminPassword = resolveAdminPassword(cfEnv);
  context.locals.adminPassword = adminPassword;

  const { url, cookies, redirect } = context;
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const isAdmin = await verifyAdminSession(
    cookies.get(ADMIN_COOKIE)?.value,
    adminPassword
  );
  context.locals.adminAuthenticated = isAdmin;

  // 3. APIs: lista blanca explícita; el resto requiere sesión de admin.
  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API.has(pathname) || isAdmin) {
      return next();
    }

    return new Response(
      JSON.stringify({ success: false, message: "No autorizado" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 4. Zona de administración.
  const isLoginPage = pathname === "/admin/login";
  if (pathname.startsWith("/admin") && !isLoginPage && !isAdmin) {
    return redirect("/admin/login");
  }

  return next();
});
