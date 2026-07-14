import { useMemo, useState } from "react";
import { useData } from "../lib/context.jsx";
import { MENU_TYPES } from "../lib/storage.js";
import { allergensForComponents } from "../lib/components.js";
import { confirmChange, markChangeAsNewDish, markChangeIgnored } from "../lib/menuOps.js";
import Highlight from "../components/Highlight.jsx";

const SUB_TABS = ["Current Menu", "Changes", "History"];
const ALL_ALLERGENS = ["gluten", "dairy", "tree nuts", "peanut", "shellfish", "fish", "egg", "soy", "sesame"];

// Bolds the specific ingredient/price/name inside a change-explanation
// sentence, so the eye lands on what changed instead of re-reading the
// whole line.
function HighlightedLine({ line }) {
  let m = line.match(/^(.+?) (was added\.|was removed\.)$/);
  if (m) return <><mark className="highlight">{m[1]}</mark> {m[2]}</>;

  m = line.match(/^Price changed from (\$[\d.]+) to (\$[\d.]+)\.$/);
  if (m) return <>Price changed from <mark className="highlight">{m[1]}</mark> to <mark className="highlight">{m[2]}</mark>.</>;

  m = line.match(/^Name changed from ("[^"]+") to ("[^"]+")\.$/);
  if (m) return <>Name changed from <mark className="highlight">{m[1]}</mark> to <mark className="highlight">{m[2]}</mark>.</>;

  return line;
}

function CurrentMenuTab({ go, data }) {
  const [menuType, setMenuType] = useState(null);
  const [q, setQ] = useState("");
  const [allergenFilter, setAllergenFilter] = useState("");

  const latestByType = useMemo(() => {
    const byType = {};
    for (const m of data.menus) {
      if (m.status !== "confirmed") continue;
      const cur = byType[m.menuType];
      if (!cur || m.uploadDate > cur.uploadDate) byType[m.menuType] = m;
    }
    return byType;
  }, [data.menus]);

  const availableTypes = MENU_TYPES.filter((t) => latestByType[t]);
  const activeType = menuType || availableTypes[0];
  const menu = activeType ? latestByType[activeType] : null;

  const changesForMenu = useMemo(() => (menu ? data.changes.filter((c) => c.menuId === menu.id) : []), [data.changes, menu]);
  const changeByDishVersion = useMemo(() => {
    const map = {};
    for (const c of changesForMenu) if (c.newVersionId) map[c.newVersionId] = c;
    return map;
  }, [changesForMenu]);

  if (!menu) {
    return (
      <div className="card empty-state">
        <p>No confirmed menu yet.</p>
        <button className="btn" onClick={() => go("scan")}>Scan a menu</button>
      </div>
    );
  }

  return (
    <div>
      <div className="chip-row" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
        {availableTypes.map((t) => (
          <button key={t} className={`btn ghost ${t === activeType ? "active" : ""}`} onClick={() => setMenuType(t)}>
            {t}
          </button>
        ))}
      </div>
      <input type="text" placeholder="Search dishes..." value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
      <div className="chip-row">
        {ALL_ALLERGENS.map((a) => (
          <button
            key={a}
            className={`toggle-chip ${allergenFilter === a ? "active" : ""}`}
            onClick={() => setAllergenFilter(allergenFilter === a ? "" : a)}
          >
            {a}
          </button>
        ))}
      </div>
      <p className="tiny muted" style={{ marginBottom: 10 }}>{activeType} · v{menu.versionNumber} · effective {menu.effectiveDate}</p>

      {menu.sections.map((section) => {
        const dishVersions = section.dishVersionIds.map((id) => data.dishVersions[id]).filter(Boolean);
        const filtered = dishVersions.filter((dv) => {
          if (q && !`${dv.displayName} ${dv.description}`.toLowerCase().includes(q.toLowerCase())) return false;
          if (allergenFilter && !allergensForComponents(dv.components || []).includes(allergenFilter)) return false;
          return true;
        });
        if (filtered.length === 0) return null;
        return (
          <div key={section.id} className="card" style={{ marginBottom: 12 }}>
            <p className="section-title">{section.name}</p>
            {filtered.map((dv) => {
              const change = changeByDishVersion[dv.id];
              const allergens = allergensForComponents(dv.components || []);
              return (
                <div key={dv.id} className="dish-row clickable" onClick={() => go("dish", { dishId: dv.dishId, fromTab: "menus" })}>
                  <div>
                    <div className="dish-name">
                      <Highlight text={dv.displayName} query={q} />{" "}
                      {change?.changeType === "Added item" && <span className="pill green">New</span>}
                      {change && change.changeType !== "Added item" && <span className="pill brass">Changed</span>}
                    </div>
                    <div className="dish-desc"><Highlight text={dv.description} query={q} /></div>
                    {allergens.length > 0 && (
                      <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {allergens.map((a) => <span key={a} className="pill wine">{a}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="muted small">{dv.price != null ? `$${dv.price}` : ""}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

const IMPORTANCE_PILL = { High: "wine", Medium: "brass", Low: "neutral" };

function ChangeCard({ change, data, go, onConfirm, onSplit, onIgnore }) {
  const dish = data.dishes[change.dishId];
  return (
    <div className="dish-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
        <div>
          <span className="dish-name">{dish?.canonicalName || "Unknown dish"}</span>{" "}
          <span className="pill neutral">{change.changeType}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <span className={`pill ${IMPORTANCE_PILL[change.serviceImportance] || "neutral"}`}>Service: {change.serviceImportance}</span>
        </div>
      </div>
      {change.oldValue && <div className="small muted">Previous: {change.oldValue}</div>}
      {change.newValue && <div className="small muted">Current: {change.newValue}</div>}
      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
        {change.explanation.map((line, i) => <li key={i} className="small"><HighlightedLine line={line} /></li>)}
      </ul>
      <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span className="tiny muted">Confidence {Math.round(change.confidence * 100)}% · Training: {change.trainingPriority}</span>
        {change.reviewStatus === "needs_review" && onConfirm && (
          <>
            <button className="btn accent" onClick={() => onConfirm(change.id)}>Same dish</button>
            <button className="btn secondary" onClick={() => onSplit(change.id)}>New dish</button>
            <button className="btn ghost" onClick={() => onIgnore(change.id, "ocr_error")}>OCR error</button>
            <button className="btn ghost" onClick={() => onIgnore(change.id, "ignored")}>Ignore</button>
          </>
        )}
        {change.reviewStatus === "needs_review" && !onConfirm && (
          <span className="pill brass">Needs master review</span>
        )}
        {change.reviewStatus !== "needs_review" && (
          <span className="pill green">{change.reviewStatus === "confirmed" ? "Confirmed" : change.reviewStatus}</span>
        )}
        {change.newVersionId && (
          <a className="link tiny" onClick={() => go("dish", { dishId: change.dishId, fromTab: "menus" })}>View dish</a>
        )}
      </div>
    </div>
  );
}

function ChangesTab({ go, data, update, initialMenuId, isMaster }) {
  const sortedMenus = useMemo(() => [...data.menus].sort((a, b) => b.uploadDate.localeCompare(a.uploadDate)), [data.menus]);
  const [menuId, setMenuId] = useState(initialMenuId || sortedMenus[0]?.id);
  const menu = data.menus.find((m) => m.id === menuId) || sortedMenus[0];
  const [filter, setFilter] = useState("All");

  const changes = useMemo(() => (menu ? data.changes.filter((c) => c.menuId === menu.id) : []), [data.changes, menu]);
  const counts = {
    All: changes.length,
    Added: changes.filter((c) => c.changeType === "Added item").length,
    Changed: changes.filter((c) => !["Added item", "Removed item"].includes(c.changeType)).length,
    Removed: changes.filter((c) => c.changeType === "Removed item").length,
  };
  const filtered = changes.filter((c) => {
    if (filter === "All") return true;
    if (filter === "Added") return c.changeType === "Added item";
    if (filter === "Removed") return c.changeType === "Removed item";
    return !["Added item", "Removed item"].includes(c.changeType);
  });

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
      <div className="card" style={{ marginBottom: 12 }}>
        <select value={menuId} onChange={(e) => setMenuId(e.target.value)}>
          {sortedMenus.map((m) => (
            <option key={m.id} value={m.id}>{m.menuType} v{m.versionNumber} — {m.effectiveDate}</option>
          ))}
        </select>
      </div>
      <div className="chip-row">
        {Object.entries(counts).map(([label, n]) => (
          <button key={label} className={`btn ghost ${filter === label ? "active" : ""}`} onClick={() => setFilter(label)}>
            {label} {n}
          </button>
        ))}
      </div>
      <div className="card">
        {filtered.length === 0 && <p className="muted small">No changes in this category.</p>}
        {filtered.map((c) => (
          <ChangeCard
            key={c.id}
            change={c}
            data={data}
            go={go}
            onConfirm={isMaster ? doConfirm : undefined}
            onSplit={isMaster ? doSplit : undefined}
            onIgnore={isMaster ? doIgnore : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function HistoryTab({ go, data }) {
  const [openId, setOpenId] = useState(null);
  const sorted = useMemo(() => [...data.menus].sort((a, b) => b.uploadDate.localeCompare(a.uploadDate)), [data.menus]);

  if (sorted.length === 0) {
    return (
      <div className="card empty-state">
        <p>No menu history yet.</p>
        <button className="btn" onClick={() => go("scan")}>Scan a menu</button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="timeline">
        {sorted.map((m, i) => {
          const changeCount = data.changes.filter((c) => c.menuId === m.id).length;
          const open = openId === m.id;
          return (
            <div key={m.id} className="timeline-item">
              <div className={`timeline-dot ${i === 0 ? "current" : ""}`} />
              <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpenId(open ? null : m.id)}>
                <div>
                  <div className="dish-name" style={{ fontSize: 13.5 }}>{m.menuType} v{m.versionNumber}</div>
                  <div className="tiny muted">Effective {m.effectiveDate} {i === 0 && <span className="pill brass">Current</span>}</div>
                </div>
                <a className="link tiny" onClick={(e) => { e.stopPropagation(); go("menus", { subTab: "changes", menuId: m.id }); }}>
                  {changeCount} changes
                </a>
              </div>
              {open && (
                <div style={{ marginTop: 8 }}>
                  {m.photos?.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      {m.photos.map((p, idx) => (
                        <img key={idx} src={p} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                      ))}
                    </div>
                  )}
                  {m.sections.map((s) => (
                    <div key={s.id} style={{ marginBottom: 8 }}>
                      <div className="small" style={{ fontWeight: 700 }}>{s.name}</div>
                      {s.dishVersionIds.map((id) => {
                        const dv = data.dishVersions[id];
                        if (!dv) return null;
                        return (
                          <div key={id} className="tiny muted">
                            {dv.displayName} — {dv.description}{dv.price != null ? ` ($${dv.price})` : ""}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyMenus({ go, params }) {
  const { data, update, isMaster } = useData();
  const [subTab, setSubTab] = useState(params?.subTab === "changes" ? "Changes" : params?.subTab === "history" ? "History" : "Current Menu");

  return (
    <div>
      <div className="segmented" style={{ marginBottom: 14 }}>
        {SUB_TABS.map((t) => (
          <button key={t} className={subTab === t ? "active" : ""} onClick={() => setSubTab(t)}>{t}</button>
        ))}
      </div>
      {subTab === "Current Menu" && <CurrentMenuTab go={go} data={data} />}
      {subTab === "Changes" && <ChangesTab go={go} data={data} update={update} initialMenuId={params?.menuId} isMaster={isMaster} />}
      {subTab === "History" && <HistoryTab go={go} data={data} />}
    </div>
  );
}
