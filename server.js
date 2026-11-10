require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
// importa direto da lib porque o index do pdf-parse tenta ler um arquivo de teste
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const db = require('./src/db');
const { hashSenha, conferirSenha } = require('./src/senha');
const { adaptarCurriculo } = require('./src/groq');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'cv-arretado-dev',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8, sameSite: 'lax' },
  })
);
app.use(express.static(path.join(__dirname, 'public')));

function logado(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ erro: 'Faça login primeiro' });
  next();
}

app.post('/api/cadastro', (req, res) => {
  const { nome, email, senha } = req.body || {};
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha nome, email e senha' });
  if (senha.length < 6) return res.status(400).json({ erro: 'A senha precisa de pelo menos 6 caracteres' });

  const emailLimpo = email.trim().toLowerCase();
  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailLimpo);
  if (existe) return res.status(409).json({ erro: 'Esse email já tem conta' });

  const r = db
    .prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)')
    .run(nome.trim(), emailLimpo, hashSenha(senha));

  req.session.userId = Number(r.lastInsertRowid);
  req.session.nome = nome.trim();
  res.json({ ok: true, nome: req.session.nome });
});

app.post('/api/login', (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ erro: 'Informe email e senha' });

  const u = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email.trim().toLowerCase());
  if (!u || !conferirSenha(senha, u.senha_hash)) {
    return res.status(401).json({ erro: 'Email ou senha errados' });
  }

  req.session.userId = u.id;
  req.session.nome = u.nome;
  res.json({ ok: true, nome: u.nome });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/eu', logado, (req, res) => {
  res.json({ id: req.session.userId, nome: req.session.nome });
});

app.post('/api/adaptar', logado, upload.single('arquivo'), async (req, res) => {
  try {
    const vaga = (req.body.vaga || '').trim();
    const cargo = (req.body.cargo || '').trim();
    let curriculo = (req.body.texto || '').trim();

    if (req.file) {
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({ erro: 'Só aceito PDF por enquanto' });
      }
      const pdf = await pdfParse(req.file.buffer);
      curriculo = pdf.text.trim();
      if (!curriculo) {
        return res.status(400).json({ erro: 'Não consegui ler texto nesse PDF (pode ser imagem escaneada). Cola o texto no campo.' });
      }
    }

    if (!curriculo) return res.status(400).json({ erro: 'Manda o currículo em PDF ou cola o texto' });
    if (vaga.length < 30) return res.status(400).json({ erro: 'Cola a descrição da vaga completa' });

    const resultado = await adaptarCurriculo({
      curriculo: curriculo.slice(0, 15000),
      vaga: vaga.slice(0, 8000),
      cargo,
    });

    const r = db
      .prepare(
        'INSERT INTO adaptacoes (usuario_id, cargo, vaga, curriculo_original, resultado, nota) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(req.session.userId, cargo, vaga, curriculo, JSON.stringify(resultado), resultado.nota_adaptado);

    res.json({ id: Number(r.lastInsertRowid), cargo, ...resultado });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: e.message || 'Deu ruim na adaptação' });
  }
});

app.get('/api/historico', logado, (req, res) => {
  const itens = db
    .prepare('SELECT id, cargo, nota, criado_em FROM adaptacoes WHERE usuario_id = ? ORDER BY id DESC LIMIT 50')
    .all(req.session.userId);
  res.json(itens);
});

app.get('/api/historico/:id', logado, (req, res) => {
  const item = db
    .prepare('SELECT * FROM adaptacoes WHERE id = ? AND usuario_id = ?')
    .get(req.params.id, req.session.userId);
  if (!item) return res.status(404).json({ erro: 'Não achei' });
  res.json({ id: item.id, cargo: item.cargo, vaga: item.vaga, ...JSON.parse(item.resultado) });
});

app.delete('/api/historico/:id', logado, (req, res) => {
  db.prepare('DELETE FROM adaptacoes WHERE id = ? AND usuario_id = ?').run(req.params.id, req.session.userId);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CV Arretado rodando em http://localhost:${PORT}`));
