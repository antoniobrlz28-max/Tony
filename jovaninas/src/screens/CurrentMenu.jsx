import { useMemo, useState } from "react";
import { useData } from "../lib/context.jsx";
import { MENU_TYPES } from "../lib/storage.js";
import { allergensForComponents } from "../lib/components.js";
import { oneLineDescription } from "../lib/descriptions.js";

export default function CurrentMenu({ go }) {
  const { data } = useData();
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

  const changesForMenu = useMemo(
    () => (menu ? data.changes.filter((c) => c.menuId === menu.id) : []),
    [data.changes, menu]
  );
  const changeByDishVersion = useMemo(() => {
    const map = {};
    for (const c of changesForMenu) if (c.newVersionId) map[c.newVersionId] = c;
    return map;
  }, [changesForMenu]);

  const allAllergens = ["gluten", "dairy", "tree nuts", "peanut", "shellfish", "fish", "egg", "soy", "sesame"];

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
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {availableTypes.map((t) => (
            <button
              key={t}
              className={`btn ${t === activeType ? "" : "ghost"}`}
              onClick={() => setMenuType(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid cols-2">
          <input type="text" placeholder="Search dishes..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={allergenFilter} onChange={(e) => setAllergenFilter(e.target.value)}>
            <option value="">Filter by allergen...</option>
            {allAllergens.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <p className="tiny muted" style={{ marginTop: 8 }}>
          {activeType} · v{menu.versionNumber} · effective {menu.effectiveDate}
        </p>
      </div>

      {menu.sections.map((section) => {
        const dishVersions = section.dishVersionIds.map((id) => data.dishVersions[id]).filter(Boolean);
        const filtered = dishVersions.filter((dv) => {
          if (q && !`${dv.displayName} ${dv.description}`.toLowerCase().includes(q.toLowerCase())) return false;
          if (allergenFilter) {
            const allergens = allergensForComponents(dv.components || []);
            if (!allergens.includes(allergenFilter)) return false;
          }
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
                <div key={dv.id} className="dish-row" style={{ cursor: "pointer" }} onClick={() => go("dish", { dishId: dv.dishId, fromTab: "menu" })}>
                  <div>
                    <div className="dish-name">
                      {dv.displayName}{" "}
                      {change?.changeType === "Added item" && <span className="pill olive">New</span>}
                      {change && change.changeType !== "Added item" && <span className="pill gold">Changed</span>}
                    </div>
                    <div className="dish-desc">{dv.description}</div>
                    {allergens.length > 0 && (
                      <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {allergens.map((a) => (
                          <span key={a} className="pill red">{a}</span>
                        ))}
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
