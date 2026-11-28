// Prüft eine Anfrage aus dem Formular auf /mitmachen/ (Probetraining oder Warteliste)
// und baut daraus die E-Mail an den Verein. Reine Funktionen ohne Netzwerk, damit sie sich lokal testen lassen.
import gruppen from '../src/data/gruppen.json';

export class Eingabefehler extends Error {}

const ARTEN = { probetraining: 'Probetraining', warteliste: 'Warteliste' };
// Einfache Prüfung; Zeilenumbrüche sind ausgeschlossen, damit niemand Kopfzeilen in die Mail schmuggeln kann.
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

function text(form, name, label, { pflicht = true, max = 100 } = {}) {
  const wert = String(form.get(name) ?? '').trim();
  if (pflicht && !wert) throw new Eingabefehler(`Bitte „${label}" ausfüllen.`);
  if (wert.length > max) throw new Eingabefehler(`„${label}" ist zu lang (höchstens ${max} Zeichen).`);
  return wert;
}

// FormData → geprüfte Anfrage.
export function parseAnfrage(form) {
  const art = String(form.get('art') ?? '');
  if (!ARTEN[art]) throw new Eingabefehler('Art der Anfrage ist ungültig.');
  const gruppe = gruppen.find((g) => g.id === form.get('gruppe'));
  if (!gruppe) throw new Eingabefehler('Bitte eine Gruppe wählen.');
  const jahr = Number(text(form, 'jahr', 'Geburtsjahr', { max: 4 }));
  const jetzt = new Date().getFullYear();
  if (!Number.isInteger(jahr) || jahr < jetzt - 25 || jahr > jetzt) throw new Eingabefehler('Geburtsjahr ist ungültig.');
  const name = text(form, 'name', 'Name', { max: 80 }).replace(/\s+/g, ' ');
  const email = text(form, 'email', 'E-Mail', { max: 120 });
  if (!EMAIL.test(email)) throw new Eingabefehler('E-Mail-Adresse ist ungültig.');
  if (form.get('einwilligung') !== 'ja') throw new Eingabefehler('Bitte der Speicherung der Angaben zustimmen.');
  return { art, gruppe: gruppe.name, jahr, name, email, nachricht: text(form, 'nachricht', 'Nachricht', { pflicht: false, max: 1000 }) };
}

// Ein ausgefülltes Feld, das Menschen nicht sehen: Spam-Programm.
export const istSpam = (form) => String(form.get('website') ?? '') !== '';

const b64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const kopf = (s) => `=?UTF-8?B?${b64(s)}?=`;

// Rohe E-Mail (RFC 5322) für Cloudflares send_email. Antworten gehen direkt an die Eltern.
export function mail(a, { von, an, jetzt = new Date(), id = crypto.randomUUID() }) {
  const betreff = `${ARTEN[a.art]}: ${a.gruppe}, Jahrgang ${a.jahr}`;
  const inhalt = [
    `Neue Anfrage über sc-eastside.de/mitmachen/`,
    '',
    `Art:         ${ARTEN[a.art]}`,
    `Gruppe:      ${a.gruppe}`,
    `Geburtsjahr: ${a.jahr}`,
    `Name:        ${a.name}`,
    `E-Mail:      ${a.email}`,
    ...(a.nachricht ? ['', 'Nachricht:', a.nachricht] : []),
    '',
    '-- ',
    'Mit „Antworten" geht die Mail direkt an die Eltern.',
    'Die Eltern haben der Speicherung zur Bearbeitung der Anfrage zugestimmt. Nach Erledigung bitte löschen.',
  ].join('\r\n');
  const body = b64(inhalt).replace(/.{76}/g, '$&\r\n');
  return [
    `From: ${kopf('EASTSIDE Website')} <${von}>`,
    `To: <${an}>`,
    `Reply-To: ${kopf(a.name)} <${a.email}>`,
    `Subject: ${kopf(betreff)}`,
    `Date: ${jetzt.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@${von.split('@')[1]}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
    '',
  ].join('\r\n');
}
