import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useData } from "../lib/context.jsx";

const EMPTY_FORM = {
  term: "",
  category: "ingredient",
  definition: "",
  origin: "",
  traditional: "",
  guestFriendly: "",
  allergens: "",
  confidence: "researched",
};

export default function Library() {
  const { data, update } = useData();
  const [q, setQ] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const entries = useMemo(() => {
    const list = Object.values(data.dictionary).sort((a, b) => a.term.localeCompare(b.term));
    if (!q) return list;
    return list.filter((e) => e.term.includes(q.toLowerCase()) || e.definition?.toLowerCase().includes(q.toLowerCase()));
  }, [data.dictionary, q]);

  function saveEntry() {
    if (!form.term.trim()) return;
    update((draft) => {
      draft.dictionary[form.term.toLowerCase().trim()] = {
        term: form.term.trim(),
        category: form.category,
        definition: form.definition,
        origin: form.origin,
        traditional: form.traditional,
        flavor: [],
        misconceptions: "",
        guestFriendly: form.guestFriendly,
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
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" placeholder="Search ingredients, sauces, techniques..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" onClick={() => setShowForm((s) => !s)}><Plus size={13} /> Add term</button>
        </div>
        {showForm && (
          <div style={{ marginTop: 12 }}>
            <div className="grid cols-2">
              <input type="text" placeholder="Term" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} />
              <input type="text" placeholder="Category (sauce, cheese, pasta shape...)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <textarea rows={2} placeholder="Definition" value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} style={{ marginTop: 8 }} />
            <div className="grid cols-2" style={{ marginTop: 8 }}>
              <input type="text" placeholder="Origin" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
              <input type="text" placeholder="Allergens (comma separated)" value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} />
            </div>
            <input type="text" placeholder="Guest-friendly one-liner" value={form.guestFriendly} onChange={(e) => setForm({ ...form, guestFriendly: e.target.value })} style={{ marginTop: 8 }} />
            <select value={form.confidence} onChange={(e) => setForm({ ...form, confidence: e.target.value })} style={{ marginTop: 8 }}>
              <option value="researched">Externally researched</option>
              <option value="restaurant-confirmed">Restaurant-confirmed (chef/manager)</option>
              <option value="inferred">AI inferred</option>
            </select>
            <button className="btn" style={{ marginTop: 8 }} onClick={saveEntry}>Save term</button>
          </div>
        )}
      </div>

      <div className="grid cols-2">
        {entries.map((e) => (
          <div key={e.term} className="card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ textTransform: "capitalize" }}>{e.term}</h3>
              <span className={`pill ${e.confidence === "restaurant-confirmed" ? "olive" : e.confidence === "inferred" ? "gold" : "blue"}`}>
                {e.confidence}
              </span>
            </div>
            <p className="small muted">{e.category}{e.origin ? ` · ${e.origin}` : ""}</p>
            <p className="small">{e.definition}</p>
            {e.guestFriendly && <p className="small" style={{ fontStyle: "italic" }}>"{e.guestFriendly}"</p>}
            {e.allergens?.length > 0 && (
              <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {e.allergens.map((a) => <span key={a} className="pill red">{a}</span>)}
              </div>
            )}
          </div>
        ))}
        {entries.length === 0 && <p className="muted">No terms found.</p>}
      </div>
    </div>
  );
}
