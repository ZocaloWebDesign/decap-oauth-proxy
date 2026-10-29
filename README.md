# decap-oauth-proxy

Proxy de login con GitHub para Decap CMS. Un solo despliegue en Vercel sirve a todas las webs de clientes.

## Variables de entorno (Vercel)
- `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET`: de la OAuth App de GitHub.
- `ALLOWED_ORIGINS`: dominios de las webs que pueden usar el panel, separados por coma.
  Ej: `cliente1.com,*.vercel.app`. Solo esos dominios reciben el token.

## OAuth App en GitHub
Settings > Developer settings > OAuth Apps > New.
- Homepage URL: la URL de este proyecto en Vercel.
- Authorization callback URL: `https://<este-proyecto>.vercel.app/callback`

## En cada web de cliente (`admin/config.yml`)
```yaml
backend:
  name: github
  repo: USUARIO/REPO
  branch: main
  base_url: https://<este-proyecto>.vercel.app
```
