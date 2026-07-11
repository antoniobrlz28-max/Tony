import { Landmark, PiggyBank, Home, Zap, Droplet, Wifi, Phone, Repeat, Shield, MoreHorizontal } from "lucide-react";

export const STORAGE_KEY = "antonio-finance-data";

export const INK = "#16232E";
export const INK_SOFT = "#7C8CA0";
export const CARD = "#1E2B38";
export const TEXT = "#E9ECEF";
export const PAPER = "#F7F4EC";
export const PAPER_DIM = "#2A333D";
export const GOLD = "#C9A13D";
export const RUST = "#D66C52";
export const SAGE = "#6FA57A";
export const SLATE = "#93A1AF";

// Lively-but-soft palette for the Habits tab
export const TEAL = "#2FA898", TEAL_BG = "#DCF3EF";
export const AMBER = "#E2A13B", AMBER_BG = "#FBEAD0";
export const CORAL = "#E2703B", CORAL_BG = "#FBE0D0";
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
export const VIOLET_BG = "#2A2545";
export const SKY = "#6E9BC9";
