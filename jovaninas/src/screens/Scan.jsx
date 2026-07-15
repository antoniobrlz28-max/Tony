import { useState } from "react";
import { Camera, FileText, Loader2, AlertCircle } from "lucide-react";
import { useData } from "../lib/context.jsx";
import { parseMenuText } from "../lib/parseMenu.js";
import { commitMenu } from "../lib/menuOps.js";
import { todayStr, uid } from "../lib/id.js";
import { extractTextFromPdf } from "../lib/pdfExtract.js";
import { createPublishMetadata } from "../lib/autoPublishMetadata.js";

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
  const [pdfStatus, setPdfStatus] = useState(null); // null | "loading" | "no-text" | "error"
  const [pdfProgress, setPdfProgress] = useState(null);
  const [showPasteText, setShowPasteText] = useState(false);
  const [sourcePdf, setSourcePdf] = useState(null);
  const [sourcePdfName, setSourcePdfName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preservice, setPreservice] = useState({
    focacciaFlavor: "",
    oysterOrigin: "",
    gelatoSorbetFlavors: "",
  });
  const [showPreservice, setShowPreservice] = useState(false);

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
    setLoading(true);

    try {
      const [{ text, hasText }, pdfDataUrl] = await Promise.all([
        extractTextFromPdf(file, (page, total) =>
          setPdfProgress({ page, total })
        ),
        readFileAsDataUrl(file),
      ]);

      if (!hasText) {
        setPdfStatus("no-text");
        setLoading(false);
        return;
      }

      setRawText(text);
      setSourcePdf(pdfDataUrl);
      setSourcePdfName(file.name);
      setPdfStatus(null);
      setShowPreservice(true);
    } catch (err) {
      console.error(err);
      setPdfStatus("error");
      setLoading(false);
    }
  }

  async function publishMenu() {
    if (!rawText.trim()) {
      alert("No text to extract.");
      return;
    }

    setLoading(true);

    try {
      const extraction = parseMenuText(rawText);

      // Ensure default sections
      if (extraction.sections.length === 0) {
        extraction.sections.push({ name: "Menu", items: [] });
      }
      if (!extraction.drinkSections) {
        extraction.drinkSections = [];
      }

      // Clean empty items
      const cleanExtraction = {
        ...extraction,
        sections: extraction.sections
          .map((s) => ({
            ...s,
            items: s.items.filter((i) => i.name && i.name.trim()),
          }))
          .filter((s) => s.items.length > 0),
        drinkSections: (extraction.drinkSections || [])
          .map((s) => ({
            ...s,
            items: s.items.filter((i) => i.name && i.name.trim()),
          }))
          .filter((s) => s.items.length > 0),
      };

      if (cleanExtraction.sections.length === 0) {
        alert("No valid dishes found. Please check the menu text.");
        setLoading(false);
        return;
      }

      const menuId = uid("menu");
      const publishMetadata = createPublishMetadata(cleanExtraction, {
        menuId,
        menuType,
        sourcePdfName,
        photos,
        preservice,
        autoPublish: true,
        publisher: "system",
      });

      update((draft) => {
        commitMenu(draft, cleanExtraction, {
          menuId,
          menuType,
          mealPeriod,
          effectiveDate,
          photos,
          rawText,
          sourcePdf,
          sourcePdfName,
          preservice,
          publishMetadata,
        });
      });

      // Reset form
      setRawText("");
      setPhotos([]);
      setSourcePdf(null);
      setSourcePdfName(null);
      setPreservice({
        focacciaFlavor: "",
        oysterOrigin: "",
        gelatoSorbetFlavors: "",
      });
      setShowPreservice(false);
      setLoading(false);

      // Navigate back to home
      go("Home");
    } catch (err) {
      console.error("Publish error:", err);
      alert("Error publishing menu. Check console.");
      setLoading(false);
    }
  }

  function handlePhotoRemove(idx) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div>
      {/* Upload Section */}
      <div className="card" style={{ marginBottom: 14, textAlign: "center" }}>
        <FileText size={26} color="var(--red)" />
        <h3 style={{ marginTop: 10 }}>Upload a PDF menu</h3>
        <p className="small muted" style={{ marginBottom: 14 }}>
          Reads text straight from the file — no typing. Works for menus from
          Word, Canva, Google Docs, etc. (anything with real text, not scanned
          images).
        </p>

        <label className="btn accent" style={{ cursor: "pointer" }}>
          <Camera size={13} /> Choose PDF
          <input
            type="file"
            accept=".pdf"
            onChange={handlePdfUpload}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {/* PDF Upload Status */}
      {pdfStatus === "loading" && (
        <div className="card" style={{ marginBottom: 14, textAlign: "center" }}>
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ marginTop: 10 }}>
            Extracting text...
            {pdfProgress &&
              ` (page ${pdfProgress.page} of ${pdfProgress.total})`}
          </p>
        </div>
      )}

      {pdfStatus === "no-text" && (
        <div
          className="pill brass"
          style={{ marginBottom: 14, display: "flex", gap: 8 }}
        >
          <AlertCircle size={14} />
          <span>
            No text found. PDF may be a scanned image. Try typing/pasting menu
            text instead.
          </span>
        </div>
      )}

      {pdfStatus === "error" && (
        <div
          className="pill danger"
          style={{ marginBottom: 14, display: "flex", gap: 8 }}
        >
          <AlertCircle size={14} />
          <span>Error reading PDF. Please try again.</span>
        </div>
      )}

      {/* Text Paste Option */}
      {!showPasteText && (
        <button
          className="btn ghost"
          style={{ width: "100%", marginBottom: 14 }}
          onClick={() => setShowPasteText(true)}
        >
          Or paste / type menu text
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
              placeholder={
                "PASTA\nElk Bolognese — elk, pork, tomato, juniper, mafaldine $29\n\nENTREES\nPork Milanese — fennel, apple mostarda, arugula, parmesan $36"
              }
            />
          </label>
        </div>
      )}

      {/* Photos Section */}
      {photos.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <p className="small" style={{ fontWeight: 700, marginBottom: 10 }}>
            Photos ({photos.length})
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {photos.map((p, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  width: 56,
                  height: 56,
                }}
              >
                <img
                  src={p}
                  alt=""
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />
                <button
                  className="btn danger"
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    padding: "2px 5px",
                    borderRadius: 6,
                  }}
                  onClick={() => handlePhotoRemove(i)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Photos Button */}
      <label className="btn ghost" style={{ cursor: "pointer", width: "100%", marginBottom: 14 }}>
        <Camera size={13} /> Add photos
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotos}
          style={{ display: "none" }}
        />
      </label>

      {/* Preservice Modal */}
      {showPreservice && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(30,26,15,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 55,
          }}
        >
          <div
            className="card"
            style={{
              width: "min(380px, 88vw)",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <p className="section-title">Today's preservice details</p>
            <p className="tiny muted" style={{ marginBottom: 16 }}>
              These details aren't printed on the menu, but help track daily
              specials. Leave blank to skip.
            </p>

            <label className="field">
              Focaccia flavor
              <input
                type="text"
                value={preservice.focacciaFlavor}
                onChange={(e) =>
                  setPreservice((p) => ({
                    ...p,
                    focacciaFlavor: e.target.value,
                  }))
                }
                placeholder="e.g., Rosemary & sea salt"
              />
            </label>

            <label className="field">
              Oyster origin
              <input
                type="text"
                value={preservice.oysterOrigin}
                onChange={(e) =>
                  setPreservice((p) => ({ ...p, oysterOrigin: e.target.value }))
                }
                placeholder="e.g., Pemaquid Point, Maine"
              />
            </label>

            <label className="field">
              Gelato & sorbet flavors
              <input
                type="text"
                value={preservice.gelatoSorbetFlavors}
                onChange={(e) =>
                  setPreservice((p) => ({
                    ...p,
                    gelatoSorbetFlavors: e.target.value,
                  }))
                }
                placeholder="e.g., Pistachio, Lemon, Dark chocolate"
              />
            </label>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                className="btn ghost"
                onClick={() => setShowPreservice(false)}
                style={{ flex: 1 }}
              >
                Back
              </button>
              <button
                className="btn accent"
                onClick={publishMenu}
                disabled={loading || !rawText.trim()}
                style={{ flex: 1 }}
              >
                {loading ? (
                  <>
                    <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Publishing...
                  </>
                ) : (
                  "Publish menu"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Button (visible when text is ready) */}
      {rawText.trim() && !showPreservice && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn ghost"
            onClick={() => {
              setRawText("");
              setSourcePdf(null);
              setSourcePdfName(null);
              setPhotos([]);
            }}
            style={{ flex: 1 }}
          >
            Clear
          </button>
          <button
            className="btn accent"
            onClick={() => setShowPreservice(true)}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? (
              <>
                <Loader2
                  size={13}
                  style={{ animation: "spin 1s linear infinite" }}
                /> Extracting...
              </>
            ) : (
              "Publish"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
