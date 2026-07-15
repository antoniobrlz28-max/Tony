// Persistent storage using localStorage

const STORAGE_KEY = "jovaninas_v1";

function emptyData() {
  return {
    menus: [],       // Food menu history (array of committed menu snapshots)
    wineMenus: [],   // Wine catalog history (array of committed wine menu snapshots)
    dictionary: {},  // Glossary/term dictionary
    profiles: [],    // Parser correction profiles
  };
}

/**
 * Load persisted app data from localStorage.
 * Returns a fresh empty data object if nothing is stored or if parsing fails.
 */
export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw);
    // Merge with emptyData to ensure all keys exist (forward-compat)
    return { ...emptyData(), ...parsed };
  } catch {
    return emptyData();
  }
}

/**
 * Save app data to localStorage.
 * Returns { ok: true } on success or { ok: false, message } on failure.
 */
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    console.error("[jovaninas] saveData failed:", err);
    return { ok: false, message: err.message || "Could not save data." };
  }
}
