// Appraisal report — the Provenance treatment.
// Rendered server-side via @react-pdf/renderer.
//
// "The single most important surface in the product. It is the artifact a
//  seller forwards to their attorney, their sibling, and their accountant."
//                                             — docs/04-brand-provenance.md §6
//
// Structure (spec §VIII + brand §6):
//   1. Header + meta band + summary cards + adjustment note + breakdowns
//   2. Key Issues — the most valuable books, first — followed on the same
//      pages by Hidden Gems — "Books you might not know are valuable."
//   3. Complete inventory — FMV descending, vellum/bisque rows; bulk as aggregate
//   4. How this appraisal was prepared — methodology + terms
// Footer on every page: Estate Comics · Powered by Legends of Superheros · Est. 1993
//
// Cover thumbnails resolve ONLY through resolveCoverImage() (report-images.ts).

import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, pdf } from '@react-pdf/renderer';
import type { ReportData, ReportBook } from '@/lib/types/report';
import { selectHiddenGems } from '@/lib/services/offer';
import { resolveCoverImage } from '@/lib/services/report-images';
import { OFFER_VALIDITY_DAYS } from '@/lib/config/constants';
import { color, font, size, space, radius, refTracking } from '@/lib/pdf/theme';

// ---------------------------------------------------------------------------
// Styles — every colour is a token; every size is from the theme scale
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  // NOTE: no lineHeight on the page. react-pdf 4.3 drops any fixed view whose
  // render-prop text (the page number) inherits or sets a lineHeight, so line
  // heights live on the prose styles below and the footer stays bare.
  page: {
    fontFamily: font.body,
    fontSize: size.sm,
    color: color.charcoalBrown,
    backgroundColor: color.ivory,
    paddingTop: space.pageTop,
    paddingBottom: space.pageBottom,
    paddingHorizontal: space.pageX,
  },

  // Header (page 1)
  headerRule: { height: 4, backgroundColor: color.darkUmber, marginBottom: space.block },
  wordmarkBlock: { alignItems: 'center', marginBottom: space.block },
  wordmark: {
    fontFamily: font.display,
    fontWeight: 700,
    fontSize: size.wordmark,
    color: color.charcoalBrown,
    letterSpacing: -0.2, lineHeight: 1 },
  wordmarkHair: { width: 112, height: 1, backgroundColor: color.antiqueGold, marginTop: 8, marginBottom: 6 },
  descriptor: {
    fontFamily: font.display,
    fontStyle: 'italic',
    fontSize: size.descriptor,
    color: color.patina, lineHeight: 1.45 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  h1: { fontFamily: font.display, fontWeight: 600, fontSize: size.h1, lineHeight: 1.15, color: color.darkUmber },
  refNumber: { fontFamily: font.body, fontWeight: 600, fontSize: size.sm, letterSpacing: refTracking, color: color.charcoalBrown, lineHeight: 1.45 },
  refLabel: { fontSize: size.micro, color: color.umber, textAlign: 'right', lineHeight: 1.45 },

  // Running header (pages 2+)
  runningHeader: {
    position: 'absolute',
    top: 18,
    left: space.pageX,
    right: space.pageX,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: color.antiqueGold,
  },
  runningWordmark: { fontFamily: font.display, fontWeight: 700, fontSize: size.wordmarkSmall, color: color.charcoalBrown, lineHeight: 1.3 },

  // Meta band
  metaBand: {
    backgroundColor: color.vellum,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: color.bisque,
    marginTop: space.gap,
    marginHorizontal: -space.pageX,
    paddingHorizontal: space.pageX,
    paddingVertical: space.tight,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: { fontSize: size.label, color: color.umber, lineHeight: 1.45 },
  metaValue: { color: color.charcoalBrown, fontWeight: 600 },

  // Section headings
  h2: { fontFamily: font.display, fontWeight: 600, fontSize: size.h2, lineHeight: 1.2, color: color.darkUmber },
  h3: { fontFamily: font.display, fontWeight: 500, fontSize: size.h3, lineHeight: 1.3, color: color.darkUmber },
  subhead: { fontFamily: font.display, fontStyle: 'italic', fontSize: size.subhead, lineHeight: 1.4, color: color.patina, marginTop: 2 },
  sectionRule: { height: 1, backgroundColor: color.antiqueGold, marginTop: space.tight, marginBottom: space.gap },

  // Summary cards
  cards: { flexDirection: 'row', gap: space.tight, marginTop: space.block },
  card: {
    flex: 1,
    backgroundColor: color.ivory,
    borderWidth: 1,
    borderColor: color.bisque,
    borderTopWidth: 2,
    borderTopColor: color.antiqueGold,
    borderRadius: radius,
    paddingVertical: space.gap,
    paddingHorizontal: space.gap,
  },
  cardLabel: { fontSize: size.label, color: color.umber, marginBottom: 2, lineHeight: 1.45 },
  cardFigure: { fontFamily: font.display, fontWeight: 600, fontSize: size.figure, lineHeight: 1.1, color: color.darkUmber },
  cardFigureSm: { fontFamily: font.display, fontWeight: 600, fontSize: size.h3, lineHeight: 1.15, color: color.darkUmber },
  cardSub: { fontSize: size.micro, color: color.umber, marginTop: 2, lineHeight: 1.45 },

  // Panels
  panel: {
    backgroundColor: color.bisque,
    borderRadius: radius,
    padding: space.gap,
    marginTop: space.gap,
  },
  panelTitle: { fontWeight: 600, fontSize: size.sm, color: color.darkUmber, marginBottom: 3, lineHeight: 1.45 },
  panelText: { fontSize: size.label, color: color.charcoalBrown, lineHeight: 1.5 },
  flagText: { fontWeight: 600, fontSize: size.label, color: color.mutedRed, lineHeight: 1.45 },

  // Two-column breakdowns
  twoCol: { flexDirection: 'row', gap: space.block, marginTop: space.block },
  col: { flex: 1 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: color.bisque },
  kvLabel: { fontSize: size.label, color: color.umber, lineHeight: 1.45 },
  kvValue: { fontSize: size.label, fontWeight: 600, color: color.darkUmber, lineHeight: 1.45 },

  // Book rows (Key Issues, Hidden Gems)
  bookRow: {
    flexDirection: 'row',
    gap: space.gap,
    paddingVertical: space.tight,
    borderBottomWidth: 0.5,
    borderBottomColor: color.bisque,
  },
  bookBody: { flex: 1 },
  bookTitle: { fontWeight: 700, fontSize: size.sm, color: color.charcoalBrown, lineHeight: 1.45 },
  bookMeta: { fontSize: size.label, color: color.umber, marginTop: 1, lineHeight: 1.45 },
  bookSentence: { fontSize: size.label, color: color.charcoalBrown, marginTop: 3, lineHeight: 1.5 },
  bookFigures: { width: 128, alignItems: 'flex-end' },
  figLabel: { fontSize: size.micro, color: color.umber, lineHeight: 1.45 },
  figValue: { fontSize: size.sm, fontWeight: 600, color: color.darkUmber, marginBottom: 3, lineHeight: 1.45 },

  // Cover thumbnail
  thumb: { width: 30, height: 45, borderRadius: radius, borderWidth: 1, borderColor: color.bisque, backgroundColor: color.vellum },
  thumbImg: { width: 30, height: 45, borderRadius: radius, objectFit: 'cover' },
  thumbPlaceholder: { width: 30, height: 45, alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { fontSize: 5.5, color: color.patina, textAlign: 'center', lineHeight: 1.45 },

  // Inventory table
  th: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: color.antiqueGold,
    marginBottom: 2,
  },
  thText: { fontWeight: 600, fontSize: size.label, color: color.darkUmber, lineHeight: 1.45 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 4, borderRadius: radius },
  trAlt: { backgroundColor: color.bisque },
  trBase: { backgroundColor: color.vellum },
  td: { fontSize: size.label, color: color.charcoalBrown, lineHeight: 1.45 },
  tdMuted: { fontSize: size.micro, color: color.umber, lineHeight: 1.45 },
  tdNum: { fontSize: size.label, color: color.charcoalBrown, textAlign: 'right', lineHeight: 1.45 },
  tdNumStrong: { fontSize: size.label, fontWeight: 600, color: color.darkUmber, textAlign: 'right', lineHeight: 1.45 },

  // Prose
  p: { fontSize: size.sm, lineHeight: 1.6, color: color.charcoalBrown, marginBottom: space.tight, maxWidth: 440 },
  termTitle: { fontWeight: 600, fontSize: size.sm, color: color.darkUmber, marginTop: space.tight, marginBottom: 2, lineHeight: 1.45 },
  termBody: { fontSize: size.label, lineHeight: 1.55, color: color.charcoalBrown, maxWidth: 460 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 22,
    left: space.pageX,
    right: space.pageX,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: color.bisque,
    paddingTop: 6,
  },
  footerText: { fontSize: size.micro, color: color.patina },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  if (n < 1) return `$${n.toFixed(2)}`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}
const range = (lo: number, hi: number) => `${fmt(lo)} – ${fmt(hi)}`;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function offerExpiry(iso: string): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + OFFER_VALIDITY_DAYS);
  return fmtDate(d.toISOString());
}

const byFmvDesc = (a: ReportBook, b: ReportBook) => b.valuation.fmv_midpoint - a.valuation.fmv_midpoint;

function plainSignificance(book: ReportBook): string | null {
  const { type, description } = book.identification.significance;
  if (description) return description;
  if (!type) return null;
  const labels: Record<NonNullable<typeof type>, string> = {
    first_appearance: 'First appearance of a significant character.',
    first_cameo: 'First brief appearance of a significant character.',
    origin: 'Origin story issue.',
    death: 'A major character death — a milestone issue.',
    first_issue: 'First issue of the series.',
    key_storyline: 'Part of a defining storyline.',
    creator_debut: 'A notable creator’s debut on the title.',
    crossover: 'A crossover issue collectors seek out.',
  };
  return labels[type];
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** The ONLY place a cover thumbnail is drawn. Source comes from the accessor. */
function CoverThumb({ book }: { book: ReportBook }) {
  const src = resolveCoverImage(book);
  return (
    <View style={s.thumb}>
      {src ? (
        // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop
        <Image src={src} style={s.thumbImg} />
      ) : (
        <View style={s.thumbPlaceholder}>
          <Text style={s.thumbPlaceholderText}>No{'\n'}image</Text>
        </View>
      )}
    </View>
  );
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Estate Comics · Powered by Legends of Superheros · Est. 1993</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function RunningHeader({ refNum }: { refNum: string }) {
  return (
    <View style={s.runningHeader} fixed>
      <Text style={s.runningWordmark}>EstateComics</Text>
      <Text style={s.refNumber}>{refNum}</Text>
    </View>
  );
}

function SectionTitle({ title, subhead }: { title: string; subhead?: string }) {
  return (
    <View>
      <Text style={s.h2}>{title}</Text>
      {subhead && <Text style={s.subhead}>{subhead}</Text>}
      <View style={s.sectionRule} />
    </View>
  );
}

/** A page after the first: running header + footer, content starts below both. */
function InnerPage({ data, children }: { data: ReportData; children: React.ReactNode }) {
  return (
    <Page size="LETTER" style={[s.page, { paddingTop: space.pageTop + 8 }]}>
      <RunningHeader refNum={data.reference_number} />
      <Footer />
      {children}
    </Page>
  );
}

// ---------------------------------------------------------------------------
// 1. Opening page — header, meta band, summary cards
// ---------------------------------------------------------------------------

function OpeningPage({ data }: { data: ReportData }) {
  const { summary, adjustment, seller } = data;
  const eras = (
    [
      ['Golden Age', summary.breakdown_by_era.golden],
      ['Silver Age', summary.breakdown_by_era.silver],
      ['Bronze Age', summary.breakdown_by_era.bronze],
      ['Copper Age', summary.breakdown_by_era.copper],
      ['Modern Age', summary.breakdown_by_era.modern],
    ] as const
  ).filter(([, n]) => n > 0);
  const publishers = Object.entries(summary.breakdown_by_publisher)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <Page size="LETTER" style={s.page}>
      <Footer />
      <View style={[s.headerRule, { marginHorizontal: -space.pageX, marginTop: -space.pageTop }]} />

      <View style={s.wordmarkBlock}>
        <Text style={s.wordmark}>EstateComics</Text>
        <View style={s.wordmarkHair} />
        <Text style={s.descriptor}>Professional Comic Book Estate Services</Text>
      </View>

      <View style={s.titleRow}>
        <View>
          <Text style={s.h1}>Appraisal Report</Text>
          <Text style={s.subhead}>Prepared for {seller.name}</Text>
        </View>
        <View>
          <Text style={s.refLabel}>Reference</Text>
          <Text style={s.refNumber}>{data.reference_number}</Text>
        </View>
      </View>

      <View style={s.metaBand}>
        <Text style={s.metaItem}>Date of appraisal  <Text style={s.metaValue}>{fmtDate(data.generated_at)}</Text></Text>
        <Text style={s.metaItem}>Books appraised  <Text style={s.metaValue}>{summary.total_books_identified}</Text></Text>
        <Text style={s.metaItem}>Location  <Text style={s.metaValue}>{seller.city}, {seller.state}</Text></Text>
      </View>

      <View style={s.cards}>
        <View style={s.card}>
          <Text style={s.cardLabel}>Books appraised</Text>
          <Text style={s.cardFigure}>{summary.total_books_identified}</Text>
          {summary.total_books_flagged > 0 && (
            <Text style={s.cardSub}>{summary.total_books_flagged} held for review</Text>
          )}
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>Fair market value</Text>
          <Text style={s.cardFigureSm}>{fmt(summary.total_fmv_low)}</Text>
          <Text style={s.cardFigureSm}>to {fmt(summary.total_fmv_high)}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>Cash offer range</Text>
          <Text style={s.cardFigureSm}>{fmt(summary.total_offer_low)}</Text>
          <Text style={s.cardFigureSm}>to {fmt(summary.total_offer_high)}</Text>
        </View>
        <View style={s.card}>
          <Text style={s.cardLabel}>Key issues</Text>
          <Text style={s.cardFigure}>{summary.key_issues_count}</Text>
          <Text style={s.cardSub}>
            {summary.hidden_gems_count} hidden {summary.hidden_gems_count === 1 ? 'gem' : 'gems'}
          </Text>
        </View>
      </View>

      <Text style={[s.p, { marginTop: space.block }]}>
        This report documents each book we identified from your photographs, our conservative
        estimate of its condition, its fair market value from recorded sales, and the cash offer
        we are prepared to make. Offers are stated as ranges, are contingent on physical
        inspection, and are valid until {offerExpiry(data.generated_at)}.
      </Text>

      {adjustment.adjustment_reasons.length > 0 && (
        <View style={s.panel}>
          <Text style={s.panelTitle}>How your storage answers affected the offer</Text>
          {adjustment.adjustment_reasons.map((r, i) => (
            <Text key={i} style={s.panelText}>{r}</Text>
          ))}
          <Text style={[s.panelText, { marginTop: 3, color: color.umber }]}>
            Applied to each book’s value before the offer was calculated (×{adjustment.fmv_multiplier.toFixed(2)}).
          </Text>
        </View>
      )}
      {adjustment.restoration_flag && (
        <View style={s.panel}>
          <Text style={s.flagText}>Restoration disclosed</Text>
          <Text style={s.panelText}>
            Because restoration, pressing or cleaning was declared, every book is held for
            physical review before any offer is final.
          </Text>
        </View>
      )}

      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.h3}>By era</Text>
          {eras.map(([label, n]) => (
            <View key={label} style={s.kvRow}>
              <Text style={s.kvLabel}>{label}</Text>
              <Text style={s.kvValue}>{n}</Text>
            </View>
          ))}
        </View>
        <View style={s.col}>
          <Text style={s.h3}>By publisher</Text>
          {publishers.map(([pub, n]) => (
            <View key={pub} style={s.kvRow}>
              <Text style={s.kvLabel}>{pub}</Text>
              <Text style={s.kvValue}>{n}</Text>
            </View>
          ))}
        </View>
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// 2. Key Issues — same basis as summary.key_issues_count (adjusted tier)
// ---------------------------------------------------------------------------

function BookEntry({ book, sentence }: { book: ReportBook; sentence: string | null }) {
  const { identification: id, condition: c, valuation: v, adjusted_offer: o } = book;
  return (
    <View style={s.bookRow} wrap={false}>
      <CoverThumb book={book} />
      <View style={s.bookBody}>
        <Text style={s.bookTitle}>
          {id.title} #{id.issue_number}
          {id.volume && id.volume > 1 ? ` (Vol. ${id.volume})` : ''}
        </Text>
        <Text style={s.bookMeta}>
          {id.publisher} · {id.cover_date} · {id.era} Age
          {id.variant_type !== 'direct' && id.variant_type !== 'unknown'
            ? ` · ${id.variant_type.replace(/_/g, ' ')}`
            : ''}
        </Text>
        {sentence && <Text style={s.bookSentence}>{sentence}</Text>}
        <Text style={[s.bookMeta, { marginTop: 3 }]}>
          Grade {c.grade_label_low} – {c.grade_label_high} ({c.grade_low.toFixed(1)}–{c.grade_high.toFixed(1)})
          {id.flagged_for_review ? '  ·  Held for review' : ''}
        </Text>
      </View>
      <View style={s.bookFigures}>
        <Text style={s.figLabel}>Fair market value</Text>
        <Text style={s.figValue}>{range(v.fmv_low, v.fmv_high)}</Text>
        <Text style={s.figLabel}>Our offer</Text>
        <Text style={s.figValue}>{range(o.offer_low, o.offer_high)}</Text>
      </View>
    </View>
  );
}

function KeyIssuesSection({ data }: { data: ReportData }) {
  const keys = data.books.filter((b) => b.adjusted_offer.tier === 'key_issues').sort(byFmvDesc);
  if (keys.length === 0) return null;
  return (
    <View>
      <SectionTitle
        title={`Key issues (${keys.length})`}
        subhead="The most valuable books in the collection, first."
      />
      {keys.map((book, i) => (
        <BookEntry key={i} book={book} sentence={plainSignificance(book)} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 3. Hidden Gems — capped selection shared with every other surface
// ---------------------------------------------------------------------------

function HiddenGemsSection({ data, first }: { data: ReportData; first: boolean }) {
  const gems = selectHiddenGems(data.books);
  if (gems.length === 0) return null;
  return (
    <View style={first ? undefined : { marginTop: space.section }}>
      <SectionTitle
        title="Books you might not know are valuable."
        subhead="Collector significance that is easy to miss without a background in comics."
      />
      <View style={[s.panel, { marginTop: 0, paddingTop: 2, paddingBottom: 2 }]}>
        {gems.map((book, i) => (
          <BookEntry key={i} book={book} sentence={book.valuation.hidden_gem_explanation} />
        ))}
      </View>
    </View>
  );
}

/** Key Issues then Hidden Gems, flowing across as many pages as they need. */
function HighlightsPages({ data }: { data: ReportData }) {
  const hasKeys = data.books.some((b) => b.adjusted_offer.tier === 'key_issues');
  const hasGems = selectHiddenGems(data.books).length > 0;
  if (!hasKeys && !hasGems) return null;
  return (
    <InnerPage data={data}>
      <KeyIssuesSection data={data} />
      <HiddenGemsSection data={data} first={!hasKeys} />
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// 4. Complete inventory — FMV descending; bulk lot as an aggregate line
// ---------------------------------------------------------------------------

const COL = { thumb: 34, title: 176, era: 44, grade: 70, fmv: 78, offer: 78, flags: 36 } as const;

function InventoryPage({ data }: { data: ReportData }) {
  const gems = new Set<ReportBook>(selectHiddenGems(data.books));
  const listed = data.books.filter((b) => !b.adjusted_offer.is_bulk).sort(byFmvDesc);
  const bulk = data.books.filter((b) => b.adjusted_offer.is_bulk);
  const bulkFmv = bulk.reduce((a, b) => ({ lo: a.lo + b.valuation.fmv_low, hi: a.hi + b.valuation.fmv_high }), { lo: 0, hi: 0 });
  const bulkOffer = bulk.reduce((a, b) => ({ lo: a.lo + b.adjusted_offer.offer_low, hi: a.hi + b.adjusted_offer.offer_high }), { lo: 0, hi: 0 });

  return (
    <InnerPage data={data}>
      <SectionTitle
        title={`Complete inventory (${data.books.length} ${data.books.length === 1 ? 'book' : 'books'})`}
        subhead="Every book we identified, highest value first."
      />

      {listed.length > 0 && (
        <View style={s.th} fixed>
          <View style={{ width: COL.thumb }} />
          <Text style={[s.thText, { width: COL.title }]}>Title</Text>
          <Text style={[s.thText, { width: COL.era }]}>Era</Text>
          <Text style={[s.thText, { width: COL.grade }]}>Grade</Text>
          <Text style={[s.thText, { width: COL.fmv, textAlign: 'right' }]}>Fair value</Text>
          <Text style={[s.thText, { width: COL.offer, textAlign: 'right' }]}>Offer</Text>
          <Text style={[s.thText, { width: COL.flags, textAlign: 'right' }]}>Note</Text>
        </View>
      )}

      {listed.map((book, i) => {
        const { identification: id, condition: c, valuation: v, adjusted_offer: o } = book;
        const note = id.flagged_for_review
          ? 'Review'
          : gems.has(book)
            ? 'Gem'
            : o.tier === 'key_issues'
              ? 'Key'
              : '';
        return (
          <View key={i} style={[s.tr, i % 2 === 0 ? s.trBase : s.trAlt]} wrap={false}>
            <View style={{ width: COL.thumb }}>
              <CoverThumb book={book} />
            </View>
            <View style={{ width: COL.title, paddingRight: 6 }}>
              <Text style={[s.td, { fontWeight: 600 }]}>{id.title} #{id.issue_number}</Text>
              <Text style={s.tdMuted}>{id.publisher} · {id.cover_date}</Text>
            </View>
            <Text style={[s.td, { width: COL.era }]}>{id.era}</Text>
            <Text style={[s.td, { width: COL.grade }]}>{c.grade_low.toFixed(1)}–{c.grade_high.toFixed(1)}</Text>
            <Text style={[s.tdNum, { width: COL.fmv }]}>{fmt(v.fmv_low)}–{fmt(v.fmv_high)}</Text>
            <Text style={[s.tdNumStrong, { width: COL.offer }]}>{fmt(o.offer_low)}–{fmt(o.offer_high)}</Text>
            <Text style={[s.tdMuted, { width: COL.flags, textAlign: 'right', color: id.flagged_for_review ? color.mutedRed : color.umber }]}>
              {note}
            </Text>
          </View>
        );
      })}

      {bulk.length > 0 && (
        <View style={[s.panel, { marginTop: space.block }]} wrap={false}>
          <Text style={s.panelTitle}>Bulk lot</Text>
          <Text style={s.panelText}>
            {bulk.length} {bulk.length === 1 ? 'book' : 'books'} valued under $10 each, offered as
            one lot rather than itemised.
          </Text>
          <View style={[s.kvRow, { marginTop: 4 }]}>
            <Text style={s.kvLabel}>Combined fair market value</Text>
            <Text style={s.kvValue}>{range(bulkFmv.lo, bulkFmv.hi)}</Text>
          </View>
          <View style={[s.kvRow, { borderBottomWidth: 0 }]}>
            <Text style={s.kvLabel}>Combined offer</Text>
            <Text style={s.kvValue}>{range(bulkOffer.lo, bulkOffer.hi)}</Text>
          </View>
        </View>
      )}
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// 5. Methodology and terms — plain language
// ---------------------------------------------------------------------------

function MethodologyPage({ data }: { data: ReportData }) {
  const terms: [string, string][] = [
    [
      'Offer validity',
      `This appraisal and the offer range in it are valid for ${OFFER_VALIDITY_DAYS} days from ${fmtDate(data.generated_at)}, until ${offerExpiry(data.generated_at)}. After that the collection is re-appraised at current market values.`,
    ],
    [
      'Physical inspection',
      'Every offer is contingent on a physical inspection of the books by an Estate Comics representative. Grades in this report are conservative estimates from cover photographs; they cannot account for interior pages, staples, or restoration that is not visible from the cover.',
    ],
    [
      'If condition differs from the photographs',
      'If a book’s condition at inspection differs materially from what the photographs showed, the offer for that book is adjusted and we explain the difference before anything proceeds.',
    ],
    [
      'Restoration',
      'Professional restoration, cleaning or pressing that was not disclosed before inspection changes a book’s value substantially and leads to a revised offer for that book.',
    ],
    [
      'Payment',
      'Once the formal offer is accepted, the collection is verified at pickup. Payment follows within 48 hours of verification, by your preferred method.',
    ],
    [
      'No obligation',
      'This report is not a contract. You may decline the offer for any reason, and so may we. Either way, this document is yours to keep and share.',
    ],
  ];

  return (
    <InnerPage data={data}>
      <SectionTitle title="How this appraisal was prepared" />
      <Text style={s.p}>
        Each cover photograph was examined to identify the title, issue, publisher and printing,
        and to estimate a condition grade. Grades are stated as a range and lean conservative: we
        grade to buy, so where a detail was uncertain, the lower estimate was used.
      </Text>
      <Text style={s.p}>
        Fair market value is drawn from recorded sales of the same issue at the same grade where
        such data exists. Where it does not, a conservative reference table by era and grade is
        used instead, and the value is an estimate rather than a market figure. Our offer is a
        percentage of fair market value at the lower end of the grade range, set by the book’s
        tier; the percentages are the same for every seller.
      </Text>
      <Text style={s.p}>
        Your answers about how the collection was stored adjust the value before the offer is
        calculated. That adjustment can lower an offer; it never raises one above what the
        photographs support.
      </Text>

      <View style={{ marginTop: space.gap }}>
        <Text style={s.h3}>Terms</Text>
        <View style={s.sectionRule} />
        {terms.map(([title, body]) => (
          <View key={title} wrap={false}>
            <Text style={s.termTitle}>{title}</Text>
            <Text style={s.termBody}>{body}</Text>
          </View>
        ))}
      </View>

      <Text style={[s.subhead, { marginTop: space.section, textAlign: 'center' }]}>
        Every collection has a story. We honor it.
      </Text>
    </InnerPage>
  );
}

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

function AppraisalDocument({ data }: { data: ReportData }) {
  return (
    <Document
      title={`Estate Comics Appraisal Report ${data.reference_number}`}
      author="Estate Comics"
      subject="Comic book collection appraisal"
      creator="Estate Comics"
      producer="Estate Comics"
    >
      <OpeningPage data={data} />
      <HighlightsPages data={data} />
      <InventoryPage data={data} />
      <MethodologyPage data={data} />
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
