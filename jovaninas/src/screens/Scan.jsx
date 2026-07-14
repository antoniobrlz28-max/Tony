import { useState } from "react";
import { Image as ImageIcon, Trash2, Plus, Check } from "lucide-react";
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

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    const dataUrls = await Promise.all(files.map(readFileAsDataUrl));
    setPhotos((prev) => [...prev, ...dataUrls]);
  }

  function runExtraction() {
    const result = parseMenuText(rawText);
    if (result.sections.length === 0) {
      result.sections.push({ name: "Menu", items: [] });
    }
    setExtraction(result);
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

  function removeSection(sIdx) {
    setExtraction((prev) => {
      const next = structuredClone(prev);
      next.sections.splice(sIdx, 1);
      return next;
    });
  }

  function addSection() {
    setExtraction((prev) => {
      const next = structuredClone(prev || { sections: [], warnings: [] });
      next.sections.push({ name: "New Section", items: [] });
      return next;
    });
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
    let result;
    update((draft) => {
      result = commitMenu(draft, cleanExtraction, {
        menuId,
        menuType,
        mealPeriod,
        effectiveDate,
        photos,
        rawText,
      });
    });
    go("changes", { menuId });
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 14 }}>
        <p className="section-title">1. Capture</p>
        <div className="grid cols-3">
          <label className="field">
            Menu type
            <select value={menuType} onChange={(e) => setMenuType(e.target.value)}>
              {MENU_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Meal period (optional)
            <input type="text" value={mealPeriod} onChange={(e) => setMealPeriod(e.target.value)} placeholder="e.g. Dinner service" />
          </label>
          <label className="field">
            Effective date
            <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </label>
        </div>

        <label className="field">
          Photo(s) — original image is always preserved, but this build does not run automated OCR. Paste or type
          the menu text below to extract it.
          <input type="file" accept="image/*,.pdf" multiple onChange={handlePhotos} />
        </label>
        {photos.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {photos.map((p, i) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={p} alt={`page ${i + 1}`} style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                <button
                  className="btn danger"
                  style={{ position: "absolute", top: -6, right: -6, padding: "2px 5px" }}
                  onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="field">
          Menu text (paste or type)
          <textarea
            rows={10}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={"PASTA\nElk Bolognese — elk, pork, tomato, juniper, mafaldine, parmesan $29\n\nENTREES\nPork Milanese — fennel, apple mostarda, arugula, parmesan $36"}
          />
        </label>
        <button className="btn" onClick={runExtraction} disabled={!rawText.trim()}>
          Extract menu structure
        </button>
      </div>

      {extraction && (
        <div className="card">
          <p className="section-title">2. Review extraction</p>
          {extraction.warnings?.length > 0 && (
            <div className="pill gold" style={{ marginBottom: 10 }}>
              {extraction.warnings.length} line(s) could not be parsed automatically — check below
            </div>
          )}
          {extraction.sections.map((section, sIdx) => (
            <div key={sIdx} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input
                  type="text"
                  value={section.name}
                  onChange={(e) => renameSection(sIdx, e.target.value)}
                  style={{ fontWeight: 700, maxWidth: 260 }}
                />
                <button className="btn ghost" onClick={() => removeSection(sIdx)}>Remove section</button>
              </div>
              {section.items.map((item, iIdx) => (
                <div key={iIdx} className="grid cols-3" style={{ marginBottom: 6, alignItems: "start" }}>
                  <input type="text" placeholder="Dish name" value={item.name} onChange={(e) => updateItem(sIdx, iIdx, "name", e.target.value)} />
                  <input type="text" placeholder="Description / components" value={item.description} onChange={(e) => updateItem(sIdx, iIdx, "description", e.target.value)} />
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="number" placeholder="Price" value={item.price ?? ""} onChange={(e) => updateItem(sIdx, iIdx, "price", e.target.value)} />
                    <button className="btn ghost" onClick={() => removeItem(sIdx, iIdx)}><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              <button className="btn ghost" onClick={() => addItem(sIdx)}><Plus size={12} /> Add dish</button>
            </div>
          ))}
          <button className="btn ghost" onClick={addSection} style={{ marginBottom: 14 }}><Plus size={12} /> Add section</button>
          <hr className="sep" />
          <button className="btn" onClick={saveMenu}><Check size={13} /> Confirm &amp; save menu version</button>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            Saving will compare this menu against the most recent confirmed "{menuType}" menu, detect changes, and
            generate a change briefing.
          </p>
        </div>
      )}
    </div>
  );
}
