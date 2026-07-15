import { useState } from "react";
import { useData } from "../lib/context.jsx";

export default function More({ go }) {
  const { update } = useData();
  const [confirmClear, setConfirmClear] = useState(false);

  function clearAllData() {
    update((draft) => {
      draft.menus = [];
      draft.wineMenus = [];
      draft.profiles = [];
    });
    setConfirmClear(false);
  }

  return (
    <div>
      <p className="section-title">More</p>
      <div className="card" style={{ marginBottom: 10 }}>
        <p className="small" style={{ fontWeight: 600, marginBottom: 8 }}>Data</p>
        {!confirmClear ? (
          <button className="btn ghost" style={{ width: "100%" }} onClick={() => setConfirmClear(true)}>
            Clear all saved menus
          </button>
        ) : (
          <div>
            <p className="small" style={{ color: "var(--red)", marginBottom: 8 }}>
              This will permanently delete all saved menus and wine lists. Cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button className="btn danger" style={{ flex: 1 }} onClick={clearAllData}>
                Yes, clear all
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
