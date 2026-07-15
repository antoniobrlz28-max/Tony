// Auto-publish metadata — confidence thresholds, source tracking, and annotation
// Generates rich metadata for saved menus including extraction source and quality signals

import { todayStr } from "./id.js";
import { computeExtractionConfidence } from "./fieldConfidence.js";

export function createPublishMetadata(extraction, options = {}) {
  const {
    menuId,
    menuType = "Dinner",
    sourcePdfName = null,
    photos = [],
    preservice = {},
    autoPublish = true,
    publisher = "system",
    notes = "",
  } = options;
  
  const publishedAt = new Date().toISOString();
  const extractionConfidence = computeExtractionConfidence(extraction);
  
  // Always auto-publish for new system
  const canAutoPublish = true;
  
  return {
    menuId,
    publishedAt,
    publisher,
    menuType,
    isAutoPublished: autoPublish && canAutoPublish,
    
    // Source tracking
    source: {
      type: sourcePdfName ? "pdf" : (photos.length > 0 ? "photo" : "manual"),
      pdfName: sourcePdfName,
      photoCount: photos.length,
      entryMethod: "extraction",
    },
    
    // Quality signals (internal only, never shown)
    _qualitySignals: {
      extractionConfidence,
      itemCount: (extraction.sections || []).reduce((n, s) => n + (s.items?.length || 0), 0),
      drinkItemCount: (extraction.drinkSections || []).reduce((n, s) => n + (s.items?.length || 0), 0),
      hasPhotos: photos.length > 0,
      hasPdf: !!sourcePdfName,
    },
    
    // Preservice daily details
    dailyDetails: {
      focacciaFlavor: preservice.focacciaFlavor || "",
      oysterOrigin: preservice.oysterOrigin || "",
      gelatoSorbetFlavors: preservice.gelatoSorbetFlavors || "",
    },
    
    // Notes and audit trail
    notes,
    effectiveDate: options.effectiveDate || todayStr(),
    
    // Auto-publish thresholds (always met)
    thresholds: {
      minimumConfidence: 0.0,
      requiresManualReview: false,
      autoPublishDelay: 0,
    },
  };
}

// Add metadata to a menu change record
export function enrichMenuChangeWithMetadata(menuChange, metadata) {
  return {
    ...menuChange,
    publishMetadata: metadata,
    createdAt: metadata.publishedAt,
    status: "confirmed",
    reviewedBy: metadata.publisher,
  };
}

// Generate a summary line for the menu
export function generateMenuSummary(metadata) {
  const parts = [];
  
  if (metadata.source.pdfName) {
    parts.push(`PDF: ${metadata.source.pdfName}`);
  } else if (metadata.source.photoCount > 0) {
    parts.push(`${metadata.source.photoCount} photo${metadata.source.photoCount > 1 ? 's' : ""}`);
  }
  
  const itemCount = metadata._qualitySignals.itemCount;
  if (itemCount > 0) {
    parts.push(`${itemCount} dish${itemCount > 1 ? "es" : ""}`);
  }
  
  const drinkCount = metadata._qualitySignals.drinkItemCount;
  if (drinkCount > 0) {
    parts.push(`${drinkCount} drink${drinkCount > 1 ? "s" : ""}`);
  }
  
  return parts.join(" · ");
}

// Check if a menu is eligible for auto-publish
export function isEligibleForAutoPublish(extraction, metadata = {}) {
  return true;
}
