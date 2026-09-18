// On-screen appraisal report view — mirrors PDF layout
// Sections: header, summary stats, hidden gems, key issues, full inventory
// Source: Implementation Spec §VIII

import type { ReportData } from '@/lib/types/report';
import { selectHiddenGems } from '@/lib/services/offer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n < 1 ? `$${n.toFixed(2)}` : `$${Math.round(n).toLocaleString()}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const ERA_COLORS: Record<string, string> = {
  Golden: 'bg-yellow-100 text-yellow-800',
  Silver: 'bg-gray-100 text-gray-700',
  Bronze: 'bg-orange-100 text-orange-800',
  Copper: 'bg-amber-100 text-amber-800',
  Modern: 'bg-blue-100 text-blue-700',
};

const TIER_COLORS: Record<string, string> = {
  key_issues: 'bg-purple-100 text-purple-800',
  mid_tier: 'bg-blue-100 text-blue-800',
  common: 'bg-gray-100 text-gray-700',
  bulk: 'bg-gray-50 text-gray-500',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface AppraisalReportProps {
  data: ReportData;
}

export default function AppraisalReport({ data }: AppraisalReportProps) {
  const { reference_number, generated_at, seller, adjustment, summary, books } = data;

  // Capped at MAX_HIDDEN_GEMS, same selection the PDF, emails and CSV use
  const hiddenGems = selectHiddenGems(books);
  const keyIssues = books.filter((b) => b.adjusted_offer.tier === 'key_issues');

  // Top publishers by count
  const topPublishers = Object.entries(summary.breakdown_by_publisher)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-8 text-sm">
      {/* ── Report header ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Appraisal Report
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-gray-900">{reference_number}</p>
            <p className="mt-0.5 text-xs text-gray-500">Generated {fmtDate(generated_at)}</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <p className="font-semibold text-gray-900">{seller.name}</p>
            <p>{seller.email}</p>
            <p>{seller.phone}</p>
            <p>
              {seller.city}, {seller.state} {seller.zip}
            </p>
          </div>
        </div>
      </div>

      {/* ── Summary stats ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Collection Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Books Identified"
            value={summary.total_books_identified.toString()}
            sub={
              summary.total_books_flagged > 0
                ? `${summary.total_books_flagged} flagged for review`
                : undefined
            }
          />
          <StatCard
            label="Total FMV"
            value={`${fmt(summary.total_fmv_low)} – ${fmt(summary.total_fmv_high)}`}
            sub="Fair market value range"
          />
          <StatCard
            label="Adjusted Offer"
            value={`${fmt(summary.total_offer_low)} – ${fmt(summary.total_offer_high)}`}
            sub="After storage adjustment"
          />
          <StatCard
            label="Key Issues"
            value={summary.key_issues_count.toString()}
            sub={`${summary.hidden_gems_count} hidden gem${summary.hidden_gems_count !== 1 ? 's' : ''}`}
          />
        </div>

        {/* Era breakdown */}
        <div className="mt-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-gray-500">Era Breakdown</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.breakdown_by_era).map(([era, count]) => {
              if (count === 0) return null;
              const label = era.charAt(0).toUpperCase() + era.slice(1);
              return (
                <span
                  key={era}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ERA_COLORS[label] ?? 'bg-gray-100 text-gray-700'}`}
                >
                  {label} · {count}
                </span>
              );
            })}
          </div>
          {topPublishers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {topPublishers.map(([publisher, count]) => (
                <span key={publisher}>
                  {publisher}: {count}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Storage adjustment */}
        {adjustment.adjustment_reasons.length > 0 && (
          <div className="mt-3 rounded-lg bg-blue-50 px-4 py-3 ring-1 ring-blue-100 text-xs text-blue-700">
            <p className="mb-1 font-semibold">
              Storage adjustment · ×{adjustment.fmv_multiplier.toFixed(3)}
            </p>
            <ul className="space-y-0.5">
              {adjustment.adjustment_reasons.map((r, i) => (
                <li key={i}>· {r}</li>
              ))}
            </ul>
          </div>
        )}

        {adjustment.restoration_flag && (
          <div className="mt-3 rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200 text-xs text-amber-800">
            <span className="font-semibold">Restoration flag: </span>
            All books will be reviewed by our team before finalising the offer.
          </div>
        )}
      </section>

      {/* ── Hidden gems ────────────────────────────────────────────────────── */}
      {hiddenGems.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Hidden Gems ({hiddenGems.length})
          </h2>
          <div className="space-y-2">
            {hiddenGems.map((book, i) => (
              <div
                key={i}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-gray-900">
                    {book.identification.title} #{book.identification.issue_number}
                  </p>
                  <p className="text-xs font-medium text-emerald-700">
                    FMV {fmt(book.valuation.fmv_low)} – {fmt(book.valuation.fmv_high)}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-gray-600">
                  {book.identification.publisher} · {book.identification.cover_date} ·{' '}
                  Grade {book.condition.grade_low.toFixed(1)}–{book.condition.grade_high.toFixed(1)}
                </p>
                {book.valuation.hidden_gem_explanation && (
                  <p className="mt-1.5 text-xs italic text-emerald-800">
                    {book.valuation.hidden_gem_explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Key issues ─────────────────────────────────────────────────────── */}
      {keyIssues.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Key Issues ({keyIssues.length})
          </h2>
          <div className="space-y-2">
            {keyIssues.map((book, i) => (
              <div
                key={i}
                className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-gray-900">
                    {book.identification.title} #{book.identification.issue_number}
                  </p>
                  <p className="text-xs font-medium text-purple-700">
                    Offer {fmt(book.adjusted_offer.offer_low)} – {fmt(book.adjusted_offer.offer_high)}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-gray-600">
                  {book.identification.publisher} · {book.identification.cover_date} ·{' '}
                  Grade {book.condition.grade_low.toFixed(1)}–{book.condition.grade_high.toFixed(1)}
                </p>
                {book.identification.significance.description && (
                  <p className="mt-1 text-xs text-purple-800">
                    {book.identification.significance.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Full inventory ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Full Inventory ({books.length} books)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2.5 font-semibold text-gray-600">#</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600">Title / Issue</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600">Era</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600">Grade</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600">FMV</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600">Offer</th>
                <th className="px-3 py-2.5 font-semibold text-gray-600">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {books.map((book, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">
                      {book.identification.title} #{book.identification.issue_number}
                    </p>
                    <p className="text-gray-400">
                      {book.identification.publisher} · {book.identification.cover_date}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${ERA_COLORS[book.identification.era] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {book.identification.era}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {book.condition.grade_low.toFixed(1)}–{book.condition.grade_high.toFixed(1)}
                    <span className="ml-1 text-gray-400">
                      ({book.condition.grade_label_low})
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {fmt(book.valuation.fmv_low)}–{fmt(book.valuation.fmv_high)}
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {fmt(book.adjusted_offer.offer_low)}–{fmt(book.adjusted_offer.offer_high)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[book.adjusted_offer.tier] ?? 'bg-gray-100 text-gray-700'}`}
                    >
                      {book.adjusted_offer.tier_label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
