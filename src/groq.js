const URL_GROQ = 'https://api.groq.com/openai/v1/chat/completions';

const PROMPT_SISTEMA = `Você é um recrutador experiente e especialista em currículos no mercado brasileiro.
Sua tarefa é adaptar o currículo de uma pessoa para uma vaga específica.

Regras:
- Nunca invente experiência, empresa, curso, data ou habilidade que não esteja no currículo original.
- Pode reescrever, reordenar e dar mais destaque ao que já existe e combina com a vaga.
- Use as palavras-chave da vaga quando elas descreverem algo que a pessoa realmente fez (ajuda em filtros de ATS).
- Escreva em português do Brasil, tom profissional e direto, verbos no passado para experiências.
- O currículo adaptado deve vir em Markdown: nome como # título, seções com ##, itens com -.

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

async function adaptarCurriculo({ curriculo, vaga, cargo }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY não configurada no .env');
  }

  const resp = await fetch(URL_GROQ, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROMPT_SISTEMA },
        {
          role: 'user',
          content: `CARGO: ${cargo || 'não informado'}\n\nVAGA:\n${vaga}\n\nCURRÍCULO ORIGINAL:\n${curriculo}`,
        },
      ],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Groq respondeu ${resp.status}: ${txt.slice(0, 300)}`);
  }

  const dados = await resp.json();
  const conteudo = dados.choices?.[0]?.message?.content || '{}';

  let json;
  try {
    json = JSON.parse(conteudo);
  } catch {
    throw new Error('A IA não devolveu um JSON válido, tenta de novo');
  }

  return {
    nota: Number(json.nota) || 0,
    nota_adaptado: Number(json.nota_adaptado) || 0,
    resumo: json.resumo || '',
    palavras_encontradas: json.palavras_encontradas || [],
    palavras_faltando: json.palavras_faltando || [],
    curriculo_adaptado: json.curriculo_adaptado || '',
    dicas: json.dicas || [],
  };
}

module.exports = { adaptarCurriculo };
