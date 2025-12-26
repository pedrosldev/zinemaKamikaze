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
  export async function insertReview(film_id: number, title: string, year: number, review: string, vibe: string, poster: string, viewing_period: boolean = true, expectation_mood: string | null = null, selected_by: string | null = null  ) {
    const [result] = await pool.execute(
      'INSERT INTO test_reviews (film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, selected_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [film_id, title, year, review, vibe, poster, viewing_period, expectation_mood, selected_by]
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

// Función atómica para reclamar un token (evita race conditions)
export async function claimToken(token: string, used_by: string = 'Anónimo'): Promise<boolean> {
  try {
    const [result]: any = await pool.execute(
      `UPDATE trigger_tokens 
       SET is_active = false, used_by = ? 
       WHERE token = ? AND is_active = true`,
      [used_by, token]
    );
    
    // Si affectedRows = 1, el token era válido y se reclamó exitosamente
    // Si affectedRows = 0, el token ya estaba usado o no existe
    return result.affectedRows === 1;
  } catch (error) {
    console.error('Error claiming token:', error);
    return false;
  }
}

// Obtener datos completos de un token
export async function getTokenData(token: string) {
  const [rows]: any = await pool.query(
    "SELECT * FROM trigger_tokens WHERE token = ? LIMIT 1",
    [token]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getActiveTokens(): Promise<TokenRow[]> {
  const [rows] = await pool.query<(TokenRow & RowDataPacket)[]>(
    "SELECT * FROM trigger_tokens WHERE is_active = true ORDER BY created_at DESC"
  );
  return rows;
}

export async function getReviewsWithNullReview() {
  try {
    const [rows] = await pool.execute(
      'SELECT id, film_id, title, year, type, vibe, poster_url, expectation_mood FROM test_reviews WHERE review IS NULL'
    );
    return rows;
  } catch (error) {
    console.error('Error getting reviews with null review:', error);
    throw error;
  }
}

// Actualizar una review existente
export async function updateReview(
  id: number,
  film_id: number,
  title: string,
  year: number,
  review: string,
  vibe: string,
  poster_url: string,
  viewing_period: boolean = false,
  expectation_mood: string | null = null,
  final_mood: string | null = null
) {
  try {
    const [result] = await pool.execute(
      'UPDATE test_reviews SET film_id = ?, title = ?, year = ?, review = ?, vibe = ?, poster_url = ?, viewing_period=?, expectation_mood=?, final_mood=? WHERE id = ?',
      [film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, final_mood, id]
    );
    return result;
  } catch (error) {
    console.error('Error updating review:', error);
    throw error;
  }
}

// Función adicional: Obtener review por ID para edición
export async function getReviewForEdit(id: number) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, film_id, title, year, type, vibe, poster_url, review FROM test_reviews WHERE id = ?',
      [id]
    );
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting review for edit:', error);
    throw error;
  }
}

export async function getLatestMovie() {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM test_reviews ORDER BY id DESC LIMIT 1"
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function updateExpectationMood(id: number, expectation_mood: string) {
  try {
    const [result] = await pool.execute(
      'UPDATE test_reviews SET expectation_mood = ? WHERE id = ?',
      [expectation_mood, id]
    );
    return result;
  } catch (error) {
    console.error('Error updating expectation mood:', error);
    throw error;
  }
}