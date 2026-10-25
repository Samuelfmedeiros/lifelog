import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import rehypeSaidaUtm from './src/lib/rehype-saida-utm.mjs';

export default defineConfig({
  // Host canonico unico do site. Trocar de dominio = mudar SO esta linha
  // (ou SITE_URL no build). canonical, hreflang, og:url, sitemap e robots
  // derivam daqui — nenhum deles tem host hardcoded.
  site: process.env.SITE_URL || 'https://lifelog.seu.pet',
  server: { host: '127.0.0.1' },
  // O CTA de saída roda em markdown.rehypePlugins e o @astrojs/mdx herda essa config
  // (extendMarkdownConfig), então vale para .md e .mdx sem declarar duas vezes.
  integrations: [mdx()],
  devToolbar: { enabled: false },
  markdown: {
    // Saída com UTM canônico + link no CORPO do post (REGRA-AMARRACAO, 24/10).
    rehypePlugins: [rehypeSaidaUtm],
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
