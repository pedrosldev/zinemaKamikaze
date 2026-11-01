import { existsSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';

// 1. Mover los archivos estáticos de dist/client/ a dist/
if (existsSync(join(dist, 'client'))) {
    cpSync(join(dist, 'client'), dist, { recursive: true });
    console.log('✓ Archivos estáticos movidos a la raíz de dist/');
}

// 2. Crear el _worker.js que Pages necesita para el SSR
const workerContent = `export { default } from './server/entry.mjs';`;
writeFileSync(join(dist, '_worker.js'), workerContent);
console.log('✓ _worker.js creado');

// 3. Eliminar el archivo de redirección que confunde a Pages
const wranglerDeployConfig = join(dist, '..', '.wrangler', 'deploy', 'config.json');
if (existsSync(wranglerDeployConfig)) {
    rmSync(wranglerDeployConfig, { force: true });
    console.log('✓ Configuración de Wrangler eliminada');
}