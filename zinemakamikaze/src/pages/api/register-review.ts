import type { APIRoute } from 'astro';
import mysql from 'mysql2/promise';

// Uso variables de entorno para la conexión a la base de datos
const db_host = import.meta.env.DB_HOST || 'localhost'; 
const db_user = import.meta.env.DB_USER; 
const db_password = import.meta.env.DB_PASSWORD; 
const db_database = import.meta.env.DB_DATABASE; 
const db_port = import.meta.env.DB_PORT;

const connection = await mysql.createConnection({
    host: db_host,
    user: db_user,
    password: db_password,
    database: db_database,
    port: db_port,
});


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
        host: '200.234.227.110',
        user: 'root',
        password: 'root',
        database: 'zinemakamikaze',
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
