const $ = (id) => document.getElementById(id);
let atual = null;
let eu = null;

async function api(url, opcoes) {
  const r = await fetch(url, opcoes);
  if (r.status === 401) {
    location.href = '/';
    throw new Error('sessão expirou');
  }
  const dados = await r.json();
  if (!r.ok) {
    const e = new Error(dados.erro || 'Erro');
    e.codigo = dados.codigo;
    throw e;
  }
  return dados;
}

async function carregarPlano() {
  eu = await api('/api/eu');
  $('ola').textContent = 'Oi, ' + eu.nome.split(' ')[0];
  const premium = eu.plano === 'premium';
  $('selo-plano').textContent = premium ? 'Premium' : 'Grátis · seja Premium';
  $('selo-plano').classList.toggle('premium', premium);
  $('btn-carta').innerHTML = premium
    ? 'Gerar carta de apresentação'
    : 'Carta de apresentação <span class="cadeado">(Premium)</span>';

  const acabou = !premium && eu.usadas_mes >= eu.limite;
  $('uso').innerHTML = premium
    ? 'Plano Premium: adaptações ilimitadas.'
    : `Plano grátis: ${eu.usadas_mes} de ${eu.limite} adaptação usada este mês. <a href="/planos.html">Ver Premium</a>`;
  $('bloqueio').classList.toggle('on', acabou);
  $('adaptar').disabled = acabou;
}

function escapar(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function classeNota(n) {
  if (n >= 75) return 'boa';
  if (n >= 50) return 'media';
  return '';
}

async function carregarHistorico() {
  const itens = await api('/api/historico');
  const lista = $('lista');
  if (!itens.length) {
    lista.innerHTML = '<li class="vazio">Nada ainda. Faz a primeira!</li>';
    return;
  }
  lista.innerHTML = itens
    .map((i) => {
      const data = new Date(i.criado_em.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR');
      return `<li data-id="${i.id}" class="${atual && atual.id === i.id ? 'ativo' : ''}">
        <span>${escapar(i.cargo || 'Sem cargo')}<br><small style="color:var(--suave)">${data}</small></span>
        <span class="selo ${classeNota(i.nota)}">${i.nota}</span>
      </li>`;
    })
    .join('');
  lista.querySelectorAll('li[data-id]').forEach((li) => {
    li.addEventListener('click', () => abrir(li.dataset.id));
  });
}

async function abrir(id) {
  const item = await api('/api/historico/' + id);
  mostrar(item);
}

function mostrar(r) {
  atual = r;
  $('formulario').style.display = 'none';
  $('resultado').classList.add('on');
  $('res-titulo').textContent = r.cargo || 'Resultado';
  $('res-resumo').textContent = r.resumo;
  $('nota-antes').textContent = r.nota;
  $('nota-depois').textContent = r.nota_adaptado;
  $('barra-antes').style.width = r.nota + '%';
  $('barra-depois').style.width = r.nota_adaptado + '%';
  $('encontradas').innerHTML = r.palavras_encontradas.map((p) => `<span class="tag">${escapar(p)}</span>`).join('') || '<small>nenhuma</small>';
  $('faltando').innerHTML = r.palavras_faltando.map((p) => `<span class="tag falta">${escapar(p)}</span>`).join('') || '<small>nenhuma</small>';
  $('dicas').innerHTML = r.dicas.map((d) => `<li>${escapar(d)}</li>`).join('');
  // o markdown vem da IA, então tira qualquer html cru antes de renderizar
  $('cv').innerHTML = marked.parse(escapar(r.curriculo_adaptado));
  $('erro-carta').textContent = '';
  mostrarCarta(r.carta);
  carregarHistorico();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mostrarCarta(carta) {
  $('area-carta').hidden = !carta;
  $('carta').textContent = carta || '';
}

function novo() {
  atual = null;
  $('resultado').classList.remove('on');
  $('formulario').style.display = '';
  carregarHistorico();
  carregarPlano();
}

$('btn-carta').addEventListener('click', async () => {
  if (eu.plano !== 'premium') {
    location.href = '/planos.html';
    return;
  }
  const b = $('btn-carta');
  b.disabled = true;
  b.textContent = 'Escrevendo a carta...';
  $('erro-carta').textContent = '';
  try {
    const r = await api(`/api/historico/${atual.id}/carta`, { method: 'POST' });
    atual.carta = r.carta;
    mostrarCarta(r.carta);
    $('area-carta').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    $('erro-carta').textContent = err.message;
  } finally {
    b.disabled = false;
    b.textContent = 'Gerar carta de apresentação';
  }
});

$('copiar-carta').addEventListener('click', async () => {
  await navigator.clipboard.writeText(atual.carta);
  $('copiar-carta').textContent = 'Copiado!';
  setTimeout(() => ($('copiar-carta').textContent = 'Copiar carta'), 1500);
});

$('arquivo').addEventListener('change', () => {
  const f = $('arquivo').files[0];
  $('nome-arquivo').textContent = f ? f.name : 'Clica aqui pra escolher o PDF';
  $('area-upload').classList.toggle('tem', !!f);
});

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('erro').textContent = '';

  const f = $('arquivo').files[0];
  if (!f && !$('texto').value.trim()) {
    $('erro').textContent = 'Manda o PDF ou cola o texto do currículo';
    return;
  }

  const fd = new FormData();
  if (f) fd.append('arquivo', f);
  fd.append('texto', $('texto').value);
  fd.append('cargo', $('cargo').value);
  fd.append('vaga', $('vaga').value);

  $('adaptar').disabled = true;
  $('carregando').classList.add('on');
  try {
    const r = await api('/api/adaptar', { method: 'POST', body: fd });
    mostrar(r);
  } catch (err) {
    if (err.codigo !== 'limite') $('erro').textContent = err.message;
  } finally {
    $('carregando').classList.remove('on');
    carregarPlano();
  }
});

$('baixar').addEventListener('click', () => window.print());

$('copiar').addEventListener('click', async () => {
  await navigator.clipboard.writeText(atual.curriculo_adaptado);
  $('copiar').textContent = 'Copiado!';
  setTimeout(() => ($('copiar').textContent = 'Copiar texto'), 1500);
});

$('apagar').addEventListener('click', async () => {
  if (!confirm('Apagar essa adaptação?')) return;
  await api('/api/historico/' + atual.id, { method: 'DELETE' });
  novo();
});

$('nova').addEventListener('click', novo);

$('sair').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/';
});

carregarPlano().then(carregarHistorico);
