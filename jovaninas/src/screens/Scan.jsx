import { useState } from "react";
import { Camera, Trash2, Plus, Check, FileText, Loader2 } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { parseMenuText } from "../lib/parseMenu.js";
import { commitMenu } from "../lib/menuOps.js";
import { todayStr, uid } from "../lib/id.js";
import { extractTextFromPdf } from "../lib/pdfExtract.js";

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
  const menuType = "Dinner";
  const mealPeriod = "";
  const effectiveDate = todayStr();
  const [rawText, setRawText] = useState("");
  const [photos, setPhotos] = useState([]);
  const [extraction, setExtraction] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  const [pdfStatus, setPdfStatus] = useState(null);
  const [pdfProgress, setPdfProgress] = useState(null);
  const [showPasteText, setShowPasteText] = useState(false);
  const [sourcePdf, setSourcePdf] = useState(null);
  const [sourcePdfName, setSourcePdfName] = useState(null);
  const [showDrinks, setShowDrinks] = useState(false);
  const [showPreservice, setShowPreservice] = useState(false);
  const [preservice, setPreservice] = useState({ 
    focacciaFlavor: "", 
    oysterOrigin: "", 
    gelatoFlavors: "",
    sorbetFlavors: ""
  });

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    const dataUrls = await Promise.all(files.map(readFileAsDataUrl));
    setPhotos((prev) => [...prev, ...dataUrls]);
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfStatus("loading");
    setPdfProgress(null);
    try {
      const [{ text, hasText, pageCount, discoveredHeaders }, pdfDataUrl] = await Promise.all([
        extractTextFromPdf(file, (page, total) => setPdfProgress({ page, total })),
        readFileAsDataUrl(file),
      ]);
      if (!hasText) {
        setPdfStatus("no-text");
        return;
      }
      setRawText(text);
      setSourcePdf(pdfDataUrl);
      setSourcePdfName(file.name);
      setPdfStatus(null);
      runExtractionFromText(text, discoveredHeaders);
      void pageCount;
    } catch (err) {
      console.error(err);
      setPdfStatus("error");
    }
  }

  function runExtractionFromText(text, extraFoodHeaders) {
    const result = parseMenuText(text, { extraFoodHeaders: extraFoodHeaders || [] });
    if (result.sections.length === 0) result.sections.push({ name: "Menu", items: [] });
    if (!result.drinkSections) result.drinkSections = [];
    setExtraction(result);
    setActiveSection(0);
    setShowDrinks(false);
    setShowPreservice(true);
  }

  function runExtraction() {
    runExtractionFromText(rawText);
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

  function updateDrinkItem(sIdx, iIdx, field, value) {
    setExtraction((prev) => {
      const next = structuredClone(prev);
      next.drinkSections[sIdx].items[iIdx][field] = field === "price" ? (value === "" ? null : Number(value)) : value;
      return next;
    });
  }

  function removeDrinkItem(sIdx, iIdx) {
    setExtraction((prev) => {
      const next = structuredClone(prev);
      next.drinkSections[sIdx].items.splice(iIdx, 1);
      return next;
    });
  }

  function saveMenu() {
    const cleanExtraction = {
      ...extraction,
      sections: extraction.sections
        .map((s) => ({ ...s, items: s.items.filter((i) => i.name && i.name.trim()) }))
        .filter((s) => s.items.length > 0),
      drinkSections: (extraction.drinkSections || [])
        .map((s) => ({ ...s, items: s.items.filter((i) => i.name && i.name.trim()) }))
        .filter((s) => s.items.length > 0),
    };
    if (cleanExtraction.sections.length === 0) {
      alert("Add at least one dish before saving.");
      return;
    }
    const menuId = uid("menu");
    update((draft) => {
      commitMenu(draft, cleanExtraction, { menuId, menuType, mealPeriod, effectiveDate, photos, rawText, sourcePdf, sourcePdfName, preservice });
    });
    go("menus", { subTab: "changes", menuId });
  }

  function handlePreserviceClose() {
    setShowPreservice(false);
  }

  return (
    <div>
      {!extraction && (
        <>
          <div className="card" style={{ marginBottom: 14, textAlign: "center" }}>
            <FileText size={26} color="var(--red)" />
            <h3 style={{ marginTop: 10 }}>Upload a PDF menu</h3>
            <p className="small muted" style={{ marginBottom: 14 }}>
              Reads the text straight out of the file — no typing. Works for menus exported from Word, Canva, Google
              Docs, etc. (anything with real text, not a flat scan of a printed page).
            </p>
            <label className="btn accent" style={{ cursor: "pointer" }}>
              {pdfStatus === "loading" ? (
                <><Loader2 size={13} className="spin" style={{ marginRight: 4 }} /> Reading{pdfProgress ? ` page ${pdfProgress.page}/${pdfProgress.total}` : "…"}</>
              ) : (
                <>Choose PDF</>
              )}
              <input type="file" accept="application/pdf" onChange={handlePdfUpload} style={{ display: "none" }} disabled={pdfStatus === "loading"} />
            </label>
            {pdfStatus === "no-text" && (
              <p className="small" style={{ color: "var(--red)", marginTop: 10 }}>
                This PDF doesn't have a readable text layer (likely a scanned image). Try a photo or paste the text
                below instead.
              </p>
            )}
            {pdfStatus === "error" && (
              <p className="small" style={{ color: "var(--red)", marginTop: 10 }}>
                Couldn't read that file. Try a photo or paste the text below instead.
              </p>
            )}
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: photos.length ? 10 : 0 }}>
              <p className="section-title" style={{ margin: 0 }}>Photo (for the archive)</p>
              <label className="icon-btn" style={{ cursor: "pointer" }}>
                <Camera size={13} /> Add photo
                <input type="file" accept="image/*" multiple onChange={handlePhotos} style={{ display: "none" }} />
              </label>
            </div>
            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={p} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10 }} />
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
          </div>

          {!showPasteText && (
            <button className="btn ghost" style={{ width: "100%", marginBottom: 14 }} onClick={() => setShowPasteText(true)}>
              Paste or type menu text instead
            </button>
          )}

          {showPasteText && (
            <div className="card" style={{ marginBottom: 14 }}>
              <label className="field">
                Menu text
                <textarea
                  rows={9}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={"PASTA\nElk Bolognese — elk, pork, tomato, juniper, mafaldine $29\n\nENTREES\nPork Milanese — fennel, apple mostarda, arugula, parmesan $36"}
                />
              </label>
              <button className="btn accent" onClick={runExtraction} disabled={!rawText.trim()} style={{ width: "100%" }}>
                Extract menu structure
              </button>
            </div>
          )}
        </>
      )}

      {extraction && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p className="section-title" style={{ margin: 0 }}>Food menu preview</p>
            {extraction.menuNumber && <span className="pill neutral">Menu No. {extraction.menuNumber}</span>}
          </div>
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
                    <Check size={15} color="var(--forest)" />
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

          {extraction.drinkSections?.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <button
                className="btn ghost"
                style={{ width: "100%", justifyContent: "space-between" }}
                onClick={() => setShowDrinks((v) => !v)}
              >
                <span>
                  Drinks found ({extraction.drinkSections.reduce((n, s) => n + s.items.length, 0)})
                </span>
                <span className="tiny muted">{showDrinks ? "Hide" : "Review"}</span>
              </button>
              {showDrinks && (
                <div style={{ marginTop: 10 }}>
                  <p className="tiny muted" style={{ marginBottom: 10 }}>
                    Best-effort — on a page that mixes food and drinks columns tightly, some lines can land in the
                    wrong place. Check names/prices before saving.
                  </p>
                  {extraction.drinkSections.map((s, sIdx) => (
                    <div key={sIdx} style={{ marginBottom: 12 }}>
                      <p className="small" style={{ fontWeight: 700, marginBottom: 6 }}>{s.name}</p>
                      {s.items.map((item, iIdx) => (
                        <div key={iIdx} className="dish-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              type="text"
                              placeholder="Drink name"
                              value={item.name}
                              onChange={(e) => updateDrinkItem(sIdx, iIdx, "name", e.target.value)}
                            />
                            <button className="btn ghost" onClick={() => removeDrinkItem(sIdx, iIdx)}><Trash2 size={13} /></button>
                          </div>
                          <input
                            type="text"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateDrinkItem(sIdx, iIdx, "description", e.target.value)}
                          />
                          <input
                            type="number"
                            placeholder="Price"
                            value={item.price ?? ""}
                            onChange={(e) => updateDrinkItem(sIdx, iIdx, "price", e.target.value)}
                            style={{ maxWidth: 120 }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={() => setExtraction(null)}>Back</button>
            <button className="btn accent" style={{ flex: 1 }} onClick={saveMenu}>
              <Check size={13} /> Confirm &amp; save
            </button>
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            Saving compares this menu against the most recent confirmed "{menuType}" menu and generates a change briefing.
          </p>
        </div>
      )}

      {showPreservice && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(30,26,15,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 55 }}>
          <div className="card" style={{ width: "min(380px, 88vw)", maxHeight: "80vh", overflowY: "auto" }}>
            <p className="section-title">Preservice details</p>
            <p className="tiny muted" style={{ marginBottom: 10 }}>
              These change daily and aren't printed on the menu — same questions as the preservice meeting. Leave any blank if not applicable tonight.
            </p>
            <label className="field">
              Today's focaccia flavor/ingredient
              <input
                type="text"
                value={preservice.focacciaFlavor}
                onChange={(e) => setPreservice((p) => ({ ...p, focacciaFlavor: e.target.value }))}
                placeholder="e.g. rosemary + sea salt"
              />
            </label>
            <label className="field">
              Where are tonight's oysters from?
              <input
                type="text"
                value={preservice.oysterOrigin}
                onChange={(e) => setPreservice((p) => ({ ...p, oysterOrigin: e.target.value }))}
                placeholder="e.g. Kumamoto, Humboldt Bay, CA"
              />
            </label>
            <label className="field">
              Tonight's gelato flavors
              <input
                type="text"
                value={preservice.gelatoFlavors}
                onChange={(e) => setPreservice((p) => ({ ...p, gelatoFlavors: e.target.value }))}
                placeholder="e.g. pistachio, hazelnut"
              />
            </label>
            <label className="field">
              Tonight's sorbet flavors
              <input
                type="text"
                value={preservice.sorbetFlavors}
                onChange={(e) => setPreservice((p) => ({ ...p, sorbetFlavors: e.target.value }))}
                placeholder="e.g. blood orange, lemon"
              />
            </label>
            <button className="btn accent" style={{ width: "100%", marginTop: 8 }} onClick={handlePreserviceClose}>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}