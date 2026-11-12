// o currículo é guardado em markdown, mas a tela trabalha com essa estrutura:
// { nome, topo: [linhas], secoes: [{ titulo, blocos: [{ t: 'p'|'h3', x } | { t: 'ul', itens: [] }] }] }

const MODELOS = [
  { id: 'classico', nome: 'Clássico', ats: true },
  { id: 'harvard', nome: 'Harvard', ats: true },
  { id: 'moderno', nome: 'Moderno', ats: true },
  { id: 'minimalista', nome: 'Minimalista', ats: true },
  { id: 'compacto', nome: 'Compacto', ats: true },
  { id: 'elegante', nome: 'Elegante', ats: true },
  { id: 'executivo', nome: 'Executivo', ats: false },
  { id: 'lateral', nome: 'Duas colunas', ats: false },
];

const SECOES_LATERAIS = /habilidade|compet[eê]ncia|skill|idioma|ferrament|tecnologia|conhecimento|certifica|contato|interesse/i;

function lerMarkdown(md) {
  const cv = { nome: '', topo: [], secoes: [] };
  let secao = null;

  for (const bruta of (md || '').split('\n')) {
    const linha = bruta.trim();
    if (!linha || /^(-{3,}|\*{3,}|_{3,})$/.test(linha)) continue;

    let m;
    if ((m = linha.match(/^#\s+(.*)/)) && !cv.nome && !secao) {
      cv.nome = m[1];
    } else if ((m = linha.match(/^#{1,2}\s+(.*)/))) {
      secao = { titulo: m[1], blocos: [] };
      cv.secoes.push(secao);
    } else if ((m = linha.match(/^#{3,6}\s+(.*)/))) {
      if (secao) secao.blocos.push({ t: 'h3', x: m[1] });
      else cv.topo.push(m[1]);
    } else if ((m = linha.match(/^([-*+•]|\d+[.)])\s+(.*)/))) {
      if (!secao) {
        cv.topo.push(m[2]);
        continue;
      }
      const ultimo = secao.blocos[secao.blocos.length - 1];
      if (ultimo && ultimo.t === 'ul') ultimo.itens.push(m[2]);
      else secao.blocos.push({ t: 'ul', itens: [m[2]] });
    } else if (secao) {
      secao.blocos.push({ t: 'p', x: linha });
    } else if (!cv.nome) {
      // sem "# Nome", a primeira linha solta vira o nome
      cv.nome = linha;
    } else {
      cv.topo.push(linha);
    }
  }
  return cv;
}

function paraMarkdown(cv) {
  const partes = [];
  if (cv.nome) partes.push('# ' + cv.nome);
  cv.topo.forEach((l) => partes.push(l));
  cv.secoes.forEach((s) => {
    partes.push('## ' + s.titulo);
    s.blocos.forEach((b) => {
      if (b.t === 'ul') partes.push(b.itens.map((i) => '- ' + i).join('\n'));
      else if (b.t === 'h3') partes.push('### ' + b.x);
      else partes.push(b.x);
    });
  });
  return partes.join('\n\n');
}

const semMarcas = (s) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');

// versão pra colar em formulário de site de vaga, sem nenhum símbolo de markdown
function paraTexto(cv) {
  const partes = [];
  if (cv.nome) partes.push(semMarcas(cv.nome));
  if (cv.topo.length) partes.push(cv.topo.map(semMarcas).join('\n'));
  cv.secoes.forEach((s) => {
    const linhas = [semMarcas(s.titulo).toUpperCase()];
    s.blocos.forEach((b) => {
      if (b.t === 'ul') b.itens.forEach((i) => linhas.push('• ' + semMarcas(i)));
      else linhas.push(semMarcas(b.x));
    });
    partes.push(linhas.join('\n'));
  });
  return partes.join('\n\n');
}

function limparVazios(cv) {
  cv.topo = cv.topo.filter((l) => l.trim());
  cv.secoes = cv.secoes
    .map((s) => ({
      titulo: s.titulo.trim(),
      blocos: s.blocos
        .map((b) => (b.t === 'ul' ? { t: 'ul', itens: b.itens.filter((i) => i.trim()) } : b))
        .filter((b) => (b.t === 'ul' ? b.itens.length : b.x.trim())),
    }))
    .filter((s) => s.titulo || s.blocos.length);
  return cv;
}

function htmlInline(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
}

// lê de volta o que a pessoa digitou, mantendo negrito e itálico
function lerInline(el) {
  let s = '';
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) s += n.nodeValue;
    else if (n.nodeName === 'BR') s += ' ';
    else if (n.nodeName === 'STRONG' || n.nodeName === 'B') s += '**' + lerInline(n) + '**';
    else if (n.nodeName === 'EM' || n.nodeName === 'I') s += '*' + lerInline(n) + '*';
    else if (n.nodeType === 1) s += lerInline(n);
  });
  return s.replace(/ /g, ' ').replace(/\s+/g, ' ').replace(/\*\*\s*\*\*/g, '');
}

function renderizarCv(cv, modelo, { editavel = false } = {}) {
  const ed = (attrs) => (editavel ? ` contenteditable="true" spellcheck="true" ${attrs}` : '');
  const lateral = modelo === 'lateral';

  let topo = '';
  cv.topo.forEach((l, i) => {
    // na coluna estreita os contatos ficam um por linha
    if (lateral && !editavel) {
      l.split(/\s+\|\s+/).forEach((p) => (topo += `<p class="linha-topo">${htmlInline(p)}</p>`));
    } else {
      topo += `<p class="linha-topo"${ed(`data-k="topo" data-i="${i}"`)}>${htmlInline(l)}</p>`;
    }
  });
  const cab = `<header class="cab"><h1${ed('data-k="nome"')}>${htmlInline(cv.nome)}</h1>${topo}</header>`;

  const secao = (s, si) => {
    let corpo = '';
    s.blocos.forEach((b, bi) => {
      const at = (extra = '') => ed(`data-s="${si}" data-b="${bi}" ${extra}`);
      if (b.t === 'ul') {
        corpo += '<ul>' + b.itens.map((it, ii) => `<li${at(`data-i="${ii}"`)}>${htmlInline(it)}</li>`).join('') + '</ul>';
      } else if (b.t === 'h3') {
        corpo += `<h3${at()}>${htmlInline(b.x)}</h3>`;
      } else {
        corpo += `<p${at()}>${htmlInline(b.x)}</p>`;
      }
    });
    const controles = editavel
      ? `<div class="controles-sec" contenteditable="false">
           <button type="button" class="mini-btn" data-acao="item" data-s="${si}">+ item</button>
           <button type="button" class="mini-btn" data-acao="remover" data-s="${si}">Remover seção</button>
         </div>`
      : '';
    return `<section class="sec"><h2${ed(`data-k="titulo" data-s="${si}"`)}>${htmlInline(s.titulo)}</h2><div class="sec-corpo">${corpo}</div>${controles}</section>`;
  };

  const lista = cv.secoes.map((s, i) => ({ s, i }));
  if (lateral) {
    const lado = lista.filter(({ s }) => SECOES_LATERAIS.test(s.titulo));
    const resto = lista.filter(({ s }) => !SECOES_LATERAIS.test(s.titulo));
    return `<aside class="lateral">${cab}${lado.map(({ s, i }) => secao(s, i)).join('')}</aside>
      <div class="principal">${resto.map(({ s, i }) => secao(s, i)).join('')}</div>`;
  }
  return `${cab}<div class="principal">${lista.map(({ s, i }) => secao(s, i)).join('')}</div>`;
}
