// Legt eine Einreichung als Pull Request an, angemeldet als GitHub App.
//
// Variablen: GITHUB_REPO (owner/name), GITHUB_APP_ID, GITHUB_INSTALLATION_ID,
// Secret GITHUB_APP_KEY (privater Schlüssel im PKCS#8-Format, siehe docs/einreichen-einrichten.md),
// optional GITHUB_API (nur für Tests).

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlText = (s) => b64url(new TextEncoder().encode(s));

function base64(text) {
  const bytes = new TextEncoder().encode(text);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function appJwt(env) {
  const pem = env.GITHUB_APP_KEY.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const jetzt = Math.floor(Date.now() / 1000);
  const daten = `${b64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64urlText(JSON.stringify({ iat: jetzt - 60, exp: jetzt + 540, iss: String(env.GITHUB_APP_ID) }))}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(daten));
  return `${daten}.${b64url(sig)}`;
}

function client(env, token) {
  const api = env.GITHUB_API || 'https://api.github.com';
  return async (method, pfad, body) => {
    const res = await fetch(`${api}${pfad}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'eastside-einreichen',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (method === 'GET' && res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub ${method} ${pfad}: ${res.status} ${await res.text()}`);
    return res.json();
  };
}

export async function github(env) {
  const jwt = await appJwt(env);
  const { token } = await client(env, jwt)('POST', `/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`);
  return client(env, token);
}

// Freier Dateiname unter src/content/news/ (bei gleichem Datum und Titel: -2, -3 …).
export async function freierSlug(gh, repo, basis) {
  for (let n = 1; n < 20; n++) {
    const slug = n === 1 ? basis : `${basis}-${n}`;
    const datei = await gh('GET', `/repos/${repo}/contents/src/content/news/${slug}.md`);
    const zweig = await gh('GET', `/repos/${repo}/git/ref/heads/bericht/${slug}`);
    if (!datei && !zweig) return slug;
  }
  throw new Error('Kein freier Dateiname gefunden');
}

export async function pullRequest(gh, repo, { slug, inhalt, titel, beschreibung }) {
  const repoInfo = await gh('GET', `/repos/${repo}`);
  const basis = repoInfo.default_branch;
  const ref = await gh('GET', `/repos/${repo}/git/ref/heads/${basis}`);
  const zweig = `bericht/${slug}`;
  await gh('POST', `/repos/${repo}/git/refs`, { ref: `refs/heads/${zweig}`, sha: ref.object.sha });
  await gh('PUT', `/repos/${repo}/contents/src/content/news/${slug}.md`, {
    message: `Bericht eingereicht: ${titel}`,
    content: base64(inhalt),
    branch: zweig,
  });
  const pr = await gh('POST', `/repos/${repo}/pulls`, { title: `Bericht: ${titel}`, head: zweig, base: basis, body: beschreibung });
  return pr.html_url;
}
