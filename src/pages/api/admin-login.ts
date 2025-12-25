import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { password } = await request.json();
    const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || "tu-password-segura";
    
    if (password === ADMIN_PASSWORD) {
      // Establecer cookie de autenticación (válida por 24 horas)
      cookies.set("admin_auth", ADMIN_PASSWORD, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 horas
        path: "/"
      });
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Contraseña incorrecta" 
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Error en el servidor" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};