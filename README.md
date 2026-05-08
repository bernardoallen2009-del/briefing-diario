# Briefing Diário

Resumo diário de mercados, geopolítica, política e tecnologia em português europeu.

O projeto usa:

- Next.js para a interface e API route.
- NewsAPI para recolher notícias recentes.
- Groq para sintetizar o briefing.

## Configuração

Cria um ficheiro `.env.local` com:

```bash
GROQ_API_KEY=gsk_COLOCA_AQUI
NEWSAPI_KEY=COLOCA_AQUI
```

## Desenvolvimento

```bash
npm install
npm run dev
```

Depois abre `http://localhost:3000`.

## Deploy no Vercel

Adiciona as mesmas variáveis no Vercel em `Settings > Environment Variables`:

- `GROQ_API_KEY`
- `NEWSAPI_KEY`

Depois faz deploy normalmente com a integração GitHub ou com:

```bash
vercel --prod
```

## Instalar no iPhone

Depois do deploy em HTTPS, abre o site no Safari e escolhe `Partilhar > Adicionar ao ecrã principal`.

O projeto inclui manifest, ícones Apple e modo `standalone`, por isso o atalho abre como app, sem a barra do Safari. Se já tinhas adicionado o site antes desta alteração, remove esse atalho antigo e adiciona novamente.

## Estrutura

```text
pages/
  api/briefing.js  API que recolhe notícias e gera o briefing
  _app.js
  index.js         Interface principal
styles/
  globals.css      Estilos globais e layout responsivo
```
