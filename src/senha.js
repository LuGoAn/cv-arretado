const crypto = require('crypto');

function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function conferirSenha(senha, guardado) {
  const [salt, hash] = guardado.split(':');
  const teste = crypto.scryptSync(senha, salt, 64);
  return crypto.timingSafeEqual(teste, Buffer.from(hash, 'hex'));
}

module.exports = { hashSenha, conferirSenha };
