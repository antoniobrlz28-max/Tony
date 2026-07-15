import { useState } from "react";
import {
  Home as HomeIcon,
  ScanLine,
  BookMarked,
  GraduationCap,
  Library as LibraryIcon,
  MoreHorizontal,
  Search as SearchIcon,
  AlertTriangle,
  X,
} from "lucide-react";
import { DataProvider, useData } from "./lib/context.jsx";
import jovaninaLogo from "./assets/jovanina-logo.png";
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
  { id: "library", label: "Glossary", icon: LibraryIcon },
  { id: "more", label: "More", icon: MoreHorizontal },
];

function SaveErrorBanner() {
  const { saveError, dismissSaveError } = useData();
  if (!saveError) return null;
  return (
    <div style={{ background: "var(--red-bg)", color: "var(--red)", padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1 }}>{saveError}</span>
      <button onClick={dismissSaveError} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", flexShrink: 0 }}>
        <X size={14} />
      </button>
    </div>
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
      <SaveErrorBanner />
      <div className="topbar">
        <div className="monogram" style={{ padding: 0, overflow: "hidden" }}>
          <img
            src={jovaninaLogo}
            alt="Jovanina's"
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.18)" }}
          />
        </div>
        <div className="brand" style={{ flex: 1 }}>
          <div className="name">Jovanina's</div>
          <div className="tag">Broken Italian</div>
        </div>
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
