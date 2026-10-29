# decap-oauth-proxy

Login por contraseña para Decap CMS, compartido por todas las webs de clientes.
El cliente solo ve el panel y escribe su contraseña: no necesita cuenta de GitHub.

## Cómo funciona
1. El panel (`/admin` de la web) abre `/auth`, que muestra el formulario de contraseña.
2. `/login` verifica la contraseña (guardada con scrypt, nunca en texto plano) y le entrega al panel una sesión firmada que vence a las 8 hs.
3. El panel llama a `/gh/...`: el proxy agrega un permiso temporal de la GitHub App, válido **solo para el repo de ese cliente**, y reenvía a GitHub. El navegador nunca ve un token de GitHub.

## Variables de entorno (Vercel)
| Variable | Qué es |
|---|---|
| `GITHUB_APP_ID` | ID de la GitHub App |
| `GITHUB_APP_PRIVATE_KEY` | Contenido del archivo `.pem` de la App (con sus saltos de línea, o con `\n`) |
| `SESSION_SECRET` | Texto largo y aleatorio (32+ caracteres) para firmar sesiones |
| `CLIENTS` | JSON con un cliente por dominio (ver abajo) |

```json
{
  "cliente.com": { "repo": "ZocaloWebDesign/Cliente1-web", "password": "scrypt$..." }
}
```
La clave es el dominio exacto desde el que se abre el panel (sin `https://`).

## GitHub App (una sola vez)
Organización > Settings > Developer settings > GitHub Apps > New GitHub App.
- Webhook: desmarcar "Active".
- Permisos de repositorio: **Contents: Read and write**, **Metadata: Read-only**.
- Where can this app be installed: **Only on this account**.
- Después: *Generate a private key* (baja el `.pem`) e *Install App* en la organización, eligiendo los repos de los clientes.

## Alta de un cliente nuevo
1. Instalar la GitHub App también en el repo del cliente (si se eligieron repos puntuales).
2. Generar el hash: `node scripts/hash-password.js "contraseña-del-cliente"`.
3. Agregar `"dominio": {"repo": "...", "password": "<hash>"}` a `CLIENTS` en Vercel y redeployar.
4. En la web del cliente, `admin/config.yml`:
```yaml
backend:
  name: github
  repo: ORG/REPO
  branch: main
  base_url: https://decap-oauth-proxy-roan.vercel.app
  api_root: https://decap-oauth-proxy-roan.vercel.app/gh
```

## Seguridad
- Cinco contraseñas incorrectas desde la misma IP bloquean el acceso 15 minutos.
- Un cliente no puede tocar el repo de otro: el proxy rechaza cualquier ruta que no sea la de su repo.
- Cambiar la contraseña de un cliente: nuevo hash en `CLIENTS` y redeploy. Las sesiones abiertas vencen solas.
- Este repo es público: no subir claves, `.pem` ni contraseñas. Todo eso va solo en Vercel.
