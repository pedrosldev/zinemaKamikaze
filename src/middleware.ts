import { defineMiddleware } from "astro:middleware";
import { initDb } from "./lib/db";

const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || "tu-password-segura";

export const onRequest = defineMiddleware(async (context, next) => {
    // ==========================================
    // 1. INICIALIZAR BASE DE DATOS (Solo en Cloudflare)
    // ==========================================
    // Usamos import() dinámico para que solo se ejecute en el runtime de Cloudflare
    // y no durante el pre-renderizado de Node.js.
    try {
        const { env } = await import("cloudflare:workers");
       if (env && (env as any).HYPERDRIVE) {
            initDb(env);
        } else {
            initDb();
        }
    } catch (e) {
        // Si falla (ej. en local con Netlify), usamos la conexión local
        initDb();
    }

    // ==========================================
    // 2. LÓGICA DE AUTENTICACIÓN (La que ya tenías)
    // ==========================================
    const { url, cookies, redirect } = context;

    // No proteger ninguna ruta /api
    if (url.pathname.startsWith("/api/")) {
        return next();
    }

    const isLoginPage = url.pathname === "/admin/login";

    // Proteger solo páginas /admin (no APIs)
    if (url.pathname.startsWith("/admin") && !isLoginPage) {
        const authToken = cookies.get("admin_auth")?.value;

        if (authToken !== ADMIN_PASSWORD) {
            return redirect("/admin/login");
        }
    }

    return next();
});