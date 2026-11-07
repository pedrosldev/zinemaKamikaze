import { existsSync, cpSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';

// 1. Mover los archivos estáticos de dist/client/ a dist/
if (existsSync(join(dist, 'client'))) {
  cpSync(join(dist, 'client'), dist, { recursive: true });
  console.log('Archivos estáticos movidos a la raíz de dist/');
}

// 2. Crear el _worker.js que Pages necesita para el SSR
const workerContent = `export { default } from './server/entry.mjs';`;
writeFileSync(join(dist, '_worker.js'), workerContent);
console.log('_worker.js creado');

// 3. Eliminar archivos que no deben publicarse como assets estáticos.
//    - .dev.vars: lo genera el plugin de Cloudflare para `wrangler dev`.
//    - *.map: exponen el código fuente del servidor.
//    - wrangler.json: configuración interna de build.
const removeIfExists = (path) => {
  if (existsSync(path)) {
    rmSync(path, { force: true });
    console.log(`Eliminado ${path}`);
  }
};

removeIfExists(join(dist, 'server', '.dev.vars'));
removeIfExists(join(dist, 'server', 'wrangler.json'));

function removeMaps(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      removeMaps(full);
    } else if (entry.endsWith('.map')) {
      rmSync(full, { force: true });
    }
  }
}

if (existsSync(join(dist, 'server'))) {
  removeMaps(join(dist, 'server'));
}

// 4. Cabeceras de seguridad y caché.
const headersContent = `/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
`;
writeFileSync(join(dist, '_headers'), headersContent);

// 5. Evitar que el código del servidor se sirva como asset estático.
//    El worker resuelve sus imports en tiempo de despliegue, no por URL.
const redirectsContent = `/server/* / 302
`;
writeFileSync(join(dist, '_redirects'), redirectsContent);

// 6. Eliminar el archivo de redirección que confunde a Pages
const wranglerDeployConfig = join(dist, '..', '.wrangler', 'deploy', 'config.json');
if (existsSync(wranglerDeployConfig)) {
  rmSync(wranglerDeployConfig, { force: true });
  console.log('Configuración de Wrangler eliminada');
}

// 7. Verificación final: ningún secreto debe quedar en el build.
const forbidden = [join(dist, 'server', '.dev.vars')];
const leaks = forbidden.filter((path) => existsSync(path));

function hasMaps(dir) {
  return readdirSync(dir).some((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return hasMaps(full);
    return entry.endsWith('.map');
  });
}

if (existsSync(join(dist, 'server')) && hasMaps(join(dist, 'server'))) {
  leaks.push(join(dist, 'server', '**/*.map'));
}

if (leaks.length > 0) {
  throw new Error(`El build contiene archivos que no deben publicarse: ${leaks.join(', ')}`);
}

console.log('Build verificado: sin .dev.vars ni source maps');
