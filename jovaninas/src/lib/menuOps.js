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

// ─── audit & rollback ───────────────────────────────────────────────────────

/**
 * Commit a scan audit record alongside a menu save.
 *
 * An audit captures the raw parser output, confidence score, issue list, and
 * source metadata so that quality can be reviewed and corrections replayed.
 *
 * @param {object} draft
 * @param {object} auditData
 * @param {string} auditData.menuId         - ID of the associated menu snapshot
 * @param {string} auditData.parser         - "layout-aware" | "text"
 * @param {number} auditData.confidence     - 0–1 overall confidence
 * @param {Array}  auditData.issues         - From collectParserIssues / validateParsedMenu
 * @param {object} [auditData.parserMeta]   - metadata from parseMenuFromLayout
 * @param {object} [opts]
 * @param {string} [opts.menuType]
 */
export function commitScanAudit(draft, auditData, opts = {}) {
  if (!draft.scanAudits) draft.scanAudits = [];

  const { menuId, parser, confidence, issues = [], parserMeta = {} } = auditData;
  const { menuType = "Dinner" } = opts;

  const audit = {
    id: uid("audit"),
    menuId,
    menuType,
    parser,
    confidence,
    issueCount: issues.length,
    criticalCount: issues.filter((i) => i.severity === "critical").length,
    warningCount: issues.filter((i) => i.severity === "warning").length,
    issues,
    parserMeta,
    createdAt: new Date().toISOString(),
  };

  draft.scanAudits.unshift(audit);
  // Keep the last 200 audit records
  if (draft.scanAudits.length > 200) draft.scanAudits.length = 200;
}

/**
 * Roll back to the previous menu snapshot of the same type.
 *
 * Finds the two most-recent menus where `menu.menuType === menuType`, and if
 * the first one matches `currentMenuId` it is removed (or marked inactive) so
 * that the prior snapshot becomes current again.
 *
 * @param {object} draft
 * @param {string} currentMenuId - ID of the menu to roll back from
 * @returns {string|null} The ID of the menu that is now "current", or null
 */
export function rollbackToPreviousMenu(draft, currentMenuId) {
  if (!draft.menus || draft.menus.length === 0) return null;

  const idx = draft.menus.findIndex((m) => m.id === currentMenuId);
  if (idx < 0) return null;

  // Remove the current menu (it will be preserved in scanAudits if one was created)
  draft.menus.splice(idx, 1);

  // Return the ID of the menu that is now at the top of the same type, or null
  const current = draft.menus[0];
  return current ? current.id : null;
}
