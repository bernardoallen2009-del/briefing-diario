import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Tag classifier ────────────────────────────────────────────────
function classifyTag(text) {
  const t = (text || "").toLowerCase();
  if (/bitcoin|crypto|ethereum|blockchain|defi/i.test(t)) return "markets";
  if (/trump|biden|election|congress|senate|president|democrat|republican|poll|approval|política|eleição|governo|partido|parlamento/i.test(t)) return "politics";
  if (/\bai\b|artificial intelligence|openai|deepmind|llm|nvidia|semiconductor|machine learning|lecun|robot|chatgpt|gemini/i.test(t)) return "tech";
  if (/war|conflict|ukraine|russia|china|nato|taiwan|israel|gaza|iran|missile|sanction|diplomat|geopolit|guerra|conflito|médio oriente/i.test(t)) return "geo";
  return "financial";
}

// ── All source queries organised by category ──────────────────────
const SOURCE_QUERIES = [
  // 🌐 Global Agencies
  { q: "Reuters economy finance markets global",              label: "Reuters",               lang: "en" },
  { q: "Associated Press economy politics global",            label: "Associated Press",       lang: "en" },
  { q: "AFP Agence France-Presse geopolitics global",         label: "AFP",                   lang: "en" },

  // 🇵🇹 Portugal
  { q: "Público Portugal economia política",                  label: "Público",               lang: "pt" },
  { q: "Expresso Portugal economia mercados",                 label: "Expresso",              lang: "pt" },
  { q: "RTP Notícias Portugal",                              label: "RTP Notícias",          lang: "pt" },
  { q: "Observador Portugal economia",                        label: "Observador",            lang: "pt" },
  { q: "SIC Notícias Portugal",                              label: "SIC Notícias",          lang: "pt" },
  { q: "Jornal Negócios Portugal mercados finanças",          label: "Jornal de Negócios",    lang: "pt" },
  { q: "Diário Notícias Portugal",                           label: "Diário de Notícias",    lang: "pt" },

  // 🇺🇸 USA — Finance & Markets
  { q: "Wall Street Journal markets economy stocks bonds",    label: "Wall Street Journal",   lang: "en" },
  { q: "Bloomberg markets finance economy Fed",               label: "Bloomberg",             lang: "en" },
  { q: "Financial Times economy markets global",              label: "Financial Times",       lang: "en" },
  { q: "New York Times economy finance global",               label: "New York Times",        lang: "en" },
  { q: "Washington Post politics economy USA",                label: "Washington Post",       lang: "en" },
  { q: "NPR economy politics USA",                            label: "NPR",                   lang: "en" },
  { q: "Axios politics economy markets",                      label: "Axios",                 lang: "en" },
  { q: "ProPublica investigation economy",                    label: "ProPublica",            lang: "en" },

  // 🇬🇧 UK
  { q: "BBC News economy geopolitics global",                 label: "BBC News",              lang: "en" },
  { q: "The Economist economy geopolitics analysis",          label: "The Economist",         lang: "en" },
  { q: "The Guardian economy politics global",                label: "The Guardian",          lang: "en" },
  { q: "The Times UK economy politics",                       label: "The Times",             lang: "en" },

  // 🇪🇺 Europe
  { q: "Deutsche Welle DW Europe economy geopolitics",        label: "Deutsche Welle",        lang: "en" },
  { q: "France 24 geopolitics Europe global",                 label: "France 24",             lang: "en" },
  { q: "Euronews Europe economy politics",                    label: "Euronews",              lang: "en" },
  { q: "Politico Europe EU policy economy",                   label: "Politico Europe",       lang: "en" },
  { q: "El País economia política global",                    label: "El País",               lang: "es" },

  // 🌍 Asia & Global
  { q: "Al Jazeera Middle East geopolitics global",           label: "Al Jazeera",            lang: "en" },
  { q: "South China Morning Post China Asia economy",         label: "South China Morning Post", lang: "en" },
  { q: "NHK World Japan Asia economy",                        label: "NHK World",             lang: "en" },

  // 📈 Finance & Investments (specialist)
  { q: "ARK Invest innovation technology ETF disruptive",     label: "ARK Invest",            lang: "en" },
  { q: "DWS investments asset management outlook",            label: "DWS",                   lang: "en" },
  { q: "Guggenheim Investments market outlook credit",        label: "Guggenheim Investments",lang: "en" },
  { q: "Morgan Stanley markets wealth strategy",              label: "Morgan Stanley",        lang: "en" },
  { q: "BNP Paribas Asset Management portfolio",              label: "BNP Paribas AM",        lang: "en" },
  { q: "ZeroHedge market macro finance bearish",              label: "ZeroHedge",             lang: "en" },
  { q: "MTKnews markets finance",                             label: "MTKnews",               lang: "en" },

  // 🤖 Tech & AI
  { q: "Wired technology AI society economy",                 label: "Wired",                 lang: "en" },
  { q: "Ars Technica technology AI chips",                    label: "Ars Technica",          lang: "en" },
  { q: "MIT Technology Review artificial intelligence",       label: "MIT Technology Review", lang: "en" },
  { q: "Yann LeCun AI research artificial intelligence",      label: "Yann LeCun / AI",       lang: "en" },
  { q: "OpenAI Google DeepMind AI model release",             label: "AI Research",           lang: "en" },

  // 🔬 Science
  { q: "Nature science research breakthrough",                label: "Nature",                lang: "en" },
  { q: "Scientific American science climate technology",      label: "Scientific American",   lang: "en" },

  // 🗳️ Politics
  { q: "Trump approval rating poll politics USA 2025",         label: "The Economist / Politico", lang: "en" },
  { q: "geopolitics NATO China Russia conflict diplomacy",     label: "Geopolítica",           lang: "en" },
];

// ── Fetch news from NewsAPI ───────────────────────────────────────
async function fetchAllSources() {
  const key = process.env.NEWSAPI_KEY;
  if (!key || key.includes("COLOCA")) {
    throw new Error("NEWSAPI_KEY não configurada. Vai ao Vercel → Settings → Environment Variables.");
  }

  const from = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString().split("T")[0];

  // NewsAPI free plan: batch carefully, 3 articles per query to stay within limits
  const fetches = SOURCE_QUERIES.map(({ q, lang }) =>
    fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&from=${from}&sortBy=publishedAt&pageSize=3&language=${lang}&apiKey=${key}`
    )
      .then(r => r.json())
      .catch(() => ({ articles: [] }))
  );

  const results = await Promise.all(fetches);

  const seen = new Set();
  const articles = [];

  for (let i = 0; i < results.length; i++) {
    const { label } = SOURCE_QUERIES[i];
    for (const a of (results[i].articles || [])) {
      if (!a.title || a.title === "[Removed]" || seen.has(a.title)) continue;
      seen.add(a.title);
      articles.push({
        title: a.title,
        description: a.description || "",
        url: a.url,
        source: a.source?.name || label,
        hint: label,
      });
    }
  }

  return articles.slice(0, 60);
}

// ── Robust JSON extractor ─────────────────────────────────────────
function extractJSON(raw) {
  const clean = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  let depth = 0, start = -1;
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === "{") { if (start === -1) start = i; depth++; }
    else if (clean[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(clean.slice(start, i + 1)); } catch { start = -1; }
      }
    }
  }
  return null;
}

// ── Main handler ──────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const articles = await fetchAllSources();
    if (!articles.length) throw new Error("NewsAPI não devolveu artigos. Verifica a chave NEWSAPI_KEY.");

    const today = new Date().toISOString().split("T")[0];

    const list = articles
      .map((a, i) => `${i + 1}. [${a.hint}]\n   Título: ${a.title}\n   Resumo: ${a.description}\n   URL: ${a.url}`)
      .join("\n\n");

    const prompt = `Hoje é ${today}. És um analista sénior que prepara um briefing diário para investidores e decisores portugueses.

Tens acesso a notícias reais de hoje das seguintes fontes credíveis e neutras:

AGÊNCIAS: Reuters, AP, AFP, Lusa
PORTUGAL: Público, Expresso, RTP, Observador, SIC Notícias, Jornal de Negócios, Diário de Notícias
EUA: Wall Street Journal, Bloomberg, Financial Times, New York Times, Washington Post, NPR, Axios
UK: BBC News, The Economist, The Guardian, The Times
EUROPA: Deutsche Welle, France 24, Euronews, Politico Europe, El País
ÁSIA/GLOBAL: Al Jazeera, South China Morning Post, NHK World
INVESTIMENTOS: ARK Invest, DWS, Guggenheim Investments, Morgan Stanley, BNP Paribas AM, ZeroHedge, MTKnews
TECNOLOGIA/IA: Wired, Ars Technica, MIT Technology Review, Yann LeCun, OpenAI, DeepMind
CIÊNCIA: Nature, Scientific American

NOTÍCIAS DE HOJE:
${list}

Cria um briefing completo em PORTUGUÊS EUROPEU. Responde APENAS com JSON válido, sem markdown:
{
  "hero": {
    "headline": "título impactante em português europeu, máx 12 palavras, sobre o tema mais importante de hoje",
    "summary": "2-3 frases em português europeu — síntese executiva do que mais importa hoje",
    "tags": ["financial","geo","markets","politics","tech"]
  },
  "cards": [
    {
      "headline": "título em português europeu, máx 10 palavras",
      "summary": "1 frase clara em português europeu, máx 28 palavras",
      "source": "Nome exacto da publicação (ex: Reuters, Wall Street Journal, Expresso, BBC News)",
      "url": "URL real tal como aparece na lista acima",
      "tag": "financial|geo|markets|politics|tech"
    }
  ]
}

Regras obrigatórias:
- Exactamente 12 cards, as notícias mais importantes e impactantes de hoje
- Variedade máxima de fontes — nunca repetir a mesma fonte mais de 1 vez
- Cobertura obrigatória: 1 fonte PT, 1 Reuters/AP/AFP, 1 BBC/Guardian, 1 WSJ/Bloomberg/FT, 1 Economist, 1 gestora de activos (ARK/DWS/Guggenheim/MS/BNP), 1 tech/IA, 1 geopolítica, 1 política americana, 1 Al Jazeera/global, 2 livres
- Português europeu correcto — sem "você", "né", "ótimo", "incrível"
- URLs reais das notícias (copia exactamente da lista)`;

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 3000,
      temperature: 0.15,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content || "";
    const parsed = extractJSON(raw);
    if (!parsed) throw new Error("Groq não devolveu JSON válido. Tenta recarregar.");

    const validTags = new Set(["financial", "geo", "markets", "politics", "tech"]);
    const cards = (parsed.cards || []).slice(0, 12).map(c => ({
      ...c,
      tag: validTags.has(c.tag) ? c.tag : classifyTag(c.headline + " " + c.summary),
    }));

    return res.status(200).json({
      hero: parsed.hero || {},
      cards,
      generatedAt: new Date().toISOString(),
      articlesScanned: articles.length,
      sourcesQueried: SOURCE_QUERIES.length,
    });

  } catch (err) {
    console.error("Briefing error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
