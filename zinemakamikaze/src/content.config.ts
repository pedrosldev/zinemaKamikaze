import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';


const review = defineCollection({
    loader: glob({ base: './src/content/reviews', pattern: '**/*.{md,mdx}' }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.date(),
        tags: z.array(z.string()),
        image: z.string().optional(),
    }),
});

export const collections = { review };