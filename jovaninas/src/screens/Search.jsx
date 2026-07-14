import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { allergensForComponents } from "../lib/components.js";
import { latestDishVersion } from "../lib/menuOps.js";

function activeDishVersions(data) {
  return Object.values(data.dishes)
    .filter((d) => d.status === "active")
    .map((d) => latestDishVersion(data, d.id))
    .filter(Boolean);
}

function runSearch(query, data) {
  const q = query.trim().toLowerCase();
  if (!q) return { kind: "empty" };

  const whatIs = q.match(/^what is ([\w' -]+)\??$/) || q.match(/^teach me (about )?([\w' -]+)$/);
  if (whatIs) {
    const term = (whatIs[1] || whatIs[2]).trim().replace(/^a |^an /, "");
    const hit = Object.values(data.dictionary).find((e) => e.term === term || term.includes(e.term));
    if (hit) return { kind: "term", hit };
  }

  if (/changed (this month|recently|this week)/.test(q)) {
    const days = q.includes("week") ? 7 : 31;
    const cutoff = Date.now() - days * 86400000;
    const changes = data.changes.filter((c) => {
      const menu = data.menus.find((m) => m.id === c.menuId);
      return menu && new Date(menu.uploadDate).getTime() >= cutoff;
    });
    return { kind: "changes", changes };
  }

  const containsMatch = q.match(/contain(?:s|ing)?\s+([\w' -]+)/) || q.match(/with\s+([\w' -]+)$/) || q.match(/use[s]?\s+([\w' -]+)/);
  if (containsMatch) {
    const term = containsMatch[1].trim();
    const dishes = activeDishVersions(data).filter((dv) =>
      (dv.components || []).some((c) => c.normalized.includes(term)) || dv.description.toLowerCase().includes(term)
    );
    return { kind: "dishes", dishes, label: `Dishes containing "${term}"` };
  }

  if (/safe for|avoiding|dairy.?free|gluten.?free|nut.?free/.test(q)) {
    let avoid = null;
    if (q.includes("dairy")) avoid = "dairy";
    else if (q.includes("gluten")) avoid = "gluten";
    else if (q.includes("nut")) avoid = "tree nuts";
    else if (q.includes("shellfish")) avoid = "shellfish";
    if (avoid) {
      const dishes = activeDishVersions(data).filter((dv) => !allergensForComponents(dv.components || []).includes(avoid));
      return { kind: "dishes", dishes, label: `Dishes without ${avoid}` };
    }
  }

  if (/octopus|every version of/.test(q)) {
    const nameMatch = q.replace(/show me every version of( the)?/, "").replace("dish", "").trim();
    const dish = Object.values(data.dishes).find((d) => d.canonicalName.toLowerCase().includes(nameMatch));
    if (dish) return { kind: "dish-history", dishId: dish.id };
  }

  if (/gone up in price|price increase/.test(q)) {
    const changes = data.changes.filter((c) => c.changeType === "Price increased");
    return { kind: "changes", changes };
  }

  const dishes = activeDishVersions(data).filter((dv) => `${dv.displayName} ${dv.description}`.toLowerCase().includes(q));
  const terms = Object.values(data.dictionary).filter((e) => e.term.includes(q) || e.definition?.toLowerCase().includes(q));
  const notes = data.notes.filter((n) => n.content.toLowerCase().includes(q));
  return { kind: "mixed", dishes, terms, notes };
}

export default function Search({ go, params }) {
  const { data } = useData();
  const [q, setQ] = useState(params?.q || "");
  const [chip, setChip] = useState("All");
  const result = useMemo(() => runSearch(q, data), [q, data]);
  const backTab = params?.fromTab || "home";

  const goDish = (dishId) => go("dish", { dishId, fromTab: backTab });

  return (
    <div>
      <a className="link small" onClick={() => go(backTab)} style={{ marginBottom: 10, display: "inline-flex" }}>
        <ArrowLeft size={13} /> Back
      </a>
      <div className="card" style={{ marginBottom: 12 }}>
        <input
          type="text"
          autoFocus
          placeholder='e.g. "what is nduja", "dishes with hazelnuts", "changed this month"'
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {result.kind === "mixed" && (
        <div className="chip-row">
          {["All", "Dishes", "Ingredients", "Notes"].map((c) => (
            <button key={c} className={`btn ghost ${chip === c ? "active" : ""}`} onClick={() => setChip(c)}>{c}</button>
          ))}
        </div>
      )}

      {result.kind === "empty" && <p className="muted">Try a question above.</p>}

      {result.kind === "term" && (
        <div className="card" style={{ cursor: "pointer" }} onClick={() => go("term", { term: result.hit.term, fromTab: backTab })}>
          <h3 style={{ textTransform: "capitalize" }}>{result.hit.term}</h3>
          <p className="small">{result.hit.definition}</p>
          <p className="small" style={{ fontStyle: "italic" }}>{result.hit.guestFriendly}</p>
        </div>
      )}

      {result.kind === "changes" && (
        <div className="card">
          <p className="section-title">{result.changes.length} matching change(s)</p>
          {result.changes.map((c) => (
            <div key={c.id} className="dish-row">
              <div>
                <div className="dish-name" style={{ fontSize: 13.5 }}>{data.dishes[c.dishId]?.canonicalName}</div>
                <div className="dish-desc">{c.changeType}: {c.explanation[0]}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.kind === "dish-history" && (
        <button className="btn" onClick={() => goDish(result.dishId)}>View dish history</button>
      )}

      {result.kind === "dishes" && (
        <div className="card">
          <p className="section-title">{result.label || "Matching dishes"} ({result.dishes.length})</p>
          {result.dishes.map((dv) => (
            <div key={dv.id} className="dish-row" style={{ cursor: "pointer" }} onClick={() => goDish(dv.dishId)}>
              <div>
                <div className="dish-name" style={{ fontSize: 13.5 }}>{dv.displayName}</div>
                <div className="dish-desc">{dv.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {result.kind === "mixed" && (
        <>
          {(chip === "All" || chip === "Dishes") && result.dishes.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <p className="section-title">Dishes</p>
              {result.dishes.map((dv) => (
                <div key={dv.id} className="dish-row" style={{ cursor: "pointer" }} onClick={() => goDish(dv.dishId)}>
                  <div>
                    <div className="dish-name" style={{ fontSize: 13.5 }}>{dv.displayName}</div>
                    <div className="dish-desc">{dv.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {(chip === "All" || chip === "Ingredients") && result.terms.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <p className="section-title">Library terms</p>
              {result.terms.map((t) => (
                <div key={t.term} className="dish-row" style={{ cursor: "pointer" }} onClick={() => go("term", { term: t.term, fromTab: backTab })}>
                  <div>
                    <div className="dish-name" style={{ fontSize: 13.5, textTransform: "capitalize" }}>{t.term}</div>
                    <div className="dish-desc">{t.definition}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {(chip === "All" || chip === "Notes") && result.notes.length > 0 && (
            <div className="card">
              <p className="section-title">Notes</p>
              {result.notes.map((n) => <div key={n.id} className="small" style={{ padding: "4px 0" }}>{n.content}</div>)}
            </div>
          )}
          {result.dishes.length + result.terms.length + result.notes.length === 0 && q && (
            <p className="muted">No matches for "{q}".</p>
          )}
        </>
      )}
    </div>
  );
}
