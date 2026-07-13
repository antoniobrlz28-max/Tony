import { Landmark, PiggyBank, Banknote, Home, Zap, Droplet, Wifi, Phone, Repeat, Shield, MoreHorizontal } from "lucide-react";

export const STORAGE_KEY = "antonio-finance-data";

// LifeOS signature palette (from the Master Blueprint v0.1 "Signature palette"
// table — the authoritative source). Near-black surfaces, azure primary, and a
// seven-color domain spectrum. The full gradient (SPECTRUM) is reserved for the
// Orbit ring and hero moments — never button fills.
export const INK = "#050811";        // page background (Base)
export const INK_SOFT = "#5A6577";   // hairlines, muted strokes
export const CARD = "#0D1422";       // raised cards
export const TEXT = "#F2F4F8";
export const PAPER = "#F7F9FC";      // text on colored buttons
export const PAPER_DIM = "#151E2E";  // inset rows / wells
export const ACCENT = "#3186FF";     // Blue — primary
export const RUST = "#FF646F";       // danger / owed / leaving
export const SAGE = "#18D79B";       // Green — positive / held / habits domain
export const SLATE = "#96A2B5";      // secondary text

// Domain colors (LifeOS grammar: every badge/chart inherits its domain color)
export const CYAN = "#08D9D0";       // Focus
export const AMBER = "#FFC83D", AMBER_BG = "#2B2308";   // Finance domain / calories
export const CORAL = "#FF7165", CORAL_BG = "#331A16";   // Health domain
export const VIOLET = "#895CFF", VIOLET_BG = "#1B1638"; // Mind domain
export const MAGENTA = "#EF4FC5";    // Purpose
export const LIME = "#A3E635";       // Energy
export const TEAL = "#08D9D0", TEAL_BG = "#08211F";     // training accents (cyan family)
export const SKY = "#08D9D0";        // legacy alias — now cyan

// The Orbit gradient: blue → cyan → green → amber → coral → magenta → violet
export const SPECTRUM = ["#3186FF", "#08D9D0", "#18D79B", "#FFC83D", "#FF7165", "#EF4FC5", "#895CFF"];

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
