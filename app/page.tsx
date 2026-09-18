import type { Metadata } from 'next';
import Link from 'next/link';
import { SERVICE_AREAS } from '@/lib/config/service-areas';

export const metadata: Metadata = {
  title: 'Sell Your Comic Book Collection | TheComicBuyers.com',
  description:
    'Get an instant, AI-powered appraisal for your vintage comic book collection. We buy Golden, Silver, Bronze, Copper, and Modern Age comics across New England, New York, New Jersey, Pennsylvania, and South Florida. Free, no-obligation offer.',
};

const TRUST_ITEMS = [
  { label: 'Est. 1993', sub: '30+ years in comics' },
  { label: 'AI-Powered', sub: 'Instant identification' },
  { label: '10 States', sub: 'New England · NY · NJ · PA · FL' },
  { label: 'Paid in 48 Hours', sub: 'After verification at pickup' },
];

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'Photograph Your Covers',
    body: 'Take one clear photo of each front cover. Use natural light, lay the book flat, and capture the full cover. No special equipment — a smartphone works perfectly.',
  },
  {
    num: '02',
    title: 'AI Identifies & Values',
    body: 'Our AI reads each cover, identifies the title, issue, publisher, and variant, grades condition from the photo, and cross-references GoCollect for current fair market value.',
  },
  {
    num: '03',
    title: 'Receive Your Cash Offer',
    body: 'We contact you within 24 hours to discuss the offer and schedule a convenient pickup. Payment is made on the day we collect.',
  },
];

const COMPARISONS = [
  {
    vs: 'vs. eBay',
    them: ['List each book individually', 'Pay 12–15% in fees', 'Pack & ship every sale', 'Months to liquidate'],
    us: ['One photo session per book', 'Zero fees — ever', 'We come to you', 'Offer within 24 hours'],
  },
  {
    vs: 'vs. Comic Shops',
    them: ['30–40% of retail, flat rate', 'Cherry-pick only the best', 'You haul the boxes to them', 'No visibility into pricing'],
    us: ['FMV-based pricing per book', 'We buy the whole collection', 'We pick up at your home', 'Full AI valuation you can see'],
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is the minimum collection size?',
    a: 'We purchase full collections of any size. Whether you have a dozen books or several thousand, we can make you an offer.',
  },
  {
    q: 'How accurate is the AI appraisal?',
    a: "Very high for well-photographed covers. The final offer is always subject to in-person review, and we'll discuss any discrepancies before proceeding.",
  },
  {
    q: 'How quickly will I be paid?',
    a: 'We verify the collection in person at pickup, then pay within 48 hours by your preferred method. Every offer is contingent on that inspection and valid for 14 days.',
  },
  {
    q: 'What states do you serve?',
    a: 'Connecticut, Massachusetts, Rhode Island, New Hampshire, Vermont, Maine, New York, New Jersey, Pennsylvania, and South Florida (Miami-Dade, Broward, and Palm Beach counties).',
  },
  {
    q: 'What types of comics do you buy?',
    a: "All publishers, all eras — from Golden Age to modern releases. We're especially strong buyers for Golden, Silver, and Bronze Age material.",
  },
  {
    q: 'What if some books are in poor condition?',
    a: "We buy books in all conditions. Low-grade keys still have value, and even reading copies contribute to the collection total.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gray-900 px-4 py-20 text-center sm:py-28 sm:px-6">
        <p className="mb-4 inline-block rounded-full bg-gray-700 px-3 py-1 text-xs font-semibold text-gray-300">
          Legends of Superheroes · Est. 1993
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
          The Smartest Way to Sell Your Comic Book Collection
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-gray-400">
          Upload photos, get instant AI-powered valuations, and receive a fair cash offer — with
          free pickup anywhere in New England, the Mid-Atlantic, or South Florida.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/appraise"
            className="rounded-md bg-red-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-red-700"
          >
            Start Free Appraisal →
          </Link>
          <Link href="/how-it-works" className="text-sm font-medium text-gray-400 hover:text-gray-200">
            See how it works
          </Link>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-gray-100 sm:grid-cols-4 sm:divide-y-0">
          {TRUST_ITEMS.map(({ label, sub }) => (
            <div key={label} className="px-6 py-5 text-center">
              <p className="text-lg font-bold text-gray-900">{label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              From photos to cash in three steps
            </h2>
            <p className="mt-3 text-base text-gray-600">
              No spreadsheets. No haggling. No trips to a comic shop.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ num, title, body }) => (
              <div key={num} className="rounded-xl border border-gray-200 bg-white p-6">
                <p className="mb-3 font-mono text-4xl font-extrabold text-gray-100">{num}</p>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/appraise"
              className="inline-block rounded-md bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              Try It Now — Free →
            </Link>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight text-gray-900">
            Why sellers choose us
          </h2>
          <div className="grid gap-8 lg:grid-cols-2">
            {COMPARISONS.map(({ vs, them, us }) => (
              <div key={vs} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-100 bg-gray-50 px-6 py-3">
                  <p className="text-sm font-semibold text-gray-700">{vs}</p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  <div className="p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      The Alternative
                    </p>
                    <ul className="space-y-2">
                      {them.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-gray-500">
                          <span className="mt-0.5 flex-shrink-0 text-red-400">✕</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-green-50 p-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-green-700">
                      TheComicBuyers
                    </p>
                    <ul className="space-y-2">
                      {us.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-green-900">
                          <span className="mt-0.5 flex-shrink-0 text-green-500">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service areas */}
      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Where we buy</h2>
            <p className="mt-3 text-base text-gray-600">We travel to you — anywhere in our service area.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SERVICE_AREAS.map((area) => (
              <Link
                key={area.slug}
                href={`/areas/${area.slug}`}
                className="group rounded-lg border border-gray-200 bg-white p-4 text-center hover:border-red-200 hover:bg-red-50"
              >
                <p className="text-sm font-semibold text-gray-900 group-hover:text-red-700">
                  {area.name}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {area.cities[0]}, {area.cities[1]}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-gray-900">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group rounded-lg border border-gray-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 marker:content-none">
                  {q}
                  <span className="ml-4 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <p className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-600">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-red-600 px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Ready to find out what your collection is worth?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-red-100">
          It takes about 5 minutes to photograph a long box. Our AI does the rest — for free,
          with no obligation.
        </p>
        <Link
          href="/appraise"
          className="mt-8 inline-block rounded-md bg-white px-8 py-3.5 text-base font-semibold text-red-600 shadow-lg hover:bg-red-50"
        >
          Start Free Appraisal →
        </Link>
      </section>
    </>
  );
}
