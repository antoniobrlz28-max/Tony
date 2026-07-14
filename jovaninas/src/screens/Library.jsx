import { useMemo, useState } from "react";
import { Plus, Volume2 } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { speakTerm } from "../lib/speech.js";

const EMPTY_FORM = {
  term: "", category: "ingredient", definition: "", origin: "", traditional: "",
  guestFriendly: "", allergens: "", pronunciation: "", confidence: "researched", language: "it",
};

export default function Library({ go }) {
  const { data, update, isMaster } = useData();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const categories = useMemo(() => {
    const set = new Set(Object.values(data.dictionary).map((e) => e.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [data.dictionary]);

  const entries = useMemo(() => {
    let list = Object.values(data.dictionary).sort((a, b) => a.term.localeCompare(b.term));
    if (category !== "All") list = list.filter((e) => e.category === category);
    if (q) list = list.filter((e) => e.term.includes(q.toLowerCase()) || e.definition?.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [data.dictionary, q, category]);

  function saveEntry() {
    if (!form.term.trim()) return;
    update((draft) => {
      draft.dictionary[form.term.toLowerCase().trim()] = {
        term: form.term.trim(),
        language: form.language,
        category: form.category,
        definition: form.definition,
        origin: form.origin,
        traditional: form.traditional,
        flavor: [],
        misconceptions: "",
        guestFriendly: form.guestFriendly,
        pronunciation: form.pronunciation,
        allergens: form.allergens.split(",").map((a) => a.trim()).filter(Boolean),
        confidence: form.confidence,
      };
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input type="text" placeholder="Search ingredients, sauces, techniques..." value={q} onChange={(e) => setQ(e.target.value)} />
          {isMaster && <button className="btn" onClick={() => setShowForm((s) => !s)}><Plus size={13} /></button>}
        </div>
        <div className="chip-row" style={{ overflowX: "auto", flexWrap: "nowrap", marginBottom: 0 }}>
          {categories.map((c) => (
            <button key={c} className={`btn ghost ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        {showForm && (
          <div style={{ marginTop: 12 }}>
            <div className="grid cols-2">
              <input type="text" placeholder="Term" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} />
              <input type="text" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <textarea rows={2} placeholder="Definition" value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} style={{ marginTop: 8 }} />
            <div className="grid cols-2" style={{ marginTop: 8 }}>
              <input type="text" placeholder="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
              <input type="text" placeholder="Allergens (comma separated)" value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} />
            </div>
            <div className="grid cols-2" style={{ marginTop: 8 }}>
              <input type="text" placeholder="Guest-friendly one-liner" value={form.guestFriendly} onChange={(e) => setForm({ ...form, guestFriendly: e.target.value })} />
              <input type="text" placeholder="Pronunciation (e.g. mos-TAHR-dah)" value={form.pronunciation} onChange={(e) => setForm({ ...form, pronunciation: e.target.value })} />
            </div>
            <div className="grid cols-2" style={{ marginTop: 8 }}>
              <select value={form.confidence} onChange={(e) => setForm({ ...form, confidence: e.target.value })}>
                <option value="researched">Externally researched</option>
                <option value="restaurant-confirmed">Restaurant-confirmed (chef/manager)</option>
                <option value="inferred">AI inferred</option>
              </select>
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} title="Language of the term, for pronunciation playback">
                <option value="it">Italian accent</option>
                <option value="en">English</option>
                <option value="es">Spanish accent</option>
                <option value="fr">French accent</option>
              </select>
            </div>
            <button className="btn" style={{ marginTop: 8 }} onClick={saveEntry}>Save term</button>
          </div>
        )}
      </div>

      <div className="grid cols-2">
        {entries.map((e) => (
          <div key={e.term} className="card clickable" onClick={() => go("term", { term: e.term, fromTab: "library" })}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ textTransform: "capitalize" }}>{e.term}</h3>
              {e.pronunciation && (
                <button className="icon-btn" style={{ padding: "4px 7px" }} onClick={(ev) => { ev.stopPropagation(); speakTerm(e.term, e.language); }}><Volume2 size={12} /></button>
              )}
            </div>
            <span className={`pill ${e.confidence === "restaurant-confirmed" ? "green" : e.confidence === "inferred" ? "brass" : "neutral"}`}>
              {e.confidence}
            </span>
            <p className="small muted" style={{ marginTop: 8 }}>{e.category}{e.origin ? ` · ${e.origin}` : ""}</p>
            <p className="small">{e.definition}</p>
            {e.guestFriendly && <p className="small" style={{ fontStyle: "italic" }}>"{e.guestFriendly}"</p>}
            {e.allergens?.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {e.allergens.map((a) => <span key={a} className="pill wine">{a}</span>)}
              </div>
            )}
          </div>
        ))}
        {entries.length === 0 && <p className="muted">No terms found.</p>}
      </div>
    </div>
  );
}
