import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// News-Beiträge: eine Markdown-Datei pro Beitrag in src/content/news.
// Beiträge mit draft: true werden nicht veröffentlicht (z. B. Einreichungen von Trainer:innen).
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    kategorie: z.enum(['Erfolg', 'Wettkampf', 'Verein', 'Training']),
    klasse: z.string().optional(),
    fotos: z.number().optional(),
    teaser: z.string(),
    // Adresse des Beitrags auf der alten Website (bei übernommenen Beiträgen)
    quelle: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news };
