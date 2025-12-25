import { defineMiddleware } from "astro:middleware";

const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || "tu-password-segura";

export const onRequest = defineMiddleware(async (context, next) => {
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