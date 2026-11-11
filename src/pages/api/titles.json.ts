import titlesData from '../../data/all_titles_with_id.json';

// Estático: se genera en build y lo sirve la CDN sin gastar CPU.
export const prerender = true;

export function GET() {
    return new Response(JSON.stringify(titlesData), {
        headers: {
            "Content-Type": "application/json"
        }
    });
}