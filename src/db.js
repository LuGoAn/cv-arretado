const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dir = process.env.DB_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(path.join(dir, 'cv-arretado.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS adaptacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    cargo TEXT,
    vaga TEXT NOT NULL,
    curriculo_original TEXT NOT NULL,
    resultado TEXT NOT NULL,
    nota INTEGER,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// colunas que entraram depois; o try é pro caso do banco já ter elas
for (const sql of [
  "ALTER TABLE usuarios ADD COLUMN plano TEXT NOT NULL DEFAULT 'gratis'",
  'ALTER TABLE usuarios ADD COLUMN premium_desde TEXT',
  'ALTER TABLE adaptacoes ADD COLUMN carta TEXT',
  // apagar só esconde, senão a pessoa apaga e ganha outra adaptação grátis
  'ALTER TABLE adaptacoes ADD COLUMN apagado INTEGER NOT NULL DEFAULT 0',
]) {
  try { db.exec(sql); } catch {}
}

module.exports = db;
