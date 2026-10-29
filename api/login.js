// Paso 2: recibe la contraseña. Si es correcta, le pasa al panel (Decap) una sesión del proxy vía postMessage.
const { esc, clientFor, verifyPassword, makeSession, blocked, failed, cleared } = require('../lib/common');
const { form } = require('./auth');

// Mismo saludo que hace Decap: el popup avisa, el panel responde con su origen y recién ahí enviamos la sesión.
const done = (host, status, payload) => `<!doctype html><meta charset="utf-8"><script>
(function(){
  var msg = 'authorization:github:${status}:' + ${JSON.stringify(JSON.stringify(payload))};
  var allowed = ${JSON.stringify('https://' + host)};
  function onMsg(e){
    if (e.origin !== allowed) return;
    window.opener.postMessage(msg, e.origin);
    window.removeEventListener('message', onMsg, false);
    window.close();
  }
  window.addEventListener('message', onMsg, false);
  window.opener && window.opener.postMessage('authorizing:github', '*');
})();
</script>`;

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).send('Método no permitido');

  const body = typeof req.body === 'string' ? Object.fromEntries(new URLSearchParams(req.body)) : req.body || {};
  const host = String(body.site_id || '').toLowerCase();
  const client = clientFor(host);
  if (!client) return res.status(400).send('Este sitio no está habilitado para usar el panel.');

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const key = `${host}|${ip}`;
  if (blocked(key)) return res.status(429).send(form(host, 'Demasiados intentos. Esperá 15 minutos.'));

  if (!verifyPassword(body.password, client.password)) {
    failed(key);
    await new Promise((r) => setTimeout(r, 600));
    return res.status(401).send(form(host, 'Contraseña incorrecta.'));
  }
  cleared(key);
  res.status(200).send(done(host, 'success', { token: makeSession(host), provider: 'github' }));
};
