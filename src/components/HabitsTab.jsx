import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Check, X, Edit2, RefreshCw, Dumbbell, Flame, Wine } from "lucide-react";
import { LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  INK_SOFT, CARD, TEXT, SLATE, AMBER, AMBER_BG, TEAL, TEAL_BG, CORAL, CORAL_BG,
  VIOLET, VIOLET_BG, SKY, PAPER_DIM, ABSTINENCE_COLORS,
} from "../lib/constants.js";
import { todayStr, addDays, monthDates, shiftMonth, formatDuration } from "../lib/helpers.js";
import {
  Section, IconBtn, DeleteBtn, SmallBtn, Field, Empty, HeatCell, FastBar, BottomSheet,
  inputStyle, minimalInputStyle,
} from "./shared.jsx";
import { NutritionLog } from "./Nutrition.jsx";

function FastingModal({ date, log, onClose, onSave, blockNew }) {
  const hasFast = (log?.fastingHours || 0) > 0;
  const [step, setStep] = useState(hasFast ? "clock" : "ask");
  const [duration, setDuration] = useState(log?.fastingHours || 16);
  const nowTime = (() => {
    const n = new Date();
    return String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0");
  })();
  const [startTime, setStartTime] = useState(log?.fastingStart || nowTime);
  const [pastStart, setPastStart] = useState(log?.fastingStart || "08:00");
  const [pastEnd, setPastEnd] = useState(nowTime);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (step !== "clock" || date !== todayStr() || log?.fastCompleted) return;
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, [step, date, log?.fastCompleted]);

  function computeEnd(start, dur) {
    const [h, m] = start.split(":").map(Number);
    let endMin = h * 60 + m + dur * 60;
    const crosses = endMin >= 24 * 60;
    endMin = endMin % (24 * 60);
    const eh = Math.floor(endMin / 60), em = endMin % 60;
    return String(eh).padStart(2, "0") + ":" + String(em).padStart(2, "0") + (crosses ? " (+1d)" : "");
  }
  function elapsedMinutesNow(start) {
    const now = new Date();
    const [h, m] = start.split(":").map(Number);
    let diff = (now.getHours() * 60 + now.getMinutes()) - (h * 60 + m);
    if (diff < 0) diff += 24 * 60;
    return diff;
  }
  function durationBetween(start, end) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  }

  return (
    <div className="overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(4,7,12,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="sheet-in" style={{ background: CARD, borderRadius: 12, padding: 20, width: "100%", maxWidth: 340, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{date}</span>
          <IconBtn icon={X} onClick={onClose} label="Close" />
        </div>

        {step === "ask" && (
          <>
            <div style={{ fontSize: 15, marginBottom: 16, fontWeight: 600 }}>Fasting today?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <SmallBtn tone="ghost" onClick={() => setStep("logpast")} style={{ flex: 1, justifyContent: "center" }}>No</SmallBtn>
              <SmallBtn onClick={() => setStep(blockNew ? "blocked" : "setup")} style={{ flex: 1, justifyContent: "center", background: AMBER }}>Yes</SmallBtn>
            </div>
          </>
        )}

        {step === "blocked" && (
          <>
            <div style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>You already have an active fast running today. Finish or clear it before starting another.</div>
            <SmallBtn onClick={onClose} style={{ width: "100%", justifyContent: "center", background: AMBER }}>Got it</SmallBtn>
          </>
        )}

        {step === "logpast" && (
          <>
            <div style={{ fontSize: 12, color: SLATE, marginBottom: 10 }}>Log a fast that already happened</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <Field label="Start time"><input style={inputStyle} type="time" value={pastStart} onChange={e => setPastStart(e.target.value)} /></Field>
              <Field label="End time"><input style={inputStyle} type="time" value={pastEnd} onChange={e => setPastEnd(e.target.value)} /></Field>
            </div>
            <div style={{ fontSize: 11.5, color: SLATE, marginBottom: 14 }}>Length: {durationBetween(pastStart, pastEnd)}h</div>
            <SmallBtn onClick={() => { onSave({ fastingHours: durationBetween(pastStart, pastEnd), fastingStart: pastStart, fastCompleted: true }); onClose(); }} style={{ width: "100%", justifyContent: "center", background: AMBER }}>Log fast</SmallBtn>
            <button onClick={onClose} style={{ background: "none", border: "none", color: SLATE, fontSize: 12, marginTop: 10, cursor: "pointer", width: "100%" }}>Never mind</button>
          </>
        )}

        {step === "setup" && (
          <>
            <div style={{ fontSize: 12, color: SLATE, marginBottom: 8 }}>Fast length</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14, maxHeight: 260, overflowY: "auto" }}>
              {[
                { h: 16, tag: "Recommended", desc: "The standard 16:8 window — sustainable for most days." },
                { h: 18, tag: "Extended", desc: "A bit more of a stretch, bigger deficit." },
                { h: 24, tag: "Full day", desc: "24 hours. Only if you're sure." },
              ].map(opt => (
                <button key={opt.h} onClick={() => setDuration(opt.h)} style={{
                  textAlign: "left", borderRadius: 10, overflow: "hidden", cursor: "pointer", padding: 0,
                  border: duration === opt.h ? `2px solid ${AMBER}` : `1px solid ${INK_SOFT}30`, background: "none"
                }}>
                  <div style={{ background: duration === opt.h ? AMBER : PAPER_DIM, color: duration === opt.h ? "white" : SLATE, fontSize: 10.5, fontWeight: 700, padding: "5px 10px" }}>{opt.tag}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: TEXT }}>{opt.h}h</div>
                      <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>{opt.desc}</div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginLeft: 8,
                      border: `2px solid ${duration === opt.h ? AMBER : INK_SOFT}`,
                      background: duration === opt.h ? AMBER : "transparent"
                    }} />
                  </div>
                </button>
              ))}
            </div>
            <Field label="Start time"><input style={inputStyle} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></Field>
            <SmallBtn onClick={() => { onSave({ fastingHours: duration, fastingStart: startTime, fastCompleted: false }); onClose(); }} style={{ marginTop: 14, background: AMBER, width: "100%", justifyContent: "center" }}>Start fast</SmallBtn>
          </>
        )}

        {step === "clock" && log && (() => {
          const endLabel = computeEnd(log.fastingStart || "00:00", log.fastingHours);
          const isLive = date === todayStr() && !log.fastCompleted;
          const elapsed = isLive ? elapsedMinutesNow(log.fastingStart || "00:00") : null;
          const totalMin = log.fastingHours * 60;
          const pct = elapsed !== null ? Math.min(100, (elapsed / totalMin) * 100) : 100;
          const remainingMin = elapsed !== null ? Math.max(0, totalMin - elapsed) : 0;
          return (
            <>
              <div style={{ fontSize: 13, color: SLATE, marginBottom: 6 }}>{log.fastingHours}h fast · started {log.fastingStart} · ends {endLabel}</div>
              <FastBar pct={pct} label={`${Math.round(pct)}%`} />
              {isLive ? (
                <div style={{ marginTop: 10, fontSize: 20, textAlign: "center" }}>
                  {remainingMin > 0 ? `${Math.floor(remainingMin / 60)}h ${remainingMin % 60}m left` : "Fast complete"}
                </div>
              ) : (
                <div style={{ marginTop: 10, fontSize: 13, textAlign: "center", color: SLATE }}>Logged fast for this day</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <SmallBtn tone="ghost" onClick={() => setStep("setup")} style={{ flex: 1, justifyContent: "center" }}>Edit</SmallBtn>
                <SmallBtn tone="rust" onClick={() => { onSave({ fastingHours: 0, fastingStart: null, fastCompleted: false }); onClose(); }} style={{ flex: 1, justifyContent: "center" }}>Clear</SmallBtn>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

function AbstinenceRow({ item, onReset, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [color, setColor] = useState(item.color);
  const [confirmReset, setConfirmReset] = useState(false);

  const elapsedSec = Math.floor((Date.now() - new Date(item.startedAt).getTime()) / 1000);
  const best = item.history.length ? Math.max(...item.history, elapsedSec) : elapsedSec;

  if (editing) {
    return (
      <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
        <input style={{ ...inputStyle, marginBottom: 8 }} value={name} onChange={e => setName(e.target.value)} />
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {ABSTINENCE_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 24, height: 24, borderRadius: 6, border: color === c ? `2px solid ${TEXT}` : "2px solid transparent", background: c, cursor: "pointer"
            }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <SmallBtn tone="gold" onClick={() => { onSave({ name, color }); setEditing(false); }}><Check size={12} /> Save</SmallBtn>
          <SmallBtn tone="ghost" onClick={() => setEditing(false)}>Cancel</SmallBtn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px 6px" }}>
        <div style={{ background: item.color, color: "white", fontWeight: 700, fontSize: 13, padding: "6px 12px", borderRadius: 8 }}>{item.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconBtn icon={Edit2} onClick={() => setEditing(true)} label="Edit" />
          <DeleteBtn onDelete={onDelete} />
        </div>
      </div>
      <div style={{ padding: "0 12px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{formatDuration(elapsedSec)}</div>
          {confirmReset ? (
            <div style={{ display: "flex", gap: 6 }}>
              <SmallBtn tone="rust" onClick={() => { onReset(); setConfirmReset(false); }}>Confirm reset</SmallBtn>
              <SmallBtn tone="ghost" onClick={() => setConfirmReset(false)}>Cancel</SmallBtn>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} style={{
              width: 36, height: 36, borderRadius: "50%", border: `1px solid ${INK_SOFT}30`, background: CARD, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", color: TEXT
            }}><RefreshCw size={16} /></button>
          )}
        </div>
        {item.history.length > 0 && (
          <>
            <div style={{ marginTop: 8, height: 14, background: PAPER_DIM, borderRadius: 7, overflow: "hidden" }}>
              <div style={{ height: "100%", width: Math.min(100, (elapsedSec / best) * 100) + "%", background: item.color, borderRadius: 7, transition: "width 0.3s" }} />
            </div>
            <div style={{ fontSize: 10.5, color: SLATE, marginTop: 5, fontVariantNumeric: "tabular-nums" }}>
              personal best {formatDuration(best, true)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AbstinencePage({ data, addAbstinence, resetAbstinence, editAbstinence, deleteAbstinence, onBack }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(ABSTINENCE_COLORS[0]);

  function submit() {
    if (!name) return;
    addAbstinence(name, color);
    setName("");
    setColor(ABSTINENCE_COLORS[0]);
    setAdding(false);
  }

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: TEXT, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
        <ChevronLeft size={16} /> Back to Habits
      </button>
      <h2 style={{ fontSize: 20, marginBottom: 4, marginTop: 0 }}>Abstinence</h2>
      <div style={{ fontSize: 12, color: SLATE, marginBottom: 14 }}>Track how long it's been</div>

      {data.abstinence.length === 0 && !adding && <Empty text="No trackers yet — add one below." />}
      {data.abstinence.map(item => (
        <AbstinenceRow key={item.id} item={item}
          onReset={() => resetAbstinence(item.id)}
          onSave={updates => editAbstinence(item.id, updates)}
          onDelete={() => deleteAbstinence(item.id)} />
      ))}

      {adding ? (
        <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 10, padding: 12, marginTop: 10 }}>
          <input style={{ ...inputStyle, marginBottom: 8 }} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Quit Drinking" autoFocus />
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {ABSTINENCE_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 24, height: 24, borderRadius: 6, border: color === c ? `2px solid ${TEXT}` : "2px solid transparent", background: c, cursor: "pointer"
              }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <SmallBtn onClick={submit} style={{ background: color }}><Plus size={13} /> Add tracker</SmallBtn>
            <SmallBtn tone="ghost" onClick={() => { setAdding(false); setName(""); }}>Cancel</SmallBtn>
          </div>
        </div>
      ) : (
        <SmallBtn onClick={() => setAdding(true)} style={{ marginTop: 10 }}><Plus size={13} /> Add tracker</SmallBtn>
      )}
    </div>
  );
}

function IdentityReviewPage({ todayIdentity, todayIdentityNote, identityAvg, upsertHabitLog, review, setReview, showReviewForm, setShowReviewForm, submitReview, weeklyReviews, deleteWeeklyReview, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: TEXT, fontWeight: 600, fontSize: 13, marginBottom: 16 }}>
        <ChevronLeft size={16} /> Back to Habits
      </button>
      <h2 style={{ fontSize: 20, marginBottom: 4, marginTop: 0 }}>Identity & review</h2>
      <div style={{ fontSize: 12, color: SLATE, marginBottom: 18 }}>Who you're becoming, and what you're learning</div>

      <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <h3 style={{ fontSize: 16, color: TEXT, margin: 0 }}>Identity</h3>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: VIOLET }}>30-day avg: {identityAvg}</span>
        </div>
        <div style={{ fontSize: 12, color: SLATE, marginBottom: 10 }}>Acted like the person I'm becoming, today</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input type="range" min={0} max={10} step={1} value={todayIdentity}
            onChange={e => upsertHabitLog(todayStr(), { identityScore: Number(e.target.value) })}
            style={{ flex: 1, accentColor: VIOLET }} />
          <div style={{ width: 30, textAlign: "center", fontSize: 19, fontWeight: 700, color: VIOLET }}>{todayIdentity}</div>
        </div>
        <div style={{ fontSize: 11, color: SLATE, marginTop: 12, marginBottom: 4 }}>Why? (optional)</div>
        <textarea
          value={todayIdentityNote}
          onChange={e => upsertHabitLog(todayStr(), { identityNote: e.target.value })}
          placeholder="What made today feel like that?"
          style={{ ...inputStyle, minHeight: 44, resize: "vertical" }}
        />
      </div>

      <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, color: TEXT, margin: 0 }}>Weekly review</h3>
          <span style={{ fontSize: 10, fontWeight: 700, color: VIOLET, background: VIOLET_BG, padding: "3px 9px", borderRadius: 10 }}>Sundays</span>
        </div>
        {!showReviewForm ? (
          <SmallBtn onClick={() => setShowReviewForm(true)} style={{ background: VIOLET }}><Plus size={13} /> New review</SmallBtn>
        ) : (
          <>
            {[
              ["wentWell", "What went well?"], ["wastedTime", "Where did I waste time?"], ["proud", "What made me proud?"],
              ["hurtDecision", "What decisions hurt me?"], ["lesson", "Biggest lesson?"], ["nextFocus", "What deserves attention next week?"]
            ].map(([key, label]) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11.5, color: SLATE, marginBottom: 4 }}>{label}</div>
                <textarea style={{ ...inputStyle, minHeight: 50, resize: "vertical" }} value={review[key]} onChange={e => setReview({ ...review, [key]: e.target.value })} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <SmallBtn onClick={submitReview} style={{ background: VIOLET }}><Check size={13} /> Save review</SmallBtn>
              <SmallBtn tone="ghost" onClick={() => setShowReviewForm(false)}>Cancel</SmallBtn>
            </div>
          </>
        )}
        {weeklyReviews.length === 0 && !showReviewForm && <Empty text="No reviews yet — first one starts this Sunday." />}
        {weeklyReviews.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {weeklyReviews.slice(0, 4).map(w => (
              <div key={w.id} style={{ padding: "10px 0", borderBottom: `1px solid ${INK_SOFT}18` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: VIOLET }}>{w.date}</span>
                  <DeleteBtn onDelete={() => deleteWeeklyReview(w.id)} />
                </div>
                <div style={{ fontSize: 11.5, color: SLATE }}>{w.lesson || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HabitsTab({ data, upsertHabitLog, toggleHabitBool, incrementAlcohol, editHabitLog, deleteHabitLog, addFoodItem, editFoodItem, deleteFoodItem, addAbstinence, resetAbstinence, editAbstinence, deleteAbstinence, addWeeklyReview, deleteWeeklyReview }) {
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [showAbstinence, setShowAbstinence] = useState(false);
  const [showLogDaySheet, setShowLogDaySheet] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [review, setReview] = useState({ wentWell: "", wastedTime: "", proud: "", hurtDecision: "", lesson: "", nextFocus: "" });
  const [, setGlanceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setGlanceTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const dates = monthDates(month);
  // Glance totals sum every day shown in the grid (the whole month), so manually adding up the visible squares always matches
  const relevantDates = dates;

  function logFor(date) { return data.habits.find(h => h.date === date); }
  const todayIdentity = logFor(todayStr())?.identityScore ?? 5;
  const todayIdentityNote = logFor(todayStr())?.identityNote ?? "";
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(todayStr(), -i));
  const identityScores = last30.map(d => logFor(d)?.identityScore).filter(v => v !== undefined);
  const identityAvg = identityScores.length ? (identityScores.reduce((a, b) => a + b, 0) / identityScores.length).toFixed(1) : "—";
  function submitReview() {
    addWeeklyReview(review);
    setReview({ wentWell: "", wastedTime: "", proud: "", hurtDecision: "", lesson: "", nextFocus: "" });
    setShowReviewForm(false);
  }
  function weightBefore(date) {
    const prior = data.habits.filter(h => h.date < date && h.weight).sort((a, b) => b.date.localeCompare(a.date))[0];
    return prior ? Number(prior.weight) : null;
  }

  const trainedCount = relevantDates.filter(d => logFor(d)?.trained).length;
  const fastingCount = relevantDates.filter(d => (logFor(d)?.fastingHours || 0) > 0).length;

  const activeFast = (() => {
    const todayLog = logFor(todayStr());
    if (!todayLog?.fastingHours || !todayLog?.fastingStart || todayLog?.fastCompleted) return null;
    const [h, m] = todayLog.fastingStart.split(":").map(Number);
    const now = new Date();
    let diff = (now.getHours() * 60 + now.getMinutes()) - (h * 60 + m);
    if (diff < 0) diff += 24 * 60;
    const totalMin = todayLog.fastingHours * 60;
    const remaining = totalMin - diff;
    return remaining > 0 ? { remaining, pct: Math.min(100, (diff / totalMin) * 100) } : null;
  })();

  // Drinks broken into week-long buckets (7-day chunks from the 1st of the month)
  const weekBuckets = [];
  for (let i = 0; i < relevantDates.length; i += 7) {
    const chunk = relevantDates.slice(i, i + 7);
    const total = chunk.reduce((s, d) => s + (logFor(d)?.alcoholDrinks || 0), 0);
    weekBuckets.push({ label: `Wk${Math.floor(i / 7) + 1}`, drinks: total });
  }
  const totalDrinks = weekBuckets.reduce((s, w) => s + w.drinks, 0);

  const weekStartDate = (() => {
    const d = new Date(todayStr() + "T00:00:00");
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  })();
  const weekDatesSoFar = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i)).filter(d => d <= todayStr());
  const drinksThisWeek = weekDatesSoFar.reduce((s, d) => s + (logFor(d)?.alcoholDrinks || 0), 0);
  const fastedThisWeek = weekDatesSoFar.filter(d => (logFor(d)?.fastingHours || 0) > 0).length;

  // Weight tracking — practical view: latest, 7-entry average, goal
  const weightLogs = data.habits.filter(h => h.weight).sort((a, b) => a.date.localeCompare(b.date));
  const latestWeight = weightLogs.length ? weightLogs[weightLogs.length - 1] : null;
  const latestDow = latestWeight ? new Date(latestWeight.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }) : "";
  const toGoalRaw = latestWeight ? data.goalWeight - Number(latestWeight.weight) : null;
  const toGoalLabel = toGoalRaw === null ? "—" : (toGoalRaw > 0 ? "+" : toGoalRaw < 0 ? "-" : "") + Math.abs(toGoalRaw).toFixed(1) + " kg";
  const prevBeforeLatest = latestWeight ? weightBefore(latestWeight.date) : null;
  const increment = (latestWeight && prevBeforeLatest != null) ? Number(latestWeight.weight) - prevBeforeLatest : null;
  const incrementLabel = increment === null ? "—" : (increment > 0 ? "+" : "") + increment.toFixed(1) + " kg";
  const incrementColor = increment === null ? SLATE : increment > 0 ? CORAL : increment < 0 ? TEAL : SLATE;

  const [dayForm, setDayForm] = useState({ date: todayStr(), wakeTime: "", sleepTime: "", weight: "", trainingNote: "" });
  function saveDayForm() {
    const { date, ...rest } = dayForm;
    upsertHabitLog(date, rest);
    setDayForm({ ...dayForm, wakeTime: "", sleepTime: "", weight: "", trainingNote: "" });
  }
  function sleepHoursFor(entry) {
    if (!entry.sleepTime || !entry.wakeTime) return null;
    const [sh, sm] = entry.sleepTime.split(":").map(Number);
    const [wh, wm] = entry.wakeTime.split(":").map(Number);
    let diff = (wh * 60 + wm) - (sh * 60 + sm);
    if (diff <= 0) diff += 24 * 60;
    return diff / 60;
  }
  const [showSleep, setShowSleep] = useState(false);
  const RANGE_OPTIONS = [
    { key: "7d", label: "7 Days", days: 7 },
    { key: "2w", label: "2 Weeks", days: 14 },
    { key: "1m", label: "1 Month", days: 30 },
    { key: "3m", label: "3 Months", days: 90 },
  ];
  const [rangeIdx, setRangeIdx] = useState(0);
  const chartRange = RANGE_OPTIONS[rangeIdx];
  const rangeCutoff = addDays(todayStr(), -chartRange.days);
  const rawSleepDays = data.habits.filter(h => h.sleepTime && h.wakeTime && h.date >= rangeCutoff).sort((a, b) => a.date.localeCompare(b.date));
  const sleepChartData = chartRange.days <= 14
    ? rawSleepDays.map(h => ({ date: h.date.slice(5), hours: Number(sleepHoursFor(h).toFixed(1)), drinks: h.alcoholDrinks || 0 }))
    : (() => {
        const buckets = [];
        for (let i = 0; i < rawSleepDays.length; i += 7) {
          const chunk = rawSleepDays.slice(i, i + 7);
          const avgHours = chunk.reduce((s, h) => s + sleepHoursFor(h), 0) / chunk.length;
          const totalDrinks = chunk.reduce((s, h) => s + (h.alcoholDrinks || 0), 0);
          buckets.push({ date: `Wk ${buckets.length + 1}`, hours: Number(avgHours.toFixed(1)), drinks: totalDrinks });
        }
        return buckets;
      })();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showIdentityReview, setShowIdentityReview] = useState(false);

  const rows = [
    { key: "trained", label: "Trained", color: TEAL, bg: TEAL_BG, kind: "bool" },
    { key: "fastingHours", label: "Fasted", color: AMBER, bg: AMBER_BG, kind: "fasting" },
    { key: "alcoholDrinks", label: "Alcohol", color: CORAL, bg: CORAL_BG, kind: "tally" },
  ];

  const weightChartData = weightLogs.filter(h => h.date >= rangeCutoff).map(h => ({ date: h.date.slice(5), weight: Number(h.weight) }));
  const periodAvg = weightChartData.length ? (weightChartData.reduce((s, w) => s + w.weight, 0) / weightChartData.length).toFixed(1) : null;
  const periodAvgLabel = { "7d": "7-day avg", "2w": "2-week avg", "1m": "1-month avg", "3m": "3-month avg" }[chartRange.key];

  const [fastDate, setFastDate] = useState(null);
  const weekdayLetter = d => new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "narrow" });

  if (showAbstinence) {
    return (
      <AbstinencePage
        data={data}
        addAbstinence={addAbstinence}
        resetAbstinence={resetAbstinence}
        editAbstinence={editAbstinence}
        deleteAbstinence={deleteAbstinence}
        onBack={() => setShowAbstinence(false)}
      />
    );
  }

  if (showIdentityReview) {
    return (
      <IdentityReviewPage
        todayIdentity={todayIdentity}
        todayIdentityNote={todayIdentityNote}
        identityAvg={identityAvg}
        upsertHabitLog={upsertHabitLog}
        review={review}
        setReview={setReview}
        showReviewForm={showReviewForm}
        setShowReviewForm={setShowReviewForm}
        submitReview={submitReview}
        weeklyReviews={data.weeklyReviews}
        deleteWeeklyReview={deleteWeeklyReview}
        onBack={() => setShowIdentityReview(false)}
      />
    );
  }

  return (
    <>
      <Section title="This month at a glance"
        right={<SmallBtn onClick={() => setShowLogDaySheet(true)} style={{ background: TEAL, padding: "6px 13px", minHeight: 30, fontSize: 11.5 }}><Plus size={12} /> Log day</SmallBtn>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 14, padding: "12px 12px" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${TEAL}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Dumbbell size={13} color={TEAL} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{trainedCount} days</div>
            <div style={{ fontSize: 9.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 3 }}>Trained</div>
          </div>
          <div style={{
            background: activeFast ? `${AMBER}14` : CARD, borderRadius: 14, padding: "12px 12px",
            border: `1px solid ${INK_SOFT}22`
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${AMBER}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Flame size={13} color={AMBER} />
              </div>
              {activeFast && <span style={{ fontSize: 9, fontWeight: 700, color: AMBER, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</span>}
            </div>
            {activeFast ? (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 2 }}>
                  {Math.floor(activeFast.remaining / 60)}h {activeFast.remaining % 60}m left
                </div>
                <div style={{ fontSize: 9.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Currently fasting</div>
                <FastBar pct={activeFast.pct} />
              </div>
            ) : (
              <>
                <div style={{ fontSize: 9.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Fasted</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{fastedThisWeek}</div>
                    <div style={{ fontSize: 9.5, color: SLATE }}>this week</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{fastingCount}</div>
                    <div style={{ fontSize: 9.5, color: SLATE }}>this month</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 14, padding: "12px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${CORAL}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Wine size={13} color={CORAL} />
              </div>
              <span style={{ fontSize: 9.5, color: SLATE, textTransform: "uppercase", letterSpacing: "0.04em" }}>Drinks</span>
            </div>
            <div style={{ display: "flex", gap: 18 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: drinksThisWeek > 0 ? CORAL : TEXT }}>{drinksThisWeek}</div>
                <div style={{ fontSize: 9.5, color: SLATE }}>this week</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: totalDrinks > 0 ? CORAL : TEXT }}>{totalDrinks}</div>
                <div style={{ fontSize: 9.5, color: SLATE }}>this month</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Monthly grid">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <IconBtn icon={ChevronLeft} onClick={() => setMonth(shiftMonth(month, -1))} label="Previous month" />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{new Date(month + "-01T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <IconBtn icon={ChevronRight} onClick={() => setMonth(shiftMonth(month, 1))} label="Next month" />
        </div>
        <div style={{ overflowX: "auto", paddingBottom: 6 }}>
          <div style={{ display: "inline-block" }}>
            <div style={{ display: "flex", gap: 3, marginBottom: 4, marginLeft: 74 }}>
              {dates.map(d => (
                <div key={d} style={{ width: 26, minWidth: 26, textAlign: "center", fontSize: 9, color: SLATE, lineHeight: 1.1 }}>
                  <div>{Number(d.slice(8, 10))}</div>
                  <div style={{ fontWeight: 700, color: INK_SOFT }}>{weekdayLetter(d)}</div>
                </div>
              ))}
            </div>
            {rows.map(row => (
              <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 4 }}>
                <div style={{ width: 70, fontSize: 11.5, fontWeight: 600, color: TEXT }}>{row.label}</div>
                {dates.map(d => {
                  const log = logFor(d);
                  if (row.kind === "bool") {
                    return <HeatCell key={d} filled={!!log?.[row.key]} color={row.color} bg={row.bg} onClick={() => toggleHabitBool(d, row.key)} />;
                  }
                  if (row.kind === "fasting") {
                    const n = log?.fastingHours || 0;
                    return <HeatCell key={d} filled={n > 0} color={row.color} bg={row.bg} label={n > 0 ? n : ""} onClick={() => setFastDate(d)} />;
                  }
                  if (row.kind === "tally") {
                    const n = log?.alcoholDrinks || 0;
                    return <HeatCell key={d} filled={n > 0} color={row.color} bg={row.bg} label={n > 0 ? n : ""} onClick={() => incrementAlcohol(d)} />;
                  }
                  // weight trend — read only, colored by direction vs previous logged weight
                  if (!log?.weight) return <HeatCell key={d} filled={false} color={SLATE} bg={PAPER_DIM} />;
                  const prev = weightBefore(d);
                  const cur = Number(log.weight);
                  const dir = prev == null ? "–" : cur < prev ? "↓" : cur > prev ? "↑" : "–";
                  const col = dir === "↓" ? TEAL : dir === "↑" ? CORAL : SLATE;
                  return <HeatCell key={d} filled={true} color={col} bg={PAPER_DIM} label={dir} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {fastDate && (
        <FastingModal date={fastDate} log={logFor(fastDate)} onClose={() => setFastDate(null)}
          blockNew={!!activeFast && fastDate !== todayStr()}
          onSave={updates => upsertHabitLog(fastDate, updates)} />
      )}

      <div className="fade-up" style={{ marginBottom: 20 }}>
        <button onClick={() => setShowIdentityReview(true)} style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: CARD, border: `1px solid ${INK_SOFT}18`, borderRadius: 22, padding: "18px 16px", cursor: "pointer"
        }}>
          <h2 style={{ fontSize: 18, color: TEXT, margin: 0 }}>Identity & review</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: VIOLET }}>{todayIdentity}/10 today</span>
            <ChevronRight size={16} color={SLATE} />
          </div>
        </button>
      </div>

      <Section title="Weight tracking"
        right={<span style={{ fontSize: 10.5, fontWeight: 700, color: SLATE, background: PAPER_DIM, borderRadius: 999, padding: "4px 11px", whiteSpace: "nowrap" }}>Goal {data.goalWeight} kg</span>}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          <div>
            <div style={{ fontSize: 10, color: SLATE }}>Latest</div>
            <div style={{ fontSize: 16 }}>{latestWeight ? latestWeight.weight + " kg" : "—"}</div>
            <div style={{ fontSize: 9.5, color: SLATE }}>{latestDow}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: SLATE }}>{periodAvgLabel}</div>
            <div style={{ fontSize: 16 }}>{periodAvg ? periodAvg + " kg" : "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: SLATE }}>To goal</div>
            <div style={{ fontSize: 15 }}>{toGoalLabel}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: SLATE }}>Since last</div>
            <div style={{ fontSize: 16, color: incrementColor }}>{incrementLabel}</div>
          </div>
        </div>
      </Section>

      <Section title="Charts" right={
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setRangeIdx((rangeIdx + 1) % RANGE_OPTIONS.length)} style={{
            fontSize: 11, fontWeight: 600, border: `1px solid ${INK_SOFT}40`, borderRadius: 999, padding: "4px 11px",
            background: "transparent", color: TEXT, cursor: "pointer"
          }}>{chartRange.label}</button>
          <button onClick={() => setShowSleep(!showSleep)} style={{
            fontSize: 11, fontWeight: 600, border: `1px solid ${INK_SOFT}40`, borderRadius: 999, padding: "4px 11px",
            background: showSleep ? TEAL : "transparent", color: showSleep ? "white" : TEXT, cursor: "pointer"
          }}>{showSleep ? "Weight" : "Sleep hours"}</button>
        </div>
      }>
        {!showSleep ? (
          weightChartData.length > 1 ? (
            <div style={{ height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={PAPER_DIM} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: SLATE }} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10, fill: SLATE }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke={TEAL} strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty text="Log weight on at least 2 days to see a trend line." />
        ) : (
          sleepChartData.length > 0 ? (
            <div>
              <div style={{ display: "flex", gap: 14, marginBottom: 6, fontSize: 10.5, color: SLATE }}>
                <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: SKY, marginRight: 4 }} />{chartRange.days <= 14 ? "Sleep hours" : "Avg sleep hours/wk"}</span>
                <span><span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, background: CORAL, marginRight: 4 }} />{chartRange.days <= 14 ? "Drinks that day" : "Total drinks/wk"}</span>
              </div>
              <div style={{ height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sleepChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke={PAPER_DIM} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: SLATE }} />
                    <YAxis tick={{ fontSize: 10, fill: SLATE }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="hours" fill={SKY} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="drinks" fill={CORAL} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : <Empty text="Log both sleep time and wake time to see sleep hours." />
        )}
      </Section>

      {showLogDaySheet && (
        <BottomSheet title="Log a day" onClose={() => setShowLogDaySheet(false)}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Field label="Date"><input style={minimalInputStyle} type="date" value={dayForm.date} onChange={e => setDayForm({ ...dayForm, date: e.target.value })} /></Field>
            <Field label="Sleep time"><input style={minimalInputStyle} type="time" value={dayForm.sleepTime} onChange={e => setDayForm({ ...dayForm, sleepTime: e.target.value })} /></Field>
            <Field label="Wake time"><input style={minimalInputStyle} type="time" value={dayForm.wakeTime} onChange={e => setDayForm({ ...dayForm, wakeTime: e.target.value })} /></Field>
            <Field label="Weight (kg)"><input style={minimalInputStyle} type="number" value={dayForm.weight} onChange={e => setDayForm({ ...dayForm, weight: e.target.value })} /></Field>
            <Field label="Training note"><input style={minimalInputStyle} value={dayForm.trainingNote} onChange={e => setDayForm({ ...dayForm, trainingNote: e.target.value })} placeholder="e.g. RDL 3x10" /></Field>
          </div>
          <SmallBtn onClick={() => { saveDayForm(); setShowLogDaySheet(false); }} style={{ marginTop: 18, background: TEAL, width: "100%", justifyContent: "center" }}><Plus size={13} /> Save day</SmallBtn>
        </BottomSheet>
      )}

      <NutritionLog data={data} addFoodItem={addFoodItem} editFoodItem={editFoodItem} deleteFoodItem={deleteFoodItem} />

      <button onClick={() => setShowAbstinence(true)} className="fade-up" style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: CARD, border: `1px solid ${INK_SOFT}18`, borderRadius: 22, padding: "18px 16px",
        cursor: "pointer", marginBottom: 20
      }}>
        <h2 style={{ fontSize: 18, color: TEXT, margin: 0 }}>Abstinence</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {data.abstinence.length > 0 && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: SLATE }}>{data.abstinence.length} tracker{data.abstinence.length === 1 ? "" : "s"}</span>
          )}
          <ChevronRight size={16} color={SLATE} />
        </div>
      </button>

      <Section title="History" eyebrow="every logged day" collapsible open={historyOpen} onToggle={() => setHistoryOpen(!historyOpen)}>
        {data.habits.length === 0 && <Empty text="No days logged yet." />}
        {data.habits.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(h => (
          <HabitLogRow key={h.id} log={h} onSave={updates => editHabitLog(h.id, updates)} onDelete={() => deleteHabitLog(h.id)} />
        ))}
      </Section>
    </>
  );
}

function HabitLogRow({ log, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [f, setF] = useState({
    weight: log.weight || "", wakeTime: log.wakeTime || "", sleepTime: log.sleepTime || "",
    trainingNote: log.trainingNote || "", trained: !!log.trained, alcoholDrinks: log.alcoholDrinks || 0,
  });

  if (editing) {
    return (
      <div style={{ background: CARD, border: `1px solid ${INK_SOFT}22`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
          <Field label="Weight (kg)"><input style={inputStyle} type="number" value={f.weight} onChange={e => setF({ ...f, weight: e.target.value })} /></Field>
          <Field label="Sleep time"><input style={inputStyle} type="time" value={f.sleepTime} onChange={e => setF({ ...f, sleepTime: e.target.value })} /></Field>
          <Field label="Wake time"><input style={inputStyle} type="time" value={f.wakeTime} onChange={e => setF({ ...f, wakeTime: e.target.value })} /></Field>
          <Field label="Drinks"><input style={inputStyle} type="number" value={f.alcoholDrinks} onChange={e => setF({ ...f, alcoholDrinks: e.target.value })} /></Field>
          <Field label="Training note"><input style={inputStyle} value={f.trainingNote} onChange={e => setF({ ...f, trainingNote: e.target.value })} placeholder="e.g. RDL 3x10" /></Field>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: SLATE, marginBottom: 10 }}>
          <input type="checkbox" checked={f.trained} onChange={e => setF({ ...f, trained: e.target.checked })} /> Trained
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <SmallBtn tone="gold" onClick={() => { onSave({ ...f, weight: Number(f.weight) || 0, alcoholDrinks: Number(f.alcoholDrinks) || 0 }); setEditing(false); }}><Check size={12} /> Save</SmallBtn>
          <SmallBtn tone="ghost" onClick={() => setEditing(false)}><X size={12} /> Cancel</SmallBtn>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => setRevealed(r => !r)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${INK_SOFT}18`, cursor: "pointer", userSelect: "none" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{log.date}</div>
        <div style={{ fontSize: 11, color: SLATE }}>
          {log.trained ? "Trained" : "Rest"}{log.weight ? ` · ${log.weight}kg` : ""}{log.alcoholDrinks ? ` · ${log.alcoholDrinks} drink${log.alcoholDrinks === 1 ? "" : "s"}` : ""}
        </div>
      </div>
      {revealed && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
          <IconBtn icon={Edit2} onClick={() => setEditing(true)} label="Edit" />
          <DeleteBtn onDelete={onDelete} />
        </div>
      )}
    </div>
  );
}
