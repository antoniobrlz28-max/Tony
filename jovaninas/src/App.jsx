import { useState } from "react";
import {
  Home as HomeIcon,
  ScanLine,
  BookMarked,
  GraduationCap,
  Library as LibraryIcon,
  MoreHorizontal,
  Search as SearchIcon,
  Lock,
  Unlock,
} from "lucide-react";
import { DataProvider, useData } from "./lib/context.jsx";
import JovaninaMark from "./components/JovaninaMark.jsx";
import Home from "./screens/Home.jsx";
import Scan from "./screens/Scan.jsx";
import MyMenus from "./screens/MyMenus.jsx";
import DishPage from "./screens/DishPage.jsx";
import TermPage from "./screens/TermPage.jsx";
import Library from "./screens/Library.jsx";
import Learn from "./screens/Learn.jsx";
import Search from "./screens/Search.jsx";
import More from "./screens/More.jsx";

const TABS = [
  { id: "home", label: "Brief", icon: HomeIcon },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "menus", label: "My Menus", icon: BookMarked },
  { id: "learn", label: "Learn", icon: GraduationCap },
  { id: "library", label: "Library", icon: LibraryIcon },
  { id: "more", label: "More", icon: MoreHorizontal },
];

function LockControl() {
  const { isMaster, pinIsSet, unlockMaster, lockMaster, setMasterPin } = useData();
  const [modal, setModal] = useState(null); // null | "set" | "unlock"
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  function openModal() {
    setPin("");
    setConfirmPin("");
    setError("");
    if (isMaster && pinIsSet) {
      lockMaster();
      return;
    }
    setModal(pinIsSet ? "unlock" : "set");
  }

  async function submit() {
    if (modal === "set") {
      if (pin.length < 4) return setError("Use at least 4 digits.");
      if (pin !== confirmPin) return setError("PINs don't match.");
      await setMasterPin(pin);
      setModal(null);
    } else {
      const ok = await unlockMaster(pin);
      if (!ok) return setError("Incorrect PIN.");
      setModal(null);
    }
  }

  return (
    <>
      <button className="icon-btn" onClick={openModal} title={isMaster ? "Lock this device" : "Unlock master access"}>
        {isMaster ? <Unlock size={14} /> : <Lock size={14} />}
      </button>
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(30,26,15,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="card" style={{ width: "min(320px, 86vw)" }}>
            <p className="section-title">{modal === "set" ? "Set a master PIN" : "Enter master PIN"}</p>
            <p className="tiny muted" style={{ marginBottom: 10 }}>
              {modal === "set"
                ? "This device-level PIN unlocks editing. Anyone without it can view but not change anything."
                : "Unlock to add, confirm changes, 86 items, or edit the library."}
            </p>
            <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" style={{ marginBottom: 8 }} autoFocus />
            {modal === "set" && (
              <input type="password" inputMode="numeric" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} placeholder="Confirm PIN" style={{ marginBottom: 8 }} />
            )}
            {error && <p className="small" style={{ color: "var(--red)", marginBottom: 8 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn ghost" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn" onClick={submit} style={{ flex: 1 }}>{modal === "set" ? "Save" : "Unlock"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AppShell() {
  const [route, setRoute] = useState({ screen: "home", params: {} });

  const go = (screen, params = {}) => setRoute({ screen, params });

  const activeTab = route.screen === "dish" || route.screen === "search" || route.screen === "term"
    ? route.params.fromTab || "home"
    : route.screen;

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="monogram"><JovaninaMark size={26} /></div>
        <div className="brand" style={{ flex: 1 }}>
          <div className="name">Jovanina's</div>
          <div className="tag">Broken Italian</div>
        </div>
        <LockControl />
        <button className="icon-btn" onClick={() => go("search", { fromTab: activeTab })}>
          <SearchIcon size={14} />
        </button>
      </div>
      <main className="content">
        {route.screen === "home" && <Home go={go} />}
        {route.screen === "scan" && <Scan go={go} />}
        {route.screen === "menus" && <MyMenus go={go} params={route.params} />}
        {route.screen === "learn" && <Learn go={go} params={route.params} />}
        {route.screen === "library" && <Library go={go} />}
        {route.screen === "more" && <More go={go} />}
        {route.screen === "search" && <Search go={go} params={route.params} />}
        {route.screen === "dish" && <DishPage go={go} params={route.params} />}
        {route.screen === "term" && <TermPage go={go} params={route.params} />}
      </main>
      <nav className="bottom-nav">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={activeTab === t.id ? "active" : ""}
              onClick={() => go(t.id)}
            >
              <span className="nav-icon"><Icon size={18} /></span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}
