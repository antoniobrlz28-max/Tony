import { uid, addDays, todayStr } from "./helpers.js";
import { ABSTINENCE_COLORS } from "./constants.js";

export function defaultData() {
  return {
    accounts: [{ id: uid(), name: "Checking", balance: 0, type: "checking" }],
    // Each category carries ONE number: a monthly dollar budget. Spend is compared
    // against it within a calendar month. Simple, editable, no special cases.
    categories: [
      { id: "cat_rent", name: "Rent", budget: 1650 },
      { id: "cat_groc", name: "Groceries", budget: 400 },
      { id: "cat_ess", name: "Essentials", budget: 300 },
      { id: "cat_disc", name: "Discretionary", budget: 700 },
      { id: "cat_sav", name: "Savings", budget: 400 },
    ],
    transactions: [],
    bills: [],
    goals: [],
    debts: [],
    habits: [],
    foodItems: [],
    abstinence: [],
    weeklyReviews: [],
    tasks: [],
    dismissedRecs: [],
    recFeedback: [],
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
    { id: uid(), name: "Rent", budget: 1650 },
    { id: uid(), name: "Groceries", budget: 200 },
    { id: uid(), name: "Essentials", budget: 120 },
    { id: uid(), name: "Discretionary", budget: 1300 },
    { id: uid(), name: "Savings", budget: 150 },
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

// "Surprise me": invents a different life on every call so the app can be
// explored under many data shapes — different income levels and pay cadence,
// spending personalities, sleep types, drinking levels, training discipline,
// goals, debts, and commitments. Anonymized notes only, no future dates.
export function generateRandomData() {
  const today = todayStr();
  const d = n => addDays(today, n);
  const ri = (min, max) => Math.round(min + Math.random() * (max - min));
  const rf = (min, max) => min + Math.random() * (max - min);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const chance = p => Math.random() < p;
  const sample = (arr, n) => arr.slice().sort(() => Math.random() - 0.5).slice(0, n);
  const hhmm = mins => `${String(Math.floor(((mins % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(Math.round(mins) % 60).padStart(2, "0")}`;

  // ---- Roll the persona ----
  const archetype = pick(["saver", "balanced", "paycheck-to-paycheck", "overspender"]);
  const sleepType = pick(["early-bird", "night-owl", "erratic"]);
  const drinkLevel = pick(["dry", "social", "heavy"]);
  const cycleDays = pick([7, 14, 14, 30]);
  const payBase = ri(500, 1800) * (cycleDays / 14) * 2; // scale check size with cadence
  const monthlyIncome = payBase * (30 / cycleDays);
  const rent = Math.round(monthlyIncome * rf(0.22, 0.45) / 25) * 25;
  const spendRatio = { saver: 0.62, balanced: 0.82, "paycheck-to-paycheck": 0.97, overspender: 1.12 }[archetype];
  const trainFreq = ri(0, 5);
  const fasts = chance(0.5);
  const logRate = rf(0.55, 1);
  const useCash = chance(0.35);
  const weightNow = rf(58, 105);
  const direction = pick([-1, -1, 0, 1]); // mostly cutting, sometimes bulking
  const goalWeight = Math.round(weightNow + direction * rf(3, 9));
  const personaName = `${sleepType.replace("-", " ")} ${archetype.replace(/-/g, " ")} · ${drinkLevel} drinker · ${cycleDays}d checks`;

  // ---- Accounts & categories ----
  const accounts = [
    { id: uid(), name: "Checking", balance: Math.round(payBase * rf(0.1, 0.9)), type: "checking" },
    { id: uid(), name: "Savings", balance: Math.round(monthlyIncome * (archetype === "saver" ? rf(1, 4) : rf(0, 0.4))), type: "savings" },
  ];
  if (useCash) accounts.push({ id: uid(), name: "Cash", balance: ri(0, 120), type: "cash" });
  const checkingId = accounts[0].id;
  const savingsId = accounts[1].id;
  const cashId = useCash ? accounts[2].id : null;

  // Split the income left after rent into dollar budgets, weighted by persona.
  const pieces = [ri(5, 15), ri(8, 20), ri(30, 65), ri(5, 30)];
  const pieceSum = pieces.reduce((a, b) => a + b, 0);
  const afterRent = Math.max(0, monthlyIncome - rent);
  const budgetOf = w => Math.round((afterRent * (w / pieceSum)) / 25) * 25;
  const categories = [
    { id: uid(), name: "Rent", budget: rent },
    { id: uid(), name: "Groceries", budget: budgetOf(pieces[0]) },
    { id: uid(), name: "Essentials", budget: budgetOf(pieces[1]) },
    { id: uid(), name: "Discretionary", budget: budgetOf(pieces[2]) },
    { id: uid(), name: "Savings", budget: budgetOf(pieces[3]) },
  ];
  const [rentCat, grocCat, essCat, discCat] = categories;

  // ---- Transactions (3–5 months) ----
  const months = ri(3, 5);
  const periods = Math.ceil((months * 30) / cycleDays);
  const nextPay = ri(1, Math.min(cycleDays - 1, 13));
  const transactions = [];
  const spendPerPeriod = payBase * spendRatio;
  const scale = spendPerPeriod / 1500; // amount ranges tuned around a $1.5k period
  const notes = {
    dining: ["Taco spot", "Coffee shop", "Late-night diner", "Sushi counter", "Burger run", "Food hall", "Brunch place"],
    ride: ["Rideshare - home", "Rideshare - work", "Rideshare - night out"],
    shop: ["Online order", "Clothing store", "Pharmacy run", "Home goods"],
  };
  for (let p = 0; p < periods; p++) {
    const base = nextPay - cycleDays * (p + 1);
    const day = () => Math.min(0, base + ri(0, cycleDays - 1));
    transactions.push({ id: uid(), type: "income", amount: ri(payBase * 0.82, payBase * 1.15), accountId: checkingId, date: d(base), note: "Paycheck" });
    const weeks = cycleDays / 7;
    const put = (count, amtLo, amtHi, catId, note) => {
      for (let i = 0; i < Math.round(count * weeks); i++) {
        transactions.push({ id: uid(), type: "expense", amount: Math.max(3, ri(amtLo * scale, amtHi * scale)), accountId: checkingId, categoryId: catId, date: d(day()), note: typeof note === "function" ? note() : note });
      }
    };
    put(rf(1, 3), 20, 120, grocCat.id, "Groceries");
    put(rf(2, 6), 8, 40, discCat.id, () => pick(notes.dining));
    put(rf(0, 3), 10, 35, discCat.id, () => pick(notes.ride));
    put(rf(0, 2), 15, 90, discCat.id, () => pick(notes.shop));
    put(rf(0, 1.5), 20, 45, essCat.id, "Gas");
    if (drinkLevel !== "dry") put(drinkLevel === "heavy" ? rf(2, 4) : rf(0.5, 2), 9, 35, discCat.id, "Bar tab");
    const atmCount = Math.round((archetype === "overspender" ? rf(2, 4) : rf(0, 2)) * weeks);
    for (let i = 0; i < atmCount; i++) {
      const amt = ri(20, 140);
      if (cashId) transactions.push({ id: uid(), type: "transfer", amount: amt, accountId: checkingId, toAccountId: cashId, date: d(day()), note: "ATM cash withdrawal" });
      else transactions.push({ id: uid(), type: "expense", amount: amt, accountId: checkingId, categoryId: discCat.id, date: d(day()), note: "ATM cash withdrawal" });
    }
    if (archetype === "saver" || (archetype === "balanced" && chance(0.6))) {
      transactions.push({ id: uid(), type: "transfer", amount: Math.round(payBase * rf(0.05, 0.2)), accountId: checkingId, toAccountId: savingsId, date: d(base), note: "To savings" });
    }
  }
  const subPool = [["Music streaming", 11.99], ["Video streaming", 15.49], ["AI assistant sub", 21], ["Cloud storage", 2.99], ["Gym membership", ri(25, 55)], ["Prepaid phone", ri(40, 70)], ["Game pass", 16.99]];
  const subs = sample(subPool, ri(2, 6));
  for (let m = 0; m < months; m++) {
    transactions.push({ id: uid(), type: "expense", amount: ri(rent * 0.98, rent * 1.02), accountId: checkingId, categoryId: rentCat.id, date: d(-ri(2, 10) - m * 30), note: "Rent" });
    for (const [note, amount] of subs) {
      transactions.push({ id: uid(), type: "expense", amount, accountId: checkingId, categoryId: discCat.id, date: d(-ri(1, 28) - m * 30), note });
    }
  }
  if (cashId) {
    for (let i = 0; i < ri(3, 10); i++) {
      transactions.push({ id: uid(), type: "expense", amount: ri(5, 45), accountId: cashId, categoryId: discCat.id, date: d(-ri(0, 30)), note: pick(["Cash spend", "Street food", "Tip", "Corner store"]) });
    }
  }

  // ---- Bills ----
  const bills = [
    { id: uid(), name: "Rent", amount: rent, dueDate: d(ri(1, 27)), frequencyDays: 30, accountId: checkingId, categoryId: rentCat.id, lastPaid: d(-ri(3, 28)) },
    ...subs.slice(0, ri(1, 3)).map(([name, amount]) => ({ id: uid(), name: name === "Prepaid phone" ? "Phone" : "Subscription", amount, dueDate: d(ri(1, 27)), frequencyDays: 30, accountId: checkingId, categoryId: discCat.id, lastPaid: d(-ri(3, 28)) })),
  ];

  // ---- Goals & debts ----
  const goalPool = ["Emergency cushion", "Move-out fund", "New laptop", "Trip fund", "Car down payment", "Camera"];
  const goals = sample(goalPool, ri(0, 3)).map(name => {
    const target = ri(4, 40) * 100;
    return { id: uid(), name, target, saved: Math.round(target * rf(0, 0.9)) };
  });
  const debtPool = [["Credit card", 18, 29], ["Medical bill", 0, 8], ["Personal loan", 9, 16], ["Car loan", 5, 11]];
  const debts = sample(debtPool, ri(0, 2)).map(([name, rLo, rHi]) => {
    const total = ri(8, 90) * 100;
    const paid = Math.round(total * rf(0, 0.6));
    return {
      id: uid(), name, total, rate: ri(rLo, rHi), paid,
      payments: paid > 0 ? [-70, -40, -12].map(off => ({ date: d(off + ri(-4, 4)), amount: Math.round(paid / 3) })) : [],
    };
  });

  // ---- Daily habit logs ----
  const trainDows = sample([1, 2, 3, 4, 5, 6], Math.min(6, trainFreq));
  const fastDows = fasts ? sample([1, 2, 3, 4], ri(1, 3)) : [];
  const bedBase = sleepType === "early-bird" ? 22 * 60 : sleepType === "night-owl" ? 25 * 60 : null;
  const sleepLen = rf(6, 8.5);
  const habits = [];
  let w = weightNow - direction * rf(1.5, 4); // walk toward today's weight
  const habitDays = ri(60, 90);
  for (let i = habitDays; i >= 1; i--) {
    if (!chance(logRate)) continue;
    const date = d(-i);
    const dow = new Date(date + "T00:00:00").getDay();
    const isWeekend = dow === 0 || dow === 6;
    const trained = trainDows.includes(dow) && chance(0.8);
    const fasted = fastDows.includes(dow) && chance(0.7);
    const drinks = drinkLevel === "dry" ? 0
      : drinkLevel === "social" ? (isWeekend ? ri(0, 3) : (chance(0.12) ? 1 : 0))
      : (isWeekend ? ri(2, 6) : ri(0, 2));
    const bed = (bedBase ?? ri(21 * 60, 26 * 60)) + ri(-40, 40) + (isWeekend ? ri(0, 60) : 0);
    const wake = bed + (sleepLen + rf(-0.7, 0.7)) * 60;
    w += direction * rf(0.02, 0.08) + rf(-0.25, 0.25);
    const identity = Math.max(1, Math.min(10, Math.round(5.2 + (trained ? 1.6 : 0) - drinks * 0.6 + rf(-1.2, 1.2))));
    habits.push({
      id: uid(), date, trained, weight: Math.round(w * 10) / 10,
      sleepTime: hhmm(bed), wakeTime: hhmm(wake), alcoholDrinks: drinks,
      trainingNote: trained ? pick(["Push day", "Pull day", "Legs", "Full body", "Run 5k", "Boxing"]) : "",
      fastingHours: fasted ? pick([16, 16, 18]) : 0, fastingStart: fasted ? "12:00" : null, fastCompleted: fasted,
      identityScore: identity,
    });
  }
  habits.push({ id: uid(), date: today, trained: trainDows.includes(new Date().getDay()), weight: Math.round(weightNow * 10) / 10, alcoholDrinks: 0, trainingNote: "", fastingHours: 0, fastingStart: null, fastCompleted: false, identityScore: ri(4, 8) });

  // ---- Food (last ~10 days), abstinence, reviews ----
  const foodItems = [];
  const calTarget = ri(17, 30) * 100;
  for (let i = 9; i >= 0; i--) {
    if (!chance(logRate)) continue;
    for (const [meal, odds] of [["Breakfast", 0.65], ["Lunch", 0.85], ["Dinner", 0.85], ["Snack", 0.45]]) {
      if (!chance(odds)) continue;
      const cal = ri(120, meal === "Snack" ? 420 : 780);
      foodItems.push({ id: uid(), date: d(-i), meal, name: pick(["Bowl", "Sandwich", "Leftovers", "Salad", "Wrap", "Plate", "Shake", "Tacos"]), calories: cal, protein: ri(5, Math.max(12, Math.round(cal / 12))), carbs: ri(5, Math.round(cal / 6)), fat: ri(3, Math.round(cal / 12)) });
    }
  }
  const abstinence = sample([["Quit Vaping", 2], ["Quit Drinking", 0], ["No Weed", 6], ["Quit Smoking", 4], ["No Gambling", 5]], ri(0, 3))
    .map(([name, ci]) => ({ id: uid(), name, color: ABSTINENCE_COLORS[ci], startedAt: new Date(Date.now() - ri(1, 45) * 86400000 - ri(0, 23) * 3600000).toISOString(), history: chance(0.5) ? [ri(1, 20) * 86400] : [] }));
  const weeklyReviews = Array.from({ length: ri(0, 3) }, (_, i) => ({
    id: uid(), date: d(-2 - i * 7),
    wentWell: pick(["Kept the routine going.", "Stayed under budget most days.", "Trained more than planned."]),
    wastedTime: pick(["Too much scrolling.", "Late nights again.", "Errands ate the weekend."]),
    proud: pick(["Logged every day.", "Said no when it mattered.", "Cooked at home."]),
    hurtDecision: pick(["Impulse order.", "Skipped a workout.", "One late night too many."]),
    lesson: pick(["Momentum beats motivation.", "Plan the night before.", "Cash disappears fastest."]),
    nextFocus: pick(["Sleep window.", "Meal prep Sunday.", "One no-spend day."]),
  }));

  return {
    accounts, categories, transactions, bills, goals, debts, habits, foodItems, abstinence, weeklyReviews,
    goalWeight, calorieTarget: calTarget, nextPaycheck: d(nextPay), cycleDays, fixedRent: rent,
    demoPersona: personaName,
  };
}

export function migrate(d) {
  if (!d.categories.some(c => c.name.toLowerCase() === "rent")) {
    d = { ...d, categories: [{ id: uid(), name: "Rent", budget: 0 }, ...d.categories] };
  }
  // percent-of-after-rent → flat monthly dollar budgets. Seed each budget from
  // the category's real trailing-3-month spend; fall back to the old percent
  // model (or fixedRent for rent) when there's no history to learn from.
  if (d.categories.some(c => c.budget === undefined)) {
    const now = todayStr().slice(0, 7);
    const monthKeys = [1, 2, 3].map(i => {
      const [y, m] = now.split("-").map(Number);
      const dt = new Date(y, m - 1 - i, 1);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    });
    const avgSpend = catId => {
      const sums = monthKeys
        .map(ym => (d.transactions || []).filter(t => t.type === "expense" && t.categoryId === catId && t.date.startsWith(ym)).reduce((s, t) => s + t.amount, 0))
        .filter(s => s > 0);
      return sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length : 0;
    };
    const monthlyIncome = (() => {
      const sums = monthKeys
        .map(ym => (d.transactions || []).filter(t => t.type === "income" && t.date.startsWith(ym)).reduce((s, t) => s + t.amount, 0))
        .filter(s => s > 0);
      return sums.length ? sums.reduce((a, b) => a + b, 0) / sums.length : 0;
    })();
    const rentBudget = Number(d.fixedRent) || 0;
    const afterRent = Math.max(0, monthlyIncome - rentBudget);
    d = {
      ...d,
      categories: d.categories.map(c => {
        if (c.budget !== undefined) return c;
        const isRent = c.name.toLowerCase().includes("rent");
        let budget = avgSpend(c.id);
        if (!budget) budget = isRent ? rentBudget : Math.round((afterRent * Number(c.percent || 0)) / 100);
        const { percent, ...rest } = c;
        return { ...rest, budget: Math.round(budget / 10) * 10 };
      }),
    };
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
  if (!d.tasks) d = { ...d, tasks: [] };
  if (!d.dismissedRecs) d = { ...d, dismissedRecs: [] };
  if (!d.recFeedback) d = { ...d, recFeedback: [] };
  d = { ...d, debts: d.debts.map(x => x.payments ? x : { ...x, payments: [] }) };
  return d;
}
