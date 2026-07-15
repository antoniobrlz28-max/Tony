/**
 * PDF text extraction wrapper for the jovaninas app.
 *
 * Uses pdf.js to pull plain text from a PDF file.  The app only needs a simple
 * text string (for the text-based parser) plus a page count and a list of any
 * all-caps headings that might be extra section headers.
 *
 * Returns: { text, hasText, pageCount, discoveredHeaders }
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
