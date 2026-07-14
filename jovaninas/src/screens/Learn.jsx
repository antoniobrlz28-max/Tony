import { useEffect, useMemo, useState } from "react";
import { Volume2, Mic, MessageCircleWarning, Compass } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { isDue, reviewCard } from "../lib/srs.js";
import { generateMCQPool } from "../lib/mcq.js";
import { generateObjectionScenarios } from "../lib/objections.js";
import { recommendDishes } from "../lib/recommend.js";
import { speakTerm, hasItalianVoice } from "../lib/speech.js";

const MODES = ["Flashcards", "Pre-Shift Quiz", "Pronunciation", "Objections", "Recommend"];

function FlashcardsMode({ data, update, dishId }) {
  const [revealed, setRevealed] = useState(false);
  const [idx, setIdx] = useState(0);

  const dueCards = useMemo(() => {
    let all = Object.values(data.cards);
    if (dishId) {
      const dish = data.dishes[dishId];
      const versionIds = new Set(dish?.versions || []);
      all = all.filter((c) => versionIds.has(c.dishVersionId));
    } else {
      all = all.filter(isDue);
    }
    return all;
  }, [data.cards, data.dishes, dishId]);

  const card = dueCards[idx % Math.max(dueCards.length, 1)];
  const dv = card ? data.dishVersions[card.dishVersionId] : null;

  const overallAccuracy = useMemo(() => {
    const withHistory = Object.values(data.cards).filter((c) => c.accuracyRate != null);
    if (!withHistory.length) return null;
    return Math.round(withHistory.reduce((sum, c) => sum + c.accuracyRate, 0) / withHistory.length);
  }, [data.cards]);

  function grade(g) {
    update((draft) => { draft.cards[card.id] = reviewCard(draft.cards[card.id], g); });
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="small">
          {dueCards.length} card{dueCards.length === 1 ? "" : "s"} {dishId ? "for this dish" : "due today"}.
          {overallAccuracy != null && ` Overall recall accuracy: ${overallAccuracy}%.`}
        </p>
      </div>
      {!card && <div className="card empty-state"><p>Nothing due right now. Nice work.</p></div>}
      {card && (
        <div className="card">
          <p className="section-title">{card.category.replace("-", " ")} · {dv?.displayName}</p>
          <p style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--font-display)" }}>{card.question}</p>
          {revealed ? (
            <>
              <p className="small" style={{ marginTop: 8 }}>{card.answer}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                <button className="btn danger" onClick={() => grade("again")}>Again</button>
                <button className="btn secondary" onClick={() => grade("hard")}>Hard</button>
                <button className="btn" onClick={() => grade("good")}>Good</button>
                <button className="btn" onClick={() => grade("easy")}>Easy</button>
              </div>
            </>
          ) : (
            <button className="btn" style={{ marginTop: 12 }} onClick={() => setRevealed(true)}>Reveal answer</button>
          )}
        </div>
      )}
    </div>
  );
}

function QuizMode({ data, dishId }) {
  const pool = useMemo(() => generateMCQPool(data, dishId).slice(0, 10), [data, dishId]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);

  const q = pool[idx];

  if (pool.length === 0) {
    return <div className="card empty-state"><p>Not enough menu data yet to build a quiz — add more dishes or dictionary terms.</p></div>;
  }
  if (!q) {
    return (
      <div className="card empty-state">
        <p style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{score} / {pool.length}</p>
        <p className="small">Quiz complete.</p>
        <button className="btn" onClick={() => { setIdx(0); setSelected(null); setScore(0); }}>Restart</button>
      </div>
    );
  }

  function choose(opt) {
    if (selected) return;
    setSelected(opt);
    if (opt === q.answer) setScore((s) => s + 1);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
        <span className="tiny muted">Question {idx + 1} of {pool.length}</span>
        <span className="tiny muted">Score {score}</span>
      </div>
      <div className="card">
        <p style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--font-display)", marginBottom: 12 }}>{q.question}</p>
        {q.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isCorrect = opt === q.answer;
          const isPicked = opt === selected;
          let bg = "var(--charcoal-raised)";
          if (selected && isCorrect) bg = "var(--deep-green-bg)";
          else if (selected && isPicked) bg = "var(--wine-bg)";
          return (
            <button
              key={opt}
              onClick={() => choose(opt)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                padding: "10px 12px", marginBottom: 8, borderRadius: 10, border: "1px solid var(--border)",
                background: bg, color: "var(--cream)", cursor: selected ? "default" : "pointer", fontSize: 13,
              }}
            >
              <span className="pill neutral">{letter}</span> {opt}
            </button>
          );
        })}
        {selected && (
          <>
            <p className="small" style={{ marginTop: 8 }}>{q.explanation}</p>
            <button className="btn" style={{ marginTop: 10 }} onClick={() => { setIdx((i) => i + 1); setSelected(null); }}>
              Next
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PronunciationMode({ data, update }) {
  const terms = useMemo(
    () => Object.values(data.dictionary).filter((e) => e.pronunciation).sort((a, b) => a.term.localeCompare(b.term)),
    [data.dictionary]
  );
  const [idx, setIdx] = useState(0);
  const [italianVoiceAvailable, setItalianVoiceAvailable] = useState(true);
  const term = terms[idx % Math.max(terms.length, 1)];
  const practiced = data.settings?.pronunciationPracticed?.[term?.term] || 0;

  useEffect(() => {
    hasItalianVoice().then(setItalianVoiceAvailable);
  }, []);

  function markPracticed() {
    update((draft) => {
      draft.settings = draft.settings || {};
      draft.settings.pronunciationPracticed = draft.settings.pronunciationPracticed || {};
      draft.settings.pronunciationPracticed[term.term] = (draft.settings.pronunciationPracticed[term.term] || 0) + 1;
    });
    setIdx((i) => i + 1);
  }

  if (terms.length === 0) {
    return <div className="card empty-state"><p>No pronunciation guides yet — add one to a Library term.</p></div>;
  }

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="section-title">Practice saying this term</p>
      <h3 style={{ fontSize: 24, textTransform: "capitalize" }}>{term.term}</h3>
      <p className="muted small" style={{ fontFamily: "ui-monospace, monospace" }}>({term.pronunciation})</p>
      <button className="icon-btn" style={{ margin: "12px auto" }} onClick={() => speakTerm(term.term, term.language)}>
        <Volume2 size={14} /> Listen{term.language === "it" ? " (Italian)" : ""}
      </button>
      {term.language === "it" && !italianVoiceAvailable && (
        <p className="tiny muted" style={{ marginTop: -4 }}>No Italian voice installed on this device — using the default voice with Italian phonetics.</p>
      )}
      <div className="tiny muted" style={{ marginBottom: 12, marginTop: 6 }}>
        <Mic size={11} style={{ verticalAlign: "-2px" }} /> Practiced {practiced}x
      </div>
      <button className="btn" onClick={markPracticed}>I said it — next term</button>
    </div>
  );
}

function ObjectionsMode({ data }) {
  const scenarios = useMemo(() => generateObjectionScenarios(data), [data]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const scenario = scenarios[idx % Math.max(scenarios.length, 1)];

  if (scenarios.length === 0) {
    return <div className="card empty-state"><p>Not enough menu data yet — add active dishes to generate objection scenarios.</p></div>;
  }

  function next() {
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="small">Scenario {(idx % scenarios.length) + 1} of {scenarios.length} · {scenario.category}</p>
      </div>
      <div className="card">
        <p className="section-title" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <MessageCircleWarning size={12} /> Guest says
        </p>
        <p style={{ fontSize: 16, fontFamily: "var(--font-display)", fontStyle: "italic" }}>"{scenario.guestLine}"</p>
        {revealed ? (
          <>
            <hr className="sep" />
            <p className="section-title">Suggested response</p>
            <p className="small">{scenario.response}</p>
            <button className="btn" style={{ marginTop: 12 }} onClick={next}>Next scenario</button>
          </>
        ) : (
          <button className="btn" style={{ marginTop: 12 }} onClick={() => setRevealed(true)}>How would you respond?</button>
        )}
      </div>
    </div>
  );
}

function RecommendMode({ data }) {
  const [protein, setProtein] = useState(null);
  const [avoidSpicy, setAvoidSpicy] = useState(false);
  const [richness, setRichness] = useState("");
  const [exclude, setExclude] = useState([]);
  const [result, setResult] = useState(null);

  const availableProteins = useMemo(() => {
    const set = new Set();
    for (const dish of Object.values(data.dishes)) {
      if (dish.status !== "active") continue;
      const dv = data.dishVersions[dish.versions.at(-1)];
      for (const c of dv?.components || []) if (c.role === "protein") set.add(c.normalized);
    }
    return Array.from(set).sort();
  }, [data]);

  const availableExcludable = useMemo(() => {
    const set = new Set();
    for (const dish of Object.values(data.dishes)) {
      if (dish.status !== "active") continue;
      const dv = data.dishVersions[dish.versions.at(-1)];
      for (const c of dv?.components || []) set.add(c.normalized);
    }
    return Array.from(set).sort();
  }, [data]);

  function run() {
    setResult(
      recommendDishes(data, {
        protein,
        avoidSpicy,
        richness: richness || null,
        excludeIngredients: exclude,
      })
    );
  }

  function toggleExclude(ing) {
    setExclude((prev) => (prev.includes(ing) ? prev.filter((x) => x !== ing) : [...prev, ing]));
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="section-title" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Compass size={12} /> Guest preferences
        </p>

        {availableProteins.length > 0 && (
          <>
            <p className="tiny muted" style={{ marginBottom: 6 }}>Protein guest likes</p>
            <div className="chip-row">
              {availableProteins.map((p) => (
                <button key={p} className={`toggle-chip ${protein === p ? "active" : ""}`} onClick={() => setProtein(protein === p ? null : p)}>
                  {p}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="tiny muted" style={{ marginBottom: 6 }}>Richness</p>
        <div className="chip-row">
          {[["", "No preference"], ["rich", "Rich"], ["light", "Light"]].map(([val, label]) => (
            <button key={val} className={`toggle-chip ${richness === val ? "active" : ""}`} onClick={() => setRichness(val)}>{label}</button>
          ))}
        </div>

        {availableExcludable.length > 0 && (
          <>
            <p className="tiny muted" style={{ marginBottom: 6 }}>Ingredients to avoid</p>
            <div className="chip-row" style={{ maxHeight: 90, overflowY: "auto" }}>
              {availableExcludable.map((ing) => (
                <button key={ing} className={`toggle-chip ${exclude.includes(ing) ? "active" : ""}`} onClick={() => toggleExclude(ing)}>
                  {ing}
                </button>
              ))}
            </div>
          </>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, margin: "10px 0" }}>
          <input type="checkbox" checked={avoidSpicy} onChange={(e) => setAvoidSpicy(e.target.checked)} />
          Guest wants to avoid spice
        </label>
        <button className="btn" onClick={run}>Get recommendation</button>
      </div>

      {result && (
        <div className="card">
          <p className="section-title">Top recommendations</p>
          {result.recommendations.length === 0 && <p className="muted small">No active dishes match — try loosening the preferences.</p>}
          {result.recommendations.map((r) => (
            <div key={r.dishVersion.id} className="dish-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="dish-name" style={{ fontSize: 14 }}>{r.dishVersion.displayName}</span>
                <span className={`pill ${r.confidence === "High" ? "green" : r.confidence === "Medium" ? "brass" : "neutral"}`}>{r.confidence} confidence</span>
              </div>
              <div className="dish-desc">{r.dishVersion.description}</div>
              {r.reasons.length > 0 && <div className="tiny muted" style={{ marginTop: 4 }}>{r.reasons.join(" · ")}</div>}
            </div>
          ))}
          {result.suggestedWine.length > 0 && (
            <>
              <hr className="sep" />
              <p className="section-title">Suggested wine</p>
              <p className="small">{result.suggestedWine[0].label} — {result.suggestedWine[0].reason}</p>
            </>
          )}
          {result.upsellAppetizer && (
            <p className="small" style={{ marginTop: 6 }}>Upsell appetizer: <strong>{result.upsellAppetizer.displayName}</strong></p>
          )}
          {result.suggestedDessert && (
            <p className="small">Suggested dessert: <strong>{result.suggestedDessert.displayName}</strong></p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Learn({ params }) {
  const { data, update } = useData();
  const [mode, setMode] = useState(params?.mode && MODES.includes(params.mode) ? params.mode : "Flashcards");

  return (
    <div>
      <div className="segmented" style={{ marginBottom: 14 }}>
        {MODES.map((m) => <button key={m} className={mode === m ? "active" : ""} onClick={() => setMode(m)}>{m}</button>)}
      </div>
      {mode === "Flashcards" && <FlashcardsMode data={data} update={update} dishId={params?.dishId} />}
      {mode === "Pre-Shift Quiz" && <QuizMode data={data} dishId={params?.dishId} />}
      {mode === "Pronunciation" && <PronunciationMode data={data} update={update} />}
      {mode === "Objections" && <ObjectionsMode data={data} />}
      {mode === "Recommend" && <RecommendMode data={data} />}
    </div>
  );
}
