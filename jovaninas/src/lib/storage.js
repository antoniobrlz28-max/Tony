const STORAGE_KEY = "jovaninas-menu-intelligence-v1";

export const MENU_TYPES = [
  "Dinner",
  "Happy Hour",
  "Brunch",
  "Dessert",
  "Cocktails",
  "Wine",
  "Amaro",
  "Private Dining",
  "Seasonal Specials",
  "Staff Meal",
  "Tasting Menu",
];

export function emptyData() {
  return {
    schemaVersion: 1,
    menus: [],          // Menu[]
    dishes: {},          // dish_id -> DishIdentity
    dishVersions: {},    // dish_version_id -> DishVersion
    changes: [],         // MenuChange[]
    notes: [],           // KnowledgeNote[]
    cards: {},           // card_id -> TrainingCard
    dictionary: {},       // term (lowercase) -> DictionaryEntry
    parserProfiles: [],  // ParserProfile[] — remembered corrections per menu format
    resolutionQueue: [], // UnresolvedItem[] — items awaiting manager review
    correctionHistory: [], // CorrectionRecord[] — audit trail of corrections
  };
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw);
    return { ...emptyData(), ...parsed };
  } catch (e) {
    console.warn("Failed to load jovaninas data, starting fresh", e);
    return emptyData();
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (e) {
    console.warn("Failed to save jovaninas data", e);
    const isQuota = e && (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014);
    return {
      ok: false,
      quota: isQuota,
      message: isQuota
        ? "This device's local storage is full — your last change was NOT saved. Original PDF/photo attachments are usually the biggest space users; export a backup from More → Settings, then export."
        : `Save failed: ${e.message || e}`,
    };
  }
}

export function resetData() {
  localStorage.removeItem(STORAGE_KEY);
}
