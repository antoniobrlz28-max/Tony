import { useMemo, useState } from "react";
import { useData } from "../lib/context.jsx";
import { isDue, reviewCard } from "../lib/srs.js";

export default function Learn({ params }) {
  const { data, update } = useData();
  const [revealed, setRevealed] = useState(false);
  const [filterDishId, setFilterDishId] = useState(params?.dishId || null);

  const dueCards = useMemo(() => {
    let all = Object.values(data.cards);
    if (filterDishId) {
      const dish = data.dishes[filterDishId];
      const versionIds = new Set(dish?.versions || []);
      all = all.filter((c) => versionIds.has(c.dishVersionId));
    } else {
      all = all.filter(isDue);
    }
    return all;
  }, [data.cards, data.dishes, filterDishId]);

  const [idx, setIdx] = useState(0);
  const card = dueCards[idx % Math.max(dueCards.length, 1)];
  const dv = card ? data.dishVersions[card.dishVersionId] : null;

  function grade(g) {
    update((draft) => {
      draft.cards[card.id] = reviewCard(draft.cards[card.id], g);
    });
    setRevealed(false);
    setIdx((i) => i + 1);
  }

  const overallAccuracy = useMemo(() => {
    const withHistory = Object.values(data.cards).filter((c) => c.accuracyRate != null);
    if (!withHistory.length) return null;
    return Math.round(withHistory.reduce((sum, c) => sum + c.accuracyRate, 0) / withHistory.length);
  }, [data.cards]);

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="section-title">Training</p>
        <p className="small">
          {dueCards.length} card{dueCards.length === 1 ? "" : "s"} {filterDishId ? "for this dish" : "due today"}.
          {overallAccuracy != null && ` Overall recall accuracy: ${overallAccuracy}%.`}
        </p>
        {filterDishId && (
          <button className="btn ghost" onClick={() => { setFilterDishId(null); setIdx(0); }}>Show all due cards instead</button>
        )}
      </div>

      {!card && (
        <div className="card empty-state">
          <p>Nothing due right now. Nice work.</p>
        </div>
      )}

      {card && (
        <div className="card">
          <p className="section-title">{card.category.replace("-", " ")} · {dv?.displayName}</p>
          <p style={{ fontSize: 16, fontWeight: 600 }}>{card.question}</p>
          {revealed ? (
            <>
              <p className="small" style={{ marginTop: 8 }}>{card.answer}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
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
