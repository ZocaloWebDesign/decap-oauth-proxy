// Paso 2: GitHub vuelve acá con ?code. Lo cambiamos por un token y se lo pasamos al panel (Decap) vía postMessage.
const { COOKIE, getCookie } = require('../lib/common');

const page = (status, payload) => `<!doctype html><meta charset="utf-8"><script>
(function(){
  var msg = 'authorization:github:${status}:' + ${JSON.stringify(JSON.stringify(payload))};
  var allowed = ${JSON.stringify((process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean))};
  function ok(origin){
    var host; try { host = new URL(origin).host } catch (e) { return false }
    return allowed.some(function(r){
      if (r === '*') return true;
      if (r.indexOf('*.') === 0) return host === r.slice(2) || host.slice(-(r.length-1)) === r.slice(1);
      return host === r;
    });
  }
  function onMsg(e){
    if (!ok(e.origin)) return;
    window.opener.postMessage(msg, e.origin);
    window.removeEventListener('message', onMsg, false);
    window.close();
  }
  window.addEventListener('message', onMsg, false);
  window.opener && window.opener.postMessage('authorizing:github', '*');
})();
</script>`;

module.exports = async (req, res) => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;
  const { code, state } = req.query;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);

  if (!code || !state || state !== getCookie(req, COOKIE)) {
    return res.status(400).send(page('error', { message: 'Estado inválido o login vencido. Probá de nuevo.' }));
  }
  try {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
    });
    const data = await r.json();
    if (!data.access_token) throw new Error(data.error_description || 'GitHub no devolvió token');
    res.status(200).send(page('success', { token: data.access_token, provider: 'github' }));
  } catch (e) {
    res.status(500).send(page('error', { message: e.message }));
  }
};

