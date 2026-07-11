import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { INK, INK_SOFT, CARD, TEXT, PAPER, PAPER_DIM, GOLD, RUST, SAGE, SLATE, AMBER } from "../lib/constants.js";
import { urgencyColor } from "../lib/helpers.js";

export function Section({ title, eyebrow, children, right, collapsible = false, open = true, onToggle }) {
  const header = (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: collapsible && !open ? 0 : 14 }}>
      <div>
        {eyebrow && <div style={{ fontSize: 11, letterSpacing: "0.12em", color: SLATE, textTransform: "uppercase", marginBottom: 2 }}>{eyebrow}</div>}
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 18, color: TEXT, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {right}
        {collapsible && (open
          ? <ChevronLeft size={16} style={{ transform: "rotate(-90deg)" }} color={SLATE} />
          : <ChevronRight size={16} style={{ transform: "rotate(90deg)" }} color={SLATE} />)}
      </div>
    </div>
  );
  return (
    <div style={{ marginBottom: 20, background: CARD, borderRadius: 22, padding: "18px 16px", border: `1px solid ${INK_SOFT}18` }}>
      {collapsible ? (
        <button onClick={onToggle} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
          {header}
        </button>
      ) : header}
      {(!collapsible || open) && children}
    </div>
  );
}

export function ProgressBar({ pct, tone = "sage" }) {
  const color = pct > 100 ? RUST : tone === "gold" ? GOLD : SAGE;
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ height: 6, background: PAPER_DIM, borderRadius: 3, overflow: "hidden", border: `1px solid ${INK_SOFT}18` }}>
      <div style={{ height: "100%", width: width + "%", background: color, transition: "width 0.3s" }} />
    </div>
  );
}
export function FastBar({ pct, label }) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ position: "relative", height: 22, background: PAPER_DIM, borderRadius: 11, overflow: "hidden", border: `1px solid ${INK_SOFT}20` }}>
      <div style={{ position: "absolute", inset: 0, width: width + "%", background: AMBER, borderRadius: 11, transition: "width 0.3s" }} />
      {label && (
        <div style={{ position: "relative", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: width > 50 ? "white" : TEXT }}>
          {label}
        </div>
      )}
    </div>
  );
}

export function CountdownPill({ days, totalDays }) {
  if (days < 0) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999,
        background: `${RUST}22`, color: RUST, border: `1px solid ${RUST}55`,
        fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap"
      }}>overdue</span>
    );
  }
  const color = urgencyColor(days, totalDays);
  const label = days === 0 ? "today" : days === 1 ? "1d" : `${days}d`;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999,
      background: `${color}22`, color, border: `1px solid ${color}55`,
      fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap"
    }}>{label}</span>
  );
}

export function SmallBtn({ children, onClick, tone = "ink", style }) {
  const bg = tone === "ink" ? INK : tone === "gold" ? GOLD : tone === "rust" ? RUST : "transparent";
  const color = tone === "ghost" ? TEXT : PAPER;
  return (
    <button
      onClick={onClick}
      style={{
        background: bg, color, border: tone === "ghost" ? `1px solid ${INK_SOFT}55` : "none",
        borderRadius: 999, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        display: "inline-flex", alignItems: "center", gap: 5, ...style
      }}
    >
      {children}
    </button>
  );
}

export function useLongPress(onLongPress, ms = 450) {
  const timer = useRef(null);
  const start = () => { timer.current = setTimeout(onLongPress, ms); };
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  return { onPointerDown: start, onPointerUp: clear, onPointerLeave: clear, onPointerCancel: clear };
}

export function IconBtn({ icon: Icon, onClick, color, label }) {
  return (
    <button onClick={onClick} aria-label={label || "Action"} style={{ background: "none", border: "none", cursor: "pointer", color: color || SLATE, padding: 4, display: "flex" }}>
      <Icon size={14} />
    </button>
  );
}
export function DeleteBtn({ onDelete, label = "Delete" }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div style={{ display: "flex", gap: 4 }}>
        <SmallBtn tone="rust" onClick={onDelete} style={{ padding: "4px 8px" }}>Confirm</SmallBtn>
        <SmallBtn tone="ghost" onClick={() => setConfirm(false)} style={{ padding: "4px 8px" }}>Cancel</SmallBtn>
      </div>
    );
  }
  return <IconBtn icon={Trash2} onClick={() => setConfirm(true)} label={label} />;
}

export function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: SLATE, flex: 1, minWidth: 110 }}>
      {label}
      {children}
    </label>
  );
}
export const inputStyle = {
  border: `1px solid ${INK_SOFT}40`, borderRadius: 14, padding: "9px 12px", fontSize: 13.5,
  background: PAPER_DIM, color: TEXT, fontFamily: "inherit", width: "100%", boxSizing: "border-box"
};
export const minimalInputStyle = {
  border: "none", borderBottom: `1px solid ${INK_SOFT}35`, borderRadius: 0, padding: "8px 2px", fontSize: 13.5,
  background: "transparent", color: TEXT, fontFamily: "inherit", width: "100%", boxSizing: "border-box"
};

export function Empty({ text }) {
  return <div style={{ fontSize: 12.5, color: SLATE, fontStyle: "italic", padding: "6px 0" }}>{text}</div>;
}
export function Row({ left, mid, right, onClick, accent, rightColor = SAGE }) {
  if (accent) {
    return (
      <div onClick={onClick} style={{
        display: "grid", gridTemplateColumns: "1fr 122px 1fr", alignItems: "center", padding: "9px 10px",
        fontSize: 13, borderRadius: 6, marginBottom: 4, borderLeft: `3px solid ${accent}`, background: PAPER_DIM
      }}>
        <span style={{ fontWeight: 600 }}>{left}</span>
        {mid ? <span style={{ color: SLATE, justifySelf: "center", textAlign: "center" }}>{mid}</span> : <span />}
        <span style={{ justifySelf: "end", fontWeight: 700, color: rightColor }}>{right}</span>
      </div>
    );
  }
  return (
    <div onClick={onClick} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${INK_SOFT}18`, fontSize: 13 }}>
      <span style={{ fontWeight: 600 }}>{left}</span>
      {mid && <span style={{ color: SLATE }}>{mid}</span>}
      <span style={{ fontWeight: 700, color: SAGE }}>{right}</span>
    </div>
  );
}

export function HeatCell({ filled, color, bg, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 26, height: 26, minWidth: 26, borderRadius: 5, border: "none", cursor: "pointer",
      background: filled ? color : bg, color: filled ? "white" : SLATE, fontSize: 10, fontWeight: 700,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>{label || ""}</button>
  );
}

export function BottomSheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,46,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div style={{ background: CARD, borderRadius: "20px 20px 0 0", padding: "18px 16px 24px", width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 -10px 30px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, color: TEXT, margin: 0 }}>{title}</h3>
          <IconBtn icon={X} onClick={onClose} label="Close" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatTile({ icon: Icon, color, value, label, caption, valueColor }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 14, padding: "12px 10px", minWidth: 0 }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Icon size={13} color={color} />
      </div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 15, fontWeight: 700, color: valueColor || TEXT, lineHeight: 1.15, overflowWrap: "break-word" }}>{value}</div>
      <div style={{ fontSize: 9.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 3 }}>{label}</div>
      <div style={{ fontSize: 9.5, color, marginTop: 2 }}>{caption}</div>
    </div>
  );
}
