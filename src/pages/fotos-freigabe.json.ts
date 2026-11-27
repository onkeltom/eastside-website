// Liste der Fotos, die functions/fotos/ ausliefern darf: nur aus veröffentlichten Beiträgen.
import { getCollection } from 'astro:content';

export async function GET() {
  const news = await getCollection('news', ({ data }) => !data.draft);
  return Response.json(news.flatMap((n) => n.data.bilder.map((b) => b.datei)));
}
