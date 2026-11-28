// POST /api/anfrage – nimmt das Formular auf /mitmachen/ an (Probetraining, Warteliste)
// und schickt es per Cloudflare Email Routing an die Vereinsadresse. Es wird nichts gespeichert.
// Einrichtung: docs/anfrage-einrichten.md
import { EmailMessage } from 'cloudflare:email';
import { parseAnfrage, istSpam, mail, Eingabefehler } from '../../cloudflare/anfrage.js';

const antwort = (status, daten) => Response.json(daten, { status });

export async function onRequestPost({ request, env }) {
  // Ohne Binding (z. B. Vorschau-Versionen) sendet das Formular den Weg per E-Mail-Programm.
  if (!env.ANFRAGEN || !env.ANFRAGE_ABSENDER) return antwort(503, { fehler: 'Formular ist hier nicht angeschlossen.' });

  let form;
  try {
    form = await request.formData();
  } catch {
    return antwort(400, { fehler: 'Formular konnte nicht gelesen werden.' });
  }
  if (istSpam(form)) return antwort(200, { ok: true });

  let a;
  try {
    a = parseAnfrage(form);
  } catch (err) {
    if (err instanceof Eingabefehler) return antwort(400, { fehler: err.message });
    throw err;
  }

  try {
    const von = env.ANFRAGE_ABSENDER;
    const an = env.ANFRAGE_EMPFAENGER;
    await env.ANFRAGEN.send(new EmailMessage(von, an, mail(a, { von, an })));
    return antwort(200, { ok: true });
  } catch (err) {
    console.error(err);
    return antwort(502, { fehler: 'Senden hat nicht geklappt.' });
  }
}
