import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { dishHistory } from "../lib/menuOps.js";
import { addNote } from "../lib/menuOps.js";
import { allergensForComponents, detectTechniques } from "../lib/components.js";
import { allDescriptions, likelyGuestQuestions } from "../lib/descriptions.js";

const LAYERS = ["Quick shift view", "Service view", "Culinary study", "Internal notes", "History"];

export default function DishPage({ go, params }) {
  const { data, update } = useData();
  const [layer, setLayer] = useState(LAYERS[0]);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("staff observation");
  const [chefConfirmed, setChefConfirmed] = useState(false);

  const dish = data.dishes[params.dishId];
  const history = useMemo(() => dishHistory(data, params.dishId), [data, params.dishId]);
  const latest = history[history.length - 1];

  const notes = data.notes.filter((n) => n.entityType === "dish" && n.entityId === params.dishId);
  const relatedChanges = data.changes.filter((c) => c.dishId === params.dishId);
  const cards = Object.values(data.cards).filter((c) => history.some((h) => h.id === c.dishVersionId));

  if (!dish || !latest) {
    return (
      <div className="card empty-state">
        <p>Dish not found.</p>
        <button className="btn" onClick={() => go("menu")}>Back to menu</button>
      </div>
    );
  }

  const allergens = allergensForComponents(latest.components || []);
  const techniques = detectTechniques(`${latest.displayName} ${latest.description}`);
  const desc = allDescriptions(latest, data.dictionary);
  const questions = likelyGuestQuestions(latest, data.dictionary);

  function saveNote() {
    if (!noteText.trim()) return;
    update((draft) => {
      addNote(draft, {
        entityType: "dish",
        entityId: params.dishId,
        noteType,
        content: noteText,
        source: chefConfirmed ? "chef" : "user",
      });
    });
    setNoteText("");
  }

  return (
    <div>
      <a className="link small" onClick={() => go(params.fromTab || "menu")} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
        <ArrowLeft size={13} /> Back
      </a>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ fontSize: 20 }}>{latest.displayName}</h3>
            <p className="muted small">{latest.description}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            {latest.price != null && <div style={{ fontWeight: 700 }}>${latest.price}</div>}
            <div className="tiny muted">{latest.section} · {dish.status}</div>
          </div>
        </div>
        {allergens.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {allergens.map((a) => (
              <span key={a} className="pill red">{a} — unconfirmed by kitchen</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {LAYERS.map((l) => (
          <button key={l} className={`btn ${layer === l ? "" : "ghost"}`} onClick={() => setLayer(l)}>
            {l}
          </button>
        ))}
      </div>

      {layer === "Quick shift view" && (
        <div className="card">
          <p className="section-title">20-second review</p>
          <p><strong>{desc.oneLine}</strong></p>
          <p className="small">{(latest.components || []).slice(0, 3).map((c) => c.normalized).join(", ") || "No components parsed yet"}</p>
          <p className="small">Techniques: {techniques.join(", ") || "not specified"}</p>
          <p className="small">Allergens: {allergens.length ? allergens.join(", ") : "none detected — confirm with kitchen"}</p>
          {questions[0] && <p className="small">Most likely guest question: "{questions[0]}"</p>}
          {relatedChanges.length > 0 && (
            <p className="small">Recent change: {relatedChanges[relatedChanges.length - 1].explanation[0]}</p>
          )}
        </div>
      )}

      {layer === "Service view" && (
        <div className="card">
          <p className="section-title">Descriptions</p>
          <p className="small"><strong>15-second:</strong> {desc.oneLine}</p>
          <p className="small"><strong>30-second:</strong> {desc.sensory}</p>
          <p className="small"><strong>Full:</strong> {desc.elevated}</p>
          <p className="small"><strong>Guest-friendly:</strong> {desc.guestFriendly}</p>
          <hr className="sep" />
          <p className="section-title">Guests may ask</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {questions.length ? questions.map((q, i) => <li key={i} className="small">{q}</li>) : <li className="small muted">None flagged yet.</li>}
          </ul>
        </div>
      )}

      {layer === "Culinary study" && (
        <div className="card">
          <p className="section-title">Component breakdown</p>
          {(latest.components || []).map((c, i) => {
            const hit = data.dictionary[c.normalized];
            return (
              <div key={i} className="dish-row">
                <div>
                  <div className="dish-name" style={{ fontSize: 13.5 }}>{c.normalized} <span className="pill neutral">{c.role}</span></div>
                  {hit && <div className="dish-desc">{hit.definition}</div>}
                  {!hit && <div className="tiny muted">No dictionary entry yet — add one in Library.</div>}
                </div>
                <span className={`pill ${c.source === "dictionary" ? "olive" : "gold"}`}>{c.source}</span>
              </div>
            );
          })}
          <hr className="sep" />
          <p className="section-title">Technique</p>
          <p className="small">{techniques.length ? techniques.join(", ") : "Not specified in the menu description."}</p>
        </div>
      )}

      {layer === "Internal notes" && (
        <div className="card">
          <p className="section-title">Add a note</p>
          <div className="grid cols-2" style={{ marginBottom: 8 }}>
            <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
              {["chef note", "manager update", "staff observation", "faq", "modification", "guest question", "selling phrase"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <input type="checkbox" checked={chefConfirmed} onChange={(e) => setChefConfirmed(e.target.checked)} />
              Chef-confirmed fact (overrides general knowledge)
            </label>
          </div>
          <textarea rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="e.g. Chef confirmed the mushroom sauce uses roasted mushroom stock, marsala, butter, and black garlic." />
          <button className="btn" style={{ marginTop: 8 }} onClick={saveNote}>Save note</button>
          <hr className="sep" />
          <p className="section-title">Notes ({notes.length})</p>
          {notes.length === 0 && <p className="muted small">No notes yet.</p>}
          {[...notes].reverse().map((n) => (
            <div key={n.id} className="dish-row">
              <div>
                <div className="small">{n.content}</div>
                <div className="tiny muted">{n.noteType} · {new Date(n.createdAt).toLocaleDateString()}</div>
              </div>
              <span className={`pill ${n.confidence === "restaurant-confirmed" ? "olive" : "neutral"}`}>{n.confidence}</span>
            </div>
          ))}
        </div>
      )}

      {layer === "History" && (
        <div className="card">
          <p className="section-title">Version history — {dish.canonicalName}</p>
          {history.map((v, i) => (
            <div key={v.id} className="dish-row">
              <div>
                <div className="dish-name" style={{ fontSize: 13.5 }}>Version {i + 1}: {v.displayName}</div>
                <div className="dish-desc">{v.description}</div>
                <div className="tiny muted">{v.effectiveDate}{v.price != null ? ` · $${v.price}` : ""}</div>
              </div>
            </div>
          ))}
          <hr className="sep" />
          <p className="section-title">Related changes</p>
          {relatedChanges.length === 0 && <p className="muted small">None recorded.</p>}
          {relatedChanges.map((c) => (
            <div key={c.id} className="small" style={{ padding: "4px 0" }}>{c.changeType}: {c.explanation.join(" ")}</div>
          ))}
          {cards.length > 0 && (
            <>
              <hr className="sep" />
              <a className="link small" onClick={() => go("learn", { dishId: dish.id })}>Quiz me on this dish ({cards.length} cards)</a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
