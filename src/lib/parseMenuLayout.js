/**
 * Spatial PDF Menu Parser
 * 
 * Reads restaurant menu PDFs with awareness of page layout:
 * - Preserves text geometry (position, font size, weight)
 * - Detects section headers (STARTERS, COCKTAILS, etc.)
 * - Assigns menu items to their visual sections
 * - Parses item names, descriptions, and prices
 * - Handles wrapped text, multi-line descriptions, and wine pricing
 */

// Known menu section headings
const KNOWN_SECTIONS = [
  'STARTERS',
  'RAW, ROASTED & GRILLED',
  'WOOD FIRED PIZZA',
  'HANDMADE FRESH PASTA',
  'MAIN PLATES',
  'SWEET',
  'SUMMER SPRITZES',
  'COCKTAILS',
  'DRAFT BEER',
  'BOTTLED BEER',
  'N/A BEVERAGES',
  'WINES BY THE GLASS',
  'SPARKLING',
  'STILL ROSÉ',
  'WHITE',
  'RED',
  'ORANGE',
];

/**
 * Group raw PDF text items into lines based on baseline proximity
 * @param {Array} items - Raw text items from PDF.js with x0, y0, x1, y1, fontSize, text, isBold, isItalic
 * @returns {Array} Lines with geometry: { id, page, text, x0, x1, y0, y1, fontSize, isBold, isItalic, fontFamilies }
 */
export function groupItemsIntoLines(items) {
  if (!items || items.length === 0) return [];

  // Group by approximate baseline (y-coordinate with font-size tolerance)
  const lineMap = new Map();
  const tolerance = (item) => item.fontSize * 0.35;

  items.forEach((item, idx) => {
    let foundLine = false;

    for (const [key, line] of lineMap) {
      const referenceFontSize = line[0].fontSize;
      const tol = Math.max(tolerance(line[0]), tolerance(item));
      
      // Check if y-coordinate is within tolerance (PDF uses bottom-left origin, already flipped)
      if (Math.abs(item.y0 - line[0].y0) < tol) {
        line.push(item);
        foundLine = true;
        break;
      }
    }

    if (!foundLine) {
      lineMap.set(`line_${idx}`, [item]);
    }
  });

  // Convert grouped items into lines, sorted left-to-right within each line
  const lines = Array.from(lineMap.values()).map((groupedItems, lineIdx) => {
    // Sort items left-to-right
    groupedItems.sort((a, b) => a.x0 - b.x0);

    const x0 = groupedItems[0].x0;
    const x1 = groupedItems[groupedItems.length - 1].x1;
    const y0 = groupedItems[0].y0;
    const y1 = groupedItems[0].y1;
    const fontSize = groupedItems[0].fontSize;
    const isBold = groupedItems.some(item => item.isBold);
    const isItalic = groupedItems.some(item => item.isItalic);
    const fontFamilies = [...new Set(groupedItems.map(item => item.fontFamily).filter(Boolean))];

    const text = groupedItems.map(item => item.text).join('');
    const page = groupedItems[0].page || 0;

    return {
      id: `line_${page}_${lineIdx}`,
      page,
      text,
      x0,
      x1,
      y0,
      y1,
      fontSize,
      isBold,
      isItalic,
      fontFamilies,
      rawItems: groupedItems,
    };
  });

  // Sort lines top-to-bottom (descending y, since PDF coordinates start at bottom)
  lines.sort((a, b) => b.y0 - a.y0);

  return lines;
}

/**
 * Detect section headers from lines
 * @param {Array} lines - Grouped text lines
 * @returns {Array} Header lines with section name
 */
export function detectSectionHeaders(lines) {
  const headers = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const text = line.text.toUpperCase().trim();

    // Try exact match first
    if (KNOWN_SECTIONS.includes(text)) {
      headers.push({
        ...line,
        sectionName: text,
        confidence: 1.0,
        matchType: 'exact',
      });
      continue;
    }

    // Try wrapped section headers: merge with next line if combined text is a known section
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const combined = (text + ' ' + nextLine.text.toUpperCase().trim()).trim();
      
      if (KNOWN_SECTIONS.includes(combined)) {
        // Merge the two lines into a single header
        const mergedHeader = {
          id: `header_${line.page}_${i}`,
          page: line.page,
          text: `${line.text} ${nextLine.text}`,
          sectionName: combined,
          x0: Math.min(line.x0, nextLine.x0),
          x1: Math.max(line.x1, nextLine.x1),
          y0: Math.max(line.y0, nextLine.y0), // Top of merged header
          y1: Math.min(line.y1, nextLine.y1), // Bottom of merged header
          fontSize: Math.max(line.fontSize, nextLine.fontSize),
          isBold: line.isBold || nextLine.isBold,
          isItalic: line.isItalic || nextLine.isItalic,
          confidence: 0.95,
          matchType: 'wrapped',
        };
        headers.push(mergedHeader);
        // Skip next line in main loop since we consumed it
        i++;
        continue;
      }
    }

    // Heuristic matching: large, bold/uppercase text
    if (
      (line.isBold && line.fontSize >= 10.5) ||
      (text === text.toUpperCase() && text.length > 2 && line.fontSize >= 11.5)
    ) {
      // Check if it's close to a known section name (fuzzy match)
      const match = findClosestKnownSection(text);
      if (match && match.score > 0.75) {
        headers.push({
          ...line,
          sectionName: match.name,
          confidence: match.score,
          matchType: 'heuristic',
        });
      }
    }
  }

  return headers;
}

/**
 * Fuzzy match text against known section names
 * @param {string} text 
 * @returns {Object|null} { name, score } or null
 */
function findClosestKnownSection(text) {
  const maxScore = { name: null, score: 0 };

  for (const known of KNOWN_SECTIONS) {
    const score = stringSimilarity(text, known);
    if (score > maxScore.score) {
      maxScore.score = score;
      maxScore.name = known;
    }
  }

  return maxScore.score > 0 ? maxScore : null;
}

/**
 * Simple similarity score (0-1) between two strings
 */
function stringSimilarity(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1.0;

  const editDistance = getLevenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance between two strings
 */
function getLevenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Assign each line to the best preceding section header
 * @param {Array} lines - All text lines
 * @param {Array} headers - Detected section headers
 * @returns {Object} Map of section name -> array of lines in that section
 */
export function assignLinesToSections(lines, headers) {
  const sections = {};

  // Initialize sections
  headers.forEach(header => {
    sections[header.sectionName] = [];
  });

  // For each non-header line, find the best preceding header
  const headerLines = new Set(headers.map(h => h.id));

  lines.forEach(line => {
    if (headerLines.has(line.id)) {
      // Skip header lines themselves
      return;
    }

    if (headers.length === 0) {
      return; // No sections detected
    }

    let bestHeader = null;
    let bestScore = -Infinity;

    for (const header of headers) {
      // Only consider headers that precede this line (higher y = earlier on page)
      if (header.y0 <= line.y0) {
        continue;
      }

      // Score based on proximity and horizontal alignment
      const verticalDistance = header.y0 - line.y0;
      const headerCenterX = (header.x0 + header.x1) / 2;
      const lineCenterX = (line.x0 + line.x1) / 2;
      const horizontalDistance = Math.abs(headerCenterX - lineCenterX);

      // Horizontal overlap: how much of the line overlaps with the header's horizontal span
      const overlapStart = Math.max(header.x0, line.x0);
      const overlapEnd = Math.min(header.x1, line.x1);
      const horizontalOverlap = Math.max(0, overlapEnd - overlapStart);

      // Score: prefer close vertical distance, horizontal alignment, and overlap
      // Penalize if line is far to the left or right of header
      const score =
        100 / (1 + verticalDistance / 20) + // Vertical proximity (decay over ~20pt)
        (horizontalOverlap / Math.max(header.x1 - header.x0, line.x1 - line.x0)) * 50 + // Overlap bonus
        -Math.abs(horizontalDistance) / 50; // Horizontal distance penalty

      if (score > bestScore) {
        bestScore = score;
        bestHeader = header;
      }
    }

    if (bestHeader) {
      sections[bestHeader.sectionName].push(line);
    }
  });

  return sections;
}

/**
 * Parse menu items within a section
 * @param {Array} lines - Lines in this section
 * @param {string} sectionName - Name of the section
 * @returns {Array} Parsed items
 */
export function parseItemsInSection(lines, sectionName) {
  const items = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check if this line is a section note (e.g., "Gluten Free Pasta Available +4")
    if (isSectionNote(line)) {
      i++;
      continue;
    }

    // Check if this line is an item title
    if (isItemTitle(line)) {
      const item = {
        section: sectionName,
        name: extractItemName(line.text),
        description: '',
        price: null,
        priceText: '',
        prices: {}, // For wine: glass, carafe, bottle
        rawLine: line.text,
        confidence: 0.8,
        source: {
          page: line.page,
          x0: line.x0,
          y0: line.y0,
          x1: line.x1,
          y1: line.y1,
        },
      };

      // Extract price from title line if present
      const priceMatch = extractPrice(line.text);
      if (priceMatch) {
        item.price = priceMatch.price;
        item.priceText = priceMatch.text;
        item.prices = priceMatch.prices || {};
        item.name = item.name.replace(priceMatch.text, '').trim();
      }

      // Consume description lines
      i++;
      while (i < lines.length && isDescriptionLine(lines[i])) {
        const descLine = lines[i];
        
        // Check for price in description
        if (!item.price) {
          const priceMatch = extractPrice(descLine.text);
          if (priceMatch) {
            item.price = priceMatch.price;
            item.priceText = priceMatch.text;
            item.prices = priceMatch.prices || {};
          } else {
            // Regular description
            item.description += (item.description ? ' ' : '') + descLine.text;
          }
        } else {
          item.description += (item.description ? ' ' : '') + descLine.text;
        }

        i++;
      }

      item.description = item.description.trim();
      items.push(item);
    } else {
      i++;
    }
  }

  return items;
}

/**
 * Check if a line is likely an item title
 * Criteria:
 * - Bold and ~10.5pt or larger
 * - Uppercase and ~11.5pt or larger
 * - Contains a dash and ends with a price
 */
function isItemTitle(line) {
  const text = line.text.trim();

  // Skip very short lines (likely not item titles)
  if (text.length < 3) {
    return false;
  }

  // Bold title
  if (line.isBold && line.fontSize >= 10.5) {
    return true;
  }

  // Uppercase title
  if (text === text.toUpperCase() && line.fontSize >= 11.5) {
    return true;
  }

  // Contains dash and price (e.g., "Martini - 32")
  if (text.includes(' - ') || text.includes(' – ')) {
    const priceMatch = extractPrice(text);
    if (priceMatch) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a line is a description/component line
 * Criteria:
 * - Regular weight (not bold)
 * - Normal or italic
 * - Usually smaller than title
 */
function isDescriptionLine(line) {
  // Skip lines that look like section notes
  if (isSectionNote(line)) {
    return false;
  }

  // Skip very large text
  if (line.fontSize >= 11.5 && line.text === line.text.toUpperCase()) {
    return false;
  }

  // Regular or italic text
  return !line.isBold || line.isItalic;
}

/**
 * Check if a line is a section note (e.g., "Add Fernet-Branca 5", "Gluten Free +4")
 */
function isSectionNote(line) {
  const text = line.text.trim().toLowerCase();

  const notePatterns = [
    /^add\s+.+\s+\+?\d+$/,
    /^gluten\s+free/,
    /^vegan/,
    /^vegetarian/,
    /^\-\s+or\s+\-$/,
  ];

  return notePatterns.some(pattern => pattern.test(text));
}

/**
 * Extract clean item name (remove price, stars, etc.)
 */
function extractItemName(text) {
  let name = text.trim();

  // Remove prices
  name = name.replace(/[\$\d\.,\s\|\/\-]+(?:glass|carafe|bottle|btl)?$/i, '').trim();

  // Remove asterisks/stars indicating raw items
  name = name.replace(/\*+/g, '').trim();

  return name;
}

/**
 * Extract price and price text from a line
 * Supports formats like:
 * - 16
 * - 29 per 6
 * - 13 | 48
 * - 13 / 34 (3-glass carafe) / 48 per Btl
 * - 11 glass | 40 bottle
 * 
 * @returns {Object|null} { price, text, prices: { glass, carafe, bottle } }
 */
export function extractPrice(text) {
  if (!text) return null;

  // Pattern 1: simple price at end of line
  const simpleMatch = text.match(/\$?(\d+(?:\.\d{2})?)\s*$/);
  if (simpleMatch) {
    return {
      price: parseFloat(simpleMatch[1]),
      text: simpleMatch[0],
      prices: {},
    };
  }

  // Pattern 2: wine pricing with units
  // "13 glass | 48 bottle" or "13 / 48" or "13 | 34 (carafe) | 48"
  const wineMatch = text.match(
    /(\d+(?:\.\d{2})?)\s*(?:glass|g)?\s*[|\-/]\s*(\d+(?:\.\d{2})?)\s*(?:carafe|3-glass|c)?\s*[|\-/]?\s*(\d+(?:\.\d{2})?)?/i
  );
  if (wineMatch && wineMatch[3]) {
    // Three prices: glass / carafe / bottle
    return {
      price: parseFloat(wineMatch[1]),
      text: wineMatch[0],
      prices: {
        glass: parseFloat(wineMatch[1]),
        carafe: parseFloat(wineMatch[2]),
        bottle: parseFloat(wineMatch[3]),
      },
    };
  }

  if (wineMatch && wineMatch[2]) {
    // Two prices: likely glass | bottle
    return {
      price: parseFloat(wineMatch[1]),
      text: wineMatch[0],
      prices: {
        glass: parseFloat(wineMatch[1]),
        bottle: parseFloat(wineMatch[2]),
      },
    };
  }

  // Pattern 3: "29 per 6"
  const perMatch = text.match(/(\d+(?:\.\d{2})?)\s+per\s+(\d+)/i);
  if (perMatch) {
    return {
      price: parseFloat(perMatch[1]),
      text: perMatch[0],
      prices: {},
    };
  }

  return null;
}

/**
 * Main entry point: parse menu from structured layout data
 * @param {Array} lines - Lines with geometry from pdfExtract
 * @returns {Object} { sections: { sectionName: [items] }, metadata: { parser, itemCount } }
 */
export function parseMenuFromLayout(lines) {
  if (!lines || lines.length === 0) {
    return {
      sections: {},
      metadata: {
        parser: 'layout-aware',
        itemCount: 0,
        sectionCount: 0,
        confidence: 0,
      },
    };
  }

  // Step 1: Detect section headers
  const headers = detectSectionHeaders(lines);
  if (headers.length === 0) {
    return {
      sections: {},
      metadata: {
        parser: 'layout-aware',
        itemCount: 0,
        sectionCount: 0,
        confidence: 0,
        error: 'No sections detected',
      },
    };
  }

  // Step 2: Assign lines to sections
  const sectionLines = assignLinesToSections(lines, headers);

  // Step 3: Parse items within each section
  const sections = {};
  let totalItems = 0;

  for (const [sectionName, sectionLinesList] of Object.entries(sectionLines)) {
    const items = parseItemsInSection(sectionLinesList, sectionName);
    sections[sectionName] = items;
    totalItems += items.length;
  }

  return {
    sections,
    metadata: {
      parser: 'layout-aware',
      itemCount: totalItems,
      sectionCount: Object.keys(sections).length,
      headerCount: headers.length,
      confidence: headers.length > 0 ? 0.85 : 0.5,
    },
  };
}
