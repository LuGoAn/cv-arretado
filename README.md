# CV Arretado

Adaptador de currículo com IA. Você manda seu currículo (PDF ou texto), cola a descrição da vaga e a IA reescreve o currículo destacando o que você já tem e que combina com a vaga. Também mostra uma nota de encaixe antes e depois, as palavras-chave que faltam e algumas dicas.

A IA não inventa experiência. O prompt proíbe isso, ela só reorganiza e reescreve o que já está no currículo.

Projeto da disciplina de IA Generativa. O modelo de negócio (BMC) está em [docs/bmc.md](docs/bmc.md).

## Stack

- Node.js + Express
- SQLite (o `node:sqlite` que já vem no Node 22.13+), guarda usuários e histórico
- Groq (GPT-OSS 120B, com outros modelos de reserva) pra adaptação
- HTML, CSS e JS puro no front

## Rodando

Precisa de Node 22.13 ou mais novo e uma chave da Groq (é grátis, pega em https://console.groq.com/keys).

```bash
git clone https://github.com/LuGoAn/cv-arretado.git
cd cv-arretado
npm install
cp .env.example .env
```

Coloca a chave no `.env` em `GROQ_API_KEY` e roda:

```bash
npm start
```

Abre http://localhost:3000, cria uma conta e testa. No app tem um botão "Usar exemplo" que preenche um currículo e uma vaga de teste.

O banco fica em `data/cv-arretado.db` e é criado sozinho na primeira vez.

## Como funciona

1. Login/cadastro simples, senha com hash scrypt e sessão em cookie.
2. O PDF é lido no servidor com `pdf-parse`. PDF escaneado (imagem) não funciona, aí tem que colar o texto.
3. O texto do currículo e da vaga vão pra Groq com um prompt de recrutador, pedindo resposta em JSON.
4. O resultado fica salvo no histórico do usuário. Dá pra ver lado a lado com o original, editar o texto e copiar. No Premium também dá pra baixar em PDF (usa o imprimir do navegador) em 3 modelos.
5. Plano grátis tem 1 adaptação por mês. O Premium (R$ 14,90) libera adaptações ilimitadas e carta de apresentação. O checkout é só simulação, não cobra nada nem manda dado de cartão pra lugar nenhum. Dá pra cancelar na página de planos pra voltar pro grátis.

## Estrutura

```
server.js        rotas da API
src/db.js        tabelas do SQLite
src/groq.js      prompt e chamada da IA
src/senha.js     hash de senha
public/          telas (landing, login, app, planos e checkout)
docs/bmc.md      business model canvas
```
