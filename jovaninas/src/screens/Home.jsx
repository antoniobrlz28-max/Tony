import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { isDue } from "../lib/srs.js";
import { todayStr } from "../lib/id.js";
import { seedSampleData } from "../lib/seed.js";

export default function Home({ go }) {
  const { data, update } = useData();
  const [q, setQ] = useState("");

  const latestMenus = useMemo(() => {
    const byType = {};
    for (const m of data.menus) {
      if (m.status !== "confirmed") continue;
      const cur = byType[m.menuType];
      if (!cur || m.uploadDate > cur.uploadDate) byType[m.menuType] = m;
    }
    return Object.values(byType).sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
  }, [data.menus]);

  const mostRecentMenu = latestMenus[0];
  const recentChanges = useMemo(
    () => data.changes.filter((c) => c.menuId === mostRecentMenu?.id),
    [data.changes, mostRecentMenu]
  );
  const needsReview = data.changes.filter((c) => c.reviewStatus === "needs_review");
  const dueCards = Object.values(data.cards).filter(isDue);
  const immediate = recentChanges.filter((c) => c.trainingPriority === "Immediate");

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go("search", { q });
          }}
          style={{ display: "flex", gap: 8 }}
        >
          <input
            type="text"
            placeholder='Ask anything — "what changed this month", "dishes with nuts"...'
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn" type="submit">Search</button>
        </form>
      </div>

      {data.menus.length === 0 && (
        <div className="card empty-state">
          <Sparkles size={22} />
          <p>No menus yet. Start by scanning or pasting your first menu.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="btn" onClick={() => go("scan")}>Scan a menu</button>
            <button className="btn secondary" onClick={() => seedSampleData(update)}>Load sample data</button>
          </div>
        </div>
      )}

      <div className="grid cols-3">
        <div className="card">
          <p className="section-title">Current menu status</p>
          {latestMenus.length === 0 && <p className="muted small">Nothing uploaded yet.</p>}
          {latestMenus.map((m) => (
            <div key={m.id} className="dish-row">
              <div>
                <div className="dish-name">{m.menuType}</div>
                <div className="dish-desc">v{m.versionNumber} · effective {m.effectiveDate}</div>
              </div>
              <a className="link small" onClick={() => go("menu")}>View</a>
            </div>
          ))}
        </div>

        <div className="card">
          <p className="section-title">Changes since last version</p>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{recentChanges.length}</div>
          <p className="muted small">
            {immediate.length > 0
              ? `${immediate.length} need immediate attention (allergen).`
              : "No urgent allergen changes."}
          </p>
          {mostRecentMenu && (
            <a className="link small" onClick={() => go("changes", { menuId: mostRecentMenu.id })}>
              Review changes <ArrowRight size={12} />
            </a>
          )}
        </div>

        <div className="card">
          <p className="section-title">Training due</p>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{dueCards.length}</div>
          <p className="muted small">Flashcards ready for review today ({todayStr()}).</p>
          <a className="link small" onClick={() => go("learn")}>
            Start studying <ArrowRight size={12} />
          </a>
        </div>
      </div>

      {needsReview.length > 0 && (
        <div className="card" style={{ marginTop: 14, borderColor: "var(--gold)" }}>
          <p className="section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} /> Unconfirmed information
          </p>
          <p className="small">
            {needsReview.length} detected change{needsReview.length === 1 ? "" : "s"} need human confirmation before
            they're finalized (uncertain dish matches, possible renames).
          </p>
          <a className="link small" onClick={() => go("changes", { menuId: needsReview[0].menuId })}>
            Review now <ArrowRight size={12} />
          </a>
        </div>
      )}
    </div>
  );
}
