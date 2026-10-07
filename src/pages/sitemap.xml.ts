import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

// Fonte unica: `site` do astro.config.mjs (context.site). Fallback mantem o
// dominio proprio — nunca o host *.vercel.app.
const FALLBACK_SITE_URL = 'https://lifelog.seu.pet';

export async function GET(context: APIContext) {
  const SITE_URL = (context.site?.toString() || FALLBACK_SITE_URL).replace(/\/$/, '');
  const allPosts = await getCollection('posts');
  const posts = allPosts.filter(p => !p.data.hidden);

  const urls = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/arquivo/', changefreq: 'weekly', priority: '0.8' },
    { loc: '/sobre/', changefreq: 'monthly', priority: '0.5' },
    ...posts.map((post) => {
      const isEn = post.id.startsWith('en/');
      const slug = isEn ? post.id.replace('en/', '') : post.id;
      return {
        loc: (isEn ? `/en/post/${slug}` : `/post/${slug}`) + '/',
        lastmod: post.data.date.toISOString().split('T')[0],
        changefreq: 'monthly' as const,
        priority: '0.6',
      };
    }),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    ${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ''}    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
