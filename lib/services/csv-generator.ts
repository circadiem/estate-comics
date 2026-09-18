// CSV export builder using papaparse
// Column structure follows PDR §V.B — one row per book.
// Source: Implementation Spec §VIII

import Papa from 'papaparse';
import type { ReportData, ReportBook } from '@/lib/types/report';
import { selectHiddenGems, isHeldForReview } from '@/lib/services/offer';

export function generateCSV(data: ReportData): string {
  // Same capped selection as the PDF and emails (MAX_HIDDEN_GEMS)
  const gems = new Set<ReportBook>(selectHiddenGems(data.books));
  const rows = data.books.map((book) => ({
    'Reference #': data.reference_number,
    'Generated At': data.generated_at,
    'Seller Name': data.seller.name,
    'Seller State': data.seller.state,

    // Identification
    'Title': book.identification.title,
    'Issue #': book.identification.issue_number,
    'Volume': book.identification.volume ?? '',
    'Publisher': book.identification.publisher,
    'Cover Date': book.identification.cover_date,
    'Era': book.identification.era,
    'Variant Type': book.identification.variant_type,
    'Variant Detail': book.identification.variant_detail ?? '',
    'Cover Price': book.identification.cover_price ?? '',
    'Significance': book.identification.significance.type ?? '',
    'Significance Description': book.identification.significance.description ?? '',
    'Cover Artist': book.identification.creators.cover_artist ?? '',
    'Writer': book.identification.creators.writer ?? '',
    'Confidence Score': book.identification.confidence_score,
    'Flagged for Review': book.identification.flagged_for_review ? 'Yes' : 'No',
    'Photo Quality': book.identification.photo_quality,

    // Condition
    'Grade Low': book.condition.grade_low.toFixed(1),
    'Grade High': book.condition.grade_high.toFixed(1),
    'Grade Midpoint': book.condition.grade_midpoint.toFixed(1),
    'Grade Label Low': book.condition.grade_label_low,
    'Grade Label High': book.condition.grade_label_high,
    'Grade Limiting Factor': book.condition.grade_limiting_factor,
    'Pressing Potential': book.condition.pressing_potential,
    'Storage Inference': book.condition.storage_inference,

    // Valuation
    'FMV Low': book.valuation.fmv_low.toFixed(2),
    'FMV High': book.valuation.fmv_high.toFixed(2),
    'FMV Midpoint': book.valuation.fmv_midpoint.toFixed(2),
    'Data Source': book.valuation.data_source,
    'GoCollect Match': book.valuation.gocollect_match ? 'Yes' : 'No',
    'Last Sale Date': book.valuation.last_sale_date ?? '',
    'Sales Volume (90d)': book.valuation.sales_volume_90d ?? '',
    'Trend': book.valuation.trend ?? '',
    'Census Count': book.valuation.census_count ?? '',
    'Is Hidden Gem': gems.has(book) ? 'Yes' : 'No',

    // Offer (base)
    'Offer Tier': book.offer.tier_label,
    'Base Offer Low': book.offer.offer_low.toFixed(2),
    'Base Offer High': book.offer.offer_high.toFixed(2),
    'Is Bulk': book.offer.is_bulk ? 'Yes' : 'No',

    // Offer (adjusted)
    'Adjusted Offer Low': book.adjusted_offer.offer_low.toFixed(2),
    'Adjusted Offer High': book.adjusted_offer.offer_high.toFixed(2),
    'Adjusted Tier': book.adjusted_offer.tier_label,
    // Held books are valued provisionally and excluded from the headline range
    'Offer Status': isHeldForReview(book) ? 'Pending verification' : 'Offered',
    'Image Key': book.image_key ?? '',

    // Storage adjustment
    'FMV Multiplier': data.adjustment.fmv_multiplier.toFixed(3),
    'Restoration Flagged': data.adjustment.restoration_flag ? 'Yes' : 'No',
  }));

  return Papa.unparse(rows);
}
