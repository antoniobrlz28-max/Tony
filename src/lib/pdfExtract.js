/**
 * PDF Extraction Layer
 * 
 * Extracts text from PDFs using PDF.js with full geometry preservation:
 * - Text position (x0, x1, y0, y1)
 * - Font metrics (size, weight, style)
 * - Character-level and line-level data for reconstruction
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text with geometry from a PDF file or URL
 * @param {File|Blob|string} source - PDF file, blob, or URL
 * @returns {Promise<Object>} { pages: [{ pageNum, width, height, items: [...], hasTextLayer }], metadata: {...} }
 */
export async function extractPdfWithGeometry(source) {
  try {
    let pdf;

    if (typeof source === 'string') {
      // URL
      pdf = await pdfjsLib.getDocument(source).promise;
    } else if (source instanceof File || source instanceof Blob) {
      // File or Blob
      const arrayBuffer = await source.arrayBuffer();
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    } else {
      throw new Error('Invalid PDF source');
    }

    const pages = [];
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      // Extract items with geometry
      const items = extractGeometryFromTextContent(textContent, viewport);

      pages.push({
        pageNum,
        width: viewport.width,
        height: viewport.height,
        items,
        hasTextLayer: items.length > 0,
      });
    }

    return {
      pages,
      metadata: {
        numPages,
        title: pdf.pdfInfo?.title || '',
        producer: pdf.pdfInfo?.producer || '',
      },
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw error;
  }
}

/**
 * Extract text items with full geometry from PDF.js textContent
 * 
 * PDF.js provides character-level data; we enrich it with:
 * - Bounding box coordinates (x0, y0, x1, y1)
 * - Font metrics (size, weight, style)
 * - Viewport height (to flip y-coordinates)
 * 
 * @param {Object} textContent - From page.getTextContent()
 * @param {Object} viewport - Page viewport
 * @returns {Array} Items with geometry
 */
function extractGeometryFromTextContent(textContent, viewport) {
  const items = [];
  const pageHeight = viewport.height;

  // Map font names to approximate weights
  const fontWeightMap = {};

  // Collect font information from the text layer
  if (textContent.styles) {
    Object.entries(textContent.styles).forEach(([fontId, style]) => {
      const fontFamily = style.fontFamily || '';
      const isBold = fontFamily.toLowerCase().includes('bold') ||
                     style.fontName?.toLowerCase().includes('bold') ||
                     false;
      const isItalic = fontFamily.toLowerCase().includes('italic') ||
                       style.fontName?.toLowerCase().includes('italic') ||
                       false;

      fontWeightMap[fontId] = { isBold, isItalic, fontFamily };
    });
  }

  // Process each item (glyph or word)
  textContent.items.forEach((item, idx) => {
    const fontId = item.fontName || '';
    const fontInfo = fontWeightMap[fontId] || { isBold: false, isItalic: false, fontFamily: '' };

    // Transform matrix [a, b, c, d, e, f] maps (x, y) to (a*x + c*y + e, b*x + d*y + f)
    // For simple scaling/translation: [sx, 0, 0, sy, tx, ty]
    const [a, b, c, d, e, f] = item.transform || [1, 0, 0, 1, 0, 0];

    // Calculate actual bounding box in viewport coordinates
    const x0 = e; // x offset from transform
    const y0 = f; // y offset from transform (in PDF coords, bottom-up)
    const x1 = x0 + (item.width || 0);
    // Font size is typically -d (negative because PDF has bottom-up coords)
    const fontSize = Math.abs(d) || 12;
    const y1 = y0 + fontSize;

    // Flip y-coordinate to top-down (standard web coordinates)
    const y0_flipped = pageHeight - y1;
    const y1_flipped = pageHeight - y0;

    items.push({
      id: `item_${idx}`,
      page: 0, // Set by caller if needed
      text: item.str || '',
      x0,
      x1,
      y0: y0_flipped,
      y1: y1_flipped,
      fontSize,
      isBold: fontInfo.isBold,
      isItalic: fontInfo.isItalic,
      fontFamily: fontInfo.fontFamily,
      fontName: fontId,
      width: item.width || 0,
      height: fontSize,
      hasEOL: item.hasEOL || false,
    });
  });

  return items;
}

/**
 * Simple fallback: check if PDF has a readable text layer
 * @param {File|Blob} pdfFile 
 * @returns {Promise<boolean>} True if PDF has text, false if scanned/image-only
 */
export async function hasPdfTextLayer(pdfFile) {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();

    // If we got items, there's a readable text layer
    return textContent.items && textContent.items.length > 0;
  } catch {
    return false;
  }
}

/**
 * Legacy: extract plain text for fallback parser
 * @param {File|Blob|string} source
 * @returns {Promise<string>} Plain text from PDF
 */
export async function extractPlainText(source) {
  try {
    let pdf;

    if (typeof source === 'string') {
      pdf = await pdfjsLib.getDocument(source).promise;
    } else if (source instanceof File || source instanceof Blob) {
      const arrayBuffer = await source.arrayBuffer();
      pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    } else {
      throw new Error('Invalid PDF source');
    }

    let text = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map(item => item.str || '')
        .join('');

      text += pageText + '\n---\n';
    }

    return text;
  } catch (error) {
    console.error('Plain text extraction error:', error);
    throw error;
  }
}
