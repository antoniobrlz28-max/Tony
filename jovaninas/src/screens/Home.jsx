import { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon, Sparkles, ArrowRight, Ban, CalendarClock } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { isDue } from "../lib/srs.js";
import { seedSampleData } from "../lib/seed.js";
import { nowIso } from "../lib/id.js";
import {
  getShiftLog, setShiftLog, get86List, toggle86, isPermanently86d, setPermanent86,
  changesSince, estimateReviewMinutes,
} from "../lib/shiftBrief.js";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home({ go }) {
  const { data, update, isMaster } = useData();
  const [q, setQ] = useState("");
  const [sinceIso] = useState(() => data.settings?.lastVisit || null);
  const [specialEvent, setSpecialEvent] = useState(() => getShiftLog(data).specialEvent || "");
  const [editingEvent, setEditingEvent] = useState(false);
  const [changeLogOpen, setChangeLogOpen] = useState(false);

  useEffect(() => {
    update((draft) => {
      draft.settings = draft.settings || {};
      draft.settings.lastVisit = nowIso();
    });
    // run once on mount — records this visit as the new checkpoint for "since"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const sinceChanges = useMemo(() => changesSince(data, sinceIso), [data, sinceIso]);

  const needsReview = data.changes.filter((c) => c.reviewStatus === "needs_review");
  const dueCards = Object.values(data.cards).filter(isDue);
  const reviewMinutes = estimateReviewMinutes(sinceChanges.length, dueCards.length);

  // Covers/chef-updates/wine-features and per-dish featured-beverage tracking
  // are deferred off this screen for now (see product notes) — the
  // underlying shiftLog/featuredBeverages logic stays in shiftBrief.js for
  // later use, just not rendered here.
  const shiftLog = getShiftLog(data);
  const eightySixIds = get86List(data);
  const eightySixDishes = eightySixIds.map((id) => data.dishes[id]).filter(Boolean);

  const accuracySamples = Object.values(data.cards).filter((c) => c.accuracyRate != null);
  const mastery = accuracySamples.length
    ? Math.round(accuracySamples.reduce((s, c) => s + c.accuracyRate, 0) / accuracySamples.length)
    : 0;

  const allActiveDishes = Object.values(data.dishes).filter((d) => d.status === "active");

  function saveEvent() {
    update((draft) => setShiftLog(draft, undefined, { specialEvent }));
  }
  function toggleDish86(dishId) {
    update((draft) => toggle86(draft, dishId));
  }
  function toggleDishPermanent86(dishId, permanent) {
    update((draft) => setPermanent86(draft, dishId, permanent));
  }

  if (data.menus.length === 0) {
    return (
      <div className="card empty-state">
        <Sparkles size={22} color="var(--gold)" />
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
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: "0 0 2px" }}>
          {greeting()}, {displayName}.
        </h3>
      </div>

      {sinceIso && sinceChanges.length > 0 && (
        <div className="card" style={{ marginBottom: 12, borderColor: "var(--gold)" }}>
          <p className="section-title" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <CalendarClock size={12} /> Since your last shift
          </p>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
            {sinceChanges.slice(0, 6).map((c) => (
              <li key={c.id} className="small">✓ {data.dishes[c.dishId]?.canonicalName} — {c.explanation[0]}</li>
            ))}
          </ul>
          {sinceChanges.length > 6 && <p className="tiny muted" style={{ marginTop: 6 }}>+{sinceChanges.length - 6} more</p>}
          <p className="tiny muted" style={{ marginTop: 8 }}>Estimated review time: {reviewMinutes} minute{reviewMinutes === 1 ? "" : "s"}.</p>
          <a className="link small" onClick={() => go("menus", { subTab: "changes", menuId: mostRecentMenu.id })}>Review now <ArrowRight size={12} /></a>
        </div>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div
          className="grid cols-4"
          style={{ textAlign: "center", cursor: recentChanges.length ? "pointer" : "default" }}
          onClick={() => recentChanges.length && setChangeLogOpen((v) => !v)}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--forest)" }}>{stats.added}</div>
            <div className="tiny muted">New items</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>{stats.changed}</div>
            <div className="tiny muted">Changed</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--red)" }}>{stats.removed}</div>
            <div className="tiny muted">Removed</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.priceChanges}</div>
            <div className="tiny muted">Price changes</div>
          </div>
        </div>
        {recentChanges.length > 0 && (
          <>
            <hr className="sep" />
            {changeLogOpen ? (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {recentChanges.map((c) => (
                  <li key={c.id}>
                    <a className="link small" onClick={() => go("menus", { subTab: "changes", menuId: c.menuId })}>
                      {data.dishes[c.dishId]?.canonicalName || c.changeType} — {c.explanation[0]}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <a className="link tiny" onClick={() => setChangeLogOpen(true)}>View change log</a>
            )}
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <p className="section-title" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Ban size={12} /> 86'd items tonight
        </p>
        {eightySixDishes.length === 0 && <p className="muted small">Nothing 86'd{isMaster ? " — tap a dish below to mark it out." : "."}</p>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: eightySixDishes.length ? 10 : 0 }}>
          {eightySixDishes.map((d) => {
            const permanent = isPermanently86d(data, d.id);
            if (!isMaster) {
              return (
                <span key={d.id} className="stamp">
                  {d.canonicalName}{permanent ? " (permanent)" : ""}
                </span>
              );
            }
            return (
              <span key={d.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <button className="stamp" onClick={() => toggleDish86(d.id)} title="Tap to bring back">
                  {d.canonicalName}
                </button>
                <button
                  className={`pill ${permanent ? "wine" : "neutral"}`}
                  onClick={() => toggleDishPermanent86(d.id, !permanent)}
                  title={permanent ? "Confirmed permanent with chef — tap to mark temporary again" : "Mark permanent (after review with chef)"}
                >
                  {permanent ? "Permanent" : "Temporary"}
                </button>
              </span>
            );
          })}
        </div>
        {isMaster && (
          <select value="" onChange={(e) => e.target.value && toggleDish86(e.target.value)}>
            <option value="">86 a dish...</option>
            {allActiveDishes.filter((d) => !eightySixIds.includes(d.id)).map((d) => (
              <option key={d.id} value={d.id}>{d.canonicalName}</option>
            ))}
          </select>
        )}
      </div>

      {(shiftLog.specialEvent || isMaster) && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="section-title">Special event</p>
          {isMaster && editingEvent ? (
            <input
              type="text"
              autoFocus
              value={specialEvent}
              onChange={(e) => setSpecialEvent(e.target.value)}
              placeholder="e.g. Private dining at 7:00"
              onBlur={() => { saveEvent(); setEditingEvent(false); }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          ) : (
            <p
              className="small"
              onClick={() => isMaster && setEditingEvent(true)}
              style={{ cursor: isMaster ? "pointer" : "default", margin: 0 }}
            >
              {shiftLog.specialEvent || <span className="muted">Tap to add tonight's event</span>}
            </p>
          )}
        </div>
      )}

      <div className="card" style={{ marginBottom: 12, display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <p className="section-title">Your review</p>
          <p className="small">{dueCards.length} card{dueCards.length === 1 ? "" : "s"} due · est. {reviewMinutes} min</p>
          <a className="link small" onClick={() => go("learn")}>Start review <ArrowRight size={12} /></a>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="ring" style={{ "--pct": mastery }}>
            <div className="ring-inner">{mastery}%</div>
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>Mastery</div>
        </div>
      </div>

      {needsReview.length > 0 && (
        <div className="card" style={{ marginBottom: 12, borderColor: "var(--gold)" }}>
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
