let aba = 'login';

fetch('/api/eu').then((r) => { if (r.ok) location.href = '/app.html'; });

document.querySelectorAll('.abas button').forEach((b) => {
  b.addEventListener('click', () => {
    aba = b.dataset.aba;
    document.querySelectorAll('.abas button').forEach((x) => x.classList.toggle('ativa', x === b));
    document.getElementById('campo-nome').hidden = aba !== 'cadastro';
    document.getElementById('nome').required = aba === 'cadastro';
    document.getElementById('enviar').textContent = aba === 'cadastro' ? 'Criar conta' : 'Entrar';
    document.getElementById('erro').textContent = '';
  });
});

document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const erro = document.getElementById('erro');
  const botao = document.getElementById('enviar');
  erro.textContent = '';
  botao.disabled = true;

  const corpo = {
    nome: document.getElementById('nome').value,
    email: document.getElementById('email').value,
    senha: document.getElementById('senha').value,
  };

  try {
    const r = await fetch(aba === 'cadastro' ? '/api/cadastro' : '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const dados = await r.json();
    if (!r.ok) throw new Error(dados.erro);
    location.href = '/app.html';
  } catch (err) {
    erro.textContent = err.message || 'Algo deu errado';
  } finally {
    botao.disabled = false;
  }
});
