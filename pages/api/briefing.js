import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function classifyTag(text) {
  const t = (text || "").toLowerCase();
  if (/bitcoin|crypto|ethereum|blockchain|defi/i.test(t)) return "markets";
  if (/trump|biden|election|congress|senate|president|democrat|republican|poll|approval|política|eleição|governo|partido/i.test(t)) return "politics";
  if (/\bai\b|artificial intelligence|openai|deepmind|llm|nvidia|semiconductor|tech|google|microsoft|apple|lecun|robot/i.test(t)) return "tech";
  if (/war|conflict|ukraine|russia|china|nato|taiwan|israel|gaza|iran|missile|sanction|diplomat|geopolit|guerra|conflito/i.test(t)) return "geo";
  return "financial";
}

async function fetchNewsAPI() {
  const key = process.env.NEWSAPI_KEY;
  if (!key || key.includes("COLOCA")) throw new Error("NEWSAPI_KEY não configurada no Vercel → Settings → Environment Variables.");

  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const queries = [
    { q: "Wall Street Journal market economy stocks", label: "Wall Street Journal" },
    { q: "New York Times economy finance global", label: "New York Times" },
    { q: "ZeroHedge market finance macro economy", label: "ZeroHedge" },
    { q: "The Economist economy geopolitics trade", label: "The Economist" },
    { q: "Trump approval rating poll politics", label: "The Economist / Politico" },
    { q: "ARK Invest innovation technology disruptive ETF", label: "ARK Invest" },
    { q: "Guggenheim Investments market outlook fixed income", label: "Guggenheim Investments" },
    { q: "DWS investments asset management CIO", label: "DWS" },
    { q: "Morgan Stanley market strategy wealth", label: "Morgan Stanley" },
    { q: "BNP Paribas Asset Management portfolio", label: "BNP Paribas AM" },
    { q: "Yann LeCun artificial intelligence AI research", label: "Yann LeCun / AI" },
    { q: "OpenAI Google DeepMind AI model tech", label: "Tech / AI" },
    { q: "geopolitics NATO China Russia Ukraine war", label: "Geopolítica" },
    { q: "MTKnews markets finance investing", label: "MTKnews" },
    { q: "Expresso Portugal economia mercados", label: "Expresso" },
    { q: "SIC Noticias Portugal economia política", label: "SIC Notícias" },
  ];

  const fetches = queries.map(({ q }) =>
    fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&from=${from}&sortBy=publishedAt&pageSize=4&language=en&apiKey=${key}`)
      .then(r => r.json()).catch(() => ({ articles: [] }))
  );

  // Portuguese language fetch separately
  const ptFetch = fetch(
    `https://newsapi.org/v2/everything?q=economia+portugal+mercados+política&from=${from}&sortBy=publishedAt&pageSize=8&language=pt&apiKey=${key}`
  ).then(r => r.json()).catch(() => ({ articles: [] }));

  const [results, ptResult] = await Promise.all([Promise.all(fetches), ptFetch]);

  const seen = new Set();
  const articles = [];

  for (let i = 0; i < results.length; i++) {
    const hint = queries[i].label;
    for (const a of (results[i].articles || [])) {
      if (!a.title || a.title === "[Removed]" || seen.has(a.title)) continue;
      seen.add(a.title);
      articles.push({ title: a.title, description: a.description || "", url: a.url, source: a.source?.name || hint, hint });
    }
  }

  for (const a of (ptResult.articles || [])) {
    if (!a.title || a.title === "[Removed]" || seen.has(a.title)) continue;
    seen.add(a.title);
    articles.push({ title: a.title, description: a.description || "", url: a.url, source: a.source?.name || "PT", hint: "Portugal" });
  }

  return articles.slice(0, 45);
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
    const articles = await fetchNewsAPI();
    if (!articles.length) throw new Error("NewsAPI não devolveu artigos.");

    const today = new Date().toISOString().split("T")[0];

    const list = articles.map((a, i) =>
      `${i + 1}. [${a.source} / ${a.hint}]\n   Título: ${a.title}\n   Resumo: ${a.description}\n   URL: ${a.url}`
    ).join("\n\n");

    const prompt = `Hoje é ${today}. És um analista financeiro e geopolítico que prepara briefings diários para investidores portugueses.

Tens notícias reais de hoje das seguintes fontes prioritárias:
Wall Street Journal · New York Times · The Economist · ZeroHedge · MTKnews
ARK Invest · DWS · Guggenheim Investments · BNP Paribas AM · Morgan Stanley
Yann LeCun / IA · OpenAI · Expresso · SIC Notícias
Geopolítica (NATO, China, Rússia) · Trump / Política americana

NOTÍCIAS DE HOJE:
${list}

Cria um briefing em PORTUGUÊS EUROPEU. Responde APENAS com JSON válido:
{
  "hero": {
    "headline": "título impactante em português europeu, máx 12 palavras",
    "summary": "2-3 frases em português europeu — síntese do que mais importa hoje para um investidor português",
    "tags": ["financial","geo","markets","politics","tech"]
  },
  "cards": [
    {
      "headline": "título em português europeu, máx 10 palavras",
      "summary": "1 frase em português europeu, máx 28 palavras",
      "source": "Nome da publicação (ex: Wall Street Journal, Expresso, ARK Invest, The Economist)",
      "url": "URL real tal como aparece na lista acima",
      "tag": "financial|geo|markets|politics|tech"
    }
  ]
}

Regras:
- Exactamente 12 cards
- Cobrir o máximo de fontes diferentes — não repetir a mesma fonte mais de 2 vezes
- Tentar incluir sempre: 1 WSJ, 1 NYT, 1 Economist, 1 ZeroHedge, 1 ARK/DWS/Guggenheim, 1 Morgan Stanley, 1 BNP Paribas, 1 PT (Expresso ou SIC), 1 IA/tech, 1 geopolítica, 1 política americana, 1 livre
- Português europeu correcto (não "você", não "né", não "ótimo")
- URLs reais das notícias`;

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 2800,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
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
      sourceCount: articles.length,
    });

  } catch (err) {
    console.error("Briefing error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
