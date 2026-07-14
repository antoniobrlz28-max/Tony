// Lightweight device-level lock, not a real auth system: it just gates the
// UI so someone glancing at a shared device can't accidentally (or
// casually) edit the menu/knowledge base. The PIN is hashed with SHA-256
// via the browser's built-in Web Crypto so it's never stored in plain text,
// but this is still a convenience gate, not a security boundary — anyone
// with devtools access to this browser could bypass it.

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPin(pin) {
  return sha256Hex(`jovaninas-master-lock:${pin}`);
}

export async function verifyPin(pin, hash) {
  if (!hash) return false;
  return (await hashPin(pin)) === hash;
}
