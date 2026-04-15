import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Tag classifier by keyword ─────────────────────────────────────
function classifyTag(text) {
  const t = text.toLowerCase();
  if (/bitcoin|crypto|ethereum|blockchain|defi|nft/i.test(t)) return "markets";
  if (/trump|biden|election|congress|senate|president|democrat|republican|macron|sunak|política|poll|approval/i.test(t)) return "politics";
  if (/ai|artificial intelligence|openai|deepmind|llm|robot|chip|nvidia|semiconductor|meta llama|tech|google|microsoft|apple/i.test(t)) return "tech";
  if (/war|conflict|ukraine|russia|china|nato|taiwan|israel|gaza|iran|missile|sanction|diplomat|geopolit/i.test(t)) return "geo";
  if (/market|stock|bond|fed|ecb|rate|inflation|gdp|earnings|ipo|equity|hedge|invest|fund|etf|s&p|nasdaq|dow|euro|dollar|oil|gold/i.test(t)) return "financial";
  return "markets";
}

// ── Fetch headlines from NewsAPI ──────────────────────────────────
async function fetchNewsAPI() {
  const key = process.env.NEWSAPI_KEY;
  if (!key || key.includes("COLOCA")) throw new Error("NEWSAPI_KEY não configurada");

  const queries = [
    "financial markets economy",
    "geopolitics war diplomacy",
    "artificial intelligence technology",
    "Trump politics USA",
    "ZeroHedge OR ARK Invest OR Guggenheim OR DWS investing",
  ];

  const today = new Date();
  const from = new Date(today - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const results = await Promise.all(
    queries.map((q) =>
      fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&from=${from}&sortBy=publishedAt&pageSize=5&language=en&apiKey=${key}`
      ).then((r) => r.json())
    )
  );

  const seen = new Set();
  const articles = [];
  for (const res of results) {
    for (const a of res.articles || []) {
      if (!a.title || a.title === "[Removed]") continue;
      if (seen.has(a.title)) continue;
      seen.add(a.title);
      articles.push({
        title: a.title,
        description: a.description || "",
        url: a.url,
        source: a.source?.name || "News",
      });
    }
  }
  return articles.slice(0, 25);
}

// ── Groq summarisation ────────────────────────────────────────────
async function summariseWithGroq(articles) {
  const articleList = articles
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title}\n   ${a.description}\n   URL: ${a.url}`)
    .join("\n\n");

  const today = new Date().toISOString().split("T")[0];

  const prompt = `Hoje é ${today}. És um analista financeiro e geopolítico de elite. Com base nas notícias abaixo, cria um briefing em PORTUGUÊS EUROPEU.

NOTÍCIAS REAIS DE HOJE:
${articleList}

Responde APENAS com JSON válido (sem markdown, sem texto extra):
{
  "hero": {
    "headline": "título impactante em português europeu, máx 12 palavras",
    "summary": "2-3 frases em português europeu sobre o tema mais importante de hoje",
    "tags": ["financial","geo","markets","politics","tech"]
  },
  "cards": [
    {
      "headline": "título em português europeu, máx 10 palavras",
      "summary": "1 frase em português europeu, máx 25 palavras, descrevendo a notícia",
      "source": "Nome da fonte",
      "url": "url real da notícia",
      "tag": "financial|geo|markets|politics|tech"
    }
  ]
}

Escolhe as 12 notícias mais importantes e relevantes. Traduz e adapta os títulos para português europeu. Usa os URLs reais fornecidos. O campo tag deve reflectir o tema: financial (mercados, economia), geo (geopolítica, conflitos), markets (ações, cripto), politics (política), tech (tecnologia, IA).`;

  const completion = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2500,
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content || "";
}

// ── JSON extractor ────────────────────────────────────────────────
function extractJSON(raw) {
  const clean = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const arr = clean.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch {} }
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

// ── Handler ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // Step 1: fetch real news
    const articles = await fetchNewsAPI();
    if (!articles.length) throw new Error("NewsAPI não devolveu artigos. Verifica a chave.");

    // Step 2: classify tags client-side as fallback
    const tagged = articles.map((a) => ({
      ...a,
      tag: classifyTag(a.title + " " + a.description),
    }));

    // Step 3: summarise with Groq
    const raw = await summariseWithGroq(tagged);
    const parsed = extractJSON(raw);

    if (!parsed) throw new Error("Groq não devolveu JSON válido.");

    // Ensure tags are valid
    const validTags = new Set(["financial", "geo", "markets", "politics", "tech"]);
    const cards = (parsed.cards || []).slice(0, 12).map((c) => ({
      ...c,
      tag: validTags.has(c.tag) ? c.tag : classifyTag(c.headline + " " + c.summary),
    }));

    return res.status(200).json({
      hero: parsed.hero || {},
      cards,
      generatedAt: new Date().toISOString(),
      articleCount: articles.length,
    });
  } catch (err) {
    console.error("Briefing error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
