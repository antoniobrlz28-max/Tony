import { useMemo, useRef, useState } from "react";
import { ArrowLeft, GraduationCap, StickyNote, Share2, Wine, Camera, Trash2 } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { dishHistory, addNote } from "../lib/menuOps.js";
import { allergensForComponents, detectTechniques } from "../lib/components.js";
import { allDescriptions, likelyGuestQuestions, audienceDescription, pictureDescription } from "../lib/descriptions.js";
import { flavorProfile } from "../lib/flavorProfile.js";
import { suggestPairings } from "../lib/pairing.js";
import { getDishPhotos, addDishPhoto, removeDishPhoto } from "../lib/photos.js";
import IngredientTerms from "../components/IngredientTerms.jsx";

const TABS = ["Overview", "Components", "Pairings", "Guest Q&A", "Photos", "Training", "History"];
const AUDIENCES = ["Professional", "Guest", "Kid", "Foodie"];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DishPage({ go, params }) {
  const { data, update, isMaster } = useData();
  const [tab, setTab] = useState("Overview");
  const [audience, setAudience] = useState("Guest");
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("staff observation");
  const [chefConfirmed, setChefConfirmed] = useState(false);
  const [guestQText, setGuestQText] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const fileRef = useRef(null);

  const dish = data.dishes[params.dishId];
  const history = useMemo(() => dishHistory(data, params.dishId), [data, params.dishId]);
  const latest = history[history.length - 1];

  const notes = data.notes.filter((n) => n.entityType === "dish" && n.entityId === params.dishId);
  const guestQuestionNotes = notes.filter((n) => n.noteType === "guest question");
  const relatedChanges = data.changes.filter((c) => c.dishId === params.dishId);
  const cards = Object.values(data.cards).filter((c) => history.some((h) => h.id === c.dishVersionId));
  const photos = getDishPhotos(data, params.dishId);

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
  const audienceText = audienceDescription(latest, audience.toLowerCase(), data.dictionary, flavors);

  function saveNote() {
    if (!noteText.trim()) return;
    update((draft) => {
      addNote(draft, { entityType: "dish", entityId: params.dishId, noteType, content: noteText, source: chefConfirmed ? "chef" : "user" });
    });
    setNoteText("");
  }

  function saveGuestQuestion() {
    if (!guestQText.trim()) return;
    update((draft) => {
      addNote(draft, { entityType: "dish", entityId: params.dishId, noteType: "guest question", content: guestQText, source: "user" });
    });
    setGuestQText("");
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await readFileAsDataUrl(file);
    update((draft) => addDishPhoto(draft, params.dishId, { url, caption: photoCaption }));
    setPhotoCaption("");
    if (fileRef.current) fileRef.current.value = "";
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
        {photos[0] ? (
          <img src={photos[0].url} alt={latest.displayName} />
        ) : (
          <span className="tiny muted">No photo attached to this dish yet</span>
        )}
      </div>

      <h3 style={{ fontSize: 22, margin: "0 0 2px" }}>{latest.displayName}</h3>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span className="muted small">{latest.section} · {dish.status}</span>
        {latest.price != null && <span className="price">${latest.price}</span>}
      </div>
      <p className="small" style={{ marginBottom: 6 }}>{pictureDescription(latest)}</p>
      <IngredientTerms components={latest.components} dictionary={data.dictionary} />
      <div style={{ marginBottom: 12 }} />

      <div className="segmented" style={{ marginBottom: 14 }}>
        {TABS.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === "Overview" && (
        <div className="card">
          <p className="section-title">Explain like I'm a...</p>
          <div className="chip-row">
            {AUDIENCES.map((a) => (
              <button key={a} className={`btn ghost ${audience === a ? "active" : ""}`} onClick={() => setAudience(a)}>{a}</button>
            ))}
          </div>
          <p className="small">{audienceText}</p>

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
              {isMaster && (
                <>
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
                </>
              )}
              {notes.length === 0 && !isMaster && <p className="muted small">No notes yet.</p>}
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
              <div
                key={i}
                className="dish-row"
                style={{ cursor: hit ? "pointer" : "default" }}
                onClick={() => hit && go("term", { term: hit.term, fromTab: params.fromTab || "menus" })}
              >
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
                  {p.matches.map((m) => (
                    <span key={m.term} className="pill brass" style={{ textTransform: "capitalize", cursor: "pointer" }} onClick={() => go("term", { term: m.term, fromTab: params.fromTab || "menus" })}>
                      {m.term}
                    </span>
                  ))}
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

      {tab === "Guest Q&A" && (
        <div className="card">
          <p className="section-title">Likely questions</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {questions.length ? questions.map((q, i) => <li key={i} className="small">{q}</li>) : <li className="small muted">None flagged yet.</li>}
          </ul>
          <hr className="sep" />
          <p className="section-title">Logged from the floor</p>
          {guestQuestionNotes.length === 0 && <p className="muted small">No guest questions logged yet.</p>}
          {[...guestQuestionNotes].reverse().map((n) => (
            <div key={n.id} className="dish-row">
              <div className="small">{n.content}</div>
              <span className="tiny muted">{new Date(n.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          {isMaster && (
            <>
              <textarea rows={2} style={{ marginTop: 8 }} value={guestQText} onChange={(e) => setGuestQText(e.target.value)} placeholder='e.g. "A guest asked if the mostarda contains nuts."' />
              <button className="btn" style={{ marginTop: 8 }} onClick={saveGuestQuestion}>Log question</button>
            </>
          )}
        </div>
      )}

      {tab === "Photos" && (
        <div className="card">
          <p className="section-title">Plating photo timeline</p>
          {isMaster && (
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input type="text" placeholder="Caption (optional)" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} />
              <button className="icon-btn" onClick={() => fileRef.current?.click()}><Camera size={13} /> Add</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
            </div>
          )}
          {photos.length === 0 && <p className="muted small">No photos yet.</p>}
          {photos.map((p) => (
            <div key={p.id} className="dish-row">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <img src={p.url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                <div>
                  <div className="small">{p.caption || "Untitled"}</div>
                  <div className="tiny muted">{p.date}</div>
                </div>
              </div>
              {isMaster && (
                <button className="btn ghost" onClick={() => update((draft) => removeDishPhoto(draft, params.dishId, p.id))}><Trash2 size={12} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "Training" && (
        <div className="card">
          <p className="section-title">Training material</p>
          <p className="small">{cards.length} flashcard{cards.length === 1 ? "" : "s"} generated for this dish across all its versions.</p>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => go("learn", { dishId: dish.id, mode: "Flashcards" })}>Study flashcards</button>
            <button className="btn secondary" onClick={() => go("learn", { dishId: dish.id, mode: "Pre-Shift Quiz" })}>Take a quiz</button>
          </div>
          <hr className="sep" />
          <p className="section-title">Selling phrases &amp; FAQ on record</p>
          {notes.filter((n) => n.noteType === "selling phrase" || n.noteType === "faq").length === 0 && (
            <p className="muted small">None logged yet — add one from the Notes panel on Overview.</p>
          )}
          {notes.filter((n) => n.noteType === "selling phrase" || n.noteType === "faq").map((n) => (
            <p key={n.id} className="small">"{n.content}"</p>
          ))}
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
                <div className="tiny muted">
                  {v.effectiveDate}
                  {v.price != null && <span className="price tiny"> · ${v.price}</span>}
                </div>
              </div>
            </div>
          ))}
          <hr className="sep" />
          <p className="section-title">Related changes</p>
          {relatedChanges.length === 0 && <p className="muted small">None recorded.</p>}
          {relatedChanges.map((c) => (
            <div key={c.id} className="small" style={{ padding: "4px 0" }}>{c.changeType}: {c.explanation.join(" ")}</div>
          ))}
        </div>
      )}
    </div>
  );
}
