// Dish detail page (placeholder)
export default function DishPage({ go, params }) {
  return (
    <div>
      <button className="btn ghost" style={{ marginBottom: 12 }} onClick={() => go(params?.fromTab || "home")}>
        ← Back
      </button>
      <p className="section-title">{params?.name || "Dish"}</p>
      <p className="small muted">Dish details coming soon.</p>
    </div>
  );
}
