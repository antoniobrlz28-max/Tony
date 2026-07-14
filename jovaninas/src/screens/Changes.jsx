import { useMemo, useState } from "react";
import { useData } from "../lib/context.jsx";
import { confirmChange, markChangeAsNewDish, markChangeIgnored } from "../lib/menuOps.js";

const IMPORTANCE_PILL = { High: "red", Medium: "gold", Low: "neutral" };

function ChangeCard({ change, data, go, onConfirm, onSplit, onIgnore }) {
  const dish = data.dishes[change.dishId];
  return (
    <div className="dish-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <span className="dish-name">{dish?.canonicalName || "Unknown dish"}</span>{" "}
          <span className="pill neutral">{change.changeType}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <span className={`pill ${IMPORTANCE_PILL[change.serviceImportance] || "neutral"}`}>
            Service: {change.serviceImportance}
          </span>
          <span className="pill blue">Training: {change.trainingPriority}</span>
        </div>
      </div>
      {change.oldValue && <div className="small muted">Previous: {change.oldValue}</div>}
      {change.newValue && <div className="small muted">Current: {change.newValue}</div>}
      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
        {change.explanation.map((line, i) => (
          <li key={i} className="small">{line}</li>
        ))}
      </ul>
      <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
        <span className="tiny muted">Confidence: {Math.round(change.confidence * 100)}%</span>
        {change.reviewStatus === "needs_review" && (
          <>
            <button className="btn" onClick={() => onConfirm(change.id)}>Same dish, new version</button>
            <button className="btn secondary" onClick={() => onSplit(change.id)}>Not the same dish</button>
            <button className="btn ghost" onClick={() => onIgnore(change.id, "ocr_error")}>OCR error</button>
            <button className="btn ghost" onClick={() => onIgnore(change.id, "ignored")}>Ignore</button>
          </>
        )}
        {change.reviewStatus !== "needs_review" && (
          <span className="pill olive">{change.reviewStatus === "confirmed" ? "Confirmed" : change.reviewStatus}</span>
        )}
        {change.newVersionId && (
          <a className="link tiny" onClick={() => go("dish", { dishId: change.dishId, fromTab: "changes" })}>
            View dish
          </a>
        )}
      </div>
    </div>
  );
}

export default function Changes({ go, params }) {
  const { data, update } = useData();
  const sortedMenus = useMemo(
    () => [...data.menus].sort((a, b) => b.uploadDate.localeCompare(a.uploadDate)),
    [data.menus]
  );
  const [menuId, setMenuId] = useState(params?.menuId || sortedMenus[0]?.id);
  const menu = data.menus.find((m) => m.id === menuId) || sortedMenus[0];

  const changes = useMemo(() => (menu ? data.changes.filter((c) => c.menuId === menu.id) : []), [data.changes, menu]);

  const groups = {
    "New tonight": changes.filter((c) => c.changeType === "Added item"),
    Changed: changes.filter((c) => !["Added item", "Removed item"].includes(c.changeType)),
    Removed: changes.filter((c) => c.changeType === "Removed item"),
  };

  const priceChanges = changes.filter((c) => c.changeType === "Price increased" || c.changeType === "Price decreased");
  const studyPriority = [...changes]
    .filter((c) => c.trainingPriority !== "Low")
    .sort((a, b) => {
      const order = { Immediate: 0, "This week": 1, "Before next shift": 2, Low: 3 };
      return order[a.trainingPriority] - order[b.trainingPriority];
    })
    .slice(0, 6);

  const doConfirm = (id) => update((draft) => confirmChange(draft, id));
  const doSplit = (id) => update((draft) => markChangeAsNewDish(draft, id));
  const doIgnore = (id, reason) => update((draft) => markChangeIgnored(draft, id, reason));

  if (!menu) {
    return (
      <div className="card empty-state">
        <p>No menus scanned yet.</p>
        <button className="btn" onClick={() => go("scan")}>Scan a menu</button>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <p className="section-title">Change briefing</p>
        <select value={menuId} onChange={(e) => setMenuId(e.target.value)}>
          {sortedMenus.map((m) => (
            <option key={m.id} value={m.id}>
              {m.menuType} v{m.versionNumber} — {m.effectiveDate}
            </option>
          ))}
        </select>
        <p className="tiny muted" style={{ marginTop: 8 }}>
          {changes.length} detected change{changes.length === 1 ? "" : "s"}
          {menu.comparedAgainstMenuId ? "" : " (first version of this menu type — everything logged as new)"}
        </p>
      </div>

      {Object.entries(groups).map(([label, list]) =>
        list.length > 0 ? (
          <div key={label} className="card" style={{ marginBottom: 12 }}>
            <p className="section-title">{label}</p>
            {list.map((c) => (
              <ChangeCard key={c.id} change={c} data={data} go={go} onConfirm={doConfirm} onSplit={doSplit} onIgnore={doIgnore} />
            ))}
          </div>
        ) : null
      )}

      {priceChanges.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p className="section-title">Price changes</p>
          {priceChanges.map((c) => (
            <div key={c.id} className="small" style={{ padding: "4px 0" }}>
              {data.dishes[c.dishId]?.canonicalName}: {c.oldValue?.match(/\$[\d.]+/)?.[0]} → {c.newValue?.match(/\$[\d.]+/)?.[0]}
            </div>
          ))}
        </div>
      )}

      {studyPriority.length > 0 && (
        <div className="card">
          <p className="section-title">Study priority</p>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {studyPriority.map((c) => (
              <li key={c.id} className="small">
                {data.dishes[c.dishId]?.canonicalName} — {c.changeType} ({c.trainingPriority})
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
