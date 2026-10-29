// Utilidades compartidas por /api/auth y /api/callback.
const crypto = require('crypto');

const COOKIE = 'oauth_state';

const newState = () => crypto.randomBytes(16).toString('hex');

const getCookie = (req, name) => {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
};

// ALLOWED_ORIGINS: lista separada por comas. Acepta "*.dominio.com" y "*" (solo para pruebas).
const originAllowed = (origin) => {
  const list = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  let host;
  try { host = new URL(origin).host; } catch { return false; }
  return list.some((rule) => {
    if (rule === '*') return true;
    if (rule.startsWith('*.')) return host === rule.slice(2) || host.endsWith(rule.slice(1));
    return host === rule;
  });
};

module.exports = { COOKIE, newState, getCookie, originAllowed };
