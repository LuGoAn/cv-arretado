const $ = (id) => document.getElementById(id);
let atual = null;
let eu = null;
let ultimoCurriculo = null;

async function api(url, opcoes) {
  const r = await fetch(url, opcoes);
  if (r.status === 401) {
    location.href = '/entrar.html';
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

const premium = () => eu && eu.plano === 'premium';

async function carregarPlano() {
  eu = await api('/api/eu');
  const primeiro = eu.nome.trim().split(/\s+/)[0];
  $('ola').textContent = 'Oi, ' + primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
  $('plano-atual').innerHTML = premium() ? 'Plano <span class="grifo">Premium</span>' : 'Plano grátis';
  $('upgrade').hidden = premium();
  $('baixar').innerHTML = premium() ? 'Baixar em PDF' : 'Baixar em PDF <span class="cadeado">(Premium)</span>';
  $('btn-carta').innerHTML = premium()
    ? 'Gerar carta de apresentação'
    : 'Carta de apresentação <span class="cadeado">(Premium)</span>';

  const acabou = !premium() && eu.usadas_mes >= eu.limite;
  $('uso').innerHTML = premium()
    ? 'Plano Premium: adaptações ilimitadas.'
    : `Plano grátis: ${eu.usadas_mes} de ${eu.limite} adaptação usada este mês. <a href="/planos.html">Ver Premium</a>`;
  $('bloqueio').classList.toggle('on', acabou);
  $('adaptar').disabled = acabou;
}

async function carregarUltimo() {
  const r = await api('/api/ultimo-curriculo');
  ultimoCurriculo = r.curriculo;
  $('usar-ultimo').hidden = !ultimoCurriculo;
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
  $('boas-vindas').hidden = itens.length > 0 || !!$('texto').value.trim();
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

function chaves() {
  return [...atual.palavras_encontradas, ...atual.palavras_faltando];
}

function renderCv() {
  // o markdown vem da IA ou da pessoa, então tira qualquer html cru antes de renderizar
  $('cv').innerHTML = marked.parse(escapar(atual.curriculo_adaptado));
  grifar($('cv'), chaves());
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
  renderCv();
  $('cv-original').textContent = r.curriculo_original || '';
  grifar($('cv-original'), chaves());
  fecharEditor();
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
  $('docs').classList.toggle('lado', qual === 'lado');
  $('cv').hidden = qual === 'original';
  $('cv-original').hidden = qual === 'adaptado';
}

document.querySelectorAll('.abas-doc button').forEach((b) => {
  b.addEventListener('click', () => trocarDoc(b.dataset.doc));
});

function aplicarModelo(m) {
  $('cv').classList.remove('modelo-classico', 'modelo-moderno', 'modelo-compacto');
  $('cv').classList.add('modelo-' + m);
  $('modelo').value = m;
}

$('modelo').addEventListener('change', () => {
  aplicarModelo($('modelo').value);
  try { localStorage.setItem('cv-modelo', $('modelo').value); } catch {}
});

try { aplicarModelo(localStorage.getItem('cv-modelo') || 'classico'); } catch { aplicarModelo('classico'); }

function abrirEditor() {
  $('texto-editor').value = atual.curriculo_adaptado;
  $('erro-edicao').textContent = '';
  $('editor').hidden = false;
  $('docs').hidden = true;
  $('legenda-grifo').hidden = true;
  document.querySelector('.barra-doc').hidden = true;
  $('editar').disabled = true;
  $('texto-editor').focus();
}

function fecharEditor() {
  $('editor').hidden = true;
  $('docs').hidden = false;
  $('legenda-grifo').hidden = false;
  document.querySelector('.barra-doc').hidden = false;
  $('editar').disabled = false;
}

$('editar').addEventListener('click', abrirEditor);
$('cancelar-edicao').addEventListener('click', fecharEditor);

$('salvar-edicao').addEventListener('click', async () => {
  const texto = $('texto-editor').value;
  const b = $('salvar-edicao');
  b.disabled = true;
  try {
    await api('/api/historico/' + atual.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculo_adaptado: texto }),
    });
    atual.curriculo_adaptado = texto;
    renderCv();
    fecharEditor();
    trocarDoc('adaptado');
  } catch (err) {
    $('erro-edicao').textContent = err.message;
  } finally {
    b.disabled = false;
  }
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
  carregarUltimo();
}

// a resposta da IA demora uns segundos, então vai mostrando o que tá acontecendo
function etapas(lista) {
  let i = 0;
  $('etapa').textContent = lista[0];
  const t = setInterval(() => {
    if (i < lista.length - 1) $('etapa').textContent = lista[++i];
  }, 2600);
  return () => clearInterval(t);
}

$('btn-carta').addEventListener('click', async () => {
  if (!premium()) {
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

function limparArquivo() {
  $('arquivo').value = '';
  $('nome-arquivo').textContent = 'Clica aqui pra escolher o PDF';
  $('area-upload').classList.remove('tem');
}

$('usar-ultimo').addEventListener('click', () => {
  limparArquivo();
  $('texto').value = ultimoCurriculo;
  $('texto').focus();
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
  const parar = etapas([
    f ? 'Lendo o seu PDF...' : 'Lendo o seu currículo...',
    'Comparando com o que a vaga pede...',
    'Reescrevendo os pontos que combinam...',
    'Calculando a nota de encaixe...',
    'Quase lá, finalizando...',
  ]);
  try {
    const r = await api('/api/adaptar', { method: 'POST', body: fd });
    mostrar(r);
  } catch (err) {
    if (err.codigo !== 'limite') $('erro').textContent = err.message;
  } finally {
    parar();
    $('carregando').classList.remove('on');
    carregarPlano();
  }
});

$('baixar').addEventListener('click', () => {
  if (!premium()) {
    location.href = '/planos.html';
    return;
  }
  fecharEditor();
  trocarDoc('adaptado');
  window.print();
});

$('copiar').addEventListener('click', async () => {
  await navigator.clipboard.writeText(atual.curriculo_adaptado);
  $('copiar').textContent = 'Copiado!';
  setTimeout(() => ($('copiar').textContent = 'Copiar texto'), 1500);
});

$('apagar').addEventListener('click', async () => {
  const sim = await confirmar({
    titulo: 'Apagar essa adaptação?',
    texto: 'Ela some do seu histórico e não dá pra recuperar.',
    ok: 'Apagar',
    perigo: true,
  });
  if (!sim) return;
  await api('/api/historico/' + atual.id, { method: 'DELETE' });
  novo();
});

$('nova').addEventListener('click', novo);

$('sair').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/';
});

const EXEMPLO_CV = `Maria Souza
Recife, PE | maria.souza@email.com | (81) 99999-0000 | linkedin.com/in/mariasouza

RESUMO
Estudante de Análise e Desenvolvimento de Sistemas com experiência em projetos web pessoais e um estágio em suporte técnico. Gosto de construir interfaces e de aprender coisa nova rápido.

FORMAÇÃO
Análise e Desenvolvimento de Sistemas - Faculdade Senac Pernambuco (2023 - 2025, cursando)

EXPERIÊNCIA
Estagiária de Suporte Técnico - Loja Nordeste Info (fev/2024 - atual)
- Atendimento a clientes por chat e telefone, resolvendo problemas de computador e rede
- Criei uma planilha de controle de chamados que reduziu o tempo de resposta da equipe
- Ajudei a atualizar o site da loja em HTML e CSS

PROJETOS
Cardápio Online (2024) - site de cardápio pra uma lanchonete do bairro, feito com HTML, CSS e JavaScript
Lista de Tarefas (2024) - app de tarefas em React com salvamento no localStorage
Portfólio pessoal - publicado no GitHub Pages

HABILIDADES
HTML, CSS, JavaScript, React (básico), Git e GitHub, Figma (básico), Excel

IDIOMAS
Inglês intermediário (leitura técnica)`;

const EXEMPLO_VAGA = `Desenvolvedor(a) Front-end Júnior - Startup de logística (híbrido, Recife)

Sobre a vaga
Estamos procurando uma pessoa desenvolvedora front-end júnior pra fazer parte do time de produto e ajudar a construir o painel que nossos clientes usam pra acompanhar entregas.

Atividades
- Desenvolver e manter telas em React
- Consumir APIs REST e tratar estados de carregamento e erro
- Transformar protótipos do Figma em interfaces responsivas
- Participar de code review e das cerimônias do time (daily, planning)

Requisitos
- HTML, CSS e JavaScript
- React
- Git e versionamento de código
- Noções de responsividade e acessibilidade

Diferenciais
- TypeScript
- Testes com Jest ou Testing Library
- Experiência com metodologias ágeis
- Inglês para leitura técnica`;

function preencherExemplo() {
  if (atual) novo();
  limparArquivo();
  $('texto').value = EXEMPLO_CV;
  $('cargo').value = 'Desenvolvedor Front-end Júnior';
  $('vaga').value = EXEMPLO_VAGA;
  $('erro').textContent = '';
  $('boas-vindas').hidden = true;
  $('formulario').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('exemplo').addEventListener('click', preencherExemplo);
$('testar-exemplo').addEventListener('click', preencherExemplo);

carregarPlano().then(carregarHistorico).then(carregarUltimo);
