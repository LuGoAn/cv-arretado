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
  $('editar').innerHTML = premium() ? 'Editar texto' : 'Editar texto <span class="cadeado">(Premium)</span>';

  $('uso').innerHTML = premium()
    ? 'Plano Premium: adaptações ilimitadas.'
    : `Plano grátis: ${eu.usadas_mes} de ${eu.limite} adaptação usada este mês. O exemplo não conta. <a href="/planos.html">Ver Premium</a>`;
  atualizarLimite();
}

// o exemplo não gasta a adaptação grátis, então ele continua liberado mesmo quando acabou
function atualizarLimite() {
  if (!eu) return;
  const acabou = !premium() && eu.usadas_mes >= eu.limite;
  const exemplo = !$('arquivo').files[0] && ehExemplo($('texto').value, $('vaga').value);
  $('bloqueio').classList.toggle('on', acabou && !exemplo);
  $('adaptar').disabled = acabou && !exemplo;
}
$('texto').addEventListener('input', atualizarLimite);
$('vaga').addEventListener('input', atualizarLimite);
$('arquivo').addEventListener('change', atualizarLimite);

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

let cvDados = null;
let editando = false;
let backup = null;
let modeloAtual = 'classico';
try {
  const salvo = localStorage.getItem('cv-modelo');
  if (MODELOS.some((m) => m.id === salvo)) modeloAtual = salvo;
} catch {}

function renderCv() {
  $('cv').className = `folha doc cv modelo-${modeloAtual}${editando ? ' editando' : ''}`;
  $('cv').innerHTML = renderizarCv(cvDados, modeloAtual, { editavel: editando });
  if (!editando) grifar($('cv'), chaves());
}

function renderGaleria() {
  $('galeria').innerHTML = MODELOS.map(
    (m) => `<button type="button" class="opcao-modelo${m.id === modeloAtual ? ' ativa' : ''}" role="radio" aria-checked="${m.id === modeloAtual}" data-m="${m.id}">
      <div class="miniatura" aria-hidden="true"><div class="folha doc cv modelo-${m.id}">${renderizarCv(cvDados, m.id)}</div></div>
      <span class="nome-modelo">${m.nome}${m.ats ? ' <span class="tag-ats">ATS</span>' : ''}</span>
    </button>`
  ).join('');
}

$('galeria').addEventListener('click', (e) => {
  const b = e.target.closest('[data-m]');
  if (!b) return;
  modeloAtual = b.dataset.m;
  try { localStorage.setItem('cv-modelo', modeloAtual); } catch {}
  $('galeria').querySelectorAll('[data-m]').forEach((x) => {
    x.classList.toggle('ativa', x === b);
    x.setAttribute('aria-checked', x === b);
  });
  renderCv();
});

const previa = document.createElement('div');
previa.className = 'previa-modelo';
previa.setAttribute('aria-hidden', 'true');
document.body.appendChild(previa);
let timerPrevia;

function mostrarPrevia(b) {
  previa.innerHTML = `<div class="folha doc cv modelo-${b.dataset.m}">${renderizarCv(cvDados, b.dataset.m)}</div>`;
  const r = b.querySelector('.miniatura').getBoundingClientRect();
  const w = 380, h = 538, m = 12;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(m, Math.min(left, innerWidth - w - m));
  // abaixo da miniatura se couber, senão acima, senão do lado
  let top = r.bottom + m;
  if (top + h > innerHeight - m) top = r.top - h - m;
  if (top < m) {
    top = Math.max(m, Math.min(r.top + r.height / 2 - h / 2, innerHeight - h - m));
    left = r.right + m + w <= innerWidth - m ? r.right + m : Math.max(m, r.left - w - m);
  }
  previa.style.left = left + 'px';
  previa.style.top = top + 'px';
  previa.classList.add('on');
}

function esconderPrevia() {
  clearTimeout(timerPrevia);
  previa.classList.remove('on');
}

// só em quem tem mouse, no celular o toque já escolhe o modelo
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  $('galeria').addEventListener('mouseover', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b || b.contains(e.relatedTarget)) return;
    clearTimeout(timerPrevia);
    timerPrevia = setTimeout(() => mostrarPrevia(b), 180);
  });
  $('galeria').addEventListener('mouseout', (e) => {
    const b = e.target.closest('[data-m]');
    if (b && !b.contains(e.relatedTarget)) esconderPrevia();
  });
  $('galeria').addEventListener('scroll', esconderPrevia);
  addEventListener('scroll', esconderPrevia, { passive: true });
}

// edição direto na folha: só os textos são editáveis, a estrutura fica travada
function lerEdicao() {
  $('cv').querySelectorAll('[contenteditable="true"]').forEach((el) => {
    const v = lerInline(el).trim();
    const { k, s, b, i } = el.dataset;
    if (k === 'nome') cvDados.nome = v;
    else if (k === 'topo') cvDados.topo[+i] = v;
    else if (k === 'titulo') cvDados.secoes[+s].titulo = v;
    else {
      const bloco = cvDados.secoes[+s].blocos[+b];
      if (bloco.t === 'ul') bloco.itens[+i] = v;
      else bloco.x = v;
    }
  });
}

function focar(seletor, noInicio) {
  const el = $('cv').querySelector(seletor);
  if (!el) return;
  el.focus();
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(noInicio);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
}

function abrirEditor() {
  backup = JSON.parse(JSON.stringify(cvDados));
  editando = true;
  trocarDoc('adaptado');
  $('barra-edicao').hidden = false;
  $('escolha-modelo').hidden = true;
  $('barra-doc').hidden = true;
  $('legenda-grifo').hidden = true;
  $('erro-edicao').textContent = '';
  $('editar').disabled = true;
  renderCv();
  $('barra-edicao').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fecharEditor() {
  editando = false;
  $('barra-edicao').hidden = true;
  $('escolha-modelo').hidden = false;
  $('barra-doc').hidden = false;
  $('legenda-grifo').hidden = false;
  $('editar').disabled = false;
  renderCv();
}

$('cv').addEventListener('keydown', (e) => {
  if (!editando) return;
  const el = e.target.closest('[contenteditable="true"]');
  if (!el) return;

  if (e.key === 'Enter') {
    e.preventDefault();
    if (el.tagName !== 'LI') return;
    // o que estiver depois do cursor vai pro item novo
    let depois = '';
    const sel = getSelection();
    if (sel.rangeCount && el.contains(sel.focusNode)) {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.setStart(sel.focusNode, sel.focusOffset);
      depois = r.toString().trim();
      r.deleteContents();
    }
    lerEdicao();
    const { s, b, i } = el.dataset;
    cvDados.secoes[+s].blocos[+b].itens.splice(+i + 1, 0, depois);
    renderCv();
    focar(`li[data-s="${s}"][data-b="${b}"][data-i="${+i + 1}"]`, true);
  } else if (e.key === 'Backspace' && el.tagName === 'LI' && !el.textContent.trim()) {
    e.preventDefault();
    lerEdicao();
    const { s, b, i } = el.dataset;
    const bloco = cvDados.secoes[+s].blocos[+b];
    bloco.itens.splice(+i, 1);
    if (!bloco.itens.length) cvDados.secoes[+s].blocos.splice(+b, 1);
    renderCv();
    if (+i > 0) focar(`li[data-s="${s}"][data-b="${b}"][data-i="${+i - 1}"]`, false);
  }
});

// colar sempre como texto puro, senão vem formatação de outro site junto
$('cv').addEventListener('paste', (e) => {
  if (!editando) return;
  e.preventDefault();
  const texto = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s*\n\s*/g, ' ');
  document.execCommand('insertText', false, texto);
});
$('cv').addEventListener('drop', (e) => editando && e.preventDefault());

$('cv').addEventListener('click', (e) => {
  const b = e.target.closest('[data-acao]');
  if (!b || !editando) return;
  lerEdicao();
  const s = +b.dataset.s;
  const secao = cvDados.secoes[s];
  if (b.dataset.acao === 'remover') {
    cvDados.secoes.splice(s, 1);
    renderCv();
    return;
  }
  let bi = secao.blocos.map((x) => x.t).lastIndexOf('ul');
  if (bi === -1) {
    secao.blocos.push({ t: 'ul', itens: [] });
    bi = secao.blocos.length - 1;
  }
  secao.blocos[bi].itens.push('');
  renderCv();
  focar(`li[data-s="${s}"][data-b="${bi}"][data-i="${secao.blocos[bi].itens.length - 1}"]`, true);
});

$('editar').addEventListener('click', () => {
  if (!premium()) {
    location.href = '/planos.html';
    return;
  }
  abrirEditor();
});
$('cancelar-edicao').addEventListener('click', () => {
  cvDados = backup;
  fecharEditor();
});

$('salvar-edicao').addEventListener('click', async () => {
  lerEdicao();
  limparVazios(cvDados);
  const md = paraMarkdown(cvDados);
  const b = $('salvar-edicao');
  b.disabled = true;
  try {
    await api('/api/historico/' + atual.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curriculo_adaptado: md }),
    });
    atual.curriculo_adaptado = md;
    fecharEditor();
    renderGaleria();
  } catch (err) {
    $('erro-edicao').textContent = err.message;
  } finally {
    b.disabled = false;
  }
});

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
  cvDados = lerMarkdown(r.curriculo_adaptado);
  fecharEditor();
  renderGaleria();
  $('cv-original').textContent = r.curriculo_original || '';
  grifar($('cv-original'), chaves());
  trocarDoc('adaptado');
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
  // só palavra inteira, senão "Git" grifa dentro de "GitHub"
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}])(${lista.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\p{N}])`,
    'giu'
  );
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
  atualizarLimite();
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
  if (editando) {
    $('erro-edicao').textContent = 'Salva ou cancela a edição antes de baixar.';
    return;
  }
  trocarDoc('adaptado');
  window.print();
});

$('copiar').addEventListener('click', async () => {
  await navigator.clipboard.writeText(paraTexto(cvDados));
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

function preencherExemplo() {
  if (atual) novo();
  limparArquivo();
  $('texto').value = EXEMPLO_CV;
  $('cargo').value = 'Desenvolvedor Front-end Júnior';
  $('vaga').value = EXEMPLO_VAGA;
  $('erro').textContent = '';
  $('boas-vindas').hidden = true;
  atualizarLimite();
  $('formulario').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('exemplo').addEventListener('click', preencherExemplo);
$('testar-exemplo').addEventListener('click', preencherExemplo);

carregarPlano().then(carregarHistorico).then(carregarUltimo);
