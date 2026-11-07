#!/usr/bin/env node
/**
 * Smoke test de solo lectura para un despliegue de ZinemaKamikaze.
 *
 * Uso:
 *   node scripts/smoke-test.mjs https://mi-preview.pages.dev
 *   SMOKE_ENV_FILE=.env.production node scripts/smoke-test.mjs https://mi-preview.pages.dev
 *
 * Variables:
 *   SMOKE_BASE_URL   URL base (alternativa al primer argumento)
 *   SMOKE_ENV_FILE   Archivo .env del que cargar ADMIN_PASSWORD
 *   ADMIN_PASSWORD   Contraseña de admin (si no se usa SMOKE_ENV_FILE)
 *
 * No crea ni modifica películas, críticas ni tokens.
 */

import { config as loadEnv } from 'dotenv';

if (process.env.SMOKE_ENV_FILE) {
  loadEnv({ path: process.env.SMOKE_ENV_FILE });
}

const baseUrl = process.argv[2] || process.env.SMOKE_BASE_URL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!baseUrl) {
  console.error('Falta la URL. Uso: node scripts/smoke-test.mjs https://tu-preview.pages.dev');
  process.exit(2);
}

const base = new URL(baseUrl);
let passed = 0;
let failed = 0;

function ok(name, detail = '') {
  passed++;
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  failed++;
  console.error(`❌ ${name} — ${detail}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    ok(name, detail);
  } catch (error) {
    fail(name, error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const url = new URL(path, base);
  return fetch(url, {
    redirect: 'manual',
    ...options,
    headers: {
      'User-Agent': 'zinemakamikaze-smoke-test',
      ...(options.headers || {}),
    },
  });
}

function getCookie(response, name) {
  const cookies = response.headers.getSetCookie?.() ?? [];
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  return match ? match.split(';')[0] : null;
}

let sessionCookie = null;

console.log(`\n🔎 Smoke test contra ${base.origin}\n`);

await check('La portada responde 200 y es HTML', async () => {
  const res = await request('/');
  assert(res.status === 200, `esperaba 200, recibí ${res.status}`);
  const html = await res.text();
  assert(/<html/i.test(html), 'la respuesta no parece HTML');
  assert(/zinema/i.test(html), 'no aparece "Zinema" en la portada');
  return `HTTP ${res.status}`;
});

await check('Cabeceras de seguridad presentes', async () => {
  const res = await request('/');
  const expected = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
  };
  for (const [header, value] of Object.entries(expected)) {
    assert(
      (res.headers.get(header) || '').toLowerCase() === value.toLowerCase(),
      `falta o es incorrecta la cabecera ${header}`
    );
  }
  return 'X-Content-Type-Options, X-Frame-Options, Referrer-Policy';
});

await check('Una ruta inexistente devuelve 404', async () => {
  const res = await request('/__smoke_no_existe__');
  assert(res.status === 404, `esperaba 404, recibí ${res.status}`);
  return 'HTTP 404';
});

await check('Los archivos internos del servidor no son accesibles', async () => {
  for (const path of ['/server/.dev.vars', '/server/entry.mjs', '/server/chunks/']) {
    const res = await request(path);
    assert(res.status !== 200, `${path} devolvió 200`);
    const body = await res.text();
    assert(!/DB_PASSWORD|ADMIN_PASSWORD/.test(body), `${path} expone secretos`);
  }
  return 'sin acceso a /server/*';
});

await check('/admin sin sesión redirige al login', async () => {
  const res = await request('/admin');
  assert([301, 302, 303, 307, 308].includes(res.status), `esperaba redirección, recibí ${res.status}`);
  const location = res.headers.get('location') || '';
  assert(location.includes('/admin/login'), `redirige a "${location}"`);
  return `HTTP ${res.status} → ${location}`;
});

await check('Login con contraseña incorrecta devuelve 401', async () => {
  const res = await request('/api/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'smoke-test-password-incorrecta' }),
  });
  assert(res.status === 401, `esperaba 401, recibí ${res.status}`);
  return 'HTTP 401';
});

await check('Origen cruzado bloqueado (CSRF)', async () => {
  const res = await request('/api/validate-tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://origen-malicioso.example',
    },
    body: JSON.stringify({ token: 'smoke-test' }),
  });
  assert(res.status === 403, `esperaba 403, recibí ${res.status}`);
  return 'HTTP 403';
});

await check('La base de datos responde (consulta SQL)', async () => {
  const res = await request('/api/validate-tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'smoke-test-token-inexistente' }),
  });
  assert(res.status === 403, `esperaba 403 (token inválido), recibí ${res.status}; ¿Hyperdrive/Aiven?`);
  const body = await res.json();
  assert(body.valid === false, 'respuesta inesperada de validate-tokens');
  return 'consulta SQL correcta';
});

await check('Una API protegida sin sesión devuelve 401', async () => {
  const res = await request('/api/generate-tokens', { method: 'POST' });
  assert(res.status === 401, `esperaba 401, recibí ${res.status}`);
  return 'HTTP 401';
});

if (adminPassword) {
  await check('Login correcto crea la sesión de admin', async () => {
    const res = await request('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword }),
    });
    assert(res.status === 200, `esperaba 200, recibí ${res.status}`);
    sessionCookie = getCookie(res, 'admin_session');
    assert(sessionCookie, 'no se recibió la cookie admin_session');
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith('admin_session='));
    assert(/HttpOnly/i.test(cookie), 'la cookie no es HttpOnly');
    assert(/SameSite=Strict/i.test(cookie), 'la cookie no es SameSite=Strict');
    return 'cookie HttpOnly + SameSite=Strict';
  });

  await check('/admin con sesión responde 200', async () => {
    assert(sessionCookie, 'no hay cookie de sesión');
    const res = await request('/admin', { headers: { Cookie: sessionCookie } });
    assert(res.status === 200, `esperaba 200, recibí ${res.status}`);
    const html = await res.text();
    assert(/ZONA DE ADMINISTRACI/i.test(html), 'no parece la página de administración');
    return 'HTTP 200';
  });
} else {
  console.log('ℹ️  Sin ADMIN_PASSWORD: se omiten las comprobaciones autenticadas.');
}

console.log(`\n${failed === 0 ? '🎉' : '❌'} Resultado: ${passed} OK, ${failed} fallos\n`);
process.exit(failed === 0 ? 0 : 1);
