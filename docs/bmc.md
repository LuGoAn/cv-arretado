# CV Arretado - Business Model Canvas

## A dor

Quem está procurando emprego manda o mesmo currículo pra todas as vagas. Muitas empresas usam ATS (sistema que filtra currículo por palavra-chave) e o currículo genérico cai fora antes de alguém ler. Adaptar na mão pra cada vaga dá trabalho e a maioria não sabe o que destacar.

Validação: conversar com colegas e conhecidos que estão buscando estágio ou primeiro emprego e perguntar quantas vagas aplicaram, quantas responderam e se adaptam o currículo. Anotar aqui os resultados antes da apresentação.

## Segmentos de clientes

- Estudantes e recém-formados procurando estágio ou primeiro emprego
- Profissionais em transição de carreira
- Quem aplica pra muitas vagas por semana (tech, vendas, atendimento)
- Depois: faculdades e cursos técnicos com setor de carreira

## Proposta de valor

- Currículo adaptado pra vaga em menos de 1 minuto
- Nota de encaixe antes e depois, pra pessoa ver o quanto melhorou
- Mostra as palavras-chave que a vaga pede e o currículo não tem
- Não inventa nada, só reescreve o que a pessoa já fez
- Histórico de todas as versões por vaga

## Canais

- Instagram, TikTok e LinkedIn com antes/depois de currículos
- Grupos de vagas no WhatsApp e Telegram
- Parceria com centros acadêmicos e coordenação de curso
- Indicação (quem consegue entrevista conta pros amigos)

## Relacionamento com clientes

- Self-service: a pessoa usa sozinha, sem atendimento
- Conteúdo com dicas de entrevista e currículo
- Suporte por email

## Fontes de receita

- Freemium: 1 adaptação grátis por mês (já funciona no MVP)
- Plano mensal (R$ 14,90) com adaptações ilimitadas, carta de apresentação e modelos de PDF
- Pacote avulso (R$ 9,90 por 10 adaptações) pra quem só usa numa fase de busca
- Plano institucional pra faculdades (preço por aluno)

## Recursos principais

- O prompt e as regras de adaptação (é o coração do produto)
- Acesso a API de LLM (hoje Groq)
- Aplicação web e banco de dados
- Base de usuários e histórico (serve pra melhorar o prompt)

## Atividades principais

- Melhorar o prompt e testar com currículos e vagas reais
- Manter a aplicação no ar
- Marketing de conteúdo
- Fechar parcerias com instituições

## Parcerias principais

- Provedores de IA (Groq, Anthropic, OpenAI)
- Hospedagem (Render, Vercel ou similar)
- Faculdades, cursos técnicos e centros acadêmicos
- Recrutadores e RHs que validam se o resultado faz sentido

## Estrutura de custos

- Chamadas de API da IA (cada adaptação custa frações de centavo na Groq)
- Hospedagem e domínio
- Marketing e anúncios
- Horas de desenvolvimento

## Viabilidade

O custo por adaptação é bem baixo porque a Groq cobra pouco por token e um currículo + vaga dá uns 3 a 5 mil tokens. Mesmo com o plano grátis, poucos assinantes já pagam a infraestrutura. O maior risco é concorrência (já existem ferramentas parecidas em inglês), então o diferencial é ser focado no mercado brasileiro, em português e com preço acessível pra estudante.
