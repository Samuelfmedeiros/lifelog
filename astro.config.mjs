import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // Host canonico unico do site. Trocar de dominio = mudar SO esta linha
  // (ou SITE_URL no build). canonical, hreflang, og:url, sitemap e robots
  // derivam daqui — nenhum deles tem host hardcoded.
  site: process.env.SITE_URL || 'https://lifelog.seu.pet',
  server: { host: '127.0.0.1' },
  integrations: [mdx()],
  devToolbar: { enabled: false },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
