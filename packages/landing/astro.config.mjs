// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Zimb landing — hosted at zimb.app via Cloudflare Pages
export default defineConfig({
  site: 'https://zimb.app',
  output: 'static',
  integrations: [sitemap()],
  build: {
    format: 'directory',
  },
  server: {
    port: 5173,
    host: true,
  },
  vite: {
    server: {
      headers: {
        'Cache-Control': 'public, max-age=0',
      },
    },
  },
});
