import { useData } from "../lib/context.jsx";

export default function Library({ go }) {
  const { data } = useData();
  const dict = data.dictionary || {};
  const terms = Object.values(dict).sort((a, b) => a.term?.localeCompare(b.term));

  return (
    <div>
      <p className="section-title">Glossary</p>
      {terms.length === 0 && <p className="small muted">No terms yet.</p>}
      {terms.map((entry) => (
        <div key={entry.term} className="card" style={{ marginBottom: 8 }}>
          <p className="small" style={{ fontWeight: 700, margin: 0 }}>{entry.term}</p>
          {entry.category && <span className="pill neutral" style={{ fontSize: 11, marginTop: 4 }}>{entry.category}</span>}
          <p className="small muted" style={{ marginTop: 4 }}>{entry.definition}</p>
        </div>
      ))}
    </div>
  );
}
