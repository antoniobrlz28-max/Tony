import { useMemo, useState } from "react";
import { Search as SearchIcon, Sparkles, ArrowRight } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { isDue } from "../lib/srs.js";
import { seedSampleData } from "../lib/seed.js";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home({ go }) {
  const { data, update } = useData();
  const [q, setQ] = useState("");

  const displayName = data.settings?.displayName || "there";

  const mostRecentMenu = useMemo(
    () => [...data.menus].sort((a, b) => b.uploadDate.localeCompare(a.uploadDate))[0],
    [data.menus]
  );

  const recentChanges = useMemo(
    () => data.changes.filter((c) => c.menuId === mostRecentMenu?.id),
    [data.changes, mostRecentMenu]
  );

  const stats = useMemo(() => {
    const added = recentChanges.filter((c) => c.changeType === "Added item").length;
    const removed = recentChanges.filter((c) => c.changeType === "Removed item").length;
    const priceChanges = recentChanges.filter((c) => c.changeType === "Price increased" || c.changeType === "Price decreased").length;
    const changed = recentChanges.length - added - removed - priceChanges;
    return { added, changed, removed, priceChanges };
  }, [recentChanges]);

  const needsReview = data.changes.filter((c) => c.reviewStatus === "needs_review");
  const dueCards = Object.values(data.cards).filter(isDue);

  const accuracySamples = Object.values(data.cards).filter((c) => c.accuracyRate != null);
  const mastery = accuracySamples.length
    ? Math.round(accuracySamples.reduce((s, c) => s + c.accuracyRate, 0) / accuracySamples.length)
    : 0;

  if (data.menus.length === 0) {
    return (
      <div className="card empty-state">
        <Sparkles size={22} color="var(--brass)" />
        <p>No menus yet. Start by scanning or pasting your first menu.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button className="btn" onClick={() => go("scan")}>Scan a menu</button>
          <button className="btn secondary" onClick={() => seedSampleData(update)}>Load sample data</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 21, margin: "0 0 2px" }}>
          {greeting()}, {displayName} 👋
        </h3>
        <p className="muted small" style={{ margin: 0 }}>Here's what's happening today.</p>
      </div>

      <div className="card" style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <div className="hero-image" style={{ width: 56, height: 56, flexShrink: 0, aspectRatio: "auto" }}>
          <Sparkles size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="section-title" style={{ marginBottom: 2 }}>Current menu</div>
          <div className="dish-name">{mostRecentMenu.menuType}</div>
          <div className="tiny muted">Effective {mostRecentMenu.effectiveDate}</div>
        </div>
        <button className="btn secondary" onClick={() => go("menus")}>View menu</button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <p className="section-title">Changes since last version</p>
        <div className="grid cols-4" style={{ textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#6fbf8f" }}>{stats.added}</div>
            <div className="tiny muted">Added</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--brass)" }}>{stats.changed}</div>
            <div className="tiny muted">Changed</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#e88a92" }}>{stats.removed}</div>
            <div className="tiny muted">Removed</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.priceChanges}</div>
            <div className="tiny muted">Price changes</div>
          </div>
        </div>
        <hr className="sep" />
        <a className="link small" onClick={() => go("menus", { subTab: "changes", menuId: mostRecentMenu.id })}>
          Review changes <ArrowRight size={12} />
        </a>
      </div>

      <div className="card" style={{ marginBottom: 12, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <p className="section-title">Today's prep for shift</p>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            <li className="small">✓ {stats.added} new item{stats.added === 1 ? "" : "s"} to learn</li>
            <li className="small">✓ {needsReview.length || stats.changed} change{(needsReview.length || stats.changed) === 1 ? "" : "s"} to review</li>
            <li className="small">✓ {dueCards.length} question{dueCards.length === 1 ? "" : "s"} due</li>
          </ul>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="ring" style={{ "--pct": mastery }}>
            <div className="ring-inner">{mastery}%</div>
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>Mastery</div>
        </div>
      </div>

      {needsReview.length > 0 && (
        <div className="card" style={{ marginBottom: 12, borderColor: "var(--brass)" }}>
          <p className="section-title">Unconfirmed information</p>
          <p className="small">
            {needsReview.length} detected change{needsReview.length === 1 ? "" : "s"} need confirmation before they're finalized.
          </p>
          <a className="link small" onClick={() => go("menus", { subTab: "changes", menuId: needsReview[0].menuId })}>
            Review now <ArrowRight size={12} />
          </a>
        </div>
      )}

      <div className="card">
        <form onSubmit={(e) => { e.preventDefault(); go("search", { q, fromTab: "home" }); }} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder='Search anything — "what dishes contain nuts?"'
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn" type="submit"><SearchIcon size={14} /></button>
        </form>
      </div>
    </div>
  );
}
