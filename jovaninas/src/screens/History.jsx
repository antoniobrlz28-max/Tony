import { useMemo, useState } from "react";
import { useData } from "../lib/context.jsx";

export default function History({ go }) {
  const { data } = useData();
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
      <p className="section-title">Menu timeline</p>
      {sorted.map((m) => {
        const changeCount = data.changes.filter((c) => c.menuId === m.id).length;
        const open = openId === m.id;
        return (
          <div key={m.id} className="dish-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpenId(open ? null : m.id)}>
              <div>
                <div className="dish-name">{m.menuType} v{m.versionNumber}</div>
                <div className="dish-desc">Effective {m.effectiveDate} · uploaded {new Date(m.uploadDate).toLocaleString()}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span className="pill neutral">{changeCount} changes</span>
                <a className="link small" onClick={(e) => { e.stopPropagation(); go("changes", { menuId: m.id }); }}>Briefing</a>
              </div>
            </div>
            {open && (
              <div style={{ marginTop: 8 }}>
                {m.photos?.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {m.photos.map((p, i) => (
                      <img key={i} src={p} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
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
  );
}
