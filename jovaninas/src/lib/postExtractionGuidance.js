// Post-extraction smart prompts and guidance for ambiguous/high-risk items
// Shows contextual help questions to resolve extraction uncertainty

import { validateExtraction } from "./parserValidation.js";

export const GUIDANCE_TYPES = {
  ITEM_REVIEW: "item_review",
  SECTION_CHECK: "section_check",
  MISSING_DATA: "missing_data",
  LIKELY_ERROR: "likely_error",
};

// Generate guidance questions based on extraction issues
export function generateGuidance(extraction, dictionary = {}) {
  const { issues, summary } = validateExtraction(extraction, dictionary);
  const guidance = [];
  
  issues.forEach((issue) => {
    if (issue.severity === "critical" || issue.severity === "warning") {
      guidance.push({
        type: GUIDANCE_TYPES.LIKELY_ERROR,
        priority: issue.severity === "critical" ? 1 : 2,
        message: issue.message,
        itemRef: { sectionIdx: issue.sectionIdx, itemIdx: issue.itemIdx },
        issueType: issue.type,
      });
    }
  });
  
  const sections = extraction.sections || [];
  sections.forEach((section, sIdx) => {
    const itemCount = section.items?.length || 0;
    if (itemCount > 20) {
      guidance.push({
        type: GUIDANCE_TYPES.SECTION_CHECK,
        priority: 3,
        message: `Section "${section.name}" has ${itemCount} items — likely needs review or splitting.`,
        sectionIdx: sIdx,
      });
    }
  });
  
  const allItems = sections.flatMap(s => s.items || []);
  const missingPrices = allItems.filter(i => i.price === null || i.price === undefined).length;
  if (missingPrices > 0 && missingPrices / allItems.length > 0.3) {
    guidance.push({
      type: GUIDANCE_TYPES.MISSING_DATA,
      priority: 3,
      message: `${missingPrices} items missing prices. Add them if available.`,
    });
  }
  
  guidance.sort((a, b) => a.priority - b.priority);
  
  return guidance;
}

// Get the next high-priority guidance item
export function getNextGuidance(extraction, dictionary = {}) {
  const guidance = generateGuidance(extraction, dictionary);
  return guidance[0] || null;
}

// Format guidance as a user-facing question
export function formatGuidanceQuestion(guidanceItem) {
  switch (guidanceItem.type) {
    case GUIDANCE_TYPES.ITEM_REVIEW:
      return `Review item in section "${guidanceItem.sectionIdx}": ${guidanceItem.message}`;
    
    case GUIDANCE_TYPES.LIKELY_ERROR:
      return `${guidanceItem.message} Is this correct?`;
    
    case GUIDANCE_TYPES.SECTION_CHECK:
      return `${guidanceItem.message} Should we split this section?`;
    
    case GUIDANCE_TYPES.MISSING_DATA:
      return `${guidanceItem.message}`;
    
    default:
      return guidanceItem.message;
  }
}
