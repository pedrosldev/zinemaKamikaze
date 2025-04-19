import type { APIRoute } from 'astro';
import mysql from 'mysql2/promise';
export const prerender = false;

// Uso variables de entorno para la conexión a la base de datos
const db_host = import.meta.env.DB_HOST || '127.0.0.1';
const db_user = import.meta.env.DB_USER || 'root';
const db_password = import.meta.env.DB_PASSWORD || 'root';
const db_database = import.meta.env.DB_NAME || 'zinemakamikaze';
const db_port = Number(import.meta.env.DB_PORT);
// const db_host =  'localhost';
// const db_user =  'root';
// const db_password = '';
// const db_database = 'zinemakamikaze';
// const db_port = 3306;
console.log('DB_HOST:', db_host);
console.log('DB_USER:', db_user);
console.log('DB_PASSWORD:', db_password);
console.log('DB_NAME:', db_database);
// const connection = await mysql.createConnection({
//     host: db_host,
//     user: db_user,
//     password: db_password,
//     database: db_database,
//     port: db_port,
// });


export const POST: APIRoute = async ({ request }) => {
    const body = await request.json();
    console.log('Body:', body);
    if (!body.film_id) {
        return new Response(
            JSON.stringify({ message: 'El film_id es obligatorio' }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }

    const connection = await mysql.createConnection({
        host: db_host,
        user: db_user,
        password: db_password,
        database: db_database,
        port: 3306,
    });

    try {
        await connection.execute(
            'INSERT INTO test_reviews (film_id) VALUES (?)',
            [body.film_id]
        );

        return new Response(
            JSON.stringify({ message: 'Review guardada exitosamente' }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error(error);
        return new Response(
            JSON.stringify({ message: 'Error al guardar la review' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } finally {
        await connection.end();
    }
};
