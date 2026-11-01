// // @ts-check
// import { defineConfig } from 'astro/config';

// import node from '@astrojs/node';

// // https://astro.build/config
// export default defineConfig({
//   output: "server",
//   adapter: node({
//     mode: "standalone",
//   }),
//   security: {
//     checkOrigin: false, 
//   },
//   server: {
//     host: true,
//     port: 4321,
//   },
// });
// @ts-check
// import { defineConfig } from 'astro/config';
// import cloudflare from '@astrojs/cloudflare';
// //import netlify from '@astrojs/netlify'; // 1. Cambiamos la importación

// // https://astro.build/config
// export default defineConfig({
//   output: "server", // 2. Mantenemos el modo server para que funcione la DB y OpenAI
//   adapter: cloudflare(),
//   // adapter: netlify({
//   //   // 3. El adaptador de Netlify no necesita el modo 'standalone'
//   //   edgeMiddleware: false, 
//   // }),

//   security: {
//     checkOrigin: false, // 4. Mantenlo así para evitar problemas de CORS con formularios
//   },

//   // 5. La sección 'server' (host/port) ya no es necesaria en producción, 
//   // pero puedes dejarla si quieres que en tu PC local siga usando ese puerto.
//   server: {
//     port: 4321,
//   },
// });

import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: 'passthrough', // 👈 Evita errores con imágenes en Cloudflare
    prerenderEnvironment: "node",
  }),
  security: {
    checkOrigin: false,
  },
  server: {
    port: 4321,
  },
});