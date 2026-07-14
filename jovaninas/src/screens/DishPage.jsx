import { useMemo, useState } from "react";
import { ArrowLeft, GraduationCap, StickyNote, Share2, Wine } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { dishHistory, addNote } from "../lib/menuOps.js";
import { allergensForComponents, detectTechniques } from "../lib/components.js";
import { allDescriptions, likelyGuestQuestions } from "../lib/descriptions.js";
import { flavorProfile } from "../lib/flavorProfile.js";
import { suggestPairings } from "../lib/pairing.js";

const TABS = ["Overview", "Components", "Pairings", "History"];

export default function DishPage({ go, params }) {
  const { data, update } = useData();
  const [tab, setTab] = useState("Overview");
  const [notesOpen, setNotesOpen] = useState(false);
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
        <button className="btn" onClick={() => go("menus")}>Back to menu</button>
      </div>
    );
  }

  const allergens = allergensForComponents(latest.components || []);
  const techniques = detectTechniques(`${latest.displayName} ${latest.description}`);
  const desc = allDescriptions(latest, data.dictionary);
  const questions = likelyGuestQuestions(latest, data.dictionary);
  const flavors = flavorProfile(latest, data.dictionary);
  const pairings = suggestPairings(latest, flavors, data.dictionary);

  function saveNote() {
    if (!noteText.trim()) return;
    update((draft) => {
      addNote(draft, { entityType: "dish", entityId: params.dishId, noteType, content: noteText, source: chefConfirmed ? "chef" : "user" });
    });
    setNoteText("");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <a className="link small" onClick={() => go(params.fromTab || "menus")}>
          <ArrowLeft size={13} /> Back
        </a>
        {relatedChanges.length > 0 && <span className="pill brass">{relatedChanges.length} change{relatedChanges.length === 1 ? "" : "s"} on record</span>}
      </div>

      <div className="hero-image" style={{ marginBottom: 12 }}>
        <span className="tiny muted">No photo attached to this dish yet</span>
      </div>

      <h3 style={{ fontSize: 22, margin: "0 0 2px" }}>{latest.displayName}</h3>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className="muted small">{latest.section} · {dish.status}</span>
        {latest.price != null && <span style={{ fontWeight: 700, fontFamily: "var(--font-display)" }}>${latest.price}</span>}
      </div>

      <div className="segmented" style={{ marginBottom: 14 }}>
        {TABS.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === "Overview" && (
        <div className="card">
          <p className="section-title">One line</p>
          <p className="small">{desc.oneLine}</p>

          {flavors.length > 0 && (
            <>
              <p className="section-title" style={{ marginTop: 14 }}>Flavor profile</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {flavors.map((f) => <span key={f} className="pill cream">{f}</span>)}
              </div>
            </>
          )}

          <p className="section-title" style={{ marginTop: 14 }}>Key components</p>
          <div className="grid cols-2">
            {(latest.components || []).map((c, i) => (
              <div key={i} className="small">• {c.normalized}</div>
            ))}
            {(latest.components || []).length === 0 && <p className="muted small">No components parsed.</p>}
          </div>

          {allergens.length > 0 && (
            <>
              <p className="section-title" style={{ marginTop: 14 }}>Allergens</p>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {allergens.map((a) => <span key={a} className="pill wine">{a} — confirm with kitchen</span>)}
              </div>
            </>
          )}

          <hr className="sep" />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn" onClick={() => go("learn", { dishId: dish.id })}>
              <GraduationCap size={13} /> Learn
            </button>
            <button className="icon-btn" onClick={() => setNotesOpen((v) => !v)}>
              <StickyNote size={13} /> Notes {notes.length > 0 && `(${notes.length})`}
            </button>
            <button className="icon-btn" onClick={() => navigator.share ? navigator.share({ title: latest.displayName, text: desc.guestFriendly }) : alert(desc.guestFriendly)}>
              <Share2 size={13} /> Share
            </button>
          </div>

          {notesOpen && (
            <div style={{ marginTop: 14 }}>
              <hr className="sep" />
              <div className="grid cols-2" style={{ marginBottom: 8 }}>
                <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                  {["chef note", "manager update", "staff observation", "faq", "modification", "guest question", "selling phrase"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <input type="checkbox" checked={chefConfirmed} onChange={(e) => setChefConfirmed(e.target.checked)} />
                  Chef-confirmed
                </label>
              </div>
              <textarea rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." />
              <button className="btn" style={{ marginTop: 8 }} onClick={saveNote}>Save note</button>
              {notes.length > 0 && <hr className="sep" />}
              {[...notes].reverse().map((n) => (
                <div key={n.id} className="dish-row">
                  <div>
                    <div className="small">{n.content}</div>
                    <div className="tiny muted">{n.noteType} · {new Date(n.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`pill ${n.confidence === "restaurant-confirmed" ? "green" : "neutral"}`}>{n.confidence}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Components" && (
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
                <span className={`pill ${c.source === "dictionary" ? "green" : "brass"}`}>{c.source}</span>
              </div>
            );
          })}
          <hr className="sep" />
          <p className="section-title">Technique</p>
          <p className="small">{techniques.length ? techniques.join(", ") : "Not specified in the menu description."}</p>
          <hr className="sep" />
          <p className="section-title">Guests may ask</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {questions.length ? questions.map((q, i) => <li key={i} className="small">{q}</li>) : <li className="small muted">None flagged yet.</li>}
          </ul>
          <hr className="sep" />
          <p className="section-title">Service descriptions</p>
          <p className="small"><strong>30-second:</strong> {desc.sensory}</p>
          <p className="small"><strong>Full:</strong> {desc.elevated}</p>
        </div>
      )}

      {tab === "Pairings" && (
        <div className="card">
          <p className="section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Wine size={13} /> Suggested pairings
          </p>
          {pairings.map((p) => (
            <div key={p.style} className="dish-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div className="dish-name" style={{ fontSize: 13.5 }}>{p.label}</div>
              <div className="dish-desc">{p.reason}</div>
              {p.matches.length > 0 ? (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {p.matches.map((m) => <span key={m.term} className="pill brass" style={{ textTransform: "capitalize" }}>{m.term}</span>)}
                </div>
              ) : (
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  No matching entries in Library yet — add wines/cocktails there to get specific suggestions.
                </div>
              )}
            </div>
          ))}
          <p className="tiny muted" style={{ marginTop: 8 }}>
            Style-based suggestions from flavor logic. Confirm against the current beverage menu before recommending to guests.
          </p>
        </div>
      )}

      {tab === "History" && (
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
