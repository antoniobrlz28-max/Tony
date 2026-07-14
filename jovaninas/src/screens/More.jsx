import { useMemo, useRef, useState } from "react";
import { Download, Upload, Trash2, Users, Compass, KeyRound } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { saveData, resetData, emptyData } from "../lib/storage.js";
import MasterGate from "../lib/MasterGate.jsx";
import JovaninaMark from "../components/JovaninaMark.jsx";

const SUB_TABS = ["Notes", "Settings", "Profile", "Team", "Roadmap"];

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
          const label = dish?.canonicalName || (n.entityType === "term" ? n.entityId : n.entityType);
          return (
            <div key={n.id} className="dish-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="dish-name" style={{ fontSize: 13, textTransform: n.entityType === "term" ? "capitalize" : "none" }}>{label}</span>
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
  const { pinIsSet, clearMasterPin } = useData();
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
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="section-title" style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <KeyRound size={12} /> Master access
        </p>
        <p className="small muted">
          {pinIsSet
            ? "This device is protected by a master PIN (set from the lock icon at the top of the app). Anyone without it can view everything but can't edit."
            : "No master PIN set yet — this device is currently unlocked for everyone. Tap the lock icon at the top of the app to set one."}
        </p>
        {pinIsSet && (
          <MasterGate message="Unlock master access to change or remove the PIN.">
            <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => confirm("Remove the master PIN? This device will be unlocked for everyone until you set a new one.") && clearMasterPin()}>
              Remove master PIN
            </button>
          </MasterGate>
        )}
        <p className="tiny muted" style={{ marginTop: 8 }}>
          This is a device-level convenience lock, not real account security — there's no "forgot PIN" recovery
          short of restoring from an exported backup.
        </p>
      </div>

      <div className="card">
        <p className="section-title">Data</p>
        <p className="small muted">
          Everything is stored locally in this browser ({"localStorage"}) — no server, no account (yet — ask about
          connecting a shared cloud database if you want this synced across every phone). Export a backup before
          clearing browser data.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="icon-btn" onClick={exportData}><Download size={13} /> Export JSON</button>
          <MasterGate message="Unlock master access to import data.">
            <button className="icon-btn" onClick={() => fileRef.current?.click()}><Upload size={13} /> Import JSON</button>
          </MasterGate>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={importData} />
        </div>
        <hr className="sep" />
        <p className="section-title">Danger zone</p>
        <MasterGate message="Unlock master access to reset data.">
          <button className="btn danger" onClick={handleReset}><Trash2 size={13} /> Reset all data</button>
        </MasterGate>
      </div>
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
    <div>
      <div className="card empty-state" style={{ marginBottom: 12 }}>
        <div className="seal" style={{ margin: "0 auto 10px" }}><JovaninaMark size={34} /></div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontStyle: "italic", margin: 0 }}>
          "Not to win, but to delight."
        </p>
        <p className="tiny muted" style={{ marginTop: 6 }}>Jovanina's Broken Italian</p>
      </div>
      <div className="card empty-state">
        <Users size={22} color="var(--gold)" />
        <p style={{ marginTop: 8 }}>Shared team workspaces, staff accounts, and role-based access are a planned
        second-stage feature.</p>
        <p className="tiny muted">This build is single-user and stores everything locally in one browser.</p>
      </div>
    </div>
  );
}

const ROADMAP_ITEMS = [
  {
    title: "Ask Chef",
    detail: "Open natural-language Q&A grounded in restaurant knowledge. Needs a live LLM API key — the local search on the Search tab is pattern-matched, not a real conversational assistant.",
  },
  {
    title: "Search by picture",
    detail: "Point a camera at a garnish or plate and identify it. Needs a vision API.",
  },
  {
    title: "Live sync across every phone",
    detail: "Notes, 86 lists, changes, and knowledge scores shared across the whole team in real time on everyone's own device. Needs a hosted database (Supabase is the recommended path) plus a manager login — the master PIN lock works today but only on a single shared device.",
  },
  {
    title: "Chef voice notes",
    detail: "Walk-around voice memos automatically transcribed and attached to dishes. Needs speech-to-text infrastructure; you can already type the same note by hand under a dish's Notes.",
  },
  {
    title: "Service replay / most-asked-questions tracking",
    detail: "Aggregate what guests actually asked about across shifts and staff. Needs multi-user data collection.",
  },
  {
    title: "Knowledge Score + AI Coach",
    detail: "Category-level mastery scoring with pattern detection on missed quiz questions (e.g. \"you keep confusing mostarda / mosto / mortadella\"). Deferred for this build in favor of the wiki, shift brief, and objection/recommendation tools.",
  },
];

function RoadmapTab() {
  return (
    <div>
      <div className="chip-row" style={{ marginBottom: 8 }}>
        <span className="pill brass" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Compass size={11} /> Second stage
        </span>
      </div>
      <div className="card">
        <p className="small muted" style={{ marginBottom: 12 }}>
          These are real parts of the bigger vision, deliberately left out of this build rather than faked — each
          needs infrastructure (a live LLM/vision API, real accounts, a backend) this local-storage app doesn't have.
        </p>
        {ROADMAP_ITEMS.map((item) => (
          <div key={item.title} className="dish-row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div className="dish-name" style={{ fontSize: 13.5 }}>{item.title}</div>
            <div className="dish-desc">{item.detail}</div>
          </div>
        ))}
      </div>
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
      {tab === "Roadmap" && <RoadmapTab />}
    </div>
  );
}
