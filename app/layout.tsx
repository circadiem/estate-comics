import type { Metadata } from 'next';
import Nav from '@/components/nav';
import Footer from '@/components/footer';
import { cormorant, nunito } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'TheComicBuyers.com — AI-Powered Comic Book Appraisals',
  description:
    'Get an instant, AI-powered appraisal for your vintage comic book collection. Serving New England, New York, New Jersey, Pennsylvania, and South Florida.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Provenance font variables (--font-cormorant, --font-nunito) are exposed
    // here so any surface can use them; no existing component is restyled yet.
    <html lang="en" className={`${cormorant.variable} ${nunito.variable}`}>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
