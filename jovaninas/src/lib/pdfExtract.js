// Extracts the embedded text layer from a PDF entirely in the browser,
// using Mozilla's pdf.js loaded at runtime from a CDN (no npm install, no
// OCR/vision API — this only works for PDFs that have real text in them,
// e.g. exported from Word/InDesign/Canva/Google Docs, not flat scans of a
// printed page). If a PDF turns out to be scanned images with no text
// layer, `hasText` comes back false and the caller should fall back to
// photo capture or manual paste.

import { FOOD_HEADERS, DRINK_HEADERS, normalizeHeaderText } from "./menuHeaders.js";

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

// A hand-designed one-page menu (like Jovanina's) commonly places food,
// cocktails, and wine/beer as separate blocks that share the same vertical
// space on the page, sometimes with food itself flowing across more than
// one physical column. Grouping text purely by Y position welds unrelated
// blocks together into one fake "line" wherever two blocks happen to sit
// at the same height. Verified directly against Jovanina's actual dinner
// menu PDF (its raw text positions were extracted and inspected).
//
// Two real fixes, both verified against that same file:
//
// 1. A horizontal gap much wider than a normal within-line gap (dish name
//    -> price, word -> word) is almost certainly a column/block boundary,
//    not a wide space — so it forces a hard break into a new line instead
//    of just adding extra spacing.
// 2. On a page that lays out two (or more) columns side by side, known
//    section headers (Starters, Handmade Fresh Pasta, Sweet, Cocktails...)
//    reliably cluster into distinct horizontal bands even when the running
//    dish/drink text between them doesn't — so headers are used as column
//    anchors: cluster their x-positions, assign every line to its nearest
//    anchor cluster, then read each column fully top-to-bottom before
//    moving to the next one, left to right. This isn't guaranteed perfect
//    on a hand-designed page (center-justified headers of different
//    lengths can occasionally split one visual column into two clusters),
//    but reading clusters in left-to-right, then top-to-bottom order keeps
//    the output correct even when that happens — verified against
//    Jovanina's real two-column dinner menu page, where dish titles no
//    longer land next to an unrelated dish from the other column. Pages
//    with only one recognizable header position (or none) are left in
//    plain top-to-bottom reading order, unchanged.
const HARD_BREAK_GAP = 48;
const COLUMN_CLUSTER_GAP = 150;

// Groups text items into rows by Y position, then splits each row into
// segments wherever the horizontal gap is wide enough to be a different
// column rather than a wide same-line gap.
function buildSegments(items) {
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

  const segments = [];
  for (const row of rows) {
    row.items.sort((a, b) => a.transform[4] - b.transform[4]);
    let text = "";
    let segStartX = null;
    let lastEnd = null;
    const flush = () => {
      const trimmed = text.trim();
      if (trimmed) segments.push({ y: row.y, x: segStartX, text: trimmed });
      text = "";
      segStartX = null;
    };
    for (const item of row.items) {
      const x = item.transform[4];
      if (lastEnd != null) {
        const gap = x - lastEnd;
        if (gap > HARD_BREAK_GAP) flush();
        else if (gap > 14) text += "   ";
        else if (gap > 2) text += " ";
      }
      if (segStartX == null) segStartX = x;
      text += item.str;
      lastEnd = x + (item.width || item.str.length * 5);
    }
    flush();
  }
  return segments;
}

// A header that's laid out across two printed lines (e.g. "RAW, ROASTED"
// on one line, "& GRILLED" on the next, as its own styled block) ends up
// as two separate segments — verified against Jovanina's real PDF, where
// this specific header's two halves land ~20pt apart in Y with unrelated
// column content interleaved between them in row order (since they're a
// third column's header, sitting beside — not inside — the food column
// whose rows happen to fall at the same page heights). Neither half alone
// matches the known header list, so both leak into whatever dish text
// they end up next to. This looks for a segment elsewhere on the page
// that's roughly the same column (close in X) and a plausible next/prev
// line (close in Y) whose combined text *does* match a known header, and
// merges the two into one recognized header segment.
export function stitchFragmentedHeaders(segments) {
  const used = new Set();
  const merged = [];
  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) {
      continue;
    }
    const seg = segments[i];
    let partner = -1;
    for (let j = 0; j < segments.length; j++) {
      if (j === i || used.has(j)) continue;
      const other = segments[j];
      if (Math.abs(other.x - seg.x) > 40) continue;
      const dy = seg.y - other.y;
      if (dy <= 0 || dy > 40) continue; // other must be the next line down
      const norm = normalizeHeaderText(`${seg.text} ${other.text}`);
      if (FOOD_HEADERS.has(norm) || DRINK_HEADERS.has(norm)) {
        partner = j;
        break;
      }
    }
    if (partner >= 0) {
      used.add(partner);
      merged.push({ ...seg, text: `${seg.text} ${segments[partner].text}` });
    } else {
      merged.push(seg);
    }
  }
  return merged;
}

// Clusters known-header x-positions into column bands (gap-based 1D
// clustering). Returns null when there's fewer than two bands to split on
// — i.e. this page doesn't look like a multi-column layout, so the caller
// should leave it in plain top-to-bottom order rather than guess.
function clusterHeaderColumns(segments) {
  const headerXs = [];
  for (const seg of segments) {
    const norm = normalizeHeaderText(seg.text);
    if (FOOD_HEADERS.has(norm) || DRINK_HEADERS.has(norm)) headerXs.push(seg.x);
  }
  if (headerXs.length < 2) return null;
  const sorted = [...headerXs].sort((a, b) => a - b);
  const clusters = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > COLUMN_CLUSTER_GAP) clusters.push([]);
    clusters[clusters.length - 1].push(sorted[i]);
  }
  if (clusters.length < 2) return null;
  const ranges = clusters.map((c) => ({ min: Math.min(...c), max: Math.max(...c) }));
  const boundaries = [];
  for (let i = 1; i < ranges.length; i++) boundaries.push((ranges[i - 1].max + ranges[i].min) / 2);
  return boundaries;
}

// Reorders a page's segments into column-major reading order when the
// page's known headers cluster into distinct column bands; otherwise
// returns them in their natural top-to-bottom order, unchanged.
export function reorderByColumns(segments) {
  const boundaries = clusterHeaderColumns(segments);
  if (!boundaries) return segments.map((s) => s.text);
  const columns = Array.from({ length: boundaries.length + 1 }, () => []);
  for (const seg of segments) {
    let idx = 0;
    for (const b of boundaries) {
      if (seg.x >= b) idx++;
      else break;
    }
    columns[idx].push(seg);
  }
  for (const col of columns) col.sort((a, b) => b.y - a.y);
  return columns.flat().map((s) => s.text);
}

// Kept for callers/tests that just want the plain top-to-bottom reading
// (no column reordering) of a page's items.
export function reconstructLines(items) {
  return buildSegments(items).map((s) => s.text);
}

export async function extractTextFromPdf(file, onProgress) {
  const pdfjsLib = await loadPdfJs();
  const buffer = await fileToArrayBuffer(file);
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(i, doc.numPages);
    const page = await doc.getPage(i);
    // getTextContent() only — getOperatorList() (formerly used here to
    // detect red-print headers by walking the page's raw drawing
    // operations) was the single most expensive step in this pipeline and
    // was already experimental/best-effort; the known FOOD_HEADERS/
    // DRINK_HEADERS phrase list is comprehensive enough now to carry
    // column/section detection on its own.
    const textContent = await page.getTextContent();
    const rawSegments = buildSegments(textContent.items);
    // Run twice: a header split across 3 lines needs its first two
    // fragments stitched before the result can match against the third.
    const segments = stitchFragmentedHeaders(stitchFragmentedHeaders(rawSegments));
    pageTexts.push(reorderByColumns(segments).join("\n"));
  }
  const text = pageTexts.join("\n\n").trim();
  return { text, pageCount: doc.numPages, hasText: text.length > 20 };
}
