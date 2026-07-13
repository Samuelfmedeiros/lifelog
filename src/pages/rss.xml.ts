import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site: string }) {
  const allPosts = await getCollection('posts');
  const posts = allPosts.filter(p => !p.data.draft);
  const sorted = posts.sort((a, b) => {
    const aSort = (a.data.pubDate || a.data.date).getTime();
    const bSort = (b.data.pubDate || b.data.date).getTime();
    return bSort - aSort;
  });

  const SITE = typeof context.site === 'string'
    ? (context.site.endsWith('/') ? context.site.slice(0, -1) : context.site)
    : String(context.site).replace(/\/$/, '');

  return rss({
    title: 'LifeLog — Samuel Medeiros',
    description: 'Jornada de aprendizado de Samuel Medeiros',
    site: SITE,
    items: sorted.map((post) => {
      const pubDate = post.data.pubDate || post.data.date;
      const coverUrl = post.data.cover
        ? (post.data.cover.startsWith('http') ? post.data.cover : `${SITE}${post.data.cover}`)
        : undefined;
      return {
        title: post.data.title,
        description: post.data.description,
        pubDate,
        link: `/post/${post.id}/`,
        ...(coverUrl && {
          customData: `<enclosure url="${coverUrl}" type="image/webp" />`,
        }),
      };
    }),
  });
}
