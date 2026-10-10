// @ts-check
import { defineConfig } from 'astro/config';

// Für die Vorschau auf GitHub Pages setzt der Workflow SITE und BASE_PATH.
// Lokal und später auf Cloudflare Pages bleibt BASE_PATH leer ("/").
export default defineConfig({
  site: process.env.SITE || 'https://sc-eastside.de',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'ignore',
});
