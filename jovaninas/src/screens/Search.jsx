import { useState } from "react";
import { useData } from "../lib/context.jsx";

export default function Search({ go, params }) {
  const { data } = useData();
  const [query, setQuery] = useState(params?.query || "");

  // Search across all food menu items
  const results = [];
  if (query.trim().length > 1) {
    const q = query.toLowerCase();
    for (const menu of data.menus || []) {
      for (const section of menu.sections || []) {
        for (const item of section.items || []) {
          if (
            item.name?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q)
          ) {
            results.push({ menu, section, item });
          }
        }
      }
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <button className="btn ghost" onClick={() => go(params?.fromTab || "home")}>←</button>
        <input
          type="search"
          placeholder="Search dishes, ingredients…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1 }}
          autoFocus
        />
      </div>
      {query.trim().length > 1 && results.length === 0 && (
        <p className="small muted">No results for "{query}".</p>
      )}
      {results.map(({ menu, section, item }, i) => (
        <div key={i} className="card" style={{ marginBottom: 8 }}>
          <p className="small" style={{ fontWeight: 700, margin: 0 }}>{item.name}</p>
          {item.description && <p className="tiny muted" style={{ margin: 0 }}>{item.description}</p>}
          <p className="tiny muted" style={{ marginTop: 4 }}>
            {section.name} · {menu.effectiveDate || menu.savedAt?.slice(0, 10)}
          </p>
        </div>
      ))}
    </div>
  );
}
