import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us | TheComicBuyers.com',
  description:
    'TheComicBuyers.com is Legends of Superheroes — a family-run comic book business established in 1993. Learn our story and our approach to buying collections.',
};

const VALUES = [
  {
    title: 'Transparent Pricing',
    body: 'Every offer we make is backed by real GoCollect sales data, not arbitrary guide prices or gut feel. You see the same valuation data we use.',
  },
  {
    title: 'No Cherry-Picking',
    body: "We buy the whole collection — not just the keys. Your common issues, run filler, and bulk material have value too, and we price them fairly.",
  },
  {
    title: 'We Come to You',
    body: 'No hauling heavy long boxes to a shop. We travel to you anywhere in our 10-state service area, schedule at your convenience, and pay within 48 hours of verifying the books.',
  },
  {
    title: '30+ Years of Expertise',
    body: "Our team has been buying and selling comics since 1993. We've seen every era, every publisher, and every condition. We know what we're looking at.",
  },
];

export default function AboutPage() {
  return (
    <main>
      {/* Header */}
      <section className="bg-gray-900 px-4 py-16 text-center sm:px-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">About Us</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
          Legends of Superheroes, Est. 1993 — three decades buying and selling comic book collections.
        </p>
      </section>

      {/* Origin story */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Our Story</h2>
          <div className="prose prose-gray max-w-none space-y-4 text-sm leading-relaxed text-gray-600">
            <p>
              We started as <strong className="text-gray-900">Legends of Superheroes</strong> in 1993 —
              a small shop with a big passion for vintage comics. Over the next three decades we built
              one of the most respected buying operations in New England, purchasing thousands of
              collections from estate sales, private sellers, and long-time collectors looking to cash
              out or downsize.
            </p>
            <p>
              The process never changed much for 30 years: a seller would call, we&apos;d drive out, spend
              a few hours manually assessing the collection, and make an offer. It worked — but it
              was slow, opaque, and inconsistent. A collection we&apos;d seen at 9 PM after a long day
              got a different assessment than the same collection at 10 AM on a Tuesday.
            </p>
            <p>
              In 2024, we rebuilt the entire process around AI. We trained our identification system
              on hundreds of thousands of comics and integrated GoCollect&apos;s real-time market data
              into every valuation. The result: sellers get an instant, objective appraisal based on
              actual sales data — before we even make the drive. We see the same report you see.
              There are no surprises.
            </p>
            <p>
              We still make the drive. We still verify every book in person and pay within 48
              hours. But now every seller knows exactly what they have before we arrive.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-2xl font-bold text-gray-900">How we operate</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {VALUES.map(({ title, body }) => (
              <div key={title} className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service area / contact */}
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Where we operate</h2>
              <p className="text-sm leading-relaxed text-gray-600">
                We currently buy collections across Connecticut, Massachusetts, Rhode Island,
                New Hampshire, Vermont, Maine, New York, New Jersey, Pennsylvania, and South Florida
                (Miami-Dade, Broward, and Palm Beach counties).
              </p>
              <p className="mt-3 text-sm text-gray-600">
                Not in our service area? We may still be able to help for very large or high-value
                collections. Contact us to discuss.
              </p>
            </div>
            <div>
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Get in touch</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium text-gray-800">Email: </span>
                  offers@thecomicbuyers.com
                </p>
                <p>
                  <span className="font-medium text-gray-800">Phone: </span>
                  (800) 555-COMIC
                </p>
                <p className="mt-4 text-xs text-gray-400">
                  Response within 1–2 business days. For the fastest response, use the free
                  appraisal tool — our team reviews every submission.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-red-600 px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Start with a free appraisal
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-red-100">
          No commitment. Just photos — and a real, data-backed valuation in minutes.
        </p>
        <Link
          href="/appraise"
          className="mt-6 inline-block rounded-md bg-white px-6 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Get Free Appraisal →
        </Link>
      </section>
    </main>
  );
}
