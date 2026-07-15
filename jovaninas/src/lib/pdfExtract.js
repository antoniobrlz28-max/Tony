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

/**
 * Extract text from a PDF File.
 *
 * @param {File} file
 * @param {(page: number, total: number) => void} [onProgress]
 * @returns {Promise<{ text: string, hasText: boolean, pageCount: number, discoveredHeaders: string[] }>}
 */
export async function extractTextFromPdf(file, onProgress) {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pageCount = pdf.numPages;
  const pageTexts = [];
  const headerSet = new Set();

  for (let p = 1; p <= pageCount; p++) {
    if (onProgress) onProgress(p, pageCount);

    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Collect all text items for the page
    const pageLines = buildPageLines(content);

    // Discover all-caps header lines as potential food section headers
    for (const line of pageLines) {
      const t = line.trim();
      if (t.length >= 3 && t.length <= 50 && t === t.toUpperCase() && /[A-Z]/.test(t)) {
        headerSet.add(t);
      }
    }

    pageTexts.push(pageLines.join("\n"));
  }

  const text = pageTexts.join("\n");
  const hasText = text.trim().length > 0;

  return {
    text,
    hasText,
    pageCount,
    discoveredHeaders: [...headerSet],
  };
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

  // Group items by baseline y coordinate (with tolerance)
  const groups = [];

  for (const item of content.items) {
    const str = item.str || "";
    if (!str.trim() && !item.hasEOL) continue;

    const [, , , , , y] = item.transform || [1, 0, 0, 1, 0, 0];
    const fontSize = Math.abs(item.transform?.[3] || 12);
    const tol = fontSize * 0.4;

    let placed = false;
    for (const g of groups) {
      if (Math.abs(g.y - y) < tol) {
        g.items.push({ x: item.transform?.[4] || 0, str });
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push({ y, items: [{ x: item.transform?.[4] || 0, str }] });
    }
  }

  // Sort groups top-to-bottom (descending y in PDF coords)
  groups.sort((a, b) => b.y - a.y);

  return groups.map((g) => {
    g.items.sort((a, b) => a.x - b.x);
    return g.items.map((i) => i.str).join("");
  }).filter((l) => l.trim().length > 0);
}
