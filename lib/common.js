// Utilidades compartidas: clientes, contraseñas, sesiones y permisos de la GitHub App.
const crypto = require('crypto');

const b64u = (b) => Buffer.from(b).toString('base64url');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// CLIENTS = {"dominio.com": {"repo": "Org/repo", "password": "scrypt$sal$hash"}}
const clientFor = (host) => {
  let all = {};
  try { all = JSON.parse(process.env.CLIENTS || '{}'); } catch { /* sin clientes */ }
  return all[String(host || '').toLowerCase()] || null;
};

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(String(password), salt, 32).toString('hex')}`;
};

const verifyPassword = (password, stored) => {
  const [alg, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const got = crypto.scryptSync(String(password), Buffer.from(salt, 'hex'), 32);
  const want = Buffer.from(hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
};

// Sesión firmada: la usa el panel en lugar de un token de GitHub.
const hmac = (data) => {
  if (!process.env.SESSION_SECRET) throw new Error('Falta SESSION_SECRET');
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(data).digest('base64url');
};

const makeSession = (host, ttl = 8 * 3600) => {
  const body = b64u(JSON.stringify({ host, exp: Math.floor(Date.now() / 1000) + ttl }));
  return `${body}.${hmac(body)}`;
};

const readSession = (token) => {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const want = hmac(body);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString());
    return s.exp > Date.now() / 1000 ? s : null;
  } catch { return null; }
};

// Límite de intentos por dominio+IP (en memoria: frena la fuerza bruta sin base de datos).
const fails = new Map();
const LIMIT = 5;
const WINDOW = 15 * 60 * 1000;
const blocked = (key) => {
  const f = fails.get(key);
  return !!f && f.until > Date.now() && f.n >= LIMIT;
};
const failed = (key) => {
  const f = fails.get(key);
  fails.set(key, !f || f.until <= Date.now() ? { n: 1, until: Date.now() + WINDOW } : { n: f.n + 1, until: f.until });
};
const cleared = (key) => fails.delete(key);

// GitHub App: JWT firmado con la clave privada -> permiso temporal limitado a un solo repo.
const appJwt = () => {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(process.env.GITHUB_APP_ID) }));
  const key = (process.env.GITHUB_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return `${head}.${body}.${crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url')}`;
};

const tokens = new Map();
const installationToken = async (repo) => {
  const hit = tokens.get(repo);
  if (hit && hit.exp - Date.now() > 5 * 60 * 1000) return hit.token;
  const H = { Authorization: `Bearer ${appJwt()}`, Accept: 'application/vnd.github+json', 'User-Agent': 'zocalo-cms-proxy' };
  const inst = await (await fetch(`https://api.github.com/repos/${repo}/installation`, { headers: H })).json();
  if (!inst.id) throw new Error(`La GitHub App no está instalada en ${repo}`);
  const r = await (await fetch(`https://api.github.com/app/installations/${inst.id}/access_tokens`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ repositories: [repo.split('/')[1]], permissions: { contents: 'write', metadata: 'read' } }),
  })).json();
  if (!r.token) throw new Error('GitHub no entregó el permiso temporal');
  tokens.set(repo, { token: r.token, exp: Date.parse(r.expires_at) });
  return r.token;
};

module.exports = { esc, clientFor, hashPassword, verifyPassword, makeSession, readSession, blocked, failed, cleared, appJwt, installationToken };
