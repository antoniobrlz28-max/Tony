import { Landmark, PiggyBank, Banknote, Home, Zap, Droplet, Wifi, Phone, Repeat, Shield, MoreHorizontal } from "lucide-react";

export const STORAGE_KEY = "antonio-finance-data";

// LifeOS palette: near-black surfaces, indigo primary, and a seven-color domain
// spectrum. The full gradient (SPECTRUM) is reserved for the Orbit ring and hero
// moments — never button fills.
export const INK = "#050608";        // page background
export const INK_SOFT = "#5C6678";   // hairlines, muted strokes
export const CARD = "#0D1119";       // raised cards
export const TEXT = "#F2F4F8";
export const PAPER = "#F7F9FC";      // text on colored buttons
export const PAPER_DIM = "#151A26";  // inset rows / wells
export const ACCENT = "#6366F1";     // Electric Blue (indigo) — primary
export const RUST = "#EF4444";       // danger / owed / leaving
export const SAGE = "#10B981";       // Emerald — positive / held / habits domain
export const SLATE = "#98A2B3";      // secondary text

// Domain colors (LifeOS grammar: every badge/chart inherits its domain color)
export const CYAN = "#06B6D4";       // Focus
export const AMBER = "#F59E0B", AMBER_BG = "#2B2008";   // Finance domain / calories
export const CORAL = "#FB7185", CORAL_BG = "#321520";   // Health domain
export const VIOLET = "#8B5CF6", VIOLET_BG = "#1E1636"; // Mind domain
export const MAGENTA = "#D946EF";    // Purpose
export const LIME = "#A3E635";       // Energy
export const TEAL = "#14B8A6", TEAL_BG = "#0D2A26";     // training accents
export const SKY = "#06B6D4";        // legacy alias — now cyan

// The Orbit gradient: blue → cyan → emerald → amber → coral → magenta → violet
export const SPECTRUM = ["#6366F1", "#06B6D4", "#10B981", "#F59E0B", "#FB7185", "#D946EF", "#8B5CF6"];

export const ABSTINENCE_COLORS = ["#A8264F", "#2C3E42", "#1F8A70", "#5B4636", "#C0392B", "#2A3F8F", "#6B4E9C", "#3D6B4F"];
export const ACCOUNT_TYPES = [
  { id: "checking", label: "Checking", icon: Landmark },
  { id: "savings", label: "Savings", icon: PiggyBank },
  { id: "cash", label: "Cash", icon: Banknote },
];
export const BILL_TEMPLATES = ["Rent", "Electricity", "Water", "Internet", "Phone", "Subscription", "Insurance"];
export const BILL_ICONS = {
  Rent: Home, Electricity: Zap, Water: Droplet, Internet: Wifi, Phone: Phone,
  Subscription: Repeat, Insurance: Shield, Other: MoreHorizontal,
};
