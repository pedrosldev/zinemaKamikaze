import type { APIRoute } from "astro";
import { addComment } from "../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { review_id, author_name, content } = await request.json();

    // Validaciones básicas
    if (!review_id || !author_name || !content) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Faltan campos obligatorios" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validar longitud del nombre
    if (author_name.trim().length === 0 || author_name.length > 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "El nombre debe tener entre 1 y 100 caracteres" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validar longitud del contenido
    if (content.trim().length === 0 || content.length > 2000) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "El comentario debe tener entre 1 y 2000 caracteres" 
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insertar el comentario
    await addComment(
      Number(review_id),
      author_name.trim(),
      content.trim()
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Comentario añadido correctamente" 
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error al añadir comentario:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Error al procesar el comentario" 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
