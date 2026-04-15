import { useState, useEffect, useCallback } from "react";
import Head from "next/head";

const TAG_LABELS = { financial:"Finanças", geo:"Geopolítica", markets:"Mercados", politics:"Política", tech:"Tecnologia" };
const tl = t => TAG_LABELS[t] || t;
const TAG_STYLE = {
  financial: { bg:"#E3EEF9", color:"#1a5fa0" },
  geo:       { bg:"#FDF0DF", color:"#8B5B0A" },
  markets:   { bg:"#E7F4E1", color:"#2d6b11" },
  politics:  { bg:"#FAE8EF", color:"#9c3157" },
  tech:      { bg:"#EDEAFD", color:"#5540c4" },
};

function Tag({ t, pill }) {
  const s = TAG_STYLE[t] || TAG_STYLE.financial;
  return <span style={{ fontSize:9.5, fontWeight:500, letterSpacing:"0.8px", textTransform:"uppercase", background:s.bg, color:s.color, padding: pill ? "4px 10px" : "3px 9px", borderRadius: pill ? 20 : 10 }}>{tl(t)}</span>;
}

function Dots() {
  return (
    <span style={{ display:"inline-flex", gap:4 }}>
      {[0,1,2].map(i => <span key={i} style={{ width:4, height:4, borderRadius:"50%", background:"var(--ink-3)", display:"inline-block", animation:`blink 1.4s ease-in-out ${i*0.2}s infinite` }} />)}
    </span>
  );
}

const TABS = ["all","financial","markets","geo","politics","tech"];
const TAB_LABELS = { all:"Tudo", ...TAG_LABELS };
const LOAD_MSGS = [
  "A pesquisar notícias de hoje…",
  "A analisar mercados financeiros…",
  "A verificar geopolítica…",
  "A compilar tecnologia e política…",
  "A preparar o resumo final…",
];

export default function Home() {
  const [phase, setPhase]       = useState("loading");
  const [hero, setHero]         = useState(null);
  const [cards, setCards]       = useState([]);
  const [filter, setFilter]     = useState("all");
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx]     = useState(0);
  const [genAt, setGenAt]       = useState(null);
  const [errMsg, setErrMsg]     = useState("");

  const today = new Date();
  const dateStr = today.toLocaleDateString("pt-PT", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  const load = useCallback(async () => {
    setPhase("loading"); setProgress(8); setMsgIdx(0); setErrMsg("");
    let p = 8;
    const pTick = setInterval(() => { p = Math.min(p + 1, 80); setProgress(p); }, 900);
    let m = 0;
    const mTick = setInterval(() => { if (m < LOAD_MSGS.length - 1) setMsgIdx(++m); }, 5000);
    try {
      const res  = await fetch("/api/briefing", { method:"POST" });
      const data = await res.json();
      clearInterval(pTick); clearInterval(mTick);
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
      setHero(data.hero || {}); setCards(data.cards || []); setGenAt(data.generatedAt);
      setProgress(100); setPhase("done");
      setTimeout(() => setProgress(0), 700);
    } catch(e) {
      clearInterval(pTick); clearInterval(mTick);
      setErrMsg(e.message); setPhase("error"); setProgress(0);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const displayed = filter === "all" ? cards : cards.filter(c => c.tag === filter);

  return (
    <>
      <Head>
        <title>Briefing Diário</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        :root { --bg:#f7f6f2; --bg-card:#fff; --bg-nav:rgba(247,246,242,.95); --ink:#1a1916; --ink-2:#5c5a54; --ink-3:#a09e97; --border:rgba(0,0,0,.07); --border-md:rgba(0,0,0,.13); --accent:#c8a96e; }
        @media(prefers-color-scheme:dark){ :root{ --bg:#141412; --bg-card:#1e1d1a; --bg-nav:rgba(20,20,18,.95); --ink:#f0ede6; --ink-2:#9e9b93; --ink-3:#5c5a54; --border:rgba(255,255,255,.06); --border-md:rgba(255,255,255,.12); } }
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;-webkit-font-smoothing:antialiased}
        @keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .card:hover{background:var(--bg)!important}
        a.read:hover{color:var(--accent)!important}
      `}</style>

      {/* Progress bar */}
      <div style={{ position:"fixed", top:0, left:0, height:2, width:`${progress}%`, background:"var(--accent)", transition:"width .5s ease", zIndex:9999 }} />

      {/* Nav */}
      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"1rem 2rem", borderBottom:"0.5px solid var(--border)", background:"var(--bg-nav)", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(16px)" }}>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:"var(--ink)", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--accent)", display:"inline-block" }} />
          Briefing
        </span>
        <span style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:"0.6px", textTransform:"uppercase" }}>{dateStr.toUpperCase()}</span>
        <button onClick={load} disabled={phase==="loading"} style={{ background:"none", border:"0.5px solid var(--border-md)", borderRadius:20, padding:"5px 14px", fontSize:11, fontFamily:"'DM Sans',sans-serif", color:"var(--ink-2)", cursor:phase==="loading"?"not-allowed":"pointer", opacity:phase==="loading"?.5:1, display:"flex", alignItems:"center", gap:5, transition:"all .2s" }}>
          <span style={{ display:"inline-block", animation:phase==="loading"?"spin 1s linear infinite":"none" }}>↻</span>
          Atualizar
        </button>
      </nav>

      {/* Tabs */}
      <div style={{ display:"flex", padding:"0 2rem", background:"var(--bg-card)", borderBottom:"0.5px solid var(--border)", overflowX:"auto" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ fontSize:11.5, color:filter===t?"var(--ink)":"var(--ink-3)", padding:"10px 14px", border:"none", background:"none", cursor:"pointer", borderBottom:`1.5px solid ${filter===t?"var(--accent)":"transparent"}`, fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap", transition:"all .15s" }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Hero */}
      <div style={{ background:"var(--bg-card)", padding:"3rem 2rem 2.5rem", borderBottom:"0.5px solid var(--border)", position:"relative", overflow:"hidden", minHeight:180 }}>
        <div style={{ position:"absolute", top:0, right:0, width:320, height:320, background:"radial-gradient(circle,rgba(200,169,110,.07) 0%,transparent 70%)", pointerEvents:"none" }} />

        {phase==="loading" && (
          <div style={{ textAlign:"center", padding:"2rem 0", color:"var(--ink-3)" }}>
            <Dots />
            <div style={{ marginTop:12, fontSize:13, fontWeight:300 }}>{LOAD_MSGS[msgIdx]}</div>
          </div>
        )}

        {phase==="error" && (
          <div style={{ textAlign:"center", padding:"2rem", color:"var(--ink-2)", fontSize:14, fontWeight:300, lineHeight:1.8 }}>
            Não foi possível carregar o briefing.<br/>
            <small style={{ fontSize:12, color:"var(--ink-3)", display:"block", marginTop:6 }}>{errMsg}</small>
            <button onClick={load} style={{ marginTop:14, padding:"6px 18px", border:"0.5px solid var(--border-md)", borderRadius:20, background:"none", fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"var(--ink-2)", cursor:"pointer" }}>
              ↻ Tentar novamente
            </button>
          </div>
        )}

        {phase==="done" && hero && (
          <>
            <div style={{ fontSize:10, fontWeight:500, letterSpacing:2, textTransform:"uppercase", color:"var(--accent)", marginBottom:"1rem" }}>Briefing · {dateStr}</div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(22px,3.5vw,36px)", lineHeight:1.22, color:"var(--ink)", maxWidth:780, marginBottom:"1.1rem" }}>{hero.headline}</h1>
            <p style={{ fontSize:15, fontWeight:300, lineHeight:1.72, color:"var(--ink-2)", maxWidth:680 }}>{hero.summary}</p>
            <div style={{ display:"flex", gap:8, marginTop:"1.5rem", flexWrap:"wrap" }}>
              {(hero.tags||["financial"]).slice(0,4).map(t => <Tag key={t} t={t} pill />)}
            </div>
          </>
        )}
      </div>

      {/* Status */}
      {phase==="done" && genAt && (
        <div style={{ padding:"0.55rem 2rem", fontSize:11, color:"var(--ink-3)", borderBottom:"0.5px solid var(--border)", display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ width:5, height:5, borderRadius:"50%", background:"#4caf50", display:"inline-block" }} />
          Atualizado às {new Date(genAt).toLocaleTimeString("pt-PT",{hour:"2-digit",minute:"2-digit"})} · {cards.length} notícias · NewsAPI + Groq (gratuito)
        </div>
      )}

      {/* Cards */}
      <div style={{ padding:"2rem", maxWidth:1180, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:"1.3rem" }}>
          <span style={{ fontSize:10, fontWeight:500, letterSpacing:2, textTransform:"uppercase", color:"var(--ink-3)", whiteSpace:"nowrap" }}>Destaques do dia</span>
          <div style={{ flex:1, height:"0.5px", background:"var(--border)" }} />
        </div>

        {phase==="loading" && <div style={{ textAlign:"center", padding:"3rem", color:"var(--ink-3)" }}><Dots /></div>}

        {phase==="done" && displayed.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))", gap:1, background:"var(--border)", border:"0.5px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
            {displayed.map((c,i) => {
              const url = c.url?.startsWith("http") ? c.url : null;
              return (
                <div key={i} className="card" style={{ background:"var(--bg-card)", padding:"1.3rem 1.5rem", display:"flex", flexDirection:"column", gap:9, transition:"background .15s" }}>
                  <div style={{ fontSize:9.5, fontWeight:500, letterSpacing:"1.2px", textTransform:"uppercase", color:"var(--ink-3)" }}>{c.source||"Fonte"}</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, lineHeight:1.35, color:"var(--ink)" }}>{c.headline}</div>
                  <div style={{ fontSize:13, fontWeight:300, lineHeight:1.62, color:"var(--ink-2)", flex:1 }}>{c.summary}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:2 }}>
                    <Tag t={c.tag||"financial"} />
                    {url
                      ? <a className="read" href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"var(--ink-3)", textDecoration:"none", transition:"color .15s" }}>Ler notícia →</a>
                      : <span style={{ fontSize:11, color:"var(--ink-3)", opacity:.3 }}>Sem link</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {phase==="done" && displayed.length === 0 && (
          <div style={{ textAlign:"center", padding:"2rem", color:"var(--ink-3)", fontSize:13 }}>Sem notícias para este filtro.</div>
        )}
      </div>

      <footer style={{ padding:"2rem", textAlign:"center", fontSize:10.5, color:"var(--ink-3)", borderTop:"0.5px solid var(--border)", marginTop:"1rem", letterSpacing:"0.5px", lineHeight:1.8 }}>
        Briefing Diário · NewsAPI + Groq AI · 100% gratuito · Atualiza a cada carregamento
      </footer>
    </>
  );
}
