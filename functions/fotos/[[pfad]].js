// GET /fotos/<schlüssel> – liefert Fotos aus dem privaten R2-Bucket (Binding FOTOS).
// Nur Fotos aus veröffentlichten Beiträgen mit Einwilligung (Liste /fotos-freigabe.json, beim Build erzeugt).
// In Vorschau-Versionen (FOTOS_NUR_MIT_LOGIN=true) zusätzlich nur mit Cloudflare-Access-Login.
import { accessNutzer } from '../../cloudflare/access.js';

export async function onRequestGet({ request, env, params }) {
  const key = [].concat(params.pfad ?? []).join('/');
  const liste = await env.ASSETS.fetch(new URL('/fotos-freigabe.json', request.url));
  const freigegeben = liste.ok ? await liste.json() : [];
  if (!freigegeben.includes(key)) return new Response('Nicht gefunden', { status: 404 });

  const geschuetzt = env.FOTOS_NUR_MIT_LOGIN === 'true';
  if (geschuetzt && !(await accessNutzer(request, env))) return new Response('Bitte anmelden', { status: 401 });

  const obj = await env.FOTOS.get(key);
  if (!obj) return new Response('Nicht gefunden', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg',
      ETag: obj.httpEtag,
      // Kurz cachen, damit ein gelöschtes Foto (Einwilligung widerrufen) bald verschwindet.
      'Cache-Control': geschuetzt ? 'private, no-store' : 'public, max-age=3600',
    },
  });
}
