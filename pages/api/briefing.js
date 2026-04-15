import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function classifyTag(text) {
  const t = (text || "").toLowerCase();
  if (/bitcoin|crypto|ethereum|blockchain|defi/i.test(t)) return "markets";
  if (/trump|biden|election|congress|senate|president|democrat|republican|poll|approval|política/i.test(t)) return "politics";
  if (/\bai\b|artificial intelligence|openai|deepmind|llm|nvidia|semiconductor|tech|google|microsoft|apple/i.test(t)) return "tech";
  if (/war|conflict|ukraine|russia|china|nato|taiwan|israel|gaza|iran|missile|sanction|diplomat|geopolit/i.test(t)) return "geo";
  return "financial";
}

async function fetchNews() {
  const key = process.env.NEWSAPI_KEY;
  if (!key || key.includes("COLOCA")) throw new Error("NEWSAPI_KEY não configurada no Vercel. Vai a Settings → Environment Variables.");

  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const queries = [
    "stock market economy inflation fed",
    "geopolitics war nato china russia",
    "artificial intelligence openai nvidia",
    "trump politics election usa",
    "investment finance hedge fund",
  ];

  const fetches = queries.map(q =>
    fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&from=${from}&sortBy=publishedAt&pageSize=6&language=en&apiKey=${key}`)
      .then(r => r.json()).catch(() => ({ articles: [] }))
  );

  const results = await Promise.all(fetches);
  const seen = new Set();
  const articles = [];

  for (const res of results) {
    for (const a of (res.articles || [])) {
      if (!a.title || a.title === "[Removed]" || seen.has(a.title)) continue;
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const articles = await fetchNews();
    if (!articles.length) throw new Error("NewsAPI não devolveu artigos.");

    const list = articles.map((a, i) =>
      `${i + 1}. [${a.source}] ${a.title}\n   ${a.description}\n   URL: ${a.url}`
    ).join("\n\n");

    const today = new Date().toISOString().split("T")[0];

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 2500,
      temperature: 0.3,
      messages: [{
        role: "user",
        content: `Hoje é ${today}. És um analista financeiro e geopolítico de elite. Com base nestas notícias reais de hoje, cria um briefing em PORTUGUÊS EUROPEU.

NOTÍCIAS:
${list}

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
      "summary": "1 frase em português europeu, máx 25 palavras",
      "source": "Nome da fonte",
      "url": "url real da notícia",
      "tag": "financial|geo|markets|politics|tech"
    }
  ]
}

Escolhe as 12 notícias mais importantes. Traduz títulos para português europeu. Usa os URLs reais.`
      }]
    });

    const raw = completion.choices[0]?.message?.content || "";
    const parsed = extractJSON(raw);
    if (!parsed) throw new Error("Groq não devolveu JSON válido.");

    const validTags = new Set(["financial", "geo", "markets", "politics", "tech"]);
    const cards = (parsed.cards || []).slice(0, 12).map(c => ({
      ...c,
      tag: validTags.has(c.tag) ? c.tag : classifyTag(c.headline + " " + c.summary),
    }));

    return res.status(200).json({
      hero: parsed.hero || {},
      cards,
      generatedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error("Briefing error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
