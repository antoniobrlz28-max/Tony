// Wraps case-insensitive matches of `query` inside `text` with <mark>. Used
// to surface exactly which word matched a search, rather than dumping a
// full sentence back at the user.
export default function Highlight({ text, query }) {
  if (!query || !text) return text;
  const q = query.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${escaped})`, "ig"));
  if (parts.length === 1) return text;
  return parts.map((part, i) => (part.toLowerCase() === q.toLowerCase() ? <mark key={i} className="highlight">{part}</mark> : part));
}
