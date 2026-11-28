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
    // Fotos im R2-Bucket (Schlüssel wie news/<datei>/01.jpg), ausgeliefert über /fotos/.
    // Ohne einwilligung: true bricht der Build ab.
    bilder: z.array(z.object({
      datei: z.string().regex(/^news\/[a-z0-9-]+\/\d{2}\.jpg$/),
      alt: z.string().min(1),
      einwilligung: z.literal(true, { message: 'Foto ohne dokumentierte Einwilligung der Eltern' }),
    })).default([]),
    teaser: z.string(),
    // Adresse des Beitrags auf der alten Website (bei übernommenen Beiträgen)
    quelle: z.string().optional(),
    // Bis zu diesem Tag (einschließlich) steht der Beitrag oben auf der Startseite.
    // Höchstens zwei gleichzeitig: der neuere groß, der zweite in der ersten Seitenzeile.
    startseite_oben_bis: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { news };
