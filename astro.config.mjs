import { defineConfig } from 'astro/config';
import { apiDev } from './scripts/dev-api.mjs';

export default defineConfig({
  site: 'https://club-boxe-toulouse.com',
  trailingSlash: 'always',
  compressHTML: false,
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  /* api/ (le bot, les leads, le MCP) servie aussi en `npm run dev` — voir scripts/dev-api.mjs */
  integrations: [apiDev()],
});
