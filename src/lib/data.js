import { uid, addDays, todayStr } from "./helpers.js";
import { ABSTINENCE_COLORS } from "./constants.js";

export function defaultData() {
  return {
    accounts: [{ id: uid(), name: "Checking", balance: 0, type: "checking" }],
    categories: [
      { id: "cat_rent", name: "Rent", percent: 30 },
      { id: "cat_ess", name: "Essentials", percent: 30 },
      { id: "cat_disc", name: "Discretionary", percent: 20 },
      { id: "cat_sav", name: "Savings", percent: 20 },
    ],
    transactions: [],
    bills: [],
    goals: [],
    debts: [],
    habits: [],
    foodItems: [],
    abstinence: [],
    weeklyReviews: [],
    goalWeight: 80,
    nextPaycheck: "2026-07-17",
    cycleDays: 14,
    fixedRent: 820,
  };
}

export function generateDemoData() {
  const today = todayStr();
  const d = n => addDays(today, n);
  const rand = (min, max) => Math.round(min + Math.random() * (max - min));

  const accounts = [
    { id: uid(), name: "Checking", balance: 340.15, type: "checking" },
    { id: uid(), name: "Savings", balance: 620, type: "savings" },
  ];
  const categories = [
    { id: uid(), name: "Rent", percent: 30 },
    { id: uid(), name: "Essentials", percent: 30 },
    { id: uid(), name: "Discretionary", percent: 25 },
    { id: uid(), name: "Savings", percent: 15 },
  ];
  const [rentCat, essCat, discCat] = categories;
  const checkingId = accounts[0].id;

  // Modeled on ~4 months of real statement patterns (anonymized, rescaled): irregular
  // paycheck amounts, a recurring transfer that functions as rent, and frequent small
  // discretionary spend (rideshare, dining/bars, convenience store, ATM cash) plus a
  // handful of recurring subscriptions. Two pay periods so "vs avg spend" has prior data.
  const transactions = [];
  const diningSpots = ["Taco spot", "Late-night diner", "Coffee shop", "Bar tab", "Pizza place", "Sushi counter"];
  const rideshareNotes = ["Rideshare - night out", "Rideshare - airport", "Rideshare - home"];
  const subscriptions = [
    { note: "Streaming service", amount: 15.99 },
    { note: "AI tool subscription", amount: 20 },
    { note: "Phone bill", amount: 65 },
    { note: "Internet", amount: 60 },
  ];

  for (const offset of [-6, -20]) {
    // Irregular income - two uneven paychecks per period, not a flat number
    transactions.push({ id: uid(), type: "income", amount: rand(650, 1150), accountId: checkingId, date: d(offset), note: "Paycheck" });
    transactions.push({ id: uid(), type: "income", amount: rand(550, 1000), accountId: checkingId, date: d(offset + 7), note: "Paycheck" });
    // Recurring large transfer out that functions as rent
    transactions.push({ id: uid(), type: "expense", amount: 820, accountId: checkingId, categoryId: rentCat.id, date: d(offset), note: "Rent transfer" });
    // Groceries / gas / essentials
    transactions.push({ id: uid(), type: "expense", amount: rand(60, 110), accountId: checkingId, categoryId: essCat.id, date: d(offset + 1), note: "Groceries" });
    transactions.push({ id: uid(), type: "expense", amount: rand(30, 55), accountId: checkingId, categoryId: essCat.id, date: d(offset + 5), note: "Gas" });
    transactions.push({ id: uid(), type: "expense", amount: rand(10, 25), accountId: checkingId, categoryId: essCat.id, date: d(offset + 9), note: "Convenience store" });
    // High-frequency small discretionary spend: rideshare, dining/bars, cash
    for (let i = 0; i < 5; i++) {
      transactions.push({ id: uid(), type: "expense", amount: rand(8, 45), accountId: checkingId, categoryId: discCat.id, date: d(offset + rand(0, 13)), note: diningSpots[rand(0, diningSpots.length - 1)] });
    }
    for (let i = 0; i < 2; i++) {
      transactions.push({ id: uid(), type: "expense", amount: rand(9, 22), accountId: checkingId, categoryId: discCat.id, date: d(offset + rand(0, 13)), note: rideshareNotes[rand(0, rideshareNotes.length - 1)] });
    }
    transactions.push({ id: uid(), type: "expense", amount: rand(20, 60), accountId: checkingId, categoryId: discCat.id, date: d(offset + rand(0, 13)), note: "ATM cash withdrawal" });
  }
  for (const sub of subscriptions) {
    transactions.push({ id: uid(), type: "expense", amount: sub.amount, accountId: checkingId, categoryId: discCat.id, date: d(-rand(1, 27)), note: sub.note });
  }
  transactions.push({ id: uid(), type: "expense", amount: 35, accountId: checkingId, categoryId: essCat.id, date: d(-1), note: "Groceries" });

  const bills = [
    { id: uid(), name: "Phone", amount: 65, dueDate: d(11), frequencyDays: 30, accountId: checkingId, categoryId: essCat.id, lastPaid: d(-19) },
    { id: uid(), name: "Internet", amount: 60, dueDate: d(4), frequencyDays: 30, accountId: checkingId, categoryId: essCat.id, lastPaid: d(-26) },
    { id: uid(), name: "Rent", amount: 820, dueDate: d(8), frequencyDays: 30, accountId: checkingId, categoryId: rentCat.id, lastPaid: d(-6) },
  ];

  const goals = [
    { id: uid(), name: "Emergency cushion", target: 1500, saved: 620 },
    { id: uid(), name: "New laptop", target: 1200, saved: 150 },
  ];

  const debts = [
    {
      id: uid(), name: "Credit card", total: 2400, rate: 22, paid: 500,
      payments: [
        { date: d(-62), amount: 150 },
        { date: d(-33), amount: 175 },
        { date: d(-5), amount: 175 },
      ],
    },
  ];

  // 90 days of procedurally generated habit history — real weekly rhythm, not flat placeholder data.
  // Training Mon/Wed/Fri-ish, fasting Tue/Thu-ish, drinks skew toward weekends, weight trending down,
  // identity score loosely tracking training/drinking that day. This is what populates the heat strip
  // and lets the Monthly grid show real variation when you page back through past months.
  const trainingNotes = ["RDL 3x10", "Incline press 3x10", "Lat pulldown 3x10", "Hip thrust 3x10", "Goblet squat 3x10"];
  const habits = [];
  for (let i = 90; i >= 1; i--) {
    const date = d(-i);
    const dow = new Date(date + "T00:00:00").getDay(); // 0 Sun .. 6 Sat
    const isWeekend = dow === 0 || dow === 6;
    const trained = [1, 3, 5].includes(dow) && Math.random() > 0.2;
    const fasted = [2, 4].includes(dow) && Math.random() > 0.35;
    const alcoholDrinks = isWeekend ? Math.round(Math.random() * 4) : (Math.random() > 0.82 ? 1 : 0);
    const weightTrend = 93.2 - ((90 - i) / 90) * 3.6;
    const weight = Math.round((weightTrend + (Math.random() * 0.6 - 0.3)) * 10) / 10;
    const sleepTime = isWeekend ? "23:45" : "22:45";
    const wakeTime = isWeekend ? "07:30" : "06:15";
    const identityBase = 5 + (trained ? 2 : 0) - alcoholDrinks * 0.8;
    const identityScore = Math.max(1, Math.min(10, Math.round(identityBase + (Math.random() * 2 - 1))));
    habits.push({
      id: uid(), date, trained, weight, sleepTime, wakeTime, alcoholDrinks,
      trainingNote: trained ? trainingNotes[Math.floor(Math.random() * trainingNotes.length)] : "",
      fastingHours: fasted ? 16 : 0, fastingStart: fasted ? "12:00" : null, fastCompleted: fasted,
      identityScore,
    });
  }

  // Today — actively fasting, started 5 hours ago on a 16h fast (demonstrates the live countdown)
  const now = new Date();
  let startH = now.getHours() - 5;
  if (startH < 0) startH += 24;
  const todayFastStart = String(startH).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  habits.push({ id: uid(), date: today, trained: false, weight: 89.6, alcoholDrinks: 0, trainingNote: "", fastingHours: 16, fastingStart: todayFastStart, fastCompleted: false, identityScore: 7 });

  const foodItems = [
    { id: uid(), date: d(-1), name: "Chicken breast", calories: 280, protein: 42, carbs: 0, fat: 8 },
    { id: uid(), date: d(-1), name: "Rice, 1 cup", calories: 205, protein: 4, carbs: 45, fat: 0 },
    { id: uid(), date: d(-2), name: "Salmon fillet", calories: 350, protein: 34, carbs: 0, fat: 22 },
    { id: uid(), date: d(-2), name: "Steamed broccoli", calories: 55, protein: 4, carbs: 11, fat: 0 },
    { id: uid(), date: d(-4), name: "Protein shake", calories: 160, protein: 30, carbs: 6, fat: 2 },
    { id: uid(), date: today, name: "Greek yogurt", calories: 130, protein: 17, carbs: 9, fat: 4 },
  ];

  const abstinence = [
    { id: uid(), name: "Quit Vaping", color: ABSTINENCE_COLORS[2], startedAt: new Date(Date.now() - 12 * 86400000 - 3 * 3600000).toISOString(), history: [4 * 86400] },
    { id: uid(), name: "Quit Drinking", color: ABSTINENCE_COLORS[0], startedAt: new Date(Date.now() - 3 * 86400000).toISOString(), history: [] },
  ];

  const weeklyReviews = [
    {
      id: uid(), date: d(-2),
      wentWell: "Trained 3x, kept drinking to weekends only.",
      wastedTime: "Too much time deciding what to eat instead of using the default meals.",
      proud: "Logged every day this week, even the rough one.",
      hurtDecision: "Skipped Tuesday's fast after a late night.",
      lesson: "Sleep under 6h reliably means more drinks the next weekend.",
      nextFocus: "Get the Sunday meal-prep habit actually running.",
    },
  ];

  return {
    accounts, categories, transactions, bills, goals, debts, habits, foodItems, abstinence, weeklyReviews,
    goalWeight: 80, nextPaycheck: d(3), cycleDays: 14, fixedRent: 820,
  };
}

export function migrate(d) {
  if (!d.categories.some(c => c.name.toLowerCase() === "rent")) {
    d = { ...d, categories: [{ id: uid(), name: "Rent", percent: 0 }, ...d.categories] };
  }
  if (!d.habits) d = { ...d, habits: [] };
  if (d.goalWeight === undefined) d = { ...d, goalWeight: 80 };
  if (!d.abstinence) d = { ...d, abstinence: [] };
  if (!d.weeklyReviews) d = { ...d, weeklyReviews: [] };
  d = { ...d, accounts: d.accounts.map(a => a.type ? a : { ...a, type: "checking" }) };
  if (!d.foodItems) {
    const seeded = d.habits.filter(h => h.calories).map(h => ({
      id: uid(), date: h.date, name: "Logged total (imported)",
      calories: Number(h.calories) || 0, protein: Number(h.protein) || 0, carbs: Number(h.carbs) || 0, fat: Number(h.fat) || 0
    }));
    d = { ...d, foodItems: seeded };
  }
  d = {
    ...d, habits: d.habits.map(h => {
      if (h.alcoholDrinks !== undefined) return h;
      const { alcohol, ...rest } = h;
      return { ...rest, alcoholDrinks: alcohol ? 1 : 0 };
    })
  };
  if (d.fixedRent === undefined) d = { ...d, fixedRent: 820 };
  d = { ...d, debts: d.debts.map(x => x.payments ? x : { ...x, payments: [] }) };
  return d;
}
