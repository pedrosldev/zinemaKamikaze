import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import type { RowDataPacket } from 'mysql2';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
});

interface ReviewRow extends RowDataPacket {
    id: number;
    title: string;
    year: number;
    vibe: string;
    film_id: number;
    poster: string;
    description: string;
  }
  interface VibeRow extends RowDataPacket {
    vibe: string;
  }
  export async function insertReview(film_id: number, title: string, year: number, poster: string) {
    const [result] = await pool.execute(
      'INSERT INTO test_reviews (film_id, title, year, poster_url) VALUES (?, ?, ?, ?)',
      [film_id, title, year, poster]
    );
    return result;
  }

export async function getAllVibes():Promise<string[]>{
  const [rows] = await pool.query<VibeRow[]>("SELECT DISTINCT vibe FROM test_reviews");
  return rows.map((row: any) => row.vibe);
}

export async function getReviewsByVibe(vibe: string): Promise<Pick<ReviewRow, 'id' |'title' | 'year' | 'film_id' | 'poster'>[]> {
  const [rows] = await pool.query<Array<Pick<ReviewRow, 'id' | 'title' | 'year' | 'film_id' | 'poster'> & RowDataPacket>>(
    "SELECT id, title, year, film_id, poster_url AS poster FROM test_reviews WHERE vibe = ?",
    [vibe]
  );
  return rows;
}

export async function getReviewById(id: number): Promise<ReviewRow | null> {
  const [rows] = await pool.query<(ReviewRow & RowDataPacket)[]>(
    "SELECT * FROM test_reviews WHERE id = ?",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}
