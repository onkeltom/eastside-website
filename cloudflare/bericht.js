// Prüft eine Einreichung aus dem Formular /einreichen/ und baut daraus die Markdown-Datei.
// Reine Funktionen ohne Netzwerk, damit sie sich lokal testen lassen.

export const KATEGORIEN = ['Erfolg', 'Wettkampf', 'Verein', 'Training'];
export const MAX_FOTOS = 20;
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;

export class Eingabefehler extends Error {}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

function text(form, name, { pflicht = true, max = 300 } = {}) {
  const wert = String(form.get(name) ?? '').trim();
  if (pflicht && !wert) throw new Eingabefehler(`Bitte „${name}" ausfüllen.`);
  if (wert.length > max) throw new Eingabefehler(`„${name}" ist zu lang (höchstens ${max} Zeichen).`);
  return wert;
}

// FormData → geprüfte Einreichung. Fotos bleiben File-Objekte.
export function parseEinreichung(form) {
  const datum = text(form, 'datum', { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || Number.isNaN(Date.parse(datum))) throw new Eingabefehler('Datum ist ungültig.');
  const kategorie = text(form, 'kategorie', { max: 20 });
  if (!KATEGORIEN.includes(kategorie)) throw new Eingabefehler('Kategorie ist ungültig.');

  const fotos = form.getAll('foto').filter((f) => typeof f === 'object' && f.size > 0);
  const alts = form.getAll('alt').map((a) => String(a).trim());
  if (fotos.length > MAX_FOTOS) throw new Eingabefehler(`Höchstens ${MAX_FOTOS} Fotos.`);
  fotos.forEach((f, i) => {
    if (f.type !== 'image/jpeg') throw new Eingabefehler(`Foto ${i + 1} ist kein JPEG.`);
    if (f.size > MAX_FOTO_BYTES) throw new Eingabefehler(`Foto ${i + 1} ist zu groß.`);
    if (!alts[i]) throw new Eingabefehler(`Bitte Foto ${i + 1} kurz beschreiben.`);
  });
  if (fotos.length && form.get('einwilligung') !== 'ja') {
    throw new Eingabefehler('Fotos nur mit Einwilligung der Eltern. Bitte bestätigen oder Fotos entfernen.');
  }

  return {
    title: text(form, 'title', { max: 120 }),
    datum,
    kategorie,
    klasse: text(form, 'klasse', { pflicht: false, max: 40 }),
    teaser: text(form, 'teaser', { max: 300 }),
    body: text(form, 'body', { max: 20000 }),
    von: text(form, 'von', { max: 80 }),
    fotos: fotos.map((datei, i) => ({ datei, alt: alts[i].slice(0, 200) })),
  };
}

export function fotoKey(slug, i) {
  return `news/${slug}/${String(i + 1).padStart(2, '0')}.jpg`;
}

// JSON-Strings sind gültige YAML-Strings in doppelten Anführungszeichen.
const y = (s) => JSON.stringify(s);

export function markdown(e, slug) {
  const zeilen = [
    '---',
    `title: ${y(e.title)}`,
    `date: ${e.datum}`,
    `kategorie: ${e.kategorie}`,
    ...(e.klasse ? [`klasse: ${y(e.klasse)}`] : []),
    `teaser: ${y(e.teaser)}`,
  ];
  if (e.fotos.length) {
    zeilen.push('bilder:');
    e.fotos.forEach((f, i) => zeilen.push(`  - datei: ${y(fotoKey(slug, i))}`, `    alt: ${y(f.alt)}`, '    einwilligung: true'));
  }
  zeilen.push('---', '', e.body.replace(/\r\n/g, '\n'), '');
  return zeilen.join('\n');
}
