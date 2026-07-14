import { useState } from "react";
import {
  Home as HomeIcon,
  ScanLine,
  BookMarked,
  GraduationCap,
  Library as LibraryIcon,
  MoreHorizontal,
  Search as SearchIcon,
} from "lucide-react";
import { DataProvider } from "./lib/context.jsx";
import Home from "./screens/Home.jsx";
import Scan from "./screens/Scan.jsx";
import MyMenus from "./screens/MyMenus.jsx";
import DishPage from "./screens/DishPage.jsx";
import Library from "./screens/Library.jsx";
import Learn from "./screens/Learn.jsx";
import Search from "./screens/Search.jsx";
import More from "./screens/More.jsx";

const TABS = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "scan", label: "Scan", icon: ScanLine },
  { id: "menus", label: "My Menus", icon: BookMarked },
  { id: "learn", label: "Learn", icon: GraduationCap },
  { id: "library", label: "Library", icon: LibraryIcon },
  { id: "more", label: "More", icon: MoreHorizontal },
];

export default function App() {
  const [route, setRoute] = useState({ screen: "home", params: {} });

  const go = (screen, params = {}) => setRoute({ screen, params });

  const activeTab = route.screen === "dish" || route.screen === "search"
    ? route.params.fromTab || "home"
    : route.screen;

  return (
    <DataProvider>
      <div className="app-shell">
        <div className="topbar">
          <div className="monogram">JJ</div>
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
                <Icon size={19} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </DataProvider>
  );
}
