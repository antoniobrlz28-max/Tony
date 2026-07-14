import { useState } from "react";
import {
  Home as HomeIcon,
  ScanLine,
  UtensilsCrossed,
  GitCompare,
  History as HistoryIcon,
  BookOpen,
  GraduationCap,
  Search as SearchIcon,
  ChefHat,
} from "lucide-react";
import { DataProvider } from "./lib/context.jsx";
import Home from "./screens/Home.jsx";
import Scan from "./screens/Scan.jsx";
import CurrentMenu from "./screens/CurrentMenu.jsx";
import Changes from "./screens/Changes.jsx";
import DishPage from "./screens/DishPage.jsx";
import HistoryScreen from "./screens/History.jsx";
import Library from "./screens/Library.jsx";
import Learn from "./screens/Learn.jsx";
import Search from "./screens/Search.jsx";

const TABS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "menu", label: "Current Menu", icon: UtensilsCrossed },
  { id: "changes", label: "Changes", icon: GitCompare },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "library", label: "Library", icon: BookOpen },
  { id: "learn", label: "Learn", icon: GraduationCap },
  { id: "search", label: "Search", icon: SearchIcon },
];

export default function App() {
  const [route, setRoute] = useState({ screen: "home", params: {} });

  const go = (screen, params = {}) => setRoute({ screen, params });

  const activeTab = route.screen === "dish" ? (route.params.fromTab || "menu") : route.screen;

  return (
    <DataProvider>
      <div className="app-shell">
        <div className="topbar">
          <div className="brand">
            <div className="name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ChefHat size={20} /> Jovanina's
            </div>
            <div className="tag">Menu Intelligence Engine — Broken Italian</div>
          </div>
        </div>
        <nav className="tabs">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                className={activeTab === t.id ? "active" : ""}
                onClick={() => go(t.id)}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </nav>
        <main className="content">
          {route.screen === "home" && <Home go={go} />}
          {route.screen === "scan" && <Scan go={go} />}
          {route.screen === "menu" && <CurrentMenu go={go} />}
          {route.screen === "changes" && <Changes go={go} params={route.params} />}
          {route.screen === "history" && <HistoryScreen go={go} />}
          {route.screen === "library" && <Library go={go} />}
          {route.screen === "learn" && <Learn go={go} />}
          {route.screen === "search" && <Search go={go} />}
          {route.screen === "dish" && <DishPage go={go} params={route.params} />}
        </main>
      </div>
    </DataProvider>
  );
}
