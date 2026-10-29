// Paso 1: Decap abre este endpoint en un popup; redirigimos a GitHub.
const { COOKIE, newState } = require('../lib/common');

module.exports = (req, res) => {
  const { GITHUB_CLIENT_ID } = process.env;
  if (!GITHUB_CLIENT_ID) return res.status(500).send('Falta GITHUB_CLIENT_ID');

  const state = newState();
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', GITHUB_CLIENT_ID);
  url.searchParams.set('scope', 'repo,user');
  url.searchParams.set('state', state);

  res.setHeader('Set-Cookie', `${COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
  res.redirect(302, url.toString());
};
