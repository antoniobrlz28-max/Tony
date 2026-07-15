/**
 * parseMenu.js — menu text parser facade
 *
 * Wraps parseMenuFromText (layout module) so Scan.jsx imports a stable API.
 */

import { parseMenuFromText } from "./parseMenuLayout.js";

/**
 * Parse menu text into sections suitable for the Scan preview.
 *
 * @param {string} text
 * @param {object} [opts]
 * @param {string[]} [opts.extraFoodHeaders]
 * @returns {{ sections, drinkSections, warnings, menuNumber }}
 */
export function parseMenuText(text, opts = {}) {
  return parseMenuFromText(text, opts);
}
