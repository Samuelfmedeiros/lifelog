import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    project: z.enum(['arachne', 'dogwalk', 'portfolio', 'capivara', 'estudos', 'descobertas']),
    tags: z.array(z.string()),
    icon: z.string().optional(),
    cover: z.string().optional(),
    featured: z.boolean().optional().default(false),
  }),
});

export const collections = { posts };
