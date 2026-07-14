export function uid(prefix = "") {
  const s = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  return prefix ? `${prefix}_${s}` : s;
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}
