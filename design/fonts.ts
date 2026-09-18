/* Estate Comics — font loading
 * Place at app/fonts.ts. Apply both variables on <html> in app/layout.tsx:
 *
 *   import { cormorant, nunito } from './fonts'
 *   <html lang="en" className={`${cormorant.variable} ${nunito.variable}`}>
 *
 * Do not add a third family. Do not add a monospace face for data labels —
 * reference numbers set in Nunito 600 with +0.04em tracking read as deliberate.
 */

import { Cormorant_Garamond, Nunito_Sans } from 'next/font/google'

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],   // italic is required — it carries the subhead register
  variable: '--font-cormorant',
  display: 'swap',
})

export const nunito = Nunito_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-nunito',
  display: 'swap',
})
