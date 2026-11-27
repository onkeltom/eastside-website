// Ende-zu-Ende-Test für /api/bericht und /fotos/ mit `wrangler pages dev` (lokales R2),
// einem nachgebauten Cloudflare Access und einer nachgebauten GitHub-API.
//
//   node scripts/test-einreichen.mjs
//
// Prüft: Login-Pflicht, gefälschte Tokens, Einwilligungs-Pflicht, Upload nach R2 + Pull Request,
// dass ungeprüfte Fotos nicht ausgeliefert werden, dass veröffentlichte es werden,
// und dass der Build Fotos ohne einwilligung: true ablehnt.
import { createServer } from 'node:http';
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, rmSync, existsSync } from 'node:fs';
import { generateKeyPairSync, createSign, createVerify, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

const MOCK = 9911;
const DEV = 8799;
const TEAM = `http://127.0.0.1:${MOCK}`;
const AUD = 'test-aud';
const b64u = (b) => Buffer.from(b).toString('base64url');

// Schlüssel: Access (signiert Login-Tokens), fremder Schlüssel (Fälschung), GitHub App.
const access = generateKeyPairSync('rsa', { modulusLength: 2048 });
const fremd = generateKeyPairSync('rsa', { modulusLength: 2048 });
const app = generateKeyPairSync('rsa', { modulusLength: 2048 });

function jwt(key, claims) {
  const daten = `${b64u(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' }))}.${b64u(JSON.stringify(claims))}`;
  return `${daten}.${createSign('RSA-SHA256').update(daten).sign(key).toString('base64url')}`;
}
const gueltig = () => jwt(access.privateKey, { aud: [AUD], iss: TEAM, email: 'trainer@example.org', exp: Math.floor(Date.now() / 1000) + 600 });

// Nachgebaute Dienste
const github = { dateien: {}, prs: [], refs: [] };
const mock = createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  const p = req.url;
  if (p === '/cdn-cgi/access/certs') return send(200, { keys: [{ ...access.publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' }] });
  if (req.method === 'POST' && p === '/app/installations/42/access_tokens') {
    const [h, c, s] = req.headers.authorization.replace('Bearer ', '').split('.');
    const ok = createVerify('RSA-SHA256').update(`${h}.${c}`).verify(app.publicKey, Buffer.from(s, 'base64url'));
    assert.ok(ok, 'App-JWT falsch signiert');
    assert.equal(JSON.parse(Buffer.from(c, 'base64url')).iss, '7');
    return send(201, { token: 'inst-token' });
  }
  assert.equal(req.headers.authorization, 'Bearer inst-token');
  if (req.method === 'GET' && p === '/repos/o/r') return send(200, { default_branch: 'main' });
  if (req.method === 'GET' && p === '/repos/o/r/git/ref/heads/main') return send(200, { object: { sha: 'abc' } });
  if (req.method === 'GET') return send(404, {});
  if (req.method === 'POST' && p === '/repos/o/r/git/refs') { github.refs.push(JSON.parse(body)); return send(201, {}); }
  if (req.method === 'PUT' && p.startsWith('/repos/o/r/contents/')) { github.dateien[p.slice('/repos/o/r/contents/'.length)] = JSON.parse(body); return send(201, {}); }
  if (req.method === 'POST' && p === '/repos/o/r/pulls') { github.prs.push(JSON.parse(body)); return send(201, { html_url: 'https://github.com/o/r/pull/1' }); }
  send(500, { unbekannt: p });
});
await new Promise((ok) => mock.listen(MOCK, '127.0.0.1', ok));

writeFileSync('.dev.vars', [
  `GITHUB_REPO=o/r`, `GITHUB_APP_ID=7`, `GITHUB_INSTALLATION_ID=42`, `GITHUB_API=${TEAM}`,
  `ACCESS_TEAM_DOMAIN=${TEAM}`, `ACCESS_AUD=${AUD}`, `FOTOS_NUR_MIT_LOGIN=false`,
  `GITHUB_APP_KEY="${app.privateKey.export({ type: 'pkcs8', format: 'pem' }).trim().replace(/\n/g, '\\n')}"`,
].join('\n'));

const env = { ...process.env, NO_PROXY: '127.0.0.1,localhost', WRANGLER_SEND_METRICS: 'false', CI: '1' };
async function starteDev() {
  const belegt = await fetch(`http://127.0.0.1:${DEV}/`).then(() => true, () => false);
  if (belegt) throw new Error(`Port ${DEV} ist belegt (alter wrangler-Prozess?)`);
  const p = spawn('npx', ['wrangler', 'pages', 'dev', 'dist', '--port', String(DEV), '--persist-to', '.wrangler/test-state'], { env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let log = '';
  p.stdout.on('data', (d) => (log += d));
  p.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 120; i++) {
    if (p.exitCode !== null) throw new Error(`wrangler beendet:\n${log}`);
    try { await fetch(`http://127.0.0.1:${DEV}/`); return { p, log: () => log }; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  process.kill(-p.pid, 'SIGTERM');
  throw new Error(`wrangler startet nicht:\n${log}`);
}
// Ganze Prozessgruppe beenden: npx startet wrangler und workerd als Kindprozesse.
const stoppe = async ({ p }) => { const fertig = new Promise((r) => p.once('exit', r)); process.kill(-p.pid, 'SIGTERM'); await fertig; };

function formular({ fotos = 0, einwilligung = true } = {}) {
  const f = new FormData();
  Object.entries({ title: 'Drei Medaillen beim Testcup', datum: '2026-11-22', kategorie: 'Wettkampf', klasse: 'U12', teaser: 'Ein guter Tag.', body: 'Text mit „Anführungszeichen" und\nZeilen.', von: 'Trainer Test' })
    .forEach(([k, v]) => f.append(k, v));
  if (einwilligung) f.append('einwilligung', 'ja');
  fotos_.length = 0;
  for (let i = 0; i < fotos; i++) {
    const bytes = randomBytes(2000);
    fotos_.push(bytes);
    f.append('foto', new Blob([bytes], { type: 'image/jpeg' }), `${i + 1}.jpg`);
    f.append('alt', `Foto ${i + 1}`);
  }
  return f;
}
const fotos_ = [];
const post = (form, token) => fetch(`http://127.0.0.1:${DEV}/api/bericht`, { method: 'POST', body: form, headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {} });

const testDatei = 'src/content/news/2026-11-22-drei-medaillen-beim-testcup.md';
let dev;
try {
  rmSync('.wrangler/test-state', { recursive: true, force: true });
  if (existsSync(testDatei)) throw new Error(`${testDatei} liegt noch von einem abgebrochenen Lauf herum`);
  execSync('npm run build', { stdio: 'ignore', env: { ...env, CF_PAGES: '1' } });
  dev = await starteDev();

  assert.equal((await post(formular())).status, 401, 'ohne Login');
  assert.equal((await post(formular(), jwt(fremd.privateKey, { aud: [AUD], iss: TEAM, email: 'x', exp: 9e9 }))).status, 401, 'gefälschtes Token');
  assert.equal((await post(formular(), jwt(access.privateKey, { aud: ['andere'], iss: TEAM, email: 'x', exp: 9e9 }))).status, 401, 'falsche Audience');
  assert.equal((await post(formular(), jwt(access.privateKey, { aud: [AUD], iss: TEAM, email: 'x', exp: 1 }))).status, 401, 'abgelaufen');
  const ohne = await post(formular({ fotos: 1, einwilligung: false }), gueltig());
  assert.equal(ohne.status, 400, 'Fotos ohne Einwilligung');
  console.log('✓ Login und Einwilligung werden geprüft');

  const res = await post(formular({ fotos: 2 }), gueltig());
  assert.equal(res.status, 201, `Einreichung: ${await res.clone().text()}\n${dev.log()}`);
  assert.equal((await res.json()).pr, 'https://github.com/o/r/pull/1');
  assert.deepEqual(github.refs, [{ ref: 'refs/heads/bericht/2026-11-22-drei-medaillen-beim-testcup', sha: 'abc' }]);
  const put = github.dateien['src/content/news/2026-11-22-drei-medaillen-beim-testcup.md'];
  assert.equal(put.branch, 'bericht/2026-11-22-drei-medaillen-beim-testcup');
  const md = Buffer.from(put.content, 'base64').toString('utf8');
  assert.match(md, /datei: "news\/2026-11-22-drei-medaillen-beim-testcup\/02\.jpg"/);
  assert.match(md, /„Anführungszeichen"/);
  assert.doesNotMatch(github.prs[0].body, /trainer@example\.org/, 'E-Mail darf nicht ins öffentliche Repository');
  console.log('✓ Fotos hochgeladen, Pull Request angelegt');

  const key = 'news/2026-11-22-drei-medaillen-beim-testcup/01.jpg';
  assert.equal((await fetch(`http://127.0.0.1:${DEV}/fotos/${key}`)).status, 404, 'ungeprüftes Foto darf nicht öffentlich sein');
  console.log('✓ Ungeprüfte Fotos sind nicht erreichbar');
  await stoppe(dev);

  // „Merge": Datei ins Repository, neu bauen → Foto wird ausgeliefert.
  writeFileSync(testDatei, md);
  execSync('npm run build', { stdio: 'ignore', env: { ...env, CF_PAGES: '1' } });
  dev = await starteDev();
  const foto = await fetch(`http://127.0.0.1:${DEV}/fotos/${key}`);
  assert.equal(foto.status, 200, 'veröffentlichtes Foto');
  assert.equal(foto.headers.get('content-type'), 'image/jpeg');
  assert.ok(Buffer.from(await foto.arrayBuffer()).equals(fotos_[0]), 'gleiche Bytes wie hochgeladen');
  const seite = await (await fetch(`http://127.0.0.1:${DEV}/news/2026-11-22-drei-medaillen-beim-testcup/`)).text();
  assert.match(seite, /src="\/fotos\/news\/2026-11-22-drei-medaillen-beim-testcup\/02\.jpg" alt="Foto 2"/);
  console.log('✓ Nach dem Merge zeigt der Beitrag die Fotos');
  await stoppe(dev);
  dev = undefined;

  writeFileSync(testDatei, md.replace(/ {4}einwilligung: true\n/g, ''));
  let abgelehnt = false;
  try { execSync('npm run build', { stdio: 'ignore' }); } catch { abgelehnt = true; }
  assert.ok(abgelehnt, 'Build muss Fotos ohne Einwilligung ablehnen');
  console.log('✓ Build lehnt Fotos ohne Einwilligung ab');
} finally {
  if (dev) await stoppe(dev);
  mock.close();
  rmSync('.dev.vars', { force: true });
  if (existsSync(testDatei)) rmSync(testDatei);
  rmSync('.wrangler/test-state', { recursive: true, force: true });
}
console.log('Alle Tests bestanden.');
