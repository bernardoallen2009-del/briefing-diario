import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";

const TAGS = ["all", "financial", "markets", "geo", "politics", "tech"];

const TAG_LABELS = {
  all: "Tudo",
  financial: "Finanças",
  markets: "Mercados",
  geo: "Geopolítica",
  politics: "Política",
  tech: "Tecnologia",
};

const TAG_META = {
  financial: { label: "Finanças", tone: "blue" },
  markets: { label: "Mercados", tone: "green" },
  geo: { label: "Geopolítica", tone: "amber" },
  politics: { label: "Política", tone: "rose" },
  tech: { label: "Tecnologia", tone: "violet" },
};

const LOAD_MESSAGES = [
  "A consultar fontes internacionais e portuguesas",
  "A filtrar duplicados e notícias pouco relevantes",
  "A cruzar mercados, política, tecnologia e geopolítica",
  "A escrever o resumo em português europeu",
];

const CACHE_KEY = "briefing-diario:last-result:v2";

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Tag({ tag }) {
  const meta = TAG_META[tag] || TAG_META.financial;
  return <span className={`tag tag-${meta.tone}`}>{meta.label}</span>;
}

function LoadingDots() {
  return (
    <span className="loading-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function CardSkeleton() {
  return (
    <article className="news-card skeleton-card" aria-hidden="true">
      <span className="skeleton skeleton-source" />
      <span className="skeleton skeleton-title" />
      <span className="skeleton skeleton-text" />
      <span className="skeleton skeleton-text short" />
      <div className="card-footer">
        <span className="skeleton skeleton-pill" />
        <span className="skeleton skeleton-link" />
      </div>
    </article>
  );
}

export default function Home() {
  const [phase, setPhase] = useState("loading");
  const [hero, setHero] = useState(null);
  const [cards, setCards] = useState([]);
  const [topicCards, setTopicCards] = useState({});
  const [meta, setMeta] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loadMessage, setLoadMessage] = useState(0);
  const [error, setError] = useState("");
  const [usingCache, setUsingCache] = useState(false);

  const dateLabel = useMemo(() => formatDate(new Date()), []);

  const load = useCallback(async ({ preferCache = false } = {}) => {
    setPhase("loading");
    setError("");
    setUsingCache(false);

    if (preferCache && typeof window !== "undefined") {
      const cached = window.localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setHero(parsed.hero || null);
          setCards(parsed.cards || []);
          setTopicCards(parsed.topicCards || {});
          setMeta(parsed.meta || null);
          setUsingCache(true);
        } catch {
          window.localStorage.removeItem(CACHE_KEY);
        }
      }
    }

    try {
      const response = await fetch("/api/briefing", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Erro ${response.status}`);

      const nextMeta = {
        generatedAt: data.generatedAt,
        articlesScanned: data.articlesScanned,
        sourcesQueried: data.sourcesQueried,
      };

      setHero(data.hero || null);
      setCards(data.cards || []);
      setTopicCards(data.topicCards || {});
      setMeta(nextMeta);
      setUsingCache(false);
      setPhase("done");

      window.localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ hero: data.hero, cards: data.cards, topicCards: data.topicCards, meta: nextMeta })
      );
    } catch (err) {
      const cached = typeof window !== "undefined" ? window.localStorage.getItem(CACHE_KEY) : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        setHero(parsed.hero || null);
        setCards(parsed.cards || []);
        setTopicCards(parsed.topicCards || {});
        setMeta(parsed.meta || null);
        setUsingCache(true);
        setPhase("done");
        setError(err.message);
      } else {
        setError(err.message);
        setPhase("error");
      }
    }
  }, []);

  useEffect(() => {
    load({ preferCache: true });
  }, [load]);

  useEffect(() => {
    const canRegister =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if ("serviceWorker" in navigator && canRegister) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (phase !== "loading") return undefined;
    const id = window.setInterval(() => {
      setLoadMessage((current) => (current + 1) % LOAD_MESSAGES.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [phase]);

  const counts = useMemo(() => {
    return {
      all: cards.length,
      financial: topicCards.financial?.length || 0,
      markets: topicCards.markets?.length || 0,
      geo: topicCards.geo?.length || 0,
      politics: topicCards.politics?.length || 0,
      tech: topicCards.tech?.length || 0,
    };
  }, [cards, topicCards]);

  const displayed = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const activeCards = filter === "all" ? cards : topicCards[filter] || [];
    return activeCards.filter((card) => {
      const haystack = `${card.headline || ""} ${card.summary || ""} ${card.source || ""}`.toLowerCase();
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });
  }, [cards, filter, query, topicCards]);

  return (
    <>
      <Head>
        <title>Briefing Diário</title>
        <meta name="description" content="Resumo diário de mercados, geopolítica, política e tecnologia em português europeu." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0f6b5d" />
        <meta name="application-name" content="Briefing Diário" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Briefing" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>

      <main className="app-shell">
        <header className="topbar">
          <a className="brand" href="#top" aria-label="Briefing Diário">
            <span className="brand-mark">B</span>
            <span>
              <strong>Briefing Diário</strong>
              <small>{dateLabel}</small>
            </span>
          </a>

          <div className="topbar-actions">
            {phase === "done" && meta?.generatedAt ? (
              <span className={`live-state ${usingCache ? "muted" : ""}`}>
                {usingCache ? "Cache" : "Atualizado"} às {formatTime(meta.generatedAt)}
              </span>
            ) : null}
            <button className="button button-primary" onClick={() => load()} disabled={phase === "loading"}>
              <span className={phase === "loading" ? "spin" : ""}>↻</span>
              Atualizar
            </button>
          </div>
        </header>

        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Mercados, poder e tecnologia</p>
            {phase === "loading" && !hero ? (
              <div className="loading-panel">
                <LoadingDots />
                <h1>A preparar o briefing.</h1>
                <p>{LOAD_MESSAGES[loadMessage]}</p>
              </div>
            ) : phase === "error" ? (
              <div className="error-panel">
                <h1>Não foi possível carregar o briefing.</h1>
                <p>{error}</p>
                <button className="button button-primary" onClick={() => load()}>
                  Tentar novamente
                </button>
              </div>
            ) : (
              <>
                <h1>{hero?.headline || "O essencial do dia, sem ruído."}</h1>
                <p>{hero?.summary || "Resumo executivo das notícias com maior impacto para investidores e decisores."}</p>
                <div className="hero-tags">
                  {(hero?.tags?.length ? hero.tags : ["financial", "geo", "tech"]).slice(0, 4).map((tag) => (
                    <Tag key={tag} tag={tag} />
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="hero-panel" aria-label="Resumo da cobertura">
            <div>
              <span className="metric">{meta?.articlesScanned || "60"}</span>
              <small>artigos analisados</small>
            </div>
            <div>
              <span className="metric">{meta?.sourcesQueried || "40+"}</span>
              <small>fontes consultadas</small>
            </div>
            <div>
              <span className="metric">{cards.length || "12"}</span>
              <small>destaques escolhidos</small>
            </div>
          </aside>
        </section>

        <section className="controls" aria-label="Filtros do briefing">
          <div className="tabs" role="tablist" aria-label="Categorias">
            {TAGS.map((tag) => (
              <button
                key={tag}
                className={filter === tag ? "active" : ""}
                onClick={() => setFilter(tag)}
                type="button"
                role="tab"
                aria-selected={filter === tag}
              >
                {TAG_LABELS[tag]}
                <span>{counts[tag] || 0}</span>
              </button>
            ))}
          </div>
          <label className="search-box">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por tema, fonte ou empresa"
              type="search"
            />
          </label>
        </section>

        {error && phase === "done" ? (
          <div className="notice">
            A mostrar a última versão guardada. Motivo: {error}
          </div>
        ) : null}

        <section className="briefing-grid" aria-live="polite">
          {phase === "loading" && !cards.length
            ? Array.from({ length: 6 }, (_, index) => <CardSkeleton key={index} />)
            : displayed.map((card, index) => {
                const url = card.url?.startsWith("http") ? card.url : "";
                return (
                  <article className="news-card" key={`${card.headline}-${index}`}>
                    <div className="card-meta">
                      <span>{card.source || "Fonte"}</span>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <h2>{card.headline}</h2>
                    <p>{card.summary}</p>
                    <div className="card-footer">
                      <Tag tag={card.tag || "financial"} />
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          Ler notícia
                          <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <span className="no-link">Sem link</span>
                      )}
                    </div>
                  </article>
                );
              })}
        </section>

        {phase === "done" && !displayed.length ? (
          <section className="empty-state">
            <h2>Sem resultados para este filtro.</h2>
            <p>Experimenta limpar a pesquisa ou escolher outra categoria.</p>
            <button className="button" onClick={() => { setQuery(""); setFilter("all"); }}>
              Limpar filtros
            </button>
          </section>
        ) : null}

        <footer className="footer">
          <strong>Gerado com NewsAPI e Groq AI.</strong>
          <span>Conteúdo sintetizado em português europeu a partir de fontes noticiosas e financeiras.</span>
        </footer>
      </main>
    </>
  );
}
