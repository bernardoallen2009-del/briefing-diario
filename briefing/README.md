# 📰 Briefing Diário — 100% Gratuito

Resumo diário de mercados, geopolítica e tecnologia.  
Funciona com **NewsAPI** (notícias reais) + **Groq** (IA gratuita e rápida, Llama 4).

---

## 🔑 Passo 1 — Obter as chaves gratuitas (5 min)

### Groq (IA gratuita)
1. Vai a https://console.groq.com
2. Cria conta (gratuito, sem cartão)
3. Clica em **API Keys → Create API Key**
4. Copia a chave (começa com `gsk_...`)

### NewsAPI (notícias em tempo real)
1. Vai a https://newsapi.org/register
2. Cria conta gratuita
3. Copia a chave da dashboard

---

## ⚙️ Passo 2 — Configurar o projeto

Abre o ficheiro `.env.local` e preenche:

```
GROQ_API_KEY=gsk_COLOCA_AQUI
NEWSAPI_KEY=COLOCA_AQUI
```

---

## 💻 Passo 3 — Correr localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000 ✅

---

## 🚀 Passo 4 — Deploy no Vercel (gratuito)

```bash
npm i -g vercel
vercel
```

No dashboard do Vercel → **Settings → Environment Variables** → adiciona:
- `GROQ_API_KEY` → a tua chave Groq
- `NEWSAPI_KEY` → a tua chave NewsAPI

Depois: `vercel --prod`

---

## 📊 Limites gratuitos

| Serviço | Limite gratuito |
|---------|----------------|
| Groq    | 14.400 req/dia (mais do que suficiente) |
| NewsAPI | 100 req/dia (plano Developer) |
| Vercel  | Ilimitado para projetos pessoais |

---

## 📁 Estrutura

```
briefing-diario/
├── pages/
│   ├── api/briefing.js   ← busca NewsAPI + resume com Groq
│   ├── _app.js
│   └── index.js          ← interface
├── styles/globals.css
├── .env.local            ← as tuas chaves (não fazer commit!)
├── .gitignore
├── next.config.js
└── package.json
```
