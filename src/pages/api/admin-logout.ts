import type { APIRoute } from "astro";

// export const POST: APIRoute = async ({ cookies }) => {
//     // cookies.delete("admin_auth", { path: "/" });
//     cookies.delete("admin_auth", { path: "/", sameSite: "strict" });

//     return new Response(JSON.stringify({ success: true }), {
//         status: 200,
//         headers: { "Content-Type": "application/json" }
//     });
// };

export const POST: APIRoute = async ({ cookies }) => {
    // Método 1: Delete con todas las combinaciones posibles
    cookies.delete("admin_auth", { path: "/" });
    cookies.delete("admin_auth", { path: "/", domain: "zinemakamikaze.com" });
    cookies.delete("admin_auth", { path: "/", domain: ".zinemakamikaze.com" });
    cookies.delete("admin_auth", { path: "/", domain: "www.zinemakamikaze.com" });

    // Método 2: Sobrescribir con expiración inmediata
    cookies.set("admin_auth", "", {
        path: "/",
        maxAge: -1,
        expires: new Date(0)
    });

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            // Método 3: Header directo
            "Set-Cookie": "admin_auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0"
        }
    });
};