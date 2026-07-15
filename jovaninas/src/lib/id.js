// Utility helpers for generating IDs and date strings

/**
 * Generate a short unique ID with an optional prefix.
 * e.g. uid("menu") => "menu_3x7kq2_lz4b9"
 */
export function uid(prefix = "id") {
  const rand = Math.random().toString(36).slice(2, 9);
  const ts = Date.now().toString(36);
  return `${prefix}_${rand}_${ts}`;
}

/**
 * Return today's date as a YYYY-MM-DD string in local time.
 */
export function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
