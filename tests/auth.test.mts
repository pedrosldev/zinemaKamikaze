import test from "node:test";
import assert from "node:assert/strict";
import {
  createAdminSession,
  verifyAdminSession,
  safeCompare,
} from "../src/lib/auth.ts";

const PASSWORD = "clave-de-prueba-suficientemente-larga";

test("crea una sesión válida y la verifica", async () => {
  const session = await createAdminSession(PASSWORD);
  assert.match(session, /^\d+\.[0-9a-f]+\.[0-9a-f]{64}$/);
  assert.equal(await verifyAdminSession(session, PASSWORD), true);
});

test("rechaza una contraseña distinta", async () => {
  const session = await createAdminSession(PASSWORD);
  assert.equal(await verifyAdminSession(session, "otra-clave"), false);
});

test("rechaza una firma manipulada", async () => {
  const session = await createAdminSession(PASSWORD);
  const [expiresAt, nonce, signature] = session.split(".");
  const tampered = `${expiresAt}.${nonce}.${signature.slice(0, -1)}0`;
  assert.equal(await verifyAdminSession(tampered, PASSWORD), false);
});

test("rechaza una caducidad manipulada", async () => {
  const session = await createAdminSession(PASSWORD);
  const [, nonce, signature] = session.split(".");
  const future = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  assert.equal(
    await verifyAdminSession(`${future}.${nonce}.${signature}`, PASSWORD),
    false
  );
});

test("rechaza una sesión caducada", async () => {
  const session = await createAdminSession(PASSWORD, -10);
  assert.equal(await verifyAdminSession(session, PASSWORD), false);
});

test("rechaza cookies vacías o con formato inválido", async () => {
  assert.equal(await verifyAdminSession(undefined, PASSWORD), false);
  assert.equal(await verifyAdminSession("", PASSWORD), false);
  assert.equal(await verifyAdminSession("abc", PASSWORD), false);
  assert.equal(await verifyAdminSession("1.2.3.4", PASSWORD), false);
  assert.equal(await verifyAdminSession("1.2.3", null), false);
});

test("la contraseña en claro (cookie antigua) no es una sesión válida", async () => {
  assert.equal(await verifyAdminSession(PASSWORD, PASSWORD), false);
});

test("safeCompare compara en tiempo constante", () => {
  assert.equal(safeCompare("abc", "abc"), true);
  assert.equal(safeCompare("abc", "abd"), false);
  assert.equal(safeCompare("abc", "abcd"), false);
  assert.equal(safeCompare(undefined, "abc"), false);
  assert.equal(safeCompare("abc", null), false);
});
