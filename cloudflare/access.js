// Prüft das Login-Token von Cloudflare Access (Header Cf-Access-Jwt-Assertion).
// Nicht dem Header Cf-Access-Authenticated-User-Email vertrauen: Ohne Prüfung der Signatur
// könnte ihn jede:r setzen, z. B. über die *.pages.dev-Adresse, wenn Access dort fehlt.
//
// Variablen: ACCESS_TEAM_DOMAIN (z. B. https://eastside.cloudflareaccess.com), ACCESS_AUD (Application Audience Tag)

const b64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const json = (s) => JSON.parse(new TextDecoder().decode(b64url(s)));

let certsCache = { domain: '', keys: [], bis: 0 };

async function schluessel(domain) {
  if (certsCache.domain === domain && certsCache.bis > Date.now()) return certsCache.keys;
  const res = await fetch(`${domain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access-Zertifikate nicht abrufbar (${res.status})`);
  const { keys } = await res.json();
  certsCache = { domain, keys, bis: Date.now() + 60 * 60 * 1000 };
  return keys;
}

// Gibt die E-Mail-Adresse zurück oder null, wenn das Token fehlt oder ungültig ist.
export async function accessNutzer(request, env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  const [kopf, inhalt, signatur] = token.split('.');
  if (!signatur) return null;
  try {
    const { kid, alg } = json(kopf);
    if (alg !== 'RS256') return null;
    const jwk = (await schluessel(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(signatur), new TextEncoder().encode(`${kopf}.${inhalt}`));
    if (!ok) return null;
    const claims = json(inhalt);
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(env.ACCESS_AUD)) return null;
    if (claims.iss !== env.ACCESS_TEAM_DOMAIN) return null;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return null;
    return claims.email ?? null;
  } catch {
    return null;
  }
}
