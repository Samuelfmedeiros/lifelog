import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { getProject } from '../lib/projects';

export async function GET(context: { site: string; url: URL }) {
  const allPosts = await getCollection('posts');
  const posts = allPosts.filter(p => !p.data.hidden);
  const sorted = posts.sort((a, b) => {
    const aSort = (a.data.pubDate || a.data.date).getTime();
    const bSort = (b.data.pubDate || b.data.date).getTime();
    return bSort - aSort;
  });

  // RSS por idioma (cacada 13/09): /rss.xml so PT, /en/rss.xml so EN.
  const isEnFeed = context.url.pathname.startsWith('/en');
  const feedPosts = sorted.filter((p) =>
    isEnFeed ? p.id.startsWith('en/') : !p.id.startsWith('en/'));
  const SITE = typeof context.site === 'string'
    ? (context.site.endsWith('/') ? context.site.slice(0, -1) : context.site)
    : String(context.site).replace(/\/$/, '');

  const chanLang = isEnFeed ? '<language>en-us</language>' : '<language>pt-br</language>';
  return rss({
    customData: chanLang,
    title: isEnFeed ? 'LifeLog — Samuel Medeiros (EN)' : 'LifeLog — Samuel Medeiros',
    description: isEnFeed
      ? "Samuel Medeiros' learning journey"
      : 'Jornada de aprendizado de Samuel Medeiros',
    site: SITE,
    items: feedPosts.map((post) => {
      const pubDate = post.data.pubDate || post.data.date;
      const coverUrl = post.data.cover
        ? (post.data.cover.startsWith('http') ? post.data.cover : `${SITE}${post.data.cover}`)
        : undefined;
      const proj = post.data.project ? getProject(post.data.project) : undefined;
      const customData = [
        ...(coverUrl ? [`<enclosure url="${coverUrl}" type="image/webp" />`] : []),
        ...(proj ? [`<project>${proj.id}</project>`, `<accent>${proj.accentDark}</accent>`] : []),
      ].join('');
      // Rota real: PT = /post/{slug}/ ; EN = /en/post/{slug}/ (NÃO /post/en/ — 404).
      // O id de posts EN é "en/{slug}" (padrão usado em PostCard/sitemap/archive).
      const postPath = post.id.startsWith('en/')
        ? `/en/post/${post.id.slice(3)}/`
        : `/post/${post.id}/`;
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate,
        link: postPath,
        ...(customData && { customData }),
      };
    }),
  });
}
