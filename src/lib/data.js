import { uid, addDays, todayStr } from "./helpers.js";
import { ABSTINENCE_COLORS } from "./constants.js";

export function defaultData() {
  return {
    accounts: [{ id: uid(), name: "Checking", balance: 0, type: "checking" }],
    // Rent is dollar-anchored (fixedRent); its percent is derived live, never stored.
    // The other percents are shares of the income LEFT AFTER rent, and sum to 100.
    categories: [
      { id: "cat_rent", name: "Rent", percent: 0 },
      { id: "cat_groc", name: "Groceries", percent: 10 },
      { id: "cat_ess", name: "Essentials", percent: 12 },
      { id: "cat_disc", name: "Discretionary", percent: 58 },
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
    calorieTarget: 2200,
    nextPaycheck: "2026-07-17",
    cycleDays: 14,
    fixedRent: 1650,
  };
}

export function generateDemoData() {
  const today = todayStr();
  const d = n => addDays(today, n);
  const rand = (min, max) => Math.round(min + Math.random() * (max - min));

  const accounts = [
    { id: uid(), name: "Checking", balance: 470, type: "checking" },
    { id: uid(), name: "Savings", balance: 150, type: "savings" },
  ];
  const categories = [
    { id: uid(), name: "Rent", percent: 0 },
    { id: uid(), name: "Groceries", percent: 10 },
    { id: uid(), name: "Essentials", percent: 12 },
    { id: uid(), name: "Discretionary", percent: 58 },
    { id: uid(), name: "Savings", percent: 20 },
  ];
  const [rentCat, grocCat, essCat, discCat] = categories;
  const checkingId = accounts[0].id;

  // Modeled on 18 months of real statement patterns (anonymized): biweekly paychecks
  // that swing ~$1.3k-2.9k, ~$1,650 monthly rent, and spend dominated by frequent
  // small cash-adjacent outflows — ATM withdrawals (~11/mo), Zelle out (~7/mo),
  // dining/coffee (~18/mo), liquor/bars (~12/mo), rideshare (~10/mo), convenience
  // stores (~9/mo) — with small infrequent groceries, almost no gas, and a stack of
  // subscriptions. Four months of history so trends and "vs avg" have real depth.
  const transactions = [];
  const diningSpots = ["Taco spot", "Late-night diner", "Coffee shop", "Burger run", "Sushi counter", "Food hall"];
  const barNotes = ["Liquor store", "Bar tab"];
  const rideshareNotes = ["Rideshare - night out", "Rideshare - home", "Rideshare - work"];
  const subscriptions = [
    { note: "Music streaming", amount: 14.99 },
    { note: "AI assistant sub", amount: 21 },
    { note: "AI chat sub", amount: 21 },
    { note: "Cloud storage", amount: 2 },
    { note: "Prepaid phone", amount: 58 },
    { note: "Content subscription", amount: 5 },
  ];

  // 9 biweekly pay periods (~4 months); next payday is d(3), so the current period started d(-11)
  for (let p = 0; p < 9; p++) {
    const base = -11 - p * 14;
    const day = () => Math.min(0, base + rand(0, 13));
    // One paycheck per period, occasionally a light one
    transactions.push({ id: uid(), type: "income", amount: p === 3 || p === 7 ? rand(1300, 1500) : rand(1700, 2750), accountId: checkingId, date: d(base), note: "Paycheck" });
    // ATM cash — the single biggest habit line; mostly $40-120, sometimes a big pull
    for (let i = 0; i < rand(5, 6); i++) {
      transactions.push({ id: uid(), type: "expense", amount: rand(0, 5) === 0 ? rand(140, 220) : rand(40, 120), accountId: checkingId, categoryId: discCat.id, date: d(day()), note: "ATM cash withdrawal" });
    }
    for (let i = 0; i < rand(3, 4); i++) {
      transactions.push({ id: uid(), type: "expense", amount: rand(6, 18) * 5, accountId: checkingId, categoryId: discCat.id, date: d(day()), note: "Zelle out" });
    }
    for (let i = 0; i < 9; i++) {
      transactions.push({ id: uid(), type: "expense", amount: rand(8, 36), accountId: checkingId, categoryId: discCat.id, date: d(day()), note: diningSpots[rand(0, diningSpots.length - 1)] });
    }
    for (let i = 0; i < rand(5, 6); i++) {
      transactions.push({ id: uid(), type: "expense", amount: rand(10, 28), accountId: checkingId, categoryId: discCat.id, date: d(day()), note: barNotes[rand(0, barNotes.length - 1)] });
    }
    for (let i = 0; i < rand(4, 5); i++) {
      transactions.push({ id: uid(), type: "expense", amount: rand(12, 38), accountId: checkingId, categoryId: discCat.id, date: d(day()), note: rideshareNotes[rand(0, rideshareNotes.length - 1)] });
    }
    for (let i = 0; i < rand(4, 5); i++) {
      transactions.push({ id: uid(), type: "expense", amount: rand(8, 25), accountId: checkingId, categoryId: discCat.id, date: d(day()), note: "Convenience store" });
    }
    transactions.push({ id: uid(), type: "expense", amount: rand(25, 55), accountId: checkingId, categoryId: discCat.id, date: d(day()), note: "Food delivery" });
    for (let i = 0; i < 2; i++) {
      transactions.push({ id: uid(), type: "expense", amount: rand(15, 60), accountId: checkingId, categoryId: grocCat.id, date: d(day()), note: "Groceries" });
    }
    if (p % 2 === 0) {
      transactions.push({ id: uid(), type: "expense", amount: rand(22, 32), accountId: checkingId, categoryId: essCat.id, date: d(day()), note: "Gas" });
    }
  }
  // Rent lands monthly, plus subscriptions and small monthly credits
  for (let m = 0; m < 4; m++) {
    transactions.push({ id: uid(), type: "expense", amount: rand(1620, 1690), accountId: checkingId, categoryId: rentCat.id, date: d(-8 - m * 30), note: "Rent" });
    for (const sub of subscriptions) {
      transactions.push({ id: uid(), type: "expense", amount: sub.amount, accountId: checkingId, categoryId: discCat.id, date: d(-rand(1, 28) - m * 30), note: sub.note });
    }
    transactions.push({ id: uid(), type: "income", amount: rand(2, 6), accountId: checkingId, date: d(-rand(1, 28) - m * 30), note: "ATM fee rebate" });
    transactions.push({ id: uid(), type: "income", amount: rand(4, 12) * 5, accountId: checkingId, date: d(-rand(1, 28) - m * 30), note: "Zelle in" });
  }

  const bills = [
    { id: uid(), name: "Rent", amount: 1650, dueDate: d(8), frequencyDays: 30, accountId: checkingId, categoryId: rentCat.id, lastPaid: d(-22) },
    { id: uid(), name: "Phone", amount: 58, dueDate: d(11), frequencyDays: 30, accountId: checkingId, categoryId: essCat.id, lastPaid: d(-19) },
    { id: uid(), name: "Subscription", amount: 14.99, dueDate: d(4), frequencyDays: 30, accountId: checkingId, categoryId: discCat.id, lastPaid: d(-26) },
  ];

  const goals = [
    { id: uid(), name: "Emergency cushion", target: 1500, saved: 150 },
    { id: uid(), name: "New laptop", target: 1200, saved: 0 },
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

  // 10 days of meal-tagged food logs so the calorie ring, macro bars, quick-add
  // chips, and 7-day chart all render with realistic variation. Today is mid-day:
  // breakfast + lunch logged, dinner still open.
  const menu = {
    Breakfast: [
      { name: "Eggs & toast", calories: 380, protein: 22, carbs: 30, fat: 18 },
      { name: "Greek yogurt", calories: 130, protein: 17, carbs: 9, fat: 4 },
      { name: "Breakfast burrito", calories: 540, protein: 24, carbs: 52, fat: 26 },
    ],
    Lunch: [
      { name: "Chicken burrito bowl", calories: 650, protein: 42, carbs: 70, fat: 22 },
      { name: "Turkey sandwich", calories: 450, protein: 28, carbs: 48, fat: 16 },
      { name: "Taco plate", calories: 720, protein: 30, carbs: 66, fat: 36 },
    ],
    Dinner: [
      { name: "Chicken breast & rice", calories: 520, protein: 46, carbs: 50, fat: 12 },
      { name: "Salmon & veggies", calories: 480, protein: 38, carbs: 14, fat: 28 },
      { name: "Pasta night", calories: 780, protein: 26, carbs: 96, fat: 30 },
    ],
    Snack: [
      { name: "Protein shake", calories: 160, protein: 30, carbs: 6, fat: 2 },
      { name: "Tortilla chips", calories: 210, protein: 3, carbs: 24, fat: 11 },
      { name: "Late-night tacos", calories: 430, protein: 18, carbs: 40, fat: 22 },
    ],
  };
  const pickMeal = meal => menu[meal][rand(0, menu[meal].length - 1)];
  const foodItems = [];
  for (let i = 9; i >= 1; i--) {
    for (const [meal, odds] of [["Breakfast", 0.7], ["Lunch", 0.9], ["Dinner", 0.85], ["Snack", 0.5]]) {
      if (Math.random() < odds) foodItems.push({ id: uid(), date: d(-i), meal, ...pickMeal(meal) });
    }
  }
  foodItems.push({ id: uid(), date: today, meal: "Breakfast", ...menu.Breakfast[1] });
  foodItems.push({ id: uid(), date: today, meal: "Lunch", ...menu.Lunch[0] });

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
    goalWeight: 80, calorieTarget: 2200, nextPaycheck: d(3), cycleDays: 14, fixedRent: 1650,
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
  if (d.fixedRent === undefined) d = { ...d, fixedRent: 1650 };
  if (d.calorieTarget === undefined) d = { ...d, calorieTarget: 2200 };
  d = { ...d, debts: d.debts.map(x => x.payments ? x : { ...x, payments: [] }) };
  return d;
}
