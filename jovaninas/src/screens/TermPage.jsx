// Glossary term page (placeholder)
export default function TermPage({ go, params }) {
  return (
    <div>
      <button className="btn ghost" style={{ marginBottom: 12 }} onClick={() => go(params?.fromTab || "library")}>
        ← Back
      </button>
      <p className="section-title">{params?.term || "Term"}</p>
      <p className="small muted">Term details coming soon.</p>
    </div>
  );
}
