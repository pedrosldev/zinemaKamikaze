import { defineMiddleware } from "astro:middleware";

// Define una contraseña o token de administrador
const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || "tu-password-segura";

export const onRequest = defineMiddleware(async (context, next) => {
    const { url, cookies, redirect } = context;

    // Excluir la ruta de login y las APIs de autenticación
    const isLoginPage = url.pathname === "/admin/login";
    const isAuthAPI = url.pathname === "/api/admin-login" || url.pathname === "/api/admin-logout";

    // Solo proteger rutas que empiecen con /admin, EXCEPTO login y APIs de auth
    if (url.pathname.startsWith("/admin") && !isLoginPage && !isAuthAPI) {
        const authToken = cookies.get("admin_auth")?.value;

        // Si no hay token válido, redirigir al login
        if (authToken !== ADMIN_PASSWORD) {
            return redirect("/admin/login");
        }
    }

    return next();
});