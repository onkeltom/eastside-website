// Ende-zu-Ende-Test für das Formular auf /mitmachen/ und /api/anfrage mit `wrangler pages dev`.
// wrangler schreibt gesendete E-Mails lokal als .eml-Datei, statt sie zu verschicken.
//
//   node scripts/test-anfrage.mjs
//
// Prüft: Pflichtfelder, ungültige Gruppe, Spam-Feld, eingeschmuggelte Kopfzeilen,
// Inhalt der E-Mail (Empfänger, Reply-To, Umlaute) und das Formular im Browser
// (Erfolgsmeldung; ohne Server ein fertiger E-Mail-Link).
import { spawn, execSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';

const DEV = 8797;
const STATISCH = 8796;
const MAILS = '.wrangler/tmp';
const env = { ...process.env, NO_PROXY: '127.0.0.1,localhost', WRANGLER_SEND_METRICS: 'false', CI: '1' };

function mails() {
  const gefunden = [];
  (function such(d) {
    if (!existsSync(d)) return;
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, f.name);
      if (f.isDirectory()) such(p); else if (f.name.endsWith('.eml')) gefunden.push(readFileSync(p, 'utf8'));
    }
  })(MAILS);
  return gefunden;
}
const kopf = (mail, name) => mail.split('\r\n\r\n')[0].split('\r\n').find((z) => z.startsWith(`${name}: `))?.slice(name.length + 2);
const dekodiert = (wert) => wert.replace(/=\?UTF-8\?B\?([^?]+)\?=/g, (_, b) => Buffer.from(b, 'base64').toString('utf8'));
const inhalt = (mail) => Buffer.from(mail.split('\r\n\r\n')[1].replace(/\s/g, ''), 'base64').toString('utf8');

function formular(ueberschreiben = {}) {
  const f = new FormData();
  const felder = { art: 'warteliste', gruppe: 'u8', jahr: '2020', name: 'Anna Müller', email: 'anna@example.org', nachricht: 'Gern ab Januar.', einwilligung: 'ja', ...ueberschreiben };
  Object.entries(felder).forEach(([k, v]) => v !== undefined && f.append(k, v));
  return f;
}
// wrangler schreibt die Datei kurz nach der Antwort.
async function warteAufMails(anzahl) {
  for (let i = 0; i < 40 && mails().length < anzahl; i++) await new Promise((r) => setTimeout(r, 100));
  return mails();
}
const post = (form) => fetch(`http://127.0.0.1:${DEV}/api/anfrage`, { method: 'POST', body: form });

let dev;
let statisch;
let browser;
try {
  rmSync(MAILS, { recursive: true, force: true });
  execSync('npm run build', { stdio: 'ignore', env });
  if (await fetch(`http://127.0.0.1:${DEV}/`).then(() => true, () => false)) throw new Error(`Port ${DEV} ist belegt`);
  dev = spawn('npx', ['wrangler', 'pages', 'dev', 'dist', '--port', String(DEV)], { env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let log = '';
  dev.stdout.on('data', (d) => (log += d));
  dev.stderr.on('data', (d) => (log += d));
  for (let i = 0; ; i++) {
    if (dev.exitCode !== null || i > 120) throw new Error(`wrangler startet nicht:\n${log}`);
    if (await fetch(`http://127.0.0.1:${DEV}/`).then(() => true, () => false)) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  for (const [fall, felder] of [
    ['ohne Einwilligung', { einwilligung: undefined }],
    ['ohne Name', { name: '' }],
    ['ungültige E-Mail', { email: 'anna@example.org\r\nBcc: x@example.org' }],
    ['unbekannte Gruppe', { gruppe: 'u99' }],
    ['falsche Art', { art: 'spam' }],
    ['Geburtsjahr in der Zukunft', { jahr: '2099' }],
  ]) {
    const res = await post(formular(felder));
    assert.equal(res.status, 400, fall);
    assert.ok((await res.json()).fehler, `${fall}: Fehlertext`);
  }
  assert.equal(mails().length, 0, 'ungültige Anfragen dürfen keine E-Mail auslösen');
  console.log('✓ Ungültige Anfragen werden abgelehnt');

  assert.equal((await post(formular({ website: 'http://spam.example' }))).status, 200, 'Spam bekommt keine Fehlermeldung');
  assert.equal(mails().length, 0, 'Spam darf keine E-Mail auslösen');
  console.log('✓ Spam-Feld wird still verworfen');

  const res = await post(formular({ name: 'Anna Müller\r\nBcc: boese@example.org' }));
  assert.equal(res.status, 200, `Anfrage: ${await res.clone().text()}\n${log}`);
  const [mail] = await warteAufMails(1);
  assert.ok(mail, 'E-Mail wurde gesendet');
  assert.equal(kopf(mail, 'To'), '<sc.east.side2023@gmail.com>');
  assert.equal(kopf(mail, 'Bcc'), undefined, 'keine eingeschmuggelte Kopfzeile');
  assert.equal(dekodiert(kopf(mail, 'Reply-To')), 'Anna Müller Bcc: boese@example.org <anna@example.org>');
  assert.equal(dekodiert(kopf(mail, 'Subject')), 'Warteliste: U8, Jahrgang 2020');
  assert.match(inhalt(mail), /Gruppe: +U8\r\n/);
  assert.match(inhalt(mail), /Gern ab Januar\./);
  console.log('✓ E-Mail an den Verein, Antworten gehen an die Eltern');

  // Im Browser: echtes Formular am Handy-Format.
  const { chromium } = createRequire(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'x.js'))('playwright');
  browser = await chromium.launch();
  const seite = await browser.newPage({ viewport: { width: 390, height: 844 } });
  async function ausfuellen(basis) {
    await seite.goto(`${basis}/mitmachen/?jahr=2020`);
    await seite.click('[data-choose="u8"][data-wait="1"]');
    await seite.fill('input[name=name]', 'Ben Test');
    await seite.fill('input[name=email]', 'ben@example.org');
    await seite.check('input[name=einwilligung]');
    await seite.click('#form-submit');
    await seite.waitForSelector('#form-note:not([hidden])');
    return seite.textContent('#form-note');
  }
  assert.match(await ausfuellen(`http://127.0.0.1:${DEV}`), /Warteliste/, 'Erfolgsmeldung');
  assert.equal((await warteAufMails(2)).length, 2, 'Browser-Anfrage kam an');
  assert.ok(mails().some((m) => dekodiert(kopf(m, 'Reply-To')) === 'Ben Test <ben@example.org>'));
  console.log('✓ Formular im Browser sendet und bestätigt');

  // Ohne Server (wie die Vorschau auf GitHub Pages): fertiger E-Mail-Link statt Sackgasse.
  statisch = createServer((req, res) => {
    let p = join('dist', decodeURIComponent(req.url.split('?')[0]));
    if (p.endsWith('/')) p = join(p, 'index.html');
    if (!existsSync(p)) { res.statusCode = 404; return res.end(); }
    const typ = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[p.slice(p.lastIndexOf('.'))];
    if (typ) res.setHeader('Content-Type', typ);
    res.end(readFileSync(p));
  }).listen(STATISCH);
  assert.match(await ausfuellen(`http://127.0.0.1:${STATISCH}`), /per E-Mail/);
  const link = await seite.getAttribute('#form-note a', 'href');
  assert.match(link, /^mailto:sc\.east\.side2023@gmail\.com\?subject=Warteliste/);
  assert.match(decodeURIComponent(link), /E-Mail: ben@example\.org/);
  console.log('✓ Ohne Server bietet das Formular einen fertigen E-Mail-Link');
  console.log('\nAlle Tests bestanden.');
} finally {
  await browser?.close();
  statisch?.close();
  if (dev) { const fertig = new Promise((r) => dev.once('exit', r)); process.kill(-dev.pid, 'SIGTERM'); await fertig; }
  rmSync(MAILS, { recursive: true, force: true });
}
