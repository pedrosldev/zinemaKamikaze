// @ts-check
import { defineConfig } from 'astro/config';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  adapter: node({
    mode: 'standalone'
  })
});
// import { defineConfig } from 'astro/config';
// import node from '@astrojs/node';

// export default defineConfig({
//   output: 'server', // O 'static', según tus necesidades
//   adapter: node(),
//   mode: 'production', // Asegúrate de incluir 'mode' y configurarlo correctamente
// });