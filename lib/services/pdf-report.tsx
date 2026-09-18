// React PDF document for the appraisal report
// Rendered server-side via @react-pdf/renderer
// Pages: cover → summary → hidden gems → key issues → full inventory → terms
// Source: Implementation Spec §VIII

import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import type { ReportData, ReportBook } from '@/lib/types/report';
import { selectHiddenGems } from '@/lib/services/offer';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const C = {
  navy: '#1a1a2e',
  red: '#c0392b',
  gold: '#d4930a',
  emerald: '#1a6b3c',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    400: '#9ca3af',
    600: '#4b5563',
    800: '#1f2937',
  },
  white: '#ffffff',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.gray[800],
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },

  // Cover
  coverPage: { fontFamily: 'Helvetica', paddingTop: 72, paddingHorizontal: 64 },
  coverBrand: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: C.red, letterSpacing: 2 },
  coverTagline: { fontSize: 11, color: C.gray[600], marginTop: 4 },
  coverTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.navy, marginTop: 48 },
  coverRule: { borderBottomWidth: 1.5, borderBottomColor: C.red, marginTop: 16, marginBottom: 24 },
  coverDetail: { fontSize: 10, color: C.gray[600], marginTop: 6 },
  coverDetailLabel: { fontFamily: 'Helvetica-Bold', color: C.gray[800] },
  coverFooter: {
    position: 'absolute',
    bottom: 40,
    left: 64,
    right: 64,
    fontSize: 7,
    color: C.gray[400],
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: C.gray[200],
    paddingTop: 8,
  },

  // Section headers
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: C.navy,
    borderBottomWidth: 1.5,
    borderBottomColor: C.red,
    paddingBottom: 4,
    marginBottom: 12,
  },
  subsectionHeader: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: C.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 14,
  },

  // Page footer
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 7,
    color: C.gray[400],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Stat grid (summary page)
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statBox: {
    borderWidth: 1,
    borderColor: C.gray[200],
    borderRadius: 4,
    padding: 8,
    minWidth: 110,
    flex: 1,
  },
  statLabel: { fontSize: 7, color: C.gray[400], textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.navy, marginTop: 2 },
  statSub: { fontSize: 7, color: C.gray[600], marginTop: 1 },

  // Tables
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.navy,
    borderRadius: 2,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 1,
  },
  tableHeaderCell: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray[200],
  },
  tableRowAlt: { backgroundColor: C.gray[50] },
  tableCell: { fontSize: 7, color: C.gray[800] },
  tableCellBold: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.gray[800] },

  // Hidden gem cards
  gemCard: {
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#fffbeb',
  },
  gemTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.navy },
  gemMeta: { fontSize: 7.5, color: C.gray[600], marginTop: 2 },
  gemBadge: {
    backgroundColor: C.gold,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  gemBadgeText: { fontSize: 6.5, color: C.white, fontFamily: 'Helvetica-Bold' },
  gemExplanation: { fontSize: 7.5, color: C.gray[600], marginTop: 6, lineHeight: 1.4 },
  gemValues: { flexDirection: 'row', gap: 16, marginTop: 6 },
  gemValueLabel: { fontSize: 6.5, color: C.gray[400], textTransform: 'uppercase' },
  gemValueText: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.emerald },

  // Two-column layout
  twoCol: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  // Era table
  eraRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  eraLabel: { fontSize: 7.5, color: C.gray[600] },
  eraCount: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.navy },

  // Adjustment box
  adjustBox: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    padding: 8,
    marginTop: 12,
  },
  adjustTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#1e40af', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  adjustReason: { fontSize: 7, color: '#1d4ed8', marginBottom: 2 },
  restorationBox: {
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
  restorationText: { fontSize: 7, color: '#92400e' },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  if (n < 1) return `$${n.toFixed(2)}`;
  return `$${Math.round(n).toLocaleString()}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Page footer
// ---------------------------------------------------------------------------

function PageFooter({ refNum }: { refNum: string }) {
  return (
    <View style={s.pageFooter} fixed>
      <Text>{refNum}</Text>
      <Text>TheComicBuyers.com — Confidential Appraisal Report</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cover page
// ---------------------------------------------------------------------------

function CoverPage({ data }: { data: ReportData }) {
  // Single source of truth: the summary is built from adjusted_offer server-side,
  // so the headline here matches the inventory rows, the email, and the screen.
  const totalAdjLow = data.summary.total_offer_low;
  const totalAdjHigh = data.summary.total_offer_high;

  return (
    <Page size="LETTER" style={s.coverPage}>
      {/* Branding */}
      <Text style={s.coverBrand}>THECOMICBUYERS.COM</Text>
      <Text style={s.coverTagline}>AI-Powered Comic Book Collection Acquisition</Text>

      {/* Rule */}
      <View style={s.coverRule} />

      {/* Title */}
      <Text style={s.coverTitle}>Appraisal Report</Text>

      {/* Details */}
      <Text style={s.coverDetail}>
        <Text style={s.coverDetailLabel}>Reference:  </Text>
        {data.reference_number}
      </Text>
      <Text style={s.coverDetail}>
        <Text style={s.coverDetailLabel}>Generated:  </Text>
        {fmtDate(data.generated_at)}
      </Text>
      <Text style={[s.coverDetail, { marginTop: 20 }]}>
        <Text style={s.coverDetailLabel}>Prepared for:  </Text>
        {data.seller.name}
      </Text>
      <Text style={s.coverDetail}>
        <Text style={s.coverDetailLabel}>Location:  </Text>
        {data.seller.city}, {data.seller.state} {data.seller.zip}
      </Text>

      {/* Offer highlight */}
      <View style={{ marginTop: 40, borderWidth: 1.5, borderColor: C.red, borderRadius: 6, padding: 16, backgroundColor: '#fff5f5' }}>
        <Text style={{ fontSize: 9, color: C.gray[600], textTransform: 'uppercase', letterSpacing: 0.8 }}>Estimated Cash Offer</Text>
        <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', color: C.navy, marginTop: 4 }}>
          {fmt(totalAdjLow)} – {fmt(totalAdjHigh)}
        </Text>
        <Text style={{ fontSize: 8, color: C.gray[600], marginTop: 4 }}>
          Based on {data.books.length} identified book{data.books.length !== 1 ? 's' : ''} · Offer valid {14} days from generation
        </Text>
      </View>

      {/* Footer */}
      <View style={s.coverFooter}>
        <Text>This report is confidential and intended solely for the named recipient. All valuations are estimates based on available market data and photo assessment. Actual offer subject to physical inspection.</Text>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Summary page
// ---------------------------------------------------------------------------

function SummaryPage({ data }: { data: ReportData }) {
  const { summary, adjustment } = data;
  const totalAdjLow = summary.total_offer_low;
  const totalAdjHigh = summary.total_offer_high;

  const eraEntries = [
    ['Golden Age', summary.breakdown_by_era.golden],
    ['Silver Age', summary.breakdown_by_era.silver],
    ['Bronze Age', summary.breakdown_by_era.bronze],
    ['Copper Age', summary.breakdown_by_era.copper],
    ['Modern Age', summary.breakdown_by_era.modern],
  ].filter(([, count]) => (count as number) > 0);

  const topPublishers = Object.entries(summary.breakdown_by_publisher)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 8);

  return (
    <Page size="LETTER" style={s.page}>
      <PageFooter refNum={data.reference_number} />
      <Text style={s.sectionHeader}>Collection Summary</Text>

      {/* Key stats */}
      <View style={s.statGrid}>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Books Identified</Text>
          <Text style={s.statValue}>{summary.total_books_identified}</Text>
          {summary.total_books_flagged > 0 && (
            <Text style={s.statSub}>{summary.total_books_flagged} flagged for review</Text>
          )}
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Est. Fair Market Value</Text>
          <Text style={s.statValue}>{fmt(summary.total_fmv_low)}</Text>
          <Text style={s.statSub}>– {fmt(summary.total_fmv_high)}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Adjusted Offer</Text>
          <Text style={[s.statValue, { color: C.emerald }]}>{fmt(totalAdjLow)}</Text>
          <Text style={s.statSub}>– {fmt(totalAdjHigh)}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Key Issues</Text>
          <Text style={s.statValue}>{summary.key_issues_count}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>Hidden Gems</Text>
          <Text style={s.statValue}>{summary.hidden_gems_count}</Text>
        </View>
      </View>

      {/* Era + publisher breakdowns */}
      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.subsectionHeader}>Era Breakdown</Text>
          {eraEntries.map(([label, count]) => (
            <View key={label as string} style={s.eraRow}>
              <Text style={s.eraLabel}>{label as string}</Text>
              <Text style={s.eraCount}>{count as number}</Text>
            </View>
          ))}
        </View>
        <View style={s.col}>
          <Text style={s.subsectionHeader}>Top Publishers</Text>
          {topPublishers.map(([pub, count]) => (
            <View key={pub} style={s.eraRow}>
              <Text style={s.eraLabel}>{pub}</Text>
              <Text style={s.eraCount}>{count as number}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Storage adjustment */}
      {adjustment.adjustment_reasons.length > 0 && (
        <View style={s.adjustBox}>
          <Text style={s.adjustTitle}>Storage Adjustment Applied ({adjustment.fmv_multiplier.toFixed(2)}×)</Text>
          {adjustment.adjustment_reasons.map((r, i) => (
            <Text key={i} style={s.adjustReason}>· {r}</Text>
          ))}
        </View>
      )}
      {adjustment.restoration_flag && (
        <View style={s.restorationBox}>
          <Text style={s.restorationText}>Restoration disclosure noted — all books subject to physical review before offer is finalised.</Text>
        </View>
      )}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Hidden gems page
// ---------------------------------------------------------------------------

function HiddenGemsPage({ data }: { data: ReportData }) {
  const gems = selectHiddenGems(data.books);
  if (gems.length === 0) return null;

  return (
    <Page size="LETTER" style={s.page}>
      <PageFooter refNum={data.reference_number} />
      <Text style={s.sectionHeader}>Hidden Gems ({gems.length})</Text>
      <Text style={{ fontSize: 7.5, color: C.gray[600], marginBottom: 12, lineHeight: 1.4 }}>
        These books have collector significance that may not be obvious to a non-collector.
        Each is worth meaningfully more than a typical issue from the same era.
      </Text>

      {gems.map((book, i) => {
        const { identification: id, valuation: val, adjusted_offer: offer } = book;
        return (
          <View key={i} style={s.gemCard} wrap={false}>
            <Text style={s.gemTitle}>
              {id.title} #{id.issue_number}
              {id.volume ? ` (Vol. ${id.volume})` : ''}
            </Text>
            <Text style={s.gemMeta}>
              {id.publisher} · {id.cover_date} · {id.era} Age
            </Text>
            {id.significance.type && (
              <View style={s.gemBadge}>
                <Text style={s.gemBadgeText}>{id.significance.type.replace(/_/g, ' ').toUpperCase()}</Text>
              </View>
            )}
            {val.hidden_gem_explanation && (
              <Text style={s.gemExplanation}>{val.hidden_gem_explanation}</Text>
            )}
            <View style={s.gemValues}>
              <View>
                <Text style={s.gemValueLabel}>Est. Value</Text>
                <Text style={s.gemValueText}>{fmt(val.fmv_low)} – {fmt(val.fmv_high)}</Text>
              </View>
              <View>
                <Text style={s.gemValueLabel}>Offer</Text>
                <Text style={s.gemValueText}>{fmt(offer.offer_low)} – {fmt(offer.offer_high)}</Text>
              </View>
              <View>
                <Text style={s.gemValueLabel}>Grade</Text>
                <Text style={s.gemValueText}>{book.condition.grade_label_low} – {book.condition.grade_label_high}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Key issues page (adjusted FMV midpoint ≥ $500 — same basis as summary.key_issues_count)
// ---------------------------------------------------------------------------

const KEY_COL_WIDTHS = { title: '24%', issue: '8%', pub: '18%', era: '8%', grade: '12%', fmv: '15%', offer: '15%' };

function KeyIssuesPage({ data }: { data: ReportData }) {
  const keys = data.books.filter((b) => b.adjusted_offer.tier === 'key_issues');
  if (keys.length === 0) return null;

  return (
    <Page size="LETTER" style={s.page}>
      <PageFooter refNum={data.reference_number} />
      <Text style={s.sectionHeader}>Key Issues ({keys.length})</Text>

      {/* Table header */}
      <View style={s.tableHeader}>
        <Text style={[s.tableHeaderCell, { width: KEY_COL_WIDTHS.title }]}>Title</Text>
        <Text style={[s.tableHeaderCell, { width: KEY_COL_WIDTHS.issue }]}>#</Text>
        <Text style={[s.tableHeaderCell, { width: KEY_COL_WIDTHS.pub }]}>Publisher</Text>
        <Text style={[s.tableHeaderCell, { width: KEY_COL_WIDTHS.era }]}>Era</Text>
        <Text style={[s.tableHeaderCell, { width: KEY_COL_WIDTHS.grade }]}>Grade</Text>
        <Text style={[s.tableHeaderCell, { width: KEY_COL_WIDTHS.fmv }]}>FMV</Text>
        <Text style={[s.tableHeaderCell, { width: KEY_COL_WIDTHS.offer }]}>Offer</Text>
      </View>

      {keys.map((book, i) => {
        const { identification: id, condition: cond, valuation: val, adjusted_offer: offer } = book;
        return (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tableCellBold, { width: KEY_COL_WIDTHS.title }]}>{id.title}</Text>
            <Text style={[s.tableCell, { width: KEY_COL_WIDTHS.issue }]}>{id.issue_number}</Text>
            <Text style={[s.tableCell, { width: KEY_COL_WIDTHS.pub }]}>{id.publisher}</Text>
            <Text style={[s.tableCell, { width: KEY_COL_WIDTHS.era }]}>{id.era}</Text>
            <Text style={[s.tableCell, { width: KEY_COL_WIDTHS.grade }]}>
              {cond.grade_low.toFixed(1)}–{cond.grade_high.toFixed(1)}
            </Text>
            <Text style={[s.tableCell, { width: KEY_COL_WIDTHS.fmv }]}>
              {fmt(val.fmv_low)}–{fmt(val.fmv_high)}
            </Text>
            <Text style={[s.tableCellBold, { width: KEY_COL_WIDTHS.offer, color: C.emerald }]}>
              {fmt(offer.offer_low)}–{fmt(offer.offer_high)}
            </Text>
          </View>
        );
      })}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Full inventory page(s)
// ---------------------------------------------------------------------------

const INV_COL_WIDTHS = { title: '22%', issue: '6%', pub: '14%', era: '7%', grade: '10%', fmv: '12%', offer: '12%', flags: '17%' };

function InventoryPage({ data }: { data: ReportData }) {
  const gems = new Set<ReportBook>(selectHiddenGems(data.books));
  return (
    <Page size="LETTER" style={s.page}>
      <PageFooter refNum={data.reference_number} />
      <Text style={s.sectionHeader}>Full Inventory ({data.books.length} books)</Text>

      {/* Table header — fixed across pages */}
      <View style={s.tableHeader} fixed>
        <Text style={[s.tableHeaderCell, { width: INV_COL_WIDTHS.title }]}>Title</Text>
        <Text style={[s.tableHeaderCell, { width: INV_COL_WIDTHS.issue }]}>#</Text>
        <Text style={[s.tableHeaderCell, { width: INV_COL_WIDTHS.pub }]}>Publisher</Text>
        <Text style={[s.tableHeaderCell, { width: INV_COL_WIDTHS.era }]}>Era</Text>
        <Text style={[s.tableHeaderCell, { width: INV_COL_WIDTHS.grade }]}>Grade</Text>
        <Text style={[s.tableHeaderCell, { width: INV_COL_WIDTHS.fmv }]}>FMV (est.)</Text>
        <Text style={[s.tableHeaderCell, { width: INV_COL_WIDTHS.offer }]}>Offer</Text>
        <Text style={[s.tableHeaderCell, { width: INV_COL_WIDTHS.flags }]}>Flags</Text>
      </View>

      {data.books.map((book, i) => {
        const { identification: id, condition: cond, valuation: val, adjusted_offer: offer } = book;
        const flags = [
          id.flagged_for_review ? 'Review' : '',
          gems.has(book) ? 'Gem' : '',
          offer.tier === 'key_issues' ? 'Key' : '',
          id.significance.type ? '★' : '',
        ].filter(Boolean).join(' · ');

        return (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tableCellBold, { width: INV_COL_WIDTHS.title }]}>{id.title}</Text>
            <Text style={[s.tableCell, { width: INV_COL_WIDTHS.issue }]}>{id.issue_number}</Text>
            <Text style={[s.tableCell, { width: INV_COL_WIDTHS.pub }]}>{id.publisher}</Text>
            <Text style={[s.tableCell, { width: INV_COL_WIDTHS.era }]}>{id.era.slice(0, 2)}</Text>
            <Text style={[s.tableCell, { width: INV_COL_WIDTHS.grade }]}>
              {cond.grade_low.toFixed(1)}–{cond.grade_high.toFixed(1)}
            </Text>
            <Text style={[s.tableCell, { width: INV_COL_WIDTHS.fmv }]}>
              {fmt(val.fmv_low)}–{fmt(val.fmv_high)}
            </Text>
            <Text style={[s.tableCellBold, { width: INV_COL_WIDTHS.offer, color: C.emerald }]}>
              {fmt(offer.offer_low)}–{fmt(offer.offer_high)}
            </Text>
            <Text style={[s.tableCell, { width: INV_COL_WIDTHS.flags, color: C.gray[400] }]}>
              {flags}
            </Text>
          </View>
        );
      })}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Terms page
// ---------------------------------------------------------------------------

function TermsPage({ data }: { data: ReportData }) {
  return (
    <Page size="LETTER" style={s.page}>
      <PageFooter refNum={data.reference_number} />
      <Text style={s.sectionHeader}>Terms & Conditions</Text>

      {[
        ['Offer Validity', `This offer estimate is valid for 14 days from the generation date shown on this report (${fmtDate(data.generated_at)}). After this period, the collection must be re-appraised.`],
        ['Physical Inspection', 'All offer amounts are contingent upon physical inspection of the collection by a TheComicBuyers representative. The AI-generated grades are conservative estimates from cover photographs only and cannot account for interior pages, staple condition, or professional restoration not visible from the cover.'],
        ['Restoration Disclosure', 'Any professional restoration, cleaning, or pressing not disclosed prior to physical inspection will result in offer renegotiation. Undisclosed restoration detected at inspection may reduce individual book offers by 30–70%.'],
        ['Grade Variance', 'Condition grades span a minimum range of 1.0 grade point to account for factors not visible in photographs (interior page quality, staple rust, subscription creases, Marvel Value Stamps, hidden defects). The actual grade assigned after inspection will typically fall at or above the midpoint of the AI-estimated range.'],
        ['Valuation Sources', 'Fair market values are derived from GoCollect sales data where available, or from era/grade interpolation tables where GoCollect data is unavailable. Market conditions fluctuate; valuations reflect estimates at time of report generation.'],
        ['Payment', 'Upon acceptance of the formal offer, the collection is physically verified at pickup. Payment is made within 48 hours of verification, by the seller\'s preferred method. All offers are contingent on physical inspection and valid for 14 days from the report date.'],
        ['No Obligation', 'This appraisal report does not constitute a binding contract. Both parties retain the right to decline the transaction for any reason.'],
      ].map(([title, body], i) => (
        <View key={i} style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.navy, marginBottom: 2 }}>{title}</Text>
          <Text style={{ fontSize: 7, color: C.gray[600], lineHeight: 1.5 }}>{body}</Text>
        </View>
      ))}

      <View style={{ marginTop: 16, borderTopWidth: 0.5, borderTopColor: C.gray[200], paddingTop: 10 }}>
        <Text style={{ fontSize: 7, color: C.gray[400], textAlign: 'center' }}>
          TheComicBuyers.com · EstateComics.com · questions@thecomicbuyers.com{'\n'}
          Reference: {data.reference_number}
        </Text>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

function AppraisalDocument({ data }: { data: ReportData }) {
  return (
    <Document
      title={`Appraisal Report ${data.reference_number}`}
      author="TheComicBuyers.com"
      subject="Comic Book Collection Appraisal"
    >
      <CoverPage data={data} />
      <SummaryPage data={data} />
      <HiddenGemsPage data={data} />
      <KeyIssuesPage data={data} />
      <InventoryPage data={data} />
      <TermsPage data={data} />
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function collectStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function generatePDF(data: ReportData): Promise<Buffer> {
  const instance = pdf(<AppraisalDocument data={data} />);
  const stream = await instance.toBuffer();
  return collectStream(stream);
}
