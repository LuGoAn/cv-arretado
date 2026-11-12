const URL_GROQ = 'https://api.groq.com/openai/v1/chat/completions';

const PROMPT_SISTEMA = `Você é um recrutador experiente e especialista em currículos no mercado brasileiro.
Sua tarefa é adaptar o currículo de uma pessoa para uma vaga específica.

Regras:
- Nunca invente experiência, empresa, curso, data ou habilidade que não esteja no currículo original.
- Pode reescrever, reordenar e dar mais destaque ao que já existe e combina com a vaga.
- Use as palavras-chave da vaga quando elas descreverem algo que a pessoa realmente fez (ajuda em filtros de ATS).
- Escreva em português do Brasil, tom profissional e direto, verbos no passado para experiências.
- O currículo adaptado deve vir em Markdown: nome como # título, seções com ##, itens com -.
- Logo abaixo do nome, mantenha TODOS os dados de contato do original (email, telefone, cidade, LinkedIn, GitHub, portfólio), exatamente como estão, numa linha separados por " | ".
- Não use links nem negrito no meio do texto. Só # para o nome, ## para seções, ### para cargo/empresa quando precisar e - para itens.

Seção de abertura (a primeira depois do contato):
- Primeiro descubra o que o original tem: um OBJETIVO (diz o que a pessoa busca: tipo de vaga, área, estágio, primeiro emprego), um RESUMO/PERFIL (diz quem a pessoa é e o que já fez) ou nenhum dos dois.
- Se for OBJETIVO: mantenha o título "Objetivo". Escreva UMA frase curta dizendo a vaga ou área que a pessoa busca, usando o nome do cargo da vaga, e no máximo 2 ou 3 conhecimentos que ela tem e a vaga pede. Ex: "Estágio em Desenvolvimento Front-end, aplicando HTML, CSS, JavaScript e React."
- Se for RESUMO: mantenha o título que o original usa (Resumo, Perfil, Sobre mim). Escreva 2 ou 3 frases só com fatos: formação, experiência mais relevante pra vaga e ferramentas que a vaga pede e a pessoa tem.
- Se não tiver nenhum: crie um "Resumo" de 2 frases, só com fatos do currículo.
- Nunca apresente a pessoa como se ela já tivesse o cargo da vaga. Estudante continua estudante; quem busca estágio não vira "desenvolvedor júnior atuando em...".
- Proibido encher linguiça: nada de "contribuindo com boas práticas", "apaixonado por", "proativo", "em constante aprendizado", "agregar valor", a não ser que esteja no original.

Responda SOMENTE com um JSON válido neste formato:
{
  "nota": número de 0 a 100 indicando o quanto o currículo ORIGINAL combina com a vaga,
  "nota_adaptado": número de 0 a 100 indicando o quanto o currículo ADAPTADO combina com a vaga,
  "resumo": "uma ou duas frases sobre o encaixe da pessoa na vaga",
  "palavras_encontradas": ["palavras-chave da vaga que aparecem no currículo"],
  "palavras_faltando": ["palavras-chave importantes da vaga que não aparecem no currículo"],
  "curriculo_adaptado": "currículo completo em Markdown",
  "dicas": ["dicas práticas do que a pessoa pode estudar ou incluir, se for verdade, para ficar mais forte na vaga"]
}`;

const PROMPT_CARTA = `Você escreve cartas de apresentação curtas para candidatos a vagas no Brasil.
Regras:
- Use SOMENTE fatos que estão escritos no currículo: empresas, cargos, projetos, cursos, ferramentas e resultados.
- Não invente nada. Isso inclui soft skills, trabalho em equipe, colaboração com outras áreas, números ou conquistas que o currículo não cita.
- Se a vaga pede algo que não está no currículo, não diga que a pessoa tem. No máximo diga que tem interesse em aprender, uma vez só.
- Antes de escrever cada frase, confira se ela tem base num trecho do currículo. Se não tiver, corte.
- 3 ou 4 parágrafos curtos, tom profissional mas humano, sem clichê exagerado.
- Comece com "Olá, equipe de recrutamento," e termine com "Atenciosamente," e o nome da pessoa.
- Ligue as experiências da pessoa com o que a vaga pede.
- Responda só com o texto da carta, sem título e sem markdown.`;

// a groq aposenta modelo sem avisar muito, então tenta em ordem até um funcionar
const MODELOS_RESERVA = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];

async function perguntarGroq(mensagens, { json = false, temperatura = 0.4 } = {}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY não configurada');
  }

  const modelos = [...new Set([process.env.GROQ_MODEL, ...MODELOS_RESERVA].filter(Boolean))];
  let resp;
  let ultimoErro = '';

  for (const model of modelos) {
    resp = await fetch(URL_GROQ, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature: temperatura,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        messages: mensagens,
      }),
    });
    if (resp.ok) break;
    ultimoErro = await resp.text();
    if (!ultimoErro.includes('model_not_found') && !ultimoErro.includes('decommissioned')) break;
    console.warn(`modelo ${model} indisponível, tentando o próximo`);
  }

  if (!resp.ok) {
    throw new Error(`Groq respondeu ${resp.status}: ${ultimoErro.slice(0, 300)}`);
  }

  const dados = await resp.json();
  return dados.choices?.[0]?.message?.content || '';
}

async function adaptarCurriculo({ curriculo, vaga, cargo }) {
  const conteudo = await perguntarGroq(
    [
      { role: 'system', content: PROMPT_SISTEMA },
      {
        role: 'user',
        content: `CARGO: ${cargo || 'não informado'}\n\nVAGA:\n${vaga}\n\nCURRÍCULO ORIGINAL:\n${curriculo}`,
      },
    ],
    { json: true }
  );

  let json;
  try {
    json = JSON.parse(conteudo || '{}');
  } catch {
    throw new Error('A IA não devolveu um JSON válido, tenta de novo');
  }

  return {
    nota: Number(json.nota) || 0,
    nota_adaptado: Number(json.nota_adaptado) || 0,
    resumo: json.resumo || '',
    palavras_encontradas: json.palavras_encontradas || [],
    palavras_faltando: json.palavras_faltando || [],
    curriculo_adaptado: garantirContatos(json.curriculo_adaptado || '', curriculo),
    dicas: json.dicas || [],
  };
}

// mesmo pedindo no prompt, a IA às vezes some com email e telefone
function garantirContatos(md, original) {
  const soDigitos = (s) => s.replace(/\D/g, '');
  const faltando = [];

  const email = original.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/);
  if (email && !md.toLowerCase().includes(email[0].toLowerCase())) faltando.push(email[0]);

  const tel = original.match(/(\+?55[\s-]?)?\(?\d{2}\)?[\s-]?9?\s?\d{4}[\s-]?\d{4}/);
  if (tel && !soDigitos(md).includes(soDigitos(tel[0]).slice(-8))) faltando.push(tel[0].trim());

  if (!faltando.length) return md;
  const linhas = md.split('\n');
  const titulo = linhas.findIndex((l) => l.startsWith('# '));
  const contato = faltando.join(' | ');
  if (titulo === -1) return contato + '\n\n' + md;
  const prox = linhas[titulo + 1];
  if (prox && prox.trim() && !prox.startsWith('#')) linhas[titulo + 1] = prox.trimEnd() + ' | ' + contato;
  else linhas.splice(titulo + 1, 0, '', contato);
  return linhas.join('\n');
}

async function gerarCarta({ nome, cargo, vaga, curriculo }) {
  const texto = await perguntarGroq([
    { role: 'system', content: PROMPT_CARTA },
    {
      role: 'user',
      content: `NOME: ${nome}\nCARGO: ${cargo || 'não informado'}\n\nVAGA:\n${vaga}\n\nCURRÍCULO:\n${curriculo}`,
    },
  ], { temperatura: 0.2 });
  return texto.trim();
}

module.exports = { adaptarCurriculo, gerarCarta };
