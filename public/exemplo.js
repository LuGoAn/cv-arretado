// usado no navegador e no servidor, que reconhece o exemplo pra não gastar a adaptação grátis
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

const normalizar = (s) => (s || '').replace(/\s+/g, ' ').trim();

function ehExemplo(curriculo, vaga) {
  return normalizar(curriculo) === normalizar(EXEMPLO_CV) && normalizar(vaga) === normalizar(EXEMPLO_VAGA);
}

if (typeof module !== 'undefined') module.exports = { EXEMPLO_CV, EXEMPLO_VAGA, ehExemplo };
