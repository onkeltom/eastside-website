// POST /api/bericht – nimmt das Formular /einreichen/ an.
// Fotos → privater R2-Bucket (Binding FOTOS), Text → Pull Request. Veröffentlicht wird erst beim Merge.
import { accessNutzer } from '../../cloudflare/access.js';
import { parseEinreichung, markdown, slugify, fotoKey, Eingabefehler } from '../../cloudflare/bericht.js';
import { github, freierSlug, pullRequest } from '../../cloudflare/github.js';

const antwort = (status, daten) => Response.json(daten, { status });

export async function onRequestPost({ request, env }) {
  const email = await accessNutzer(request, env);
  if (!email) return antwort(401, { fehler: 'Bitte zuerst anmelden.' });

  let e;
  try {
    e = parseEinreichung(await request.formData());
  } catch (err) {
    if (err instanceof Eingabefehler) return antwort(400, { fehler: err.message });
    return antwort(400, { fehler: 'Formular konnte nicht gelesen werden.' });
  }

  try {
    const gh = await github(env);
    const slug = await freierSlug(gh, env.GITHUB_REPO, `${e.datum}-${slugify(e.title) || 'bericht'}`);
    const eingereicht = new Date().toISOString();
    await Promise.all(e.fotos.map((f, i) => env.FOTOS.put(fotoKey(slug, i), f.datei.stream(), {
      httpMetadata: { contentType: 'image/jpeg' },
      // Nachweis der Einwilligung, nur im privaten Bucket gespeichert (nicht im öffentlichen Repository).
      customMetadata: { einwilligungBestaetigtVon: email, eingereicht, alt: f.alt },
    })));

    const beschreibung = [
      `Eingereicht über das Formular von **${e.von}** am ${eingereicht.slice(0, 10)}.`,
      '',
      e.fotos.length
        ? `${e.fotos.length} Foto(s) im R2-Bucket unter \`news/${slug}/\`. Die Einwilligung der Eltern wurde im Formular bestätigt. Fotos in der Vorschau-Version dieses Pull Requests prüfen (Login nötig).`
        : 'Keine Fotos.',
      '',
      '**Merge = veröffentlichen.** Vorher prüfen: keine Kindernamen, Fakten stimmen, Fotos passen.',
      '',
      '---',
      '_Automatisch erstellt von /einreichen/_',
    ].join('\n');

    const pr = await pullRequest(gh, env.GITHUB_REPO, { slug, inhalt: markdown(e, slug), titel: e.title, beschreibung });
    return antwort(201, { pr });
  } catch (err) {
    console.error(err);
    return antwort(502, { fehler: 'Speichern hat nicht geklappt. Bitte später noch einmal versuchen oder die Redaktion anschreiben.' });
  }
}
