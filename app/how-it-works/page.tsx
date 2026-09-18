import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How It Works | TheComicBuyers.com',
  description:
    'Learn how TheComicBuyers.com uses AI to identify, grade, and value your comic book collection — and how to get a documented cash offer with free pickup.',
};

const STEPS = [
  {
    num: '01',
    title: 'Photograph Each Cover',
    detail: [
      'Lay each book flat on a clean, well-lit surface.',
      'Photograph the front cover only — one photo per book.',
      'Natural light or overhead lighting works best. Avoid flash glare.',
      'Any smartphone camera is fine. JPEG or PNG accepted.',
      'You can upload up to 500 images in a single session.',
    ],
    note: 'Natural light and a clean background will give the AI the best chance of an accurate identification.',
  },
  {
    num: '02',
    title: 'AI Identification',
    detail: [
      'Our AI reads the cover art, title, issue number, and barcode.',
      'It identifies publisher, cover date, era, and variant type (direct, newsstand, price variant, etc.).',
      'Key issue status is flagged automatically — first appearances, origins, deaths, and landmark storylines.',
      'A confidence score is assigned to each identification. Low-confidence books are flagged for human review.',
    ],
    note: 'Identification uses the Claude AI model, cross-referenced against comic book databases for accuracy.',
  },
  {
    num: '03',
    title: 'Condition Grading',
    detail: [
      'The AI grades each book from the same cover photograph.',
      'It assesses spine stress lines, corner blunts, surface creases, color fading, and tears.',
      'Grades are expressed as a range (e.g., 6.0–7.0 Very Fine) with a confidence level.',
      'Storage conditions you report in the questionnaire are factored into the final valuation.',
    ],
    note: 'AI grades are estimates from photographs. The final offer is always subject to in-person verification.',
  },
  {
    num: '04',
    title: 'Fair Market Valuation',
    detail: [
      'Each book is cross-referenced against GoCollect for recent actual sales data.',
      'FMV is expressed as a low/high range based on your estimated grade.',
      'Hidden gems — books with unexpectedly high market value — are highlighted separately.',
      'Our offer is a percentage of FMV, tiered by book value.',
    ],
    note: 'All valuations are based on actual recent sales, not guide prices or arbitrary assessments.',
  },
  {
    num: '05',
    title: 'Submit & Get Paid',
    detail: [
      'Review your offer and complete the short seller questionnaire.',
      'Submit your formal offer — a confirmation email is sent immediately.',
      'Our team reviews the submission within 1–2 business days and contacts you to schedule pickup.',
      'We verify the books at collection, then pay within 48 hours by your preferred method.',
    ],
    note: 'Offers are valid for 14 days from the submission date.',
  },
];

const TIER_INFO = [
  { tier: 'Key Issues', threshold: 'FMV ≥ $500', pct: '50–60% of FMV', desc: 'High-value keys where we pay the most.' },
  { tier: 'Mid-Tier', threshold: 'FMV $50–$499', pct: '40–50% of FMV', desc: 'Solid back-issue material with real demand.' },
  { tier: 'Common', threshold: 'FMV $10–$49', pct: '30–40% of FMV', desc: 'Desirable but widely available issues.' },
  { tier: 'Bulk', threshold: 'FMV < $10', pct: '$0.50–$2.00 flat', desc: 'Reader copies and filler — priced per book.' },
];

export default function HowItWorksPage() {
  return (
    <main>
      <section className="bg-gray-900 px-4 py-16 text-center sm:px-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">How It Works</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
          A transparent, AI-powered process — from first photo to final payment.
        </p>
      </section>

      {/* Steps */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-12">
          {STEPS.map(({ num, title, detail, note }) => (
            <div key={num} className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900">
                  <span className="font-mono text-xs font-bold text-white">{num}</span>
                </div>
              </div>
              <div>
                <h2 className="mb-3 text-xl font-bold text-gray-900">{title}</h2>
                <ul className="mb-3 space-y-1.5">
                  {detail.map((d) => (
                    <li key={d} className="flex gap-2 text-sm text-gray-600">
                      <span className="mt-0.5 flex-shrink-0 text-gray-300">—</span>
                      {d}
                    </li>
                  ))}
                </ul>
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-100">
                  {note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Offer tiers */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">How offers are calculated</h2>
          <p className="mb-8 text-sm text-gray-600">
            Every book is assigned to a tier based on its fair market value midpoint. Higher-value
            books earn a higher percentage of FMV.
          </p>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-600">Tier</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">FMV Range</th>
                  <th className="px-4 py-3 font-semibold text-gray-600">Our Offer</th>
                  <th className="hidden px-4 py-3 font-semibold text-gray-600 sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {TIER_INFO.map(({ tier, threshold, pct, desc }, i) => (
                  <tr key={tier} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{tier}</td>
                    <td className="px-4 py-3 text-gray-700">{threshold}</td>
                    <td className="px-4 py-3 font-medium text-green-700">{pct}</td>
                    <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            All percentages are applied to GoCollect FMV at the time of appraisal. Offers are
            non-binding and subject to in-person verification.
          </p>
        </div>
      </section>

      <section className="bg-red-600 px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          See it in action — free, no commitment
        </h2>
        <Link
          href="/appraise"
          className="mt-6 inline-block rounded-md bg-white px-6 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Start Free Appraisal →
        </Link>
      </section>
    </main>
  );
}
