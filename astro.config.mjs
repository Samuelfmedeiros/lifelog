import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://lifelog-sepia.vercel.app',
  server: { host: '127.0.0.1' },
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
