/**
 * Menu operations — writing menus and wine catalogs into the data store.
 *
 * The data store (draft) shape:
 *   {
 *     menus: [],      // Food menu snapshots
 *     wineMenus: [],  // Wine menu snapshots
 *     ...
 *   }
 */

import { uid, todayStr } from "./id.js";

// ─── food menus ─────────────────────────────────────────────────────────────

/**
 * Commit a food menu extraction to the data store.
 *
 * @param {object} draft - Immer-style mutable data copy
 * @param {object} extraction - { sections, drinkSections, warnings, menuNumber }
 * @param {object} opts
 * @param {string} opts.menuId
 * @param {string} [opts.menuType]
 * @param {string} [opts.mealPeriod]
 * @param {string} [opts.effectiveDate]
 * @param {string[]} [opts.photos]
 * @param {string} [opts.rawText]
 * @param {string} [opts.sourcePdf]
 * @param {string} [opts.sourcePdfName]
 * @param {object} [opts.preservice]
 */
export function commitMenu(draft, extraction, opts = {}) {
  if (!draft.menus) draft.menus = [];

  const {
    menuId = uid("menu"),
    menuType = "Dinner",
    mealPeriod = "",
    effectiveDate = todayStr(),
    photos = [],
    rawText = "",
    sourcePdf = null,
    sourcePdfName = null,
    preservice = {},
  } = opts;

  const menu = {
    id: menuId,
    menuType,
    mealPeriod,
    effectiveDate,
    savedAt: new Date().toISOString(),
    version: 1,
    // Core extraction data
    sections: extraction.sections || [],
    drinkSections: extraction.drinkSections || [],
    warnings: extraction.warnings || [],
    menuNumber: extraction.menuNumber || null,
    // Source material
    photos,
    rawText,
    sourcePdf,
    sourcePdfName,
    // Daily variable details
    preservice,
  };

  // Keep menus sorted newest-first; cap history at 50
  draft.menus.unshift(menu);
  if (draft.menus.length > 50) draft.menus.length = 50;
}

// ─── wine menus ─────────────────────────────────────────────────────────────

/**
 * Commit a wine menu extraction to the data store.
 *
 * @param {object} draft
 * @param {object} extraction - { sections, warnings, menuType: "wine" }
 * @param {object} opts
 * @param {string} opts.menuId
 * @param {string} [opts.effectiveDate]
 * @param {string[]} [opts.photos]
 * @param {string} [opts.rawText]
 * @param {string} [opts.sourcePdf]
 * @param {string} [opts.sourcePdfName]
 */
export function commitWineMenu(draft, extraction, opts = {}) {
  if (!draft.wineMenus) draft.wineMenus = [];

  const {
    menuId = uid("wine"),
    effectiveDate = todayStr(),
    photos = [],
    rawText = "",
    sourcePdf = null,
    sourcePdfName = null,
  } = opts;

  const menu = {
    id: menuId,
    menuType: "wine",
    effectiveDate,
    savedAt: new Date().toISOString(),
    version: 1,
    sections: extraction.sections || [],
    warnings: extraction.warnings || [],
    // Source
    photos,
    rawText,
    sourcePdf,
    sourcePdfName,
  };

  draft.wineMenus.unshift(menu);
  if (draft.wineMenus.length > 30) draft.wineMenus.length = 30;
}
