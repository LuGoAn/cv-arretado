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
  $('selo-plano').textContent = premium ? 'Premium' : 'Plano grátis';
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
    lista.innerHTML = '<li class="vazio">Nenhuma ainda. A primeira aparece aqui.</li>';
    return;
  }
  lista.innerHTML = itens
    .map((i) => {
      const data = new Date(i.criado_em.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR');
      return `<li data-id="${i.id}" class="${atual && atual.id === i.id ? 'ativo' : ''}">
        <span>${escapar(i.cargo || 'Sem cargo')}<br><small>${data}</small></span>
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
  animarNota(r.nota, r.nota_adaptado);
  $('encontradas').innerHTML = r.palavras_encontradas.map((p) => `<mark>${escapar(p)}</mark>`).join('') || 'nenhuma';
  $('faltando').innerHTML = r.palavras_faltando.map((p) => `<mark class="falta">${escapar(p)}</mark>`).join('') || 'nada, tá completo';
  $('dicas').innerHTML = r.dicas.map((d) => `<li>${escapar(d)}</li>`).join('');
  // o markdown vem da IA, então tira qualquer html cru antes de renderizar
  $('cv').innerHTML = marked.parse(escapar(r.curriculo_adaptado));
  $('cv-original').textContent = r.curriculo_original || '';
  const chaves = [...r.palavras_encontradas, ...r.palavras_faltando];
  grifar($('cv'), chaves);
  grifar($('cv-original'), chaves);
  trocarDoc('adaptado');
  $('erro-carta').textContent = '';
  mostrarCarta(r.carta);
  carregarHistorico();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// a nota adaptada sobe a partir da original, pra mostrar o ganho
function animarNota(de, ate) {
  const num = $('nota-depois');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || ate <= de) {
    num.textContent = ate;
    return;
  }
  const inicio = performance.now();
  const duracao = 900;
  function passo(agora) {
    const t = Math.min((agora - inicio) / duracao, 1);
    num.textContent = Math.round(de + (ate - de) * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(passo);
  }
  requestAnimationFrame(passo);
}

// passa marca-texto nas palavras da vaga que aparecem no texto
function grifar(el, palavras) {
  const lista = palavras.filter((p) => p && p.length > 1).sort((a, b) => b.length - a.length);
  if (!lista.length) return;
  const re = new RegExp(`(${lista.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const nos = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) nos.push(walker.currentNode);
  for (const no of nos) {
    if (!re.test(no.nodeValue)) continue;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    no.nodeValue.split(re).forEach((pedaco, i) => {
      if (!pedaco) return;
      if (i % 2) {
        const m = document.createElement('mark');
        m.textContent = pedaco;
        frag.appendChild(m);
      } else {
        frag.appendChild(document.createTextNode(pedaco));
      }
    });
    no.replaceWith(frag);
  }
}

function trocarDoc(qual) {
  document.querySelectorAll('.abas-doc button').forEach((b) => {
    const ativa = b.dataset.doc === qual;
    b.classList.toggle('ativa', ativa);
    b.setAttribute('aria-selected', ativa);
  });
  $('cv').hidden = qual !== 'adaptado';
  $('cv-original').hidden = qual !== 'original';
}

document.querySelectorAll('.abas-doc button').forEach((b) => {
  b.addEventListener('click', () => trocarDoc(b.dataset.doc));
});

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
