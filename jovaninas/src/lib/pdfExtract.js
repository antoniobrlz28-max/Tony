/**
 * PDF text extraction wrapper for the jovaninas app.
 *
 * Two modes:
 *   1. extractTextFromPdf   – plain-text fallback (existing behaviour)
 *   2. extractPositionedLines – geometry-rich extraction for the layout parser
 *
 * NOTE: pdf.js must be available as a dependency. Worker URL is loaded from CDN.
 */

// Set up PDF.js worker. In production, bundle the worker locally instead of
// loading it from CDN to avoid supply-chain risk and remove the network dependency.
async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  }
  return pdfjs;
}

const TEXT_CACHE_TTL_MS = 5 * 60 * 1000;
const textExtractionCache = new Map();

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function getCacheKey(file) {
  return [file?.name || "", file?.size || 0, file?.lastModified || 0].join(":");
}

function getCachedExtraction(cacheKey) {
  if (!cacheKey) return null;
  const cached = textExtractionCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > TEXT_CACHE_TTL_MS) {
    textExtractionCache.delete(cacheKey);
    return null;
  }
  return cached.value;
}

function setCachedExtraction(cacheKey, value) {
  if (!cacheKey) return;
  textExtractionCache.set(cacheKey, { cachedAt: Date.now(), value });
}

/**
 * Extract text from a PDF File.
 *
 * @param {File} file
 * @param {(page: number, total: number) => void} [onProgress]
 * @param {{ useCache?: boolean }} [opts]
 * @returns {Promise<{ text: string, hasText: boolean, pageCount: number, discoveredHeaders: string[] }>}
 */
export async function extractTextFromPdf(file, onProgress, opts = {}) {
  const { useCache = true } = opts;
  const cacheKey = getCacheKey(file);
  if (useCache) {
    const cached = getCachedExtraction(cacheKey);
    if (cached) {
      if (onProgress) onProgress(cached.pageCount, cached.pageCount);
      return cached;
    }
  }

  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pageCount = pdf.numPages;
  const pageTexts = new Array(pageCount).fill("");
  const headerSet = new Set();
  let completedPages = 0;

  const pageJobs = Array.from({ length: pageCount }, (_, idx) => idx + 1).map(async (p) => {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageLines = buildPageLines(content);
    const pageHeaders = discoverHeaders(pageLines);
    return { page: p, pageText: pageLines.join("\n"), pageHeaders };
  });

  await Promise.all(
    pageJobs.map(async (job) => {
      const { page, pageText, pageHeaders } = await job;
      pageTexts[page - 1] = pageText;
      for (const header of pageHeaders) headerSet.add(header);
      completedPages += 1;
      if (onProgress) onProgress(completedPages, pageCount);
    })
  );

  const text = pageTexts.join("\n");
  const hasText = text.trim().length > 0;
  const result = {
    text,
    hasText,
    pageCount,
    discoveredHeaders: [...headerSet],
  };

  if (useCache) setCachedExtraction(cacheKey, result);
  return result;
}

function discoverHeaders(lines) {
  if (!lines || lines.length === 0) return [];
  const headers = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.length < 3 || t.length > 50) continue;
    if (t !== t.toUpperCase()) continue;
    if (!/[A-Z]/.test(t)) continue;
    headers.push(t);
  }
  return headers;
}

/**
 * Benchmarks extraction speed for different PDF sizes (cold extraction, cache off).
 * Target: typical menus should complete in under ~2s for common restaurant PDFs.
 *
 * @param {{ onePageFile?: File, fiftyPageFile?: File, runs?: number }} args
 * @returns {Promise<{ onePage?: number[], fiftyPage?: number[] }>}
 */
export async function benchmarkPdfExtraction(args = {}) {
  const { onePageFile, fiftyPageFile, runs = 3 } = args;
  const results = {};
  const benchmarkFile = async (file) => {
    const runTimes = [];
    for (let i = 0; i < runs; i++) {
      const start = nowMs();
      await extractTextFromPdf(file, undefined, { useCache: false });
      runTimes.push(Number((nowMs() - start).toFixed(2)));
    }
    return runTimes;
  };

  if (onePageFile) results.onePage = await benchmarkFile(onePageFile);
  if (fiftyPageFile) results.fiftyPage = await benchmarkFile(fiftyPageFile);
  return results;
}

/**
 * Reconstruct readable lines from a PDF text content object.
 * Groups text items that share approximately the same vertical baseline.
 *
 * @param {Object} content - from page.getTextContent()
 * @returns {string[]} Lines of text
 */
function buildPageLines(content) {
  if (!content.items || content.items.length === 0) return [];

  const normalized = [];
  for (const item of content.items) {
    const str = item.str || "";
    if (!str.trim() && !item.hasEOL) continue;
    const [, , , , x = 0, y = 0] = item.transform || [1, 0, 0, 1, 0, 0];
    const fontSize = Math.abs(item.transform?.[3] || 12);
    normalized.push({ x, y, str, tol: fontSize * 0.4 });
  }
  if (normalized.length === 0) return [];

  normalized.sort((a, b) => {
    if (Math.abs(b.y - a.y) > 0.001) return b.y - a.y;
    return a.x - b.x;
  });

  const groups = [];
  for (const item of normalized) {
    const current = groups[groups.length - 1];
    if (current && Math.abs(current.y - item.y) <= Math.max(current.tol, item.tol)) {
      current.items.push({ x: item.x, str: item.str });
      current.tol = Math.max(current.tol, item.tol);
    } else {
      groups.push({ y: item.y, tol: item.tol, items: [{ x: item.x, str: item.str }] });
    }
  }

  return groups.map((g) => {
    g.items.sort((a, b) => a.x - b.x);
    return g.items.map((i) => i.str).join("");
  }).filter((l) => l.trim().length > 0);
}

// ─── geometry extraction ─────────────────────────────────────────────────────

/**
 * Extract typography-rich items from a single page's text content.
 *
 * Returns one object per PDF text-item with bounding box and font metadata so
 * the layout parser can make spatially-aware decisions.
 *
 * @param {Object} content  - From page.getTextContent()
 * @param {Object} viewport - Page viewport (used to flip y to top-down coords)
 * @param {number} pageNum  - 1-based page number
 * @returns {Array<{id,page,text,x0,x1,y0,y1,fontSize,isBold,isItalic,fontFamily,hasEOL}>}
 */
function extractGeometryFromContent(content, viewport, pageNum) {
  const pageHeight = viewport.height;
  const fontWeightMap = {};

  if (content.styles) {
    Object.entries(content.styles).forEach(([fontId, style]) => {
      const family = (style.fontFamily || "").toLowerCase();
      const name = (style.fontName || "").toLowerCase();
      fontWeightMap[fontId] = {
        isBold: family.includes("bold") || name.includes("bold"),
        isItalic: family.includes("italic") || name.includes("italic"),
        fontFamily: style.fontFamily || "",
      };
    });
  }

  return (content.items || [])
    .filter((item) => (item.str || "").trim() || item.hasEOL)
    .map((item, idx) => {
      const fontId = item.fontName || "";
      const fontInfo = fontWeightMap[fontId] || { isBold: false, isItalic: false, fontFamily: "" };
      const [, , , d, e, f] = item.transform || [1, 0, 0, 1, 0, 0];
      const fontSize = Math.abs(d) || 12;
      const x0 = e;
      const x1 = x0 + (item.width || 0);
      // Flip y from PDF bottom-up to top-down web coordinates
      const y0 = pageHeight - (f + fontSize);
      const y1 = pageHeight - f;
      return {
        id: `item_${pageNum}_${idx}`,
        page: pageNum,
        text: item.str || "",
        x0,
        x1,
        y0,
        y1,
        fontSize,
        isBold: fontInfo.isBold,
        isItalic: fontInfo.isItalic,
        fontFamily: fontInfo.fontFamily,
        hasEOL: item.hasEOL || false,
      };
    });
}

/**
 * Extract positioned lines from a PDF file with full geometry and typography metadata.
 *
 * Each line in the returned array represents a visual line of text on the page
 * with bounding-box coordinates and font information.  This output is consumed
 * directly by the spatial layout parser (`parseMenuFromLayout`).
 *
 * Shape of each line:
 *   {
 *     id, page, text,
 *     x0, x1, y0, y1,   // bounding box (top-down coordinates)
 *     fontSize,
 *     isBold, isItalic,
 *     fontFamilies: string[],
 *   }
 *
 * @param {File} file
 * @param {(page: number, total: number) => void} [onProgress]
 * @param {{ useCache?: boolean }} [opts]
 * @returns {Promise<{
 *   positionedLines: Array,
 *   hasText: boolean,
 *   pageCount: number,
 *   discoveredHeaders: string[],
 * }>}
 */
export async function extractPositionedLines(file, onProgress, opts = {}) {
  const { useCache = true } = opts;
  const cacheKey = `geo:${getCacheKey(file)}`;
  if (useCache) {
    const cached = getCachedExtraction(cacheKey);
    if (cached) {
      if (onProgress) onProgress(cached.pageCount, cached.pageCount);
      return cached;
    }
  }

  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pageCount = pdf.numPages;
  let completedPages = 0;
  const allLines = [];
  const headerSet = new Set();

  // Process pages in order (sequential so line sort is stable)
  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();

    const items = extractGeometryFromContent(content, viewport, p);
    const lines = groupGeometryItemsIntoLines(items);

    for (const line of lines) allLines.push(line);
    for (const h of discoverHeaders(lines.map((l) => l.text))) headerSet.add(h);

    completedPages += 1;
    if (onProgress) onProgress(completedPages, pageCount);
  }

  const hasText = allLines.some((l) => l.text.trim().length > 0);
  const result = {
    positionedLines: allLines,
    hasText,
    pageCount,
    discoveredHeaders: [...headerSet],
  };

  if (useCache) setCachedExtraction(cacheKey, result);
  return result;
}

/**
 * Group geometry items into visual lines by baseline proximity.
 * Unlike buildPageLines this keeps all geometry on the output object.
 *
 * @param {Array} items - from extractGeometryFromContent
 * @returns {Array} Lines with geometry
 */
function groupGeometryItemsIntoLines(items) {
  if (!items || items.length === 0) return [];

  // Sort top-to-bottom first, then left-to-right within same baseline
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y0 - b.y0) > 0.5) return a.y0 - b.y0;
    return a.x0 - b.x0;
  });

  const lines = [];
  for (const item of sorted) {
    const tol = item.fontSize * 0.35;
    const last = lines[lines.length - 1];
    if (last && Math.abs(item.y0 - last._refY) <= tol) {
      last.items.push(item);
      last.x1 = Math.max(last.x1, item.x1);
      last.y1 = Math.max(last.y1, item.y1);
      last.isBold = last.isBold || item.isBold;
      last.isItalic = last.isItalic || item.isItalic;
      if (item.fontFamily && !last.fontFamilies.includes(item.fontFamily)) {
        last.fontFamilies.push(item.fontFamily);
      }
    } else {
      lines.push({
        id: `line_${item.page}_${lines.length}`,
        page: item.page,
        _refY: item.y0,
        text: "",          // filled below
        x0: item.x0,
        x1: item.x1,
        y0: item.y0,
        y1: item.y1,
        fontSize: item.fontSize,
        isBold: item.isBold,
        isItalic: item.isItalic,
        fontFamilies: item.fontFamily ? [item.fontFamily] : [],
        items: [item],
      });
    }
  }

  // Reconstruct text left-to-right and clean up internal field
  for (const line of lines) {
    line.items.sort((a, b) => a.x0 - b.x0);
    line.text = line.items.map((i) => i.text).join("");
    delete line._refY;
    delete line.items;
  }

  return lines.filter((l) => l.text.trim().length > 0);
}
