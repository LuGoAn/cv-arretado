let aba = 'login';

fetch('/api/eu').then((r) => { if (r.ok) location.href = '/app.html'; });

function trocarAba(qual) {
  aba = qual;
  const cad = aba === 'cadastro';
  document.querySelectorAll('.abas button').forEach((x) => x.classList.toggle('ativa', x.dataset.aba === aba));
  document.getElementById('campo-nome').hidden = !cad;
  document.getElementById('nome').required = cad;
  document.getElementById('enviar').textContent = cad ? 'Criar conta' : 'Entrar';
  document.getElementById('titulo-form').textContent = cad ? 'Cria sua conta' : 'Bem-vindo de volta';
  document.getElementById('sub-form').textContent = cad
    ? 'A primeira adaptação do mês é por nossa conta.'
    : 'Entra pra ver suas adaptações.';
  document.getElementById('senha').autocomplete = cad ? 'new-password' : 'current-password';
  document.getElementById('erro').textContent = '';
}

document.querySelectorAll('.abas button').forEach((b) => {
  b.addEventListener('click', () => trocarAba(b.dataset.aba));
});

// a landing manda pra /entrar.html#cadastro quando a pessoa clica em criar conta
if (location.hash === '#cadastro') trocarAba('cadastro');

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
