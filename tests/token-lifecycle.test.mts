import test, { after } from "node:test";
import assert from "node:assert/strict";
import {
  TOKEN_TTL_DAYS,
  createTriggerToken,
  validateToken,
  claimToken,
  deactivateToken,
  getTokenData,
  getPool,
} from "../src/lib/db.ts";

/**
 * Estos tests necesitan una base de datos MySQL real.
 * Se ejecutan con `pnpm test:db` (TEST_DB=1) y se saltan en `pnpm test`.
 */
const RUN_DB_TESTS = process.env.TEST_DB === "1";
const skip = RUN_DB_TESTS
  ? false
  : "define TEST_DB=1 para ejecutar los tests de base de datos";

const createdTokens: string[] = [];

async function insertToken(token: string, expiresSql: string) {
  createdTokens.push(token);
  await getPool().query(
    `INSERT INTO trigger_tokens (token, is_active, expires_at)
     VALUES (?, true, ${expiresSql})`,
    [token]
  );
}

after(async () => {
  if (!RUN_DB_TESTS) return;

  const pool = getPool();
  try {
    for (const token of createdTokens) {
      await pool.query("DELETE FROM trigger_tokens WHERE token = ?", [token]);
    }
  } finally {
    await (pool as any).end?.();
  }
});

test("genera tokens de 128 bits en hexadecimal", { skip }, async () => {
  const token = await createTriggerToken();
  createdTokens.push(token);

  assert.match(token, /^[0-9a-f]{32}$/);
  assert.equal(await validateToken(token), true);
});

test("ciclo de vida: crear, validar y reclamar una sola vez", { skip }, async () => {
  const token = await createTriggerToken();
  createdTokens.push(token);

  assert.equal(await validateToken(token), true);

  const data = await getTokenData(token);
  assert.ok(data, "el token recién creado debe existir");
  assert.equal(data.is_active, 1);
  assert.ok(data.expires_at, "el token debe tener caducidad");

  const expiresInDays =
    (new Date(data.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  assert.ok(
    expiresInDays > TOKEN_TTL_DAYS - 1 && expiresInDays <= TOKEN_TTL_DAYS,
    `la caducidad debe rondar ${TOKEN_TTL_DAYS} días (fue ${expiresInDays})`
  );

  assert.equal(await claimToken(token, "Test Runner"), true);
  assert.equal(await validateToken(token), false);
  assert.equal(await getTokenData(token), null);

  assert.equal(await claimToken(token, "Test Runner"), false);
});

test("un token caducado no se valida ni se puede reclamar", { skip }, async () => {
  const token = `caducado${Date.now()}${Math.random().toString(16).slice(2)}`;
  await insertToken(token, "DATE_SUB(NOW(), INTERVAL 1 DAY)");

  assert.equal(await validateToken(token), false);
  assert.equal(await getTokenData(token), null);
  assert.equal(await claimToken(token, "Test Runner"), false);
});

test("un token sin caducidad (legado) sigue siendo válido", { skip }, async () => {
  const token = `legado${Date.now()}${Math.random().toString(16).slice(2)}`;
  await insertToken(token, "NULL");

  assert.equal(await validateToken(token), true);
  assert.equal(await claimToken(token, "Test Runner"), true);
});

test("desactivar un token impide validarlo y reclamarlo", { skip }, async () => {
  const token = await createTriggerToken();
  createdTokens.push(token);

  await deactivateToken(token);

  assert.equal(await validateToken(token), false);
  assert.equal(await claimToken(token, "Test Runner"), false);
});
