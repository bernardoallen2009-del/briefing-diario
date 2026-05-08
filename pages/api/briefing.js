import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const VALID_TAGS = new Set(["financial", "geo", "markets", "politics", "tech"]);

const SOURCE_QUERIES = [
  { q: "Reuters economy finance markets global", label: "Reuters", lang: "en" },
  { q: "Associated Press economy politics global", label: "Associated Press", lang: "en" },
  { q: "AFP Agence France-Presse geopolitics global", label: "AFP", lang: "en" },
  { q: "Público Portugal economia política", label: "Público", lang: "pt" },
  { q: "Expresso Portugal economia mercados", label: "Expresso", lang: "pt" },
  { q: "RTP Notícias Portugal", label: "RTP Notícias", lang: "pt" },
  { q: "Observador Portugal economia", label: "Observador", lang: "pt" },
  { q: "SIC Notícias Portugal", label: "SIC Notícias", lang: "pt" },
  { q: "Jornal Negócios Portugal mercados finanças", label: "Jornal de Negócios", lang: "pt" },
  { q: "Diário Notícias Portugal", label: "Diário de Notícias", lang: "pt" },
  { q: "Wall Street Journal markets economy stocks bonds", label: "Wall Street Journal", lang: "en" },
  { q: "Bloomberg markets finance economy Fed", label: "Bloomberg", lang: "en" },
  { q: "Financial Times economy markets global", label: "Financial Times", lang: "en" },
  { q: "New York Times economy finance global", label: "New York Times", lang: "en" },
  { q: "Washington Post politics economy USA", label: "Washington Post", lang: "en" },
  { q: "NPR economy politics USA", label: "NPR", lang: "en" },
  { q: "Axios politics economy markets", label: "Axios", lang: "en" },
  { q: "ProPublica investigation economy", label: "ProPublica", lang: "en" },
  { q: "BBC News economy geopolitics global", label: "BBC News", lang: "en" },
  { q: "The Economist economy geopolitics analysis", label: "The Economist", lang: "en" },
  { q: "The Guardian economy politics global", label: "The Guardian", lang: "en" },
  { q: "The Times UK economy politics", label: "The Times", lang: "en" },
  { q: "Deutsche Welle DW Europe economy geopolitics", label: "Deutsche Welle", lang: "en" },
  { q: "France 24 geopolitics Europe global", label: "France 24", lang: "en" },
  { q: "Euronews Europe economy politics", label: "Euronews", lang: "en" },
  { q: "Politico Europe EU policy economy", label: "Politico Europe", lang: "en" },
  { q: "El País economia política global", label: "El País", lang: "es" },
  { q: "Al Jazeera Middle East geopolitics global", label: "Al Jazeera", lang: "en" },
  { q: "South China Morning Post China Asia economy", label: "South China Morning Post", lang: "en" },
  { q: "NHK World Japan Asia economy", label: "NHK World", lang: "en" },
  { q: "ARK Invest innovation technology ETF disruptive", label: "ARK Invest", lang: "en" },
  { q: "DWS investments asset management outlook", label: "DWS", lang: "en" },
  { q: "Guggenheim Investments market outlook credit", label: "Guggenheim Investments", lang: "en" },
  { q: "Morgan Stanley markets wealth strategy", label: "Morgan Stanley", lang: "en" },
  { q: "BNP Paribas Asset Management portfolio", label: "BNP Paribas AM", lang: "en" },
  { q: "Wired technology AI society economy", label: "Wired", lang: "en" },
  { q: "Ars Technica technology AI chips", label: "Ars Technica", lang: "en" },
  { q: "MIT Technology Review artificial intelligence", label: "MIT Technology Review", lang: "en" },
  { q: "OpenAI Google DeepMind AI model release", label: "AI Research", lang: "en" },
  { q: "Nature science research breakthrough", label: "Nature", lang: "en" },
  { q: "Scientific American science climate technology", label: "Scientific American", lang: "en" },
  { q: "US election congress president approval politics", label: "Política americana", lang: "en" },
  { q: "geopolitics NATO China Russia conflict diplomacy", label: "Geopolítica", lang: "en" },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.includes("COLOCA")) {
    throw new Error(`${name} não configurada. Adiciona a variável no .env.local ou no Vercel.`);
  }
  return value;
}

function classifyTag(text) {
  const value = (text || "").toLowerCase();
  if (/bitcoin|crypto|ethereum|blockchain|defi|stock|stocks|bond|bonds|fed|ecb|bce|mercado|bolsa/.test(value)) return "markets";
  if (/trump|biden|election|congress|senate|president|democrat|republican|poll|approval|política|eleição|governo|partido|parlamento/.test(value)) return "politics";
  if (/\bai\b|artificial intelligence|openai|deepmind|llm|nvidia|semiconductor|machine learning|robot|chatgpt|gemini|tecnologia/.test(value)) return "tech";
  if (/war|conflict|ukraine|russia|china|nato|taiwan|israel|gaza|iran|missile|sanction|diplomat|geopolit|guerra|conflito|médio oriente/.test(value)) return "geo";
  return "financial";
}

function extractJSON(raw) {
  const clean = (raw || "").replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {}

  let depth = 0;
  let start = -1;
  for (let i = 0; i < clean.length; i += 1) {
    if (clean[i] === "{") {
      if (start === -1) start = i;
      depth += 1;
    } else if (clean[i] === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        try {
          return JSON.parse(clean.slice(start, i + 1));
        } catch {
          start = -1;
        }
      }
    }
  }
  return null;
}

async function fetchJSONWithTimeout(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return { articles: [] };
    return response.json();
  } catch {
    return { articles: [] };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeArticle(article, fallbackSource) {
  const title = article.title?.trim();
  if (!title || title === "[Removed]") return null;

  return {
    title,
    description: article.description?.trim() || "",
    url: article.url || "",
    source: article.source?.name || fallbackSource,
    hint: fallbackSource,
  };
}

async function fetchAllSources() {
  const key = requireEnv("NEWSAPI_KEY");
  const from = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString().split("T")[0];

  const results = await Promise.all(
    SOURCE_QUERIES.map(({ q, lang }) => {
      const url = new URL("https://newsapi.org/v2/everything");
      url.searchParams.set("q", q);
      url.searchParams.set("from", from);
      url.searchParams.set("sortBy", "publishedAt");
      url.searchParams.set("pageSize", "3");
      url.searchParams.set("language", lang);
      url.searchParams.set("apiKey", key);
      return fetchJSONWithTimeout(url);
    })
  );

  const seen = new Set();
  const articles = [];

  results.forEach((result, index) => {
    const { label } = SOURCE_QUERIES[index];
    (result.articles || []).forEach((article) => {
      const normalized = normalizeArticle(article, label);
      if (!normalized) return;

      const fingerprint = normalized.title.toLowerCase();
      if (seen.has(fingerprint)) return;
      seen.add(fingerprint);
      articles.push(normalized);
    });
  });

  return articles.slice(0, 60);
}

function normalizeBriefing(parsed, articles) {
  const fallbackCards = articles.slice(0, 12).map((article) => ({
    headline: article.title,
    summary: article.description || "Notícia relevante para acompanhar ao longo do dia.",
    source: article.source,
    url: article.url,
    tag: classifyTag(`${article.title} ${article.description}`),
  }));

  const sourceCards = parsed.cards?.length ? parsed.cards : [];
  const cards = Array.from({ length: 12 }, (_, index) => sourceCards[index] || fallbackCards[index] || fallbackCards[index % fallbackCards.length] || {}).map((card, index) => {
    const fallback = fallbackCards[index] || fallbackCards[0] || {};
    const text = `${card.headline || fallback.headline} ${card.summary || fallback.summary}`;

    return {
      headline: String(card.headline || fallback.headline || "Destaque do dia").slice(0, 140),
      summary: String(card.summary || fallback.summary || "Resumo indisponível.").slice(0, 260),
      source: String(card.source || fallback.source || "Fonte").slice(0, 80),
      url: card.url || fallback.url || "",
      tag: VALID_TAGS.has(card.tag) ? card.tag : classifyTag(text),
    };
  });

  return {
    hero: {
      headline: String(parsed.hero?.headline || "O essencial do dia, sem ruído.").slice(0, 120),
      summary: String(parsed.hero?.summary || "Resumo executivo dos temas com maior impacto para mercados, política e tecnologia.").slice(0, 360),
      tags: (parsed.hero?.tags || ["financial", "markets", "geo"]).filter((tag) => VALID_TAGS.has(tag)).slice(0, 4),
    },
    cards,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    requireEnv("GROQ_API_KEY");
    const articles = await fetchAllSources();
    if (!articles.length) {
      throw new Error("A NewsAPI não devolveu artigos. Verifica a chave NEWSAPI_KEY e os limites da conta.");
    }

    const today = new Date().toISOString().split("T")[0];
    const list = articles
      .map((article, index) => `${index + 1}. [${article.hint}]
Título: ${article.title}
Resumo: ${article.description}
Fonte: ${article.source}
URL: ${article.url}`)
      .join("\n\n");

    const prompt = `Hoje é ${today}. És um analista sénior que prepara um briefing diário para investidores e decisores portugueses.

Usa apenas as notícias reais listadas abaixo. Escreve em português europeu claro, sóbrio e útil.

NOTÍCIAS:
${list}

Responde apenas com JSON válido, sem markdown:
{
  "hero": {
    "headline": "título com no máximo 12 palavras",
    "summary": "2 frases com a síntese executiva do dia",
    "tags": ["financial","geo","markets","politics","tech"]
  },
  "cards": [
    {
      "headline": "título com no máximo 10 palavras",
      "summary": "1 frase clara, no máximo 28 palavras",
      "source": "nome exacto da fonte",
      "url": "URL real da lista",
      "tag": "financial|geo|markets|politics|tech"
    }
  ]
}

Regras:
- Exactamente 12 cards.
- Variedade máxima de fontes.
- Inclui pelo menos uma notícia de Portugal, uma agência global, uma fonte financeira, uma fonte tecnológica e uma notícia de geopolítica.
- Não inventes factos, fontes ou URLs.`;

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 2600,
      temperature: 0.12,
      messages: [{ role: "user", content: prompt }],
    });

    const parsed = extractJSON(completion.choices[0]?.message?.content);
    if (!parsed) throw new Error("A IA não devolveu JSON válido. Tenta atualizar novamente.");

    const briefing = normalizeBriefing(parsed, articles);

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
    return res.status(200).json({
      ...briefing,
      generatedAt: new Date().toISOString(),
      articlesScanned: articles.length,
      sourcesQueried: SOURCE_QUERIES.length,
    });
  } catch (err) {
    console.error("Briefing error:", err);
    return res.status(500).json({ error: err.message || "Erro inesperado ao gerar o briefing." });
  }
}
