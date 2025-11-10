import { createPool } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import type { RowDataPacket } from 'mysql2';
dotenv.config();

const pool = createPool({
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
  export async function insertReview(film_id: number, title: string, year: number, review: string, vibe: string, poster: string) {
    const [result] = await pool.execute(
      'INSERT INTO test_reviews (film_id, title, year, review, vibe, poster_url) VALUES (?, ?, ?, ?, ?, ?)',
      [film_id, title, year, review, vibe, poster]
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

// Añade esta interface con las otras interfaces
interface TokenRow extends RowDataPacket {
  token: string;
  is_active: boolean;
  created_at: string;
}

// Añade estas funciones al final del archivo db.ts
export async function createTriggerToken(): Promise<string> {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

  await pool.execute(
    "INSERT INTO trigger_tokens (token, is_active) VALUES (?, true)",
    [token]
  );

  return token;
}

export async function validateToken(token: string): Promise<boolean> {
  const [rows] = await pool.query<(TokenRow & RowDataPacket)[]>(
    "SELECT is_active FROM trigger_tokens WHERE token = ? AND is_active = true",
    [token]
  );

  return rows.length > 0;
}

export async function deactivateToken(token: string): Promise<void> {
  await pool.execute(
    "UPDATE trigger_tokens SET is_active = false WHERE token = ?",
    [token]
  );
}

export async function getActiveTokens(): Promise<TokenRow[]> {
  const [rows] = await pool.query<(TokenRow & RowDataPacket)[]>(
    "SELECT * FROM trigger_tokens WHERE is_active = true ORDER BY created_at DESC"
  );
  return rows;
}