import { createPool } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
dotenv.config();

// ==========================================
// CONFIGURACIÓN DEL POOL DE CONEXIONES
// ==========================================
let pool: Pool | null = null;

export function initDb(env?: any) {
  if (pool) return; // Si ya está inicializado, no hacemos nada

  // Si nos pasan el env de Cloudflare (Hyperdrive)
  if (env && env.HYPERDRIVE) {
    pool = createPool({
      host: env.HYPERDRIVE.host,
      user: env.HYPERDRIVE.user,
      password: env.HYPERDRIVE.password,
      database: env.HYPERDRIVE.database,
      port: env.HYPERDRIVE.port,
      disableEval: true,
    });
  } else {
    // Entorno Local (Netlify/XAMPP). 
    // Si estamos en Cloudflare pero falló el env, esto intentará conectar a localhost (dará error en prod, pero no crasheará Astro)
    pool = createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'zinemakamikaze',
      port: Number(process.env.DB_PORT) || 3306,
    });
  }
}

if (!(globalThis as any).__dbInitialized) {
  initDb((globalThis as any).__cf_env);
  (globalThis as any).__dbInitialized = true;
}

// Función auxiliar para asegurar que el pool existe antes de usarlo
function getPool(): Pool {
  if (!pool) {
    // throw new Error("La base de datos no ha sido inicializada. Llama a initDb(env) primero.");
    initDb();
  }
  return pool as Pool;
}

// ==========================================
// INTERFACES
// ==========================================
interface ReviewRow extends RowDataPacket {
  id: number;
  title: string;
  year: number;
  vibe: string;
  film_id: number;
  poster: string;
  description: string;
  youtube_id?: string;
  review?: string;
  expectation_mood?: string;
  final_mood?: string;
  selected_by?: string;
  watched_date?: string;
}

interface VibeRow extends RowDataPacket {
  vibe: string;
}

interface ReviewedMovieRow extends RowDataPacket {
  id: number;
  film_id: number;
  title: string;
  year: number;
  poster_url: string;
  vibe: string;
}

interface TokenRow extends RowDataPacket {
  token: string;
  is_active: boolean;
  created_at: string;
}

interface CommentRow extends RowDataPacket {
  id: number;
  review_id: number;
  author_name: string;
  content: string;
  created_at: string;
}

interface ExpectationCommentRow extends RowDataPacket {
  id: number;
  film_id: number;
  author_name: string;
  content: string;
  created_at: string;
}

interface AppSettingRow extends RowDataPacket {
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_at: string;
}

// ==========================================
// FUNCIONES DE LA BASE DE DATOS
// ==========================================

export async function insertReview(film_id: number, title: string, year: number, review: string | null, vibe: string, poster: string, viewing_period: boolean = true, expectation_mood: string | null = null, selected_by: string | null = null, youtube_id: string | null = null, watched_date: string | null = null  ) {
  const [result] = await getPool().execute(
    'INSERT INTO reviews (film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, selected_by, youtube_id, watched_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [film_id, title, year, review, vibe, poster, viewing_period, expectation_mood, selected_by, youtube_id, watched_date]
  );
  return result;
}

export async function getAllVibes():Promise<string[]>{
  const [rows] = await getPool().query<VibeRow[]>("SELECT DISTINCT vibe FROM reviews");
  return rows.map((row: any) => row.vibe);
}

export async function getReviewsByVibe(vibe: string): Promise<Pick<ReviewRow, 'id' |'title' | 'year' | 'film_id' | 'poster'>[]> {
  const [rows] = await getPool().query<Array<Pick<ReviewRow, 'id' | 'title' | 'year' | 'film_id' | 'poster'> & RowDataPacket>>(
    "SELECT id, title, year, film_id, poster_url AS poster FROM reviews WHERE vibe = ?",
    [vibe]
  );
  return rows;
}

export async function getReviewById(id: number): Promise<ReviewRow | null> {
  const [rows] = await getPool().query<(ReviewRow & RowDataPacket)[]>(
    "SELECT * FROM reviews WHERE id = ?",
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function createTriggerToken(): Promise<string> {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

  await getPool().execute(
    "INSERT INTO trigger_tokens (token, is_active) VALUES (?, true)",
    [token]
  );

  return token;
}

export async function validateToken(token: string): Promise<boolean> {
  const [rows] = await getPool().query<(TokenRow & RowDataPacket)[]>(
    "SELECT is_active FROM trigger_tokens WHERE token = ? AND is_active = true",
    [token]
  );

  return rows.length > 0;
}

export async function deactivateToken(token: string): Promise<void> {
  await getPool().execute(
    "UPDATE trigger_tokens SET is_active = false WHERE token = ?",
    [token]
  );
}

// Función atómica para reclamar un token (evita race conditions)
export async function claimToken(token: string, used_by: string = 'Anónimo'): Promise<boolean> {
  try {
    const [result]: any = await getPool().execute(
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
  const [rows]: any = await getPool().query(
    "SELECT * FROM trigger_tokens WHERE token = ? LIMIT 1",
    [token]
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function getActiveTokens(): Promise<TokenRow[]> {
  const [rows] = await getPool().query<(TokenRow & RowDataPacket)[]>(
    "SELECT * FROM trigger_tokens WHERE is_active = true ORDER BY created_at DESC"
  );
  return rows;
}

export async function getReviewsWithNullReview(): Promise<Pick<ReviewRow, 'id' | 'film_id' | 'title' | 'year' | 'poster' | 'youtube_id' | 'vibe' | 'expectation_mood'>[]> {
  try {
    const [rows] = await getPool().execute<Array<Pick<ReviewRow, 'id' | 'film_id' | 'title' | 'year' | 'poster' | 'youtube_id' | 'vibe' | 'expectation_mood'> & RowDataPacket>>(
      'SELECT id, film_id, title, year, poster_url as poster, youtube_id, vibe, expectation_mood FROM reviews WHERE review IS NULL'
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
  review: string | null,
  vibe: string,
  poster_url: string,
  viewing_period: boolean = false,
  expectation_mood: string | null = null,
  final_mood: string | null = null,
  youtube_id: string | null = null,
  watched_date: string | null = null
) {
  try {
    const [result] = await getPool().execute(
      'UPDATE reviews SET film_id = ?, title = ?, year = ?, review = ?, vibe = ?, poster_url = ?, viewing_period=?, expectation_mood=?, final_mood=?, youtube_id=?, watched_date=? WHERE id = ?',
      [film_id, title, year, review, vibe, poster_url, viewing_period, expectation_mood, final_mood, youtube_id, watched_date, id]
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
    const [rows] = await getPool().execute(
      'SELECT id, film_id, title, year, type, vibe, poster_url, review FROM reviews WHERE id = ?',
      [id]
    );
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting review for edit:', error);
    throw error;
  }
}

export async function getLatestMovie() {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM reviews WHERE viewing_period = true ORDER BY id DESC LIMIT 1"
  );
  return rows.length > 0 ? rows[0] : null;
}

export async function updateExpectationMood(id: number, expectation_mood: string) {
  try {
    const [result] = await getPool().execute(
      'UPDATE reviews SET expectation_mood = ? WHERE id = ?',
      [expectation_mood, id]
    );
    return result;
  } catch (error) {
    console.error('Error updating expectation mood:', error);
    throw error;
  }
}

// Obtener todas las reviews de una película específica
export async function getReviewsByFilmId(filmId: number): Promise<ReviewRow[]> {
  const [rows] = await getPool().query<(ReviewRow & RowDataPacket)[]>(
    `SELECT * FROM reviews 
     WHERE film_id = ? 
     ORDER BY id ASC`,
    [filmId]
  );
  return rows;
}

// Obtener películas con múltiples reviews
export async function getMoviesWithMultipleReviews() {
  const [rows] = await getPool().query<(RowDataPacket & { 
    film_id: number; 
    title: string; 
    review_count: number;
    poster_url: string;
  })[]>(
    `SELECT film_id, title, poster_url, COUNT(*) as review_count 
     FROM reviews 
     GROUP BY film_id, title, poster_url 
     HAVING COUNT(*) > 1
     ORDER BY review_count DESC`
  );
  return rows;
}

// Obtener todas las películas que ya tienen review (películas revisadas)
export async function getReviewedMovies(): Promise<ReviewedMovieRow[]> {
  const [rows] = await getPool().query<ReviewedMovieRow[]>(
    `SELECT id, film_id, title, year, poster_url, vibe 
     FROM reviews 
     WHERE review IS NOT NULL AND viewing_period = false
     ORDER BY id DESC`
  );
  return rows;
}

// Contar cuántas reviews tiene una película
export async function getReviewCountByFilmId(filmId: number): Promise<number> {
  const [rows] = await getPool().query<(RowDataPacket & { count: number })[]>(
    'SELECT COUNT(*) as count FROM reviews WHERE film_id = ?',
    [filmId]
  );
  return rows[0]?.count || 0;
}

// ============= COMENTARIOS =============

// Añadir un comentario a una review
export async function addComment(reviewId: number, authorName: string, content: string) {
  const [result] = await getPool().execute(
    'INSERT INTO comments (review_id, author_name, content) VALUES (?, ?, ?)',
    [reviewId, authorName, content]
  );
  return result;
}

// Obtener todos los comentarios de una review
export async function getCommentsByReviewId(reviewId: number): Promise<CommentRow[]> {
  const [rows] = await getPool().query<(CommentRow & RowDataPacket)[]>(
    'SELECT * FROM comments WHERE review_id = ? ORDER BY created_at ASC',
    [reviewId]
  );
  return rows;
}

// ============= COMENTARIOS DE EXPECTATIVAS =============

// Añadir un comentario de expectativa sobre una película
export async function addExpectationComment(filmId: number, authorName: string, content: string) {
  const [result] = await getPool().execute(
    'INSERT INTO expectation_comments (film_id, author_name, content) VALUES (?, ?, ?)',
    [filmId, authorName, content]
  );
  return result;
}

// Obtener todos los comentarios de expectativa de una película
export async function getExpectationCommentsByFilmId(filmId: number): Promise<ExpectationCommentRow[]> {
  const [rows] = await getPool().query<(ExpectationCommentRow & RowDataPacket)[]>(
    'SELECT * FROM expectation_comments WHERE film_id = ? ORDER BY created_at ASC',
    [filmId]
  );
  return rows;
}

// ============= CONFIGURACIÓN DE LA APLICACIÓN =============

/**
 * Obtiene el valor de un setting de configuración
 * @param key - Clave del setting
 * @param defaultValue - Valor por defecto si no existe
 * @returns El valor del setting o el valor por defecto
 */
export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  const [rows] = await getPool().query<(AppSettingRow & RowDataPacket)[]>(
    'SELECT setting_value FROM app_settings WHERE setting_key = ?',
    [key]
  );
  
  return rows.length > 0 ? rows[0].setting_value : defaultValue;
}

/**
 * Actualiza o crea un setting de configuración
 * @param key - Clave del setting
 * @param value - Nuevo valor
 * @param description - Descripción opcional (solo para nuevos settings)
 */
export async function setSetting(key: string, value: string, description: string | null = null): Promise<void> {
  await getPool().execute(
    `INSERT INTO app_settings (setting_key, setting_value, description) 
     VALUES (?, ?, ?) 
     ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()`,
    [key, value, description, value]
  );
}

/**
 * Obtiene todos los settings de configuración
 * @returns Array con todos los settings
 */
export async function getAllSettings(): Promise<AppSettingRow[]> {
  const [rows] = await getPool().query<(AppSettingRow & RowDataPacket)[]>(
    'SELECT * FROM app_settings ORDER BY setting_key'
  );
  return rows;
}

/**
 * Obtiene el modo de selección de películas actual
 * @returns 'normal' | 'triple_choice' | 'catalog'
 */
export async function getSelectionMode(): Promise<'normal' | 'triple_choice' | 'catalog'> {
  const mode = await getSetting('selection_mode', 'normal');
  return mode as 'normal' | 'triple_choice' | 'catalog';
}

/**
 * Actualiza el modo de selección de películas
 * @param mode - 'normal' | 'triple_choice' | 'catalog'
 */
export async function setSelectionMode(mode: 'normal' | 'triple_choice' | 'catalog'): Promise<void> {
  await setSetting('selection_mode', mode);
}