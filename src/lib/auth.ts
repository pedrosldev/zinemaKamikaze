/**
 * Sesiones de administración firmadas con HMAC.
 *
 * La cookie NO contiene la contraseña: solo un payload con caducidad y su
 * firma. Rotar ADMIN_PASSWORD invalida automáticamente todas las sesiones.
 */

export const ADMIN_COOKIE = "admin_session";
export const LEGACY_ADMIN_COOKIE = "admin_auth";
export const ADMIN_SESSION_TTL = 60 * 60 * 24; // 24 horas

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytes: number): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function sign(password: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  return toHex(new Uint8Array(signature));
}

/** Comparación en tiempo constante para evitar filtraciones por timing. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function safeCompare(
  a: string | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) return false;
  return constantTimeEqual(a, b);
}

/** Crea una cookie de sesión: `<expiración>.<nonce>.<firma>`. */
export async function createAdminSession(
  password: string,
  ttlSeconds: number = ADMIN_SESSION_TTL
): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const nonce = randomHex(12);
  const payload = `${expiresAt}.${nonce}`;
  const signature = await sign(password, payload);
  return `${payload}.${signature}`;
}

/** Verifica la firma y la caducidad de una cookie de sesión. */
export async function verifyAdminSession(
  token: string | undefined,
  password: string | null
): Promise<boolean> {
  if (!token || !password) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expiresAtRaw, nonce, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = await sign(password, `${expiresAtRaw}.${nonce}`);
  return constantTimeEqual(signature, expected);
}
