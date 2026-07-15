import { useState } from "react";
import { Wine, FileText, Loader2, Trash2, Plus, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { parseWineText } from "../lib/wineParser.js";
import { commitWineMenu } from "../lib/menuOps.js";
import { todayStr, uid } from "../lib/id.js";
import { extractTextFromPdf } from "../lib/pdfExtract.js";
import { formatPrices } from "../lib/priceExtractor.js";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Wine item row ─────────────────────────────────────────────────────────

function WineItemRow({ item, onChange, onRemove }) {
  const priceDisplay =
    item.priceType === "wine" && Object.keys(item.prices || {}).length > 0
      ? formatPrices(item.prices, "wine")
      : item.price != null
      ? `$${item.price}`
      : "";

  return (
    <div
      className="dish-row"
      style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Check size={15} color="var(--forest)" />
        <input
          type="text"
          placeholder="Wine name"
          value={item.name}
          onChange={(e) => onChange("name", e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn ghost" onClick={onRemove}>
          <Trash2 size={13} />
        </button>
      </div>
      {item.origin && (
        <input
          type="text"
          placeholder="Origin / region"
          value={item.origin}
          onChange={(e) => onChange("origin", e.target.value)}
        />
      )}
      {item.description && (
        <input
          type="text"
          placeholder="Notes"
          value={item.description}
          onChange={(e) => onChange("description", e.target.value)}
        />
      )}
      {/* Price display – wine items may have glass/carafe/bottle */}
      {priceDisplay ? (
        <p className="tiny muted" style={{ margin: 0 }}>
          {priceDisplay}
        </p>
      ) : (
        <input
          type="number"
          placeholder="Price"
          value={item.price ?? ""}
          onChange={(e) =>
            onChange("price", e.target.value === "" ? null : Number(e.target.value))
          }
          style={{ maxWidth: 120 }}
        />
      )}
    </div>
  );
}

// ─── Saved wine menu card ──────────────────────────────────────────────────

function SavedWineMenuCard({ menu }) {
  const [open, setOpen] = useState(false);
  const itemCount = (menu.sections || []).reduce(
    (n, s) => n + (s.items?.length || 0),
    0
  );

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <button
        className="btn ghost"
        style={{ width: "100%", justifyContent: "space-between" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <span style={{ fontWeight: 600 }}>{menu.effectiveDate}</span>
          <span className="tiny muted" style={{ marginLeft: 8 }}>
            {itemCount} wine{itemCount !== 1 ? "s" : ""}
          </span>
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {(menu.sections || []).map((section, sIdx) => (
            <div key={sIdx} style={{ marginBottom: 12 }}>
              <p
                className="small"
                style={{ fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}
              >
                {section.name}
              </p>
              {(section.items || []).map((item, iIdx) => {
                const pd =
                  item.priceType === "wine" &&
                  Object.keys(item.prices || {}).length > 0
                    ? formatPrices(item.prices, "wine")
                    : item.price != null
                    ? `$${item.price}`
                    : "";
                return (
                  <div
                    key={iIdx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div>
                      <p className="small" style={{ fontWeight: 500, margin: 0 }}>
                        {item.name}
                      </p>
                      {item.origin && (
                        <p className="tiny muted" style={{ margin: 0 }}>
                          {item.origin}
                        </p>
                      )}
                      {item.description && (
                        <p className="tiny muted" style={{ margin: 0 }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    {pd && (
                      <p
                        className="small"
                        style={{
                          color: "var(--forest)",
                          fontWeight: 500,
                          flexShrink: 0,
                          marginLeft: 8,
                          margin: 0,
                        }}
                      >
                        {pd}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function WineMenu() {
  const { data, update } = useData();
  const effectiveDate = todayStr();

  const [rawText, setRawText] = useState("");
  const [extraction, setExtraction] = useState(null);
  const [pdfStatus, setPdfStatus] = useState(null); // null | "loading" | "no-text" | "error"
  const [pdfProgress, setPdfProgress] = useState(null);
  const [showPasteText, setShowPasteText] = useState(false);
  const [sourcePdf, setSourcePdf] = useState(null);
  const [sourcePdfName, setSourcePdfName] = useState(null);
  const [activeSection, setActiveSection] = useState(0);
  const [saveError, setSaveError] = useState(null);

  const wineMenus = data.wineMenus || [];

  // ── PDF upload ─────────────────────────────────────────────────────────────

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfStatus("loading");
    setPdfProgress(null);
    try {
      const [{ text, hasText, discoveredHeaders }, pdfDataUrl] = await Promise.all([
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
      runExtraction(text, discoveredHeaders);
    } catch (err) {
      console.error(err);
      setPdfStatus("error");
    }
  }

  // ── Extraction ─────────────────────────────────────────────────────────────

  function runExtraction(text = rawText, extraHeaders = []) {
    const result = parseWineText(text, { extraHeaders });
    if (result.sections.length === 0) {
      result.sections.push({ name: "Wine List", type: "wine", items: [] });
    }
    setExtraction(result);
    setActiveSection(0);
  }

  // ── Item editing ───────────────────────────────────────────────────────────

  function updateItem(sIdx, iIdx, field, value) {
    setExtraction((prev) => {
      const next = structuredClone(prev);
      next.sections[sIdx].items[iIdx][field] = value;
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
      next.sections[sIdx].items.push({
        name: "",
        origin: "",
        description: "",
        price: null,
        priceType: "simple",
        prices: {},
        confidence: 0.5,
      });
      return next;
    });
  }

  function cancelExtraction() {
    setExtraction(null);
    setSaveError(null);
  }

  function saveWineMenu() {
    const cleanExtraction = {
      ...extraction,
      sections: extraction.sections
        .map((s) => ({ ...s, items: s.items.filter((i) => i.name?.trim()) }))
        .filter((s) => s.items.length > 0),
    };
    if (cleanExtraction.sections.length === 0) {
      setSaveError("Add at least one wine before saving.");
      return;
    }
    setSaveError(null);
    const menuId = uid("wine");
    update((draft) => {
      commitWineMenu(draft, cleanExtraction, {
        menuId,
        effectiveDate,
        rawText,
        sourcePdf,
        sourcePdfName,
      });
    });
    setExtraction(null);
    setRawText("");
    setSourcePdf(null);
    setSourcePdfName(null);
    setShowPasteText(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Upload / entry area */}
      {!extraction && (
        <>
          <div className="card" style={{ marginBottom: 14, textAlign: "center" }}>
            <Wine size={26} color="var(--red)" />
            <h3 style={{ marginTop: 10 }}>Upload a wine menu PDF</h3>
            <p className="small muted" style={{ marginBottom: 14 }}>
              Reads wine list PDFs — by-the-glass, bottle, or full catalog. Works for
              menus exported from Word, Canva, or Google Docs.
            </p>
            <label className="btn accent" style={{ cursor: "pointer" }}>
              {pdfStatus === "loading" ? (
                <>
                  <Loader2 size={13} className="spin" style={{ marginRight: 4 }} />
                  Reading
                  {pdfProgress
                    ? ` page ${pdfProgress.page}/${pdfProgress.total}`
                    : "…"}
                </>
              ) : (
                <>Choose PDF</>
              )}
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                style={{ display: "none" }}
                disabled={pdfStatus === "loading"}
              />
            </label>
            {pdfStatus === "no-text" && (
              <p className="small" style={{ color: "var(--red)", marginTop: 10 }}>
                No readable text layer found. Try pasting the text below instead.
              </p>
            )}
            {pdfStatus === "error" && (
              <p className="small" style={{ color: "var(--red)", marginTop: 10 }}>
                Could not read that file. Try pasting the text below instead.
              </p>
            )}
          </div>

          {!showPasteText && (
            <button
              className="btn ghost"
              style={{ width: "100%", marginBottom: 14 }}
              onClick={() => setShowPasteText(true)}
            >
              Paste or type wine list instead
            </button>
          )}

          {showPasteText && (
            <div className="card" style={{ marginBottom: 14 }}>
              <label className="field">
                Wine list text
                <textarea
                  rows={9}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={
                    "WINES BY THE GLASS\n" +
                    "Vermentino — Sardegna, Italy  14 | 52\n" +
                    "Pinot Grigio — Alto Adige, Italy  13 | 48\n\n" +
                    "RED\n" +
                    "Nebbiolo — Barolo DOCG, Piedmont  18 | 38 | 70"
                  }
                />
              </label>
              <button
                className="btn accent"
                onClick={() => runExtraction()}
                disabled={!rawText.trim()}
                style={{ width: "100%" }}
              >
                Extract wine list
              </button>
            </div>
          )}
        </>
      )}

      {/* Extraction preview */}
      {extraction && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <p className="section-title" style={{ margin: 0 }}>
              Wine list preview
            </p>
          </div>
          {extraction.warnings?.length > 0 && (
            <div className="pill brass" style={{ marginBottom: 10 }}>
              {extraction.warnings.length} line(s) need a manual look
            </div>
          )}

          {/* Section tabs */}
          <div className="segmented" style={{ marginBottom: 12, overflowX: "auto" }}>
            {extraction.sections.map((s, i) => (
              <button
                key={i}
                className={activeSection === i ? "active" : ""}
                onClick={() => setActiveSection(i)}
              >
                {s.name || `Section ${i + 1}`}
              </button>
            ))}
          </div>

          {/* Active section items */}
          {extraction.sections[activeSection] && (
            <div className="card" style={{ marginBottom: 12 }}>
              <p
                className="small"
                style={{ fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}
              >
                {extraction.sections[activeSection].name}
              </p>
              {extraction.sections[activeSection].items.map((item, iIdx) => (
                <WineItemRow
                  key={iIdx}
                  item={item}
                  onChange={(field, value) => updateItem(activeSection, iIdx, field, value)}
                  onRemove={() => removeItem(activeSection, iIdx)}
                />
              ))}
              <button
                className="btn ghost"
                style={{ marginTop: 8 }}
                onClick={() => addItem(activeSection)}
              >
                <Plus size={12} /> Add wine
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button className="btn ghost" onClick={cancelExtraction}>
              Back
            </button>
            <button className="btn accent" style={{ flex: 1 }} onClick={saveWineMenu}>
              <Check size={13} /> Save wine list
            </button>
          </div>
          {saveError && (
            <p className="small" style={{ color: "var(--red)", marginTop: -8, marginBottom: 14 }}>
              {saveError}
            </p>
          )}
        </div>
      )}

      {/* Saved wine menus */}
      {!extraction && wineMenus.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <p className="section-title" style={{ marginBottom: 10 }}>
            Saved wine lists
          </p>
          {wineMenus.map((menu) => (
            <SavedWineMenuCard key={menu.id} menu={menu} />
          ))}
        </div>
      )}

      {!extraction && wineMenus.length === 0 && !showPasteText && (
        <p className="small muted" style={{ textAlign: "center", marginTop: 16 }}>
          No wine lists saved yet.
        </p>
      )}
    </div>
  );
}
