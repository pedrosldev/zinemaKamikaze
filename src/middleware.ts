import { defineMiddleware } from "astro:middleware";
import { initDb } from "./lib/db";
import { env } from "cloudflare:workers"; // 👈 La importación mágica

const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || "tu-password-segura";

export const onRequest = defineMiddleware(async (context, next) => {
    // ==========================================
    // 1. INICIALIZAR BASE DE DATOS (Cloudflare Hyperdrive)
    // ==========================================
    // El objeto 'env' ahora viene de la importación de 'cloudflare:workers'
    // Si no existe (ej. en local con Netlify), pasamos 'undefined' para que use XAMPP
    if (env && (env as any).HYPERDRIVE) {
        initDb(env);
    } else {
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