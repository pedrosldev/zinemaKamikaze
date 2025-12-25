import titlesData from '../../data/all_titles_with_id.json';

export function GET() {
    return new Response(JSON.stringify(titlesData), {
        headers: {
            "Content-Type": "application/json"
        }
    });
}