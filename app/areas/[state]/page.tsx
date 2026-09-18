import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SERVICE_AREAS, getAreaBySlug } from '@/lib/config/service-areas';

interface Props {
  params: { state: string };
}

export function generateStaticParams() {
  return SERVICE_AREAS.map(({ slug }) => ({ state: slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const area = getAreaBySlug(params.state);
  if (!area) return { title: 'Area | TheComicBuyers.com' };
  return {
    title: `Sell Comics in ${area.name} | TheComicBuyers.com`,
    description: `Get a free AI-powered appraisal for your comic book collection in ${area.name}. We buy Golden, Silver, Bronze, Copper, and Modern Age comics — cash offer, free pickup. Serving ${area.cities.slice(0, 3).join(', ')}, and more.`,
  };
}

const ERAS: [string, string][] = [
  ['Golden Age (1938–1955)', 'Pre-code superhero, horror, romance, and war comics. DC, Timely/Marvel, Fawcett, Quality, EC.'],
  ['Silver Age (1956–1969)', 'Marvel and DC classics. First appearances of Spider-Man, X-Men, Fantastic Four, and more.'],
  ['Bronze Age (1970–1984)', "Neal Adams, Denny O'Neil, Wrightson — the era that defined modern comics."],
  ['Copper Age (1984–1991)', 'Frank Miller, TMNT, Watchmen, Dark Knight. Rising in value every year.'],
  ['Modern Age (1991–present)', 'New Mutants #98, Walking Dead, early Image, and beyond. Volume buyers welcome.'],
  ['Whole Collections', 'We buy everything — estate collections, long box lots, warehouse finds, and retail overstock.'],
];

export default function StatePage({ params }: Props) {
  const area = getAreaBySlug(params.state);
  if (!area) notFound();

  return (
    <main>
      {/* Hero */}
      <section className="bg-gray-900 px-4 py-16 text-center sm:px-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Service Area
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Sell Your Comics in {area.name}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-gray-400">{area.tagline}</p>
        <Link
          href="/appraise"
          className="mt-8 inline-block rounded-md bg-red-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-red-700"
        >
          Start Free Appraisal →
        </Link>
      </section>

      {/* Value prop */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            The easiest way to sell your comic collection in {area.name}
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            If you have a comic book collection in {area.name} and you&apos;re thinking about
            selling, TheComicBuyers.com offers the fastest, fairest, and most transparent process
            available. We come to you — no hauling boxes, no consignment, no waiting months for
            individual sales to close.
          </p>
          <p className="mb-4 text-sm leading-relaxed text-gray-600">
            Our AI appraisal tool identifies and values every book in your collection from photos
            alone. You see the same data we do — title, issue, grade, fair market value from actual
            GoCollect sales, and our offer for each book. No surprises.
          </p>
          <p className="text-sm leading-relaxed text-gray-600">
            Once you submit, our team reviews within 1–2 business days and contacts you to schedule
            pickup. We verify the books when we collect them and pay within 48 hours by your
            preferred method.
          </p>
        </div>
      </section>

      {/* Cities */}
      <section className="bg-gray-50 px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Communities we serve in {area.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {area.cities.map((city) => (
              <span
                key={city}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700"
              >
                {city}
              </span>
            ))}
            <span className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-400">
              and everywhere in between
            </span>
          </div>
        </div>
      </section>

      {/* What we buy */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">What we buy</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {ERAS.map(([era, desc]) => (
              <div key={era} className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="mb-1 text-sm font-semibold text-gray-900">{era}</p>
                <p className="text-xs leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-red-600 px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Ready to sell your {area.name} comic collection?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-red-100">
          Free appraisal, no obligation. We come to you anywhere in {area.name}.
        </p>
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
