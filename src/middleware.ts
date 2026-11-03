import { defineMiddleware } from "astro:middleware";
import { initDb } from "./lib/db";

export const onRequest = defineMiddleware(async (context, next) => {
    // 1. Valor por defecto (para local)
    let adminPassword = import.meta.env.ADMIN_PASSWORD || "tu-password-segura";

    // ==========================================
    // 2. INICIALIZAR DB Y LEER SECRETS (Solo en Cloudflare)
    // ==========================================
    try {
        const { env } = await import("cloudflare:workers");
        if (env) {
            if ((env as any).HYPERDRIVE) {
                initDb(env);
            } else {
                initDb();
            }

            // 👇 Leemos la contraseña del Secret de Cloudflare
            if ((env as any).ADMIN_PASSWORD) {
                adminPassword = (env as any).ADMIN_PASSWORD;
            }
        } else {
            initDb();
        }
    } catch (e) {
        // Si falla (ej. en local con Netlify), usamos la conexión local
        initDb();
    }

    // ==========================================
    // 3. LÓGICA DE AUTENTICACIÓN
    // ==========================================
    const { url, cookies, redirect } = context;

    if (url.pathname.startsWith("/api/")) {
        return next();
    }

    const isLoginPage = url.pathname === "/admin/login";

    if (url.pathname.startsWith("/admin") && !isLoginPage) {
        const authToken = cookies.get("admin_auth")?.value;

        // 👇 Usamos 'adminPassword' (que ahora tiene el valor de Cloudflare)
        if (authToken !== adminPassword) {
            return redirect("/admin/login");
        }
    }

    return next();
});