import { uid, nowIso } from "./id.js";
import { extractDishComponents } from "./components.js";
import { compareMenuVersions } from "./diff.js";
import { generateCardsForDish } from "./cards.js";
import { registerDiscoveredTerm } from "./dictionary.js";

export function findLatestMenuOfType(data, menuType, excludeId = null) {
  const candidates = data.menus
    .filter((m) => m.menuType === menuType && m.status === "confirmed" && m.id !== excludeId)
    .sort(
      (a, b) =>
        (b.effectiveDate || "").localeCompare(a.effectiveDate || "") ||
        (b.uploadDate || "").localeCompare(a.uploadDate || "")
    );
  return candidates[0] || null;
}

export function prevItemsFromMenu(data, menu) {
  const items = [];
  for (const section of menu.sections) {
    for (const dvId of section.dishVersionIds) {
      const dv = data.dishVersions[dvId];
      if (!dv) continue;
      items.push({
        dishId: dv.dishId,
        dishVersionId: dv.id,
        name: dv.displayName,
        description: dv.description,
        price: dv.price,
        section: section.name,
        components: dv.components,
      });
    }
  }
  return items;
}

// Mutates `draft` (already a fresh clone from context.update) to save a new
// menu, run comparison against the prior menu of the same type, create dish
// identities/versions, changes, and training cards.
export function commitMenu(draft, extraction, meta) {
  const menuId = meta.menuId || uid("menu");
  const versionNumber = draft.menus.filter((m) => m.menuType === meta.menuType).length + 1;

  const prevMenu = findLatestMenuOfType(draft, meta.menuType);
  const prevItems = prevMenu ? prevItemsFromMenu(draft, prevMenu) : [];

  const newItemsFlat = [];
  extraction.sections.forEach((section) => {
    section.items.forEach((item) => {
      newItemsFlat.push({ ...item, section: section.name });
    });
  });

  const cmp = compareMenuVersions(prevItems, newItemsFlat, draft.dictionary);

  const sections = extraction.sections.map((s) => ({ id: uid("sec"), name: s.name, dishVersionIds: [] }));
  const changes = [];

  const attachDishVersion = (sectionName, dvId) => {
    const sec = sections.find((s) => s.name === sectionName);
    if (sec) sec.dishVersionIds.push(dvId);
  };

  const createDishVersion = ({ dishId, item, source, confidence }) => {
    const dvId = uid("dv");
    const components = item.components || extractDishComponents(item.name, item.description, draft.dictionary);
    for (const c of components) registerDiscoveredTerm(draft.dictionary, c);
    draft.dishVersions[dvId] = {
      id: dvId,
      dishId,
      menuId,
      displayName: item.name,
      description: item.description,
      price: item.price,
      section: item.section,
      effectiveDate: meta.effectiveDate,
      components,
      confidence: confidence ?? item.confidence ?? 0.7,
      source: source || "extracted",
      confirmed: false,
    };
    return dvId;
  };

  const priceStr = (v) => (v != null ? ` ($${Number(v).toFixed(2)})` : "");

  for (const m of cmp.matches) {
    const dishId = m.oldItem.dishId;
    const dvId = createDishVersion({ dishId, item: m.newItem, confidence: m.confidence });
    attachDishVersion(m.newItem.section, dvId);
    const dish = draft.dishes[dishId];
    dish.versions.push(dvId);
    dish.lastSeen = meta.effectiveDate;
    dish.status = "active";
    if (!m.noChange) {
      const changeType = m.priceChanged && !m.componentsAdded.length && !m.componentsRemoved.length
        ? m.priceDelta > 0 ? "Price increased" : "Price decreased"
        : m.nameChanged && !m.componentsAdded.length && !m.componentsRemoved.length
        ? "Renamed item"
        : "Ingredient changed";
      changes.push({
        id: uid("chg"),
        menuId,
        dishId,
        oldVersionId: m.oldItem.dishVersionId,
        newVersionId: dvId,
        changeType,
        oldValue: `${m.oldItem.name} — ${m.oldItem.description}${priceStr(m.oldItem.price)}`,
        newValue: `${m.newItem.name} — ${m.newItem.description}${priceStr(m.newItem.price)}`,
        confidence: m.confidence,
        culinaryImportance: m.culinaryImportance,
        serviceImportance: m.serviceImportance,
        trainingPriority: m.trainingPriority,
        explanation: m.explanation.length ? m.explanation : ["Minor wording or formatting change; no culinary change detected."],
        reviewStatus: "auto",
      });
    }
  }

  for (const m of cmp.uncertain) {
    const dishId = m.oldItem.dishId;
    const dvId = createDishVersion({ dishId, item: m.newItem, confidence: m.confidence });
    attachDishVersion(m.newItem.section, dvId);
    const dish = draft.dishes[dishId];
    dish.versions.push(dvId);
    dish.lastSeen = meta.effectiveDate;
    dish.status = "active";
    changes.push({
      id: uid("chg"),
      menuId,
      dishId,
      oldVersionId: m.oldItem.dishVersionId,
      newVersionId: dvId,
      changeType: m.matchType === "component" ? "Uncertain change" : "Renamed item",
      oldValue: `${m.oldItem.name} — ${m.oldItem.description}${priceStr(m.oldItem.price)}`,
      newValue: `${m.newItem.name} — ${m.newItem.description}${priceStr(m.newItem.price)}`,
      confidence: m.confidence,
      culinaryImportance: m.culinaryImportance,
      serviceImportance: m.serviceImportance,
      trainingPriority: m.trainingPriority,
      explanation: [`Possible match to "${m.oldItem.name}" — please confirm this is the same dish.`, ...m.explanation],
      reviewStatus: "needs_review",
    });
  }

  for (const item of cmp.added) {
    const dishId = uid("dish");
    draft.dishes[dishId] = {
      id: dishId,
      canonicalName: item.name,
      firstSeen: meta.effectiveDate,
      lastSeen: meta.effectiveDate,
      status: "active",
      versions: [],
    };
    const dvId = createDishVersion({ dishId, item, confidence: item.confidence });
    draft.dishes[dishId].versions.push(dvId);
    attachDishVersion(item.section, dvId);
    changes.push({
      id: uid("chg"),
      menuId,
      dishId,
      oldVersionId: null,
      newVersionId: dvId,
      changeType: "Added item",
      oldValue: null,
      newValue: `${item.name} — ${item.description}${priceStr(item.price)}`,
      confidence: item.confidence,
      culinaryImportance: "Medium",
      serviceImportance: "Medium",
      trainingPriority: "This week",
      explanation: [`${item.name} is new on the menu.`],
      reviewStatus: "auto",
    });
  }

  for (const old of cmp.removed) {
    const dish = draft.dishes[old.dishId];
    if (dish) dish.status = "removed";
    changes.push({
      id: uid("chg"),
      menuId,
      dishId: old.dishId,
      oldVersionId: old.dishVersionId,
      newVersionId: null,
      changeType: "Removed item",
      oldValue: `${old.name} — ${old.description}${priceStr(old.price)}`,
      newValue: null,
      confidence: 0.8,
      culinaryImportance: "Medium",
      serviceImportance: "Low",
      trainingPriority: "Before next shift",
      explanation: [`${old.name} was removed from the current menu. Retained in the historical archive.`],
      reviewStatus: "auto",
    });
  }

  draft.menus.push({
    id: menuId,
    menuType: meta.menuType,
    mealPeriod: meta.mealPeriod,
    effectiveDate: meta.effectiveDate,
    uploadDate: nowIso(),
    photos: meta.photos || [],
    sourcePdf: meta.sourcePdf || null,
    sourcePdfName: meta.sourcePdfName || null,
    rawText: meta.rawText,
    menuNumber: extraction.menuNumber || null,
    versionNumber,
    status: "confirmed",
    sections,
    comparedAgainstMenuId: prevMenu?.id || null,
    parseWarnings: extraction.warnings || [],
  });

  draft.changes.push(...changes);

  for (const chg of changes) {
    if (!chg.newVersionId) continue;
    const dv = draft.dishVersions[chg.newVersionId];
    const existingQuestions = new Set(
      Object.values(draft.cards)
        .filter((c) => c.dishVersionId === dv.id)
        .map((c) => c.question)
    );
    for (const card of generateCardsForDish(dv, draft.dictionary)) {
      if (!existingQuestions.has(card.question)) draft.cards[card.id] = card;
    }
  }

  return { menuId, changeCount: changes.length };
}

export function confirmChange(draft, changeId) {
  const chg = draft.changes.find((c) => c.id === changeId);
  if (chg) chg.reviewStatus = "confirmed";
}

export function markChangeIgnored(draft, changeId, reason = "ignored") {
  const chg = draft.changes.find((c) => c.id === changeId);
  if (chg) chg.reviewStatus = reason;
}

// Human confirms this was actually a brand-new dish, not a continuation of
// the matched previous dish — splits the identity and files a proper
// "removed" change for the old dish.
export function markChangeAsNewDish(draft, changeId) {
  const chg = draft.changes.find((c) => c.id === changeId);
  if (!chg || !chg.newVersionId) return;
  const dv = draft.dishVersions[chg.newVersionId];
  const oldDishId = chg.dishId;
  const oldVersionId = chg.oldVersionId;
  const oldDish = draft.dishes[oldDishId];
  if (oldDish) {
    oldDish.versions = oldDish.versions.filter((id) => id !== dv.id);
    oldDish.status = "removed";
  }

  const newDishId = uid("dish");
  draft.dishes[newDishId] = {
    id: newDishId,
    canonicalName: dv.displayName,
    firstSeen: dv.effectiveDate,
    lastSeen: dv.effectiveDate,
    status: "active",
    versions: [dv.id],
  };
  dv.dishId = newDishId;

  chg.dishId = newDishId;
  chg.changeType = "Added item";
  chg.oldVersionId = null;
  chg.oldValue = null;
  chg.reviewStatus = "confirmed";
  chg.explanation = [`${dv.displayName} was confirmed as a distinct new dish, not a continuation of the previous item.`];

  if (oldVersionId) {
    const oldDv = draft.dishVersions[oldVersionId];
    draft.changes.push({
      id: uid("chg"),
      menuId: chg.menuId,
      dishId: oldDishId,
      oldVersionId,
      newVersionId: null,
      changeType: "Removed item",
      oldValue: oldDv ? `${oldDv.displayName} — ${oldDv.description}` : null,
      newValue: null,
      confidence: 0.7,
      culinaryImportance: "Medium",
      serviceImportance: "Low",
      trainingPriority: "Before next shift",
      explanation: [`${oldDv?.displayName || "The previous item"} was removed from the menu (split from an uncertain match).`],
      reviewStatus: "confirmed",
    });
  }
}

export function addNote(draft, { entityType, entityId, noteType, content, source = "user" }) {
  draft.notes.push({
    id: uid("note"),
    entityType,
    entityId,
    noteType,
    content,
    source,
    confidence: source === "chef" ? "restaurant-confirmed" : "user",
    createdAt: nowIso(),
  });
}

export function dishHistory(data, dishId) {
  const dish = data.dishes[dishId];
  if (!dish) return [];
  return dish.versions
    .map((vid) => data.dishVersions[vid])
    .filter(Boolean)
    .sort((a, b) => (a.effectiveDate || "").localeCompare(b.effectiveDate || ""));
}

export function latestDishVersion(data, dishId) {
  const hist = dishHistory(data, dishId);
  return hist[hist.length - 1] || null;
}
