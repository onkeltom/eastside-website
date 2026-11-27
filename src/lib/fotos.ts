import { url } from './url';

// Fotos aus R2 gibt es nur auf Cloudflare Pages (Function functions/fotos/). CF_PAGES setzt Cloudflare beim Build.
const aktiv = !!process.env.CF_PAGES;

export function fotoUrl(datei: string): string | undefined {
  return aktiv ? url(`/fotos/${datei}`) : undefined;
}
