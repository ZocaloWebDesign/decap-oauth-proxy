// Uso: node scripts/hash-password.js "la-contraseña-del-cliente"
// Imprime el valor para el campo "password" de la variable CLIENTS en Vercel.
const { hashPassword } = require('../lib/common');

if (!process.argv[2]) {
  console.error('Falta la contraseña. Uso: node scripts/hash-password.js "contraseña"');
  process.exit(1);
}
console.log(hashPassword(process.argv[2]));
