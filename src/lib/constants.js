import { Landmark, PiggyBank, Home, Zap, Droplet, Wifi, Phone, Repeat, Shield, MoreHorizontal } from "lucide-react";

export const STORAGE_KEY = "antonio-finance-data";

// Near-black, cool-toned dark palette with an electric blue primary accent.
export const INK = "#0B0F15";        // page background
export const INK_SOFT = "#6E7A8A";   // hairlines, muted strokes
export const CARD = "#151A22";       // raised cards
export const TEXT = "#F2F4F8";
export const PAPER = "#F5F7FA";      // text on colored buttons
export const PAPER_DIM = "#1D242E";  // inset rows / wells
export const ACCENT = "#4D9FFF";     // primary accent (buttons, active nav, highlights)
export const RUST = "#E25C5C";       // negative / owed / leaving
export const SAGE = "#57C785";       // positive / held / gained
export const SLATE = "#8B94A3";      // secondary text

// Habit-tab accents (badges filled with the color; _BG is the dark unfilled tint)
export const TEAL = "#2FA898", TEAL_BG = "#123430";
export const AMBER = "#E2A13B", AMBER_BG = "#3A2C12";
export const CORAL = "#E2703B", CORAL_BG = "#3A2112";
export const ABSTINENCE_COLORS = ["#A8264F", "#2C3E42", "#1F8A70", "#5B4636", "#C0392B", "#2A3F8F", "#6B4E9C", "#3D6B4F"];
export const ACCOUNT_TYPES = [
  { id: "checking", label: "Checking", icon: Landmark },
  { id: "savings", label: "Savings", icon: PiggyBank },
];
export const BILL_TEMPLATES = ["Rent", "Electricity", "Water", "Internet", "Phone", "Subscription", "Insurance"];
export const BILL_ICONS = {
  Rent: Home, Electricity: Zap, Water: Droplet, Internet: Wifi, Phone: Phone,
  Subscription: Repeat, Insurance: Shield, Other: MoreHorizontal,
};
export const VIOLET = "#8D7CF0";
export const VIOLET_BG = "#241F3D";
export const SKY = "#7FB3E8";
