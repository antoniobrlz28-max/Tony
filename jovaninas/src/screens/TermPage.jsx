import { useMemo, useState } from "react";
import { ArrowLeft, Volume2 } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { dishesContainingTerm, notesForTerm } from "../lib/wiki.js";
import { addNote } from "../lib/menuOps.js";

function speak(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export default function TermPage({ go, params }) {
  const { data, update } = useData();
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("chef note");
  const [chefConfirmed, setChefConfirmed] = useState(false);

  const entry = data.dictionary[params.term];
  const { current, past } = useMemo(() => (entry ? dishesContainingTerm(data, entry.term) : { current: [], past: [] }), [data, entry]);
  const notes = useMemo(() => (entry ? notesForTerm(data, entry.term) : []), [data, entry]);
  const chefNotes = notes.filter((n) => n.confidence === "restaurant-confirmed");
  const guestQuestions = notes.filter((n) => n.noteType === "guest question");
  const isBeverage = entry && ["wine", "cocktail", "amaro", "beer"].includes(entry.category);

  if (!entry) {
    return (
      <div className="card empty-state">
        <p>Term not found.</p>
        <button className="btn" onClick={() => go("library")}>Back to Library</button>
      </div>
    );
  }

  function saveNote() {
    if (!noteText.trim()) return;
    update((draft) => {
      addNote(draft, { entityType: "term", entityId: entry.term, noteType, content: noteText, source: chefConfirmed ? "chef" : "user" });
    });
    setNoteText("");
  }

  return (
    <div>
      <a className="link small" onClick={() => go(params.fromTab || "library")} style={{ marginBottom: 10, display: "inline-flex" }}>
        <ArrowLeft size={13} /> Back
      </a>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ textTransform: "capitalize", fontSize: 22 }}>{entry.term}</h3>
            {entry.pronunciation && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <span className="muted small" style={{ fontFamily: "var(--font-stamp)" }}>({entry.pronunciation})</span>
                <button className="icon-btn" style={{ padding: "3px 7px" }} onClick={() => speak(entry.term)}><Volume2 size={11} /></button>
              </div>
            )}
          </div>
          <span className={`pill ${entry.confidence === "restaurant-confirmed" ? "green" : entry.confidence === "inferred" ? "brass" : "neutral"}`}>
            {entry.confidence}
          </span>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>{entry.category}{entry.origin ? ` · ${entry.origin}` : ""}</p>
        <p className="small" style={{ marginTop: 6 }}>{entry.definition}</p>
        {entry.guestFriendly && <p className="small" style={{ fontStyle: "italic", marginTop: 4 }}>"{entry.guestFriendly}"</p>}
        {entry.allergens?.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {entry.allergens.map((a) => <span key={a} className="pill wine">{a}</span>)}
          </div>
        )}
      </div>

      {entry.traditional && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="section-title">Traditional preparation</p>
          <p className="small">{entry.traditional}</p>
        </div>
      )}

      {entry.misconceptions && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="section-title">Common misconception</p>
          <p className="small">{entry.misconceptions}</p>
        </div>
      )}

      {isBeverage && entry.pairingStyle?.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="section-title">Pairing style</p>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {entry.pairingStyle.map((s) => <span key={s} className="pill cream">{s.replace(/-/g, " ")}</span>)}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <p className="section-title">Current dishes</p>
        {current.length === 0 && <p className="muted small">Not used on the current menu.</p>}
        {current.map((dv) => (
          <div key={dv.id} className="dish-row" style={{ cursor: "pointer" }} onClick={() => go("dish", { dishId: dv.dishId, fromTab: "library" })}>
            <div className="dish-name" style={{ fontSize: 13.5 }}>{dv.displayName}</div>
          </div>
        ))}
      </div>

      {past.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="section-title">Past dishes</p>
          {past.map((dv) => (
            <div key={dv.id} className="dish-row" style={{ cursor: "pointer" }} onClick={() => go("dish", { dishId: dv.dishId, fromTab: "library" })}>
              <div>
                <div className="dish-name" style={{ fontSize: 13.5 }}>{dv.displayName}</div>
                <div className="tiny muted">{dv.effectiveDate}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {chefNotes.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="section-title">How Jovanina's uses it</p>
          {chefNotes.map((n) => <p key={n.id} className="small" style={{ marginBottom: 6 }}>"{n.content}"</p>)}
        </div>
      )}

      {guestQuestions.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="section-title">Guest questions on record</p>
          {guestQuestions.map((n) => <p key={n.id} className="small" style={{ marginBottom: 6 }}>{n.content}</p>)}
        </div>
      )}

      <div className="card">
        <p className="section-title">Add a note</p>
        <div className="grid cols-2" style={{ marginBottom: 8 }}>
          <select value={noteType} onChange={(e) => setNoteType(e.target.value)}>
            {["chef note", "manager update", "staff observation", "guest question", "selling phrase"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <input type="checkbox" checked={chefConfirmed} onChange={(e) => setChefConfirmed(e.target.checked)} />
            Chef-confirmed
          </label>
        </div>
        <textarea rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="e.g. Chef confirmed we use the sweeter northern-Italian style, not the sharper Cremona version." />
        <button className="btn" style={{ marginTop: 8 }} onClick={saveNote}>Save note</button>
        {notes.length > 0 && (
          <>
            <hr className="sep" />
            {[...notes].reverse().map((n) => (
              <div key={n.id} className="dish-row">
                <div>
                  <div className="small">{n.content}</div>
                  <div className="tiny muted">{n.noteType} · {new Date(n.createdAt).toLocaleDateString()}</div>
                </div>
                <span className={`pill ${n.confidence === "restaurant-confirmed" ? "green" : "neutral"}`}>{n.confidence}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
