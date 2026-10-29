// Intermediario de la API de GitHub: el panel habla con /gh/... y acá se agrega el permiso real de la App.
// Solo deja pasar pedidos al repo del cliente de la sesión.
const { clientFor, readSession, installationToken } = require('../lib/common');

module.exports = async (req, res) => {
  const session = readSession((req.headers.authorization || '').replace(/^(token|Bearer)\s+/i, ''));
  if (!session) return res.status(401).json({ message: 'Sesión vencida. Volvé a ingresar.' });
  const client = clientFor(session.host);
  if (!client) return res.status(403).json({ message: 'Sitio no habilitado' });

  const url = new URL(req.url, 'http://x');
  const path = url.searchParams.get('path') || '';
  url.searchParams.delete('path');

  // Decap pregunta por el usuario al entrar; una App no tiene usuario, así que respondemos uno fijo.
  if (path === 'user') return res.status(200).json({ login: 'cliente', name: session.host, id: 0, avatar_url: '', email: null });

  const base = `repos/${client.repo}`.toLowerCase();
  const lower = path.toLowerCase();
  if (lower !== base && !lower.startsWith(`${base}/`)) return res.status(403).json({ message: 'Ruta no permitida' });

  try {
    const hasBody = !['GET', 'HEAD'].includes(req.method);
    const r = await fetch(`https://api.github.com/${path}${url.search}`, {
      method: req.method,
      headers: {
        Authorization: `token ${await installationToken(client.repo)}`,
        Accept: req.headers.accept || 'application/vnd.github+json',
        'User-Agent': 'zocalo-cms-proxy',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: hasBody ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})) : undefined,
    });
    let out = Buffer.from(await r.arrayBuffer());
    // Decap exige permiso de escritura en el repo; la App lo tiene, pero la API no siempre lo informa.
    if (req.method === 'GET' && lower === base && r.ok) {
      out = Buffer.from(JSON.stringify({ ...JSON.parse(out.toString()), permissions: { admin: false, push: true, pull: true } }));
    }
    res.status(r.status);
    for (const h of ['content-type', 'link', 'etag']) if (r.headers.get(h)) res.setHeader(h, r.headers.get(h));
    res.send(out);
  } catch (e) {
    res.status(502).json({ message: e.message });
  }
};
