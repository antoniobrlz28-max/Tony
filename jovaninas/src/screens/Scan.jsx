import { useState } from "react";
import { Camera, Trash2, Plus, Check, Image as ImageIcon } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { MENU_TYPES } from "../lib/storage.js";
import { parseMenuText } from "../lib/parseMenu.js";
import { commitMenu } from "../lib/menuOps.js";
import { todayStr, uid } from "../lib/id.js";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Scan({ go }) {
  const { update } = useData();
  const [menuType, setMenuType] = useState("Dinner");
  const [mealPeriod, setMealPeriod] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayStr());
  const [rawText, setRawText] = useState("");
  const [photos, setPhotos] = useState([]);
  const [extraction, setExtraction] = useState(null);
  const [activeSection, setActiveSection] = useState(0);

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    const dataUrls = await Promise.all(files.map(readFileAsDataUrl));
    setPhotos((prev) => [...prev, ...dataUrls]);
  }

  function runExtraction() {
    const result = parseMenuText(rawText);
    if (result.sections.length === 0) result.sections.push({ name: "Menu", items: [] });
    setExtraction(result);
    setActiveSection(0);
  }

  function updateItem(sIdx, iIdx, field, value) {
    setExtraction((prev) => {
      const next = structuredClone(prev);
      next.sections[sIdx].items[iIdx][field] = field === "price" ? (value === "" ? null : Number(value)) : value;
      return next;
    });
  }

  function removeItem(sIdx, iIdx) {
    setExtraction((prev) => {
      const next = structuredClone(prev);
      next.sections[sIdx].items.splice(iIdx, 1);
      return next;
    });
  }

  function addItem(sIdx) {
    setExtraction((prev) => {
      const next = structuredClone(prev);
      next.sections[sIdx].items.push({ name: "", description: "", price: null, confidence: 0.5 });
      return next;
    });
  }

  function renameSection(sIdx, value) {
    setExtraction((prev) => {
      const next = structuredClone(prev);
      next.sections[sIdx].name = value;
      return next;
    });
  }

  function addSection() {
    setExtraction((prev) => {
      const next = structuredClone(prev || { sections: [], warnings: [] });
      next.sections.push({ name: "New Section", items: [] });
      return next;
    });
    setActiveSection((extraction?.sections.length) || 0);
  }

  function saveMenu() {
    const cleanExtraction = {
      ...extraction,
      sections: extraction.sections
        .map((s) => ({ ...s, items: s.items.filter((i) => i.name && i.name.trim()) }))
        .filter((s) => s.items.length > 0),
    };
    if (cleanExtraction.sections.length === 0) {
      alert("Add at least one dish before saving.");
      return;
    }
    const menuId = uid("menu");
    update((draft) => {
      commitMenu(draft, cleanExtraction, { menuId, menuType, mealPeriod, effectiveDate, photos, rawText });
    });
    go("menus", { subTab: "changes", menuId });
  }

  return (
    <div>
      {!extraction && (
        <>
          <div
            style={{
              position: "relative",
              aspectRatio: "3/4",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "linear-gradient(160deg, #1c1a15, #100f0d)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
              overflow: "hidden",
            }}
          >
            {photos.length > 0 ? (
              <img src={photos[photos.length - 1]} alt="menu" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center", color: "var(--ink-soft)" }}>
                <Camera size={28} />
                <p className="small" style={{ marginTop: 8 }}>Take a photo or upload a menu page</p>
              </div>
            )}
            {["top", "bottom"].map((v) =>
              ["left", "right"].map((h) => (
                <div
                  key={v + h}
                  style={{
                    position: "absolute",
                    [v]: 14,
                    [h]: 14,
                    width: 20,
                    height: 20,
                    borderTop: v === "top" ? "2px solid var(--brass)" : "none",
                    borderBottom: v === "bottom" ? "2px solid var(--brass)" : "none",
                    borderLeft: h === "left" ? "2px solid var(--brass)" : "none",
                    borderRight: h === "right" ? "2px solid var(--brass)" : "none",
                  }}
                />
              ))
            )}
            <label className="btn" style={{ position: "absolute", bottom: 14, cursor: "pointer" }}>
              <ImageIcon size={13} style={{ marginRight: 4 }} />
              Add photo
              <input type="file" accept="image/*,.pdf" multiple onChange={handlePhotos} style={{ display: "none" }} />
            </label>
          </div>

          {photos.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img src={p} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                  <button
                    className="btn danger"
                    style={{ position: "absolute", top: -6, right: -6, padding: "2px 5px", borderRadius: 6 }}
                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ marginBottom: 14 }}>
            <p className="section-title">Menu details</p>
            <div className="grid cols-2">
              <label className="field">
                Menu type
                <select value={menuType} onChange={(e) => setMenuType(e.target.value)}>
                  {MENU_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="field">
                Effective date
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </label>
            </div>
            <label className="field">
              Meal period (optional)
              <input type="text" value={mealPeriod} onChange={(e) => setMealPeriod(e.target.value)} placeholder="e.g. Dinner service" />
            </label>
            <label className="field">
              Menu text — this build has no automated OCR, so paste or type the text you want structured.
              <textarea
                rows={9}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={"PASTA\nElk Bolognese — elk, pork, tomato, juniper, mafaldine $29\n\nENTREES\nPork Milanese — fennel, apple mostarda, arugula, parmesan $36"}
              />
            </label>
            <button className="btn" onClick={runExtraction} disabled={!rawText.trim()} style={{ width: "100%" }}>
              Extract menu structure
            </button>
          </div>
        </>
      )}

      {extraction && (
        <div>
          <p className="section-title">Extraction preview · Step 2 of 2</p>
          {extraction.warnings?.length > 0 && (
            <div className="pill brass" style={{ marginBottom: 10 }}>
              {extraction.warnings.length} line(s) need a manual look
            </div>
          )}
          <div className="segmented" style={{ marginBottom: 12, overflowX: "auto" }}>
            {extraction.sections.map((s, i) => (
              <button key={i} className={activeSection === i ? "active" : ""} onClick={() => setActiveSection(i)}>
                {s.name || `Section ${i + 1}`}
              </button>
            ))}
          </div>

          {extraction.sections[activeSection] && (
            <div className="card" style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={extraction.sections[activeSection].name}
                onChange={(e) => renameSection(activeSection, e.target.value)}
                style={{ fontWeight: 700, marginBottom: 10 }}
              />
              {extraction.sections[activeSection].items.map((item, iIdx) => (
                <div key={iIdx} className="dish-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Check size={15} color="#6fbf8f" />
                    <input
                      type="text"
                      placeholder="Dish name"
                      value={item.name}
                      onChange={(e) => updateItem(activeSection, iIdx, "name", e.target.value)}
                    />
                    <button className="btn ghost" onClick={() => removeItem(activeSection, iIdx)}><Trash2 size={13} /></button>
                  </div>
                  <input
                    type="text"
                    placeholder="Description / components"
                    value={item.description}
                    onChange={(e) => updateItem(activeSection, iIdx, "description", e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.price ?? ""}
                    onChange={(e) => updateItem(activeSection, iIdx, "price", e.target.value)}
                    style={{ maxWidth: 120 }}
                  />
                </div>
              ))}
              <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => addItem(activeSection)}>
                <Plus size={12} /> Add item
              </button>
            </div>
          )}

          <button className="btn ghost" onClick={addSection} style={{ marginBottom: 14 }}>
            <Plus size={12} /> Add section
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={() => setExtraction(null)}>Back</button>
            <button className="btn" style={{ flex: 1 }} onClick={saveMenu}>
              <Check size={13} /> Confirm &amp; save
            </button>
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            Saving compares this menu against the most recent confirmed "{menuType}" menu and generates a change briefing.
          </p>
        </div>
      )}
    </div>
  );
}
