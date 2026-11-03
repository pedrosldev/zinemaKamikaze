import { defineMiddleware } from "astro:middleware";
import { initDb } from "./lib/db";

const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || "tu-password-segura";

export const onRequest = defineMiddleware(async (context, next) => {
    // ==========================================
    // 1. INICIALIZAR BASE DE DATOS (Cloudflare Hyperdrive)
    // ==========================================
    // En Cloudflare, el entorno está en context.locals.runtime.env
    // @ts-ignore
    const env = context.locals.runtime?.env;
    
    if (env) {
        // Inicializamos la DB con el entorno (contiene las credenciales de Hyperdrive)
        initDb(env);
    } else {
        // En local (pnpm dev), initDb() usará automáticamente las variables de XAMPP
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