// Extracts the embedded text layer from a PDF entirely in the browser,
// using Mozilla's pdf.js loaded at runtime from a CDN (no npm install, no
// OCR/vision API — this only works for PDFs that have real text in them,
// e.g. exported from Word/InDesign/Canva/Google Docs, not flat scans of a
// printed page). If a PDF turns out to be scanned images with no text
// layer, `hasText` comes back false and the caller should fall back to
// photo capture or manual paste.

const PDFJS_VERSION = "4.7.76";
const PDFJS_CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_CDN = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

let pdfjsLibPromise = null;

function loadPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import(/* @vite-ignore */ PDFJS_CDN).then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      return mod;
    });
  }
  return pdfjsLibPromise;
}

function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Groups text items into lines by Y position, then joins each line
// left-to-right, inserting extra spacing where there's a large horizontal
// gap (e.g. a dish name separated from its price) so downstream parsing
// has a chance of recognizing that structure.
export function reconstructLines(items) {
  const rows = [];
  for (const item of items) {
    if (!item.str) continue;
    const y = Math.round(item.transform[5]);
    let row = rows.find((r) => Math.abs(r.y - y) <= 2);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }
  rows.sort((a, b) => b.y - a.y);
  return rows
    .map((row) => {
      row.items.sort((a, b) => a.transform[4] - b.transform[4]);
      let line = "";
      let lastEnd = null;
      for (const item of row.items) {
        const x = item.transform[4];
        if (lastEnd != null) {
          const gap = x - lastEnd;
          if (gap > 14) line += "   ";
          else if (gap > 2) line += " ";
        }
        line += item.str;
        lastEnd = x + (item.width || item.str.length * 5);
      }
      return line.trim();
    })
    .filter(Boolean);
}

export async function extractTextFromPdf(file, onProgress) {
  const pdfjsLib = await loadPdfJs();
  const buffer = await fileToArrayBuffer(file);
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    pageTexts.push(reconstructLines(textContent.items).join("\n"));
  }
  const text = pageTexts.join("\n\n").trim();
  return { text, pageCount: doc.numPages, hasText: text.length > 20 };
}
