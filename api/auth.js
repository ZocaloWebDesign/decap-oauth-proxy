// Paso 1: Decap abre este endpoint en un popup (?site_id=dominio-de-la-web). Mostramos el formulario de contraseña.
const { esc, clientFor } = require('../lib/common');

const form = (host, error) => `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Ingresar al panel</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px system-ui,sans-serif;background:#f3f4f7;color:#111}
form{background:#fff;padding:32px;border-radius:14px;box-shadow:0 8px 30px #0001;width:min(340px,88vw)}
h1{font-size:20px;margin:0 0 20px}input,button{width:100%;box-sizing:border-box;padding:12px;font-size:16px;border-radius:8px}
input{border:1px solid #ccd;margin-bottom:12px}button{border:0;background:#111;color:#fff;cursor:pointer}p{color:#c0392b;margin:0 0 12px;font-size:14px}</style></head>
<body><form method="post" action="/login"><h1>Ingresar al panel</h1>${error ? `<p>${esc(error)}</p>` : ''}
<input type="hidden" name="site_id" value="${esc(host)}">
<input type="password" name="password" placeholder="Contraseña" autocomplete="current-password" autofocus required>
<button type="submit">Entrar</button></form></body></html>`;

module.exports = (req, res) => {
  const host = String(req.query.site_id || '').toLowerCase();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (!clientFor(host)) return res.status(400).send('Este sitio no está habilitado para usar el panel.');
  res.status(200).send(form(host));
};

module.exports.form = form;
