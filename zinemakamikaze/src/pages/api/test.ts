export const GET = async () => {
    return new Response(JSON.stringify({ message: '¡Todo está funcionando!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  