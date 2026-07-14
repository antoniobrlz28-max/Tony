import { X } from "lucide-react";

// A lightweight popup for glancing at what a term means without leaving the
// screen you're on — the full wiki page (with notes, dish history, etc.) is
// still available via the Library/Search "term" route for a deeper look.
export default function TermPopup({ term, entry, onClose }) {
  if (!term) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(30,26,15,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
      onClick={onClose}
    >
      <div className="card" style={{ width: "min(360px, 88vw)", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <p className="section-title" style={{ textTransform: "capitalize", margin: 0 }}>{entry?.term || term}</p>
          <button className="icon-btn" onClick={onClose}><X size={14} /></button>
        </div>
        {entry ? (
          <>
            {entry.pronunciation && <p className="tiny muted" style={{ marginBottom: 6 }}>{entry.pronunciation}</p>}
            <p className="small" style={{ marginBottom: 8 }}>{entry.definition}</p>
            {entry.origin && <p className="tiny muted" style={{ marginBottom: 4 }}>Origin: {entry.origin}</p>}
            {entry.guestFriendly && <p className="tiny muted" style={{ marginBottom: 4 }}>In plain terms: {entry.guestFriendly}</p>}
            {(entry.allergens || []).length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                {entry.allergens.map((a) => <span key={a} className="pill wine">{a}</span>)}
              </div>
            )}
            <p className="tiny muted" style={{ marginTop: 10 }}>
              {entry.confidence === "inferred" ? "Spotted on the menu — no write-up yet. Add details in the Library." : `Category: ${entry.category}`}
            </p>
          </>
        ) : (
          <p className="small muted">No dictionary entry yet.</p>
        )}
      </div>
    </div>
  );
}
