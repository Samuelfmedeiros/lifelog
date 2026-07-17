import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    pubDate: z.date().optional(),
    project: z.string().optional(),
    tags: z.array(z.string()).default([]),
    icon: z.string().optional(),
    cover: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    lang: z.string().default('pt'),
  }),
});

export const collections = { posts };
