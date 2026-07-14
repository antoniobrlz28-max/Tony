import { useMemo, useRef, useState } from "react";
import { Download, Upload, Trash2, Users } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { saveData, resetData, emptyData } from "../lib/storage.js";

const SUB_TABS = ["Notes", "Settings", "Profile", "Team"];

function NotesTab({ data }) {
  const [filter, setFilter] = useState("All");
  const noteTypes = useMemo(() => ["All", ...Array.from(new Set(data.notes.map((n) => n.noteType)))], [data.notes]);
  const sorted = useMemo(
    () => [...data.notes].filter((n) => filter === "All" || n.noteType === filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.notes, filter]
  );

  return (
    <div>
      <div className="chip-row" style={{ overflowX: "auto", flexWrap: "nowrap" }}>
        {noteTypes.map((t) => (
          <button key={t} className={`btn ghost ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>
      <div className="card">
        {sorted.length === 0 && <p className="muted small">No notes yet. Add one from any dish page.</p>}
        {sorted.map((n) => {
          const dish = n.entityType === "dish" ? data.dishes[n.entityId] : null;
          return (
            <div key={n.id} className="dish-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="dish-name" style={{ fontSize: 13 }}>{dish?.canonicalName || n.entityType}</span>
                <span className={`pill ${n.confidence === "restaurant-confirmed" ? "green" : "neutral"}`}>{n.confidence}</span>
              </div>
              <div className="small">{n.content}</div>
              <div className="tiny muted">{n.noteType} · {new Date(n.createdAt).toLocaleDateString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsTab({ data, setData }) {
  const fileRef = useRef(null);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jovaninas-menu-intelligence-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        setData({ ...emptyData(), ...parsed });
        saveData(parsed);
        alert("Data imported.");
      } catch (err) {
        alert("Could not read that file: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  function handleReset() {
    if (!confirm("This clears all menus, dishes, changes, notes, and flashcards on this device. This cannot be undone. Continue?")) return;
    resetData();
    setData(emptyData());
  }

  return (
    <div className="card">
      <p className="section-title">Data</p>
      <p className="small muted">
        Everything is stored locally in this browser ({"localStorage"}) — no server, no account. Export a backup
        before clearing browser data.
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button className="icon-btn" onClick={exportData}><Download size={13} /> Export JSON</button>
        <button className="icon-btn" onClick={() => fileRef.current?.click()}><Upload size={13} /> Import JSON</button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={importData} />
      </div>
      <hr className="sep" />
      <p className="section-title">Danger zone</p>
      <button className="btn danger" onClick={handleReset}><Trash2 size={13} /> Reset all data</button>
    </div>
  );
}

function ProfileTab({ data, update }) {
  const [name, setName] = useState(data.settings?.displayName || "");

  function save() {
    update((draft) => {
      draft.settings = draft.settings || {};
      draft.settings.displayName = name.trim();
    });
  }

  return (
    <div className="card">
      <p className="section-title">Profile</p>
      <label className="field">
        Display name (used in Home greeting)
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gina" />
      </label>
      <button className="btn" onClick={save}>Save</button>
    </div>
  );
}

function TeamTab() {
  return (
    <div className="card empty-state">
      <Users size={22} color="var(--brass)" />
      <p style={{ marginTop: 8 }}>Shared team workspaces, staff accounts, and role-based access are a planned
      second-stage feature.</p>
      <p className="tiny muted">This build is single-user and stores everything locally in one browser.</p>
    </div>
  );
}

export default function More() {
  const { data, update, setData } = useData();
  const [tab, setTab] = useState("Notes");

  return (
    <div>
      <div className="segmented" style={{ marginBottom: 14 }}>
        {SUB_TABS.map((t) => <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === "Notes" && <NotesTab data={data} />}
      {tab === "Settings" && <SettingsTab data={data} setData={setData} />}
      {tab === "Profile" && <ProfileTab data={data} update={update} />}
      {tab === "Team" && <TeamTab />}
    </div>
  );
}
