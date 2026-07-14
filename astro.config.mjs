import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://cca.toshi0607.com',
  output: 'static',
  integrations: [preact()],
});
