import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useData } from "../lib/context.jsx";

function FoodMenuCard({ menu }) {
  const [open, setOpen] = useState(false);
  const itemCount = (menu.sections || []).reduce((n, s) => n + (s.items?.length || 0), 0);
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <button
        className="btn ghost"
        style={{ width: "100%", justifyContent: "space-between" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <span style={{ fontWeight: 600 }}>{menu.effectiveDate || menu.savedAt?.slice(0, 10)}</span>
          <span className="tiny muted" style={{ marginLeft: 8 }}>{itemCount} items</span>
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {(menu.sections || []).map((s, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <p className="small" style={{ fontWeight: 700, marginBottom: 4 }}>{s.name}</p>
              {(s.items || []).map((item, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <p className="small" style={{ margin: 0, fontWeight: 500 }}>{item.name}</p>
                    {item.description && <p className="tiny muted" style={{ margin: 0 }}>{item.description}</p>}
                  </div>
                  {item.price != null && (
                    <p className="small" style={{ color: "var(--forest)", margin: 0, flexShrink: 0, marginLeft: 8 }}>
                      ${item.price}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyMenus({ go, params }) {
  const { data } = useData();
  const menus = data.menus || [];

  return (
    <div>
      <p className="section-title">My Menus</p>
      {menus.length === 0 && (
        <p className="small muted">No menus saved yet. Upload one in the Scan tab.</p>
      )}
      {menus.map((menu) => (
        <FoodMenuCard key={menu.id} menu={menu} />
      ))}
    </div>
  );
}
