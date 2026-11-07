// @ts-check
import { defineConfig, envField } from 'astro/config';
import netlify from '@astrojs/netlify';
import cloudflare from '@astrojs/cloudflare';

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  output: "server",
  adapter: isDev
    ? netlify({ edgeMiddleware: false })
    : cloudflare({
      imageService: 'passthrough',
      prerenderEnvironment: 'node',
    }),
  env: {
    schema: {
      // Secreto de servidor: se resuelve en runtime y nunca se inlinea en el
      // bundle de producción. En desarrollo Astro lo carga desde .env.
      ADMIN_PASSWORD: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },
  security: {
    // Bloquea envíos cross-site con content-types "simples" (CSRF).
    // Las APIs usan application/json, así que no se ven afectadas.
    checkOrigin: true,
  },
  server: {
    port: 4321,
  },
});
