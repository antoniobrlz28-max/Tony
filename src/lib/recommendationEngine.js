import { computeInsights } from "./insightEngine.js";
import { todayStr } from "./helpers.js";

// Recommendation engine (Blueprint §9): an insight is only useful when it
// produces one feasible, reversible action. This maps each verified insight to
// a concrete recommendation — what to do, why it follows, and which domains it
// touches — and also surfaces a couple of state-based nudges from live data.
// Deterministic; the AI language layer (later) only rephrases these, never
// invents the underlying numbers.

// One recommendation template per insight id. `reason` quotes the evidence.
const FROM_INSIGHT = {
  "drinks-spending": ins => ins.direction === "negative" && ({
    id: "cash-cap",
    title: "Set a cash cap before you go out",
    reason: `${ins.headline}. ${ins.comparison}.`,
    detail: "Bring a fixed amount of cash and leave the card at home on nights you plan to drink.",
    domains: ["Finances", "Health"],
  }),
  "sleep-drinks": ins => ins.direction === "negative" && ({
    id: "wind-down",
    title: "Start a 30-minute wind-down tonight",
    reason: `${ins.headline}. ${ins.comparison}.`,
    detail: "Dim the lights, phone on the charger across the room, aim for lights-out 30 minutes earlier.",
    domains: ["Energy", "Health"],
  }),
  "sleep-identity": ins => ins.direction === "positive" && ({
    id: "protect-sleep",
    title: "Protect a 7-hour sleep window",
    reason: `${ins.headline}. ${ins.comparison}.`,
    detail: "Pick a fixed lights-out time tonight and hold it — your best days follow your longest nights.",
    domains: ["Energy", "Mind"],
  }),
  "training-identity": ins => ins.direction === "positive" && ({
    id: "train-today",
    title: "Get today's training in",
    reason: `${ins.headline}. ${ins.comparison}.`,
    detail: "Even a short session counts — the identity lift shows up on days you move.",
    domains: ["Health", "Mind"],
  }),
  "fasting-spending": ins => ins.direction === "positive" && ({
    id: "fast-window",
    title: "Run a fasting window today",
    reason: `${ins.headline}. ${ins.comparison}.`,
    detail: "Your fasting days also tend to be your cheaper days — a two-for-one worth repeating.",
    domains: ["Health", "Finances"],
  }),
};

// One recommendation at a time, chosen by priority. Returns null when nothing
// clears the evidence bar — the honest empty state, not filler.
export function computeRecommendation(data, asOf = todayStr()) {
  const insights = computeInsights(data, asOf);
  for (const ins of insights) {
    const make = FROM_INSIGHT[ins.id];
    const rec = make && make(ins);
    if (rec) return { ...rec, sourceInsightId: ins.id, confidence: ins.confidence };
  }
  return null;
}
