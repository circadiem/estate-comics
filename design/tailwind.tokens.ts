/* Estate Comics — Provenance Tailwind theme extension
 * Source of truth: docs/04-brand-provenance.md
 *
 * Usage in tailwind.config.ts:
 *   import { provenance } from './design/tailwind.tokens'
 *   export default { theme: { extend: provenance }, ... }
 */

export const provenance = {
  colors: {
    charcoalBrown: '#2E2620',
    darkUmber:     '#4A3F35',
    umber:         '#6F6358',
    patina:        '#7D6E5C',
    antiqueGold:   '#A67C52',
    vellum:        '#F3EDE4',
    bisque:        '#E8DFD2',
    ivory:         '#FAF6F0',
    warmBlack:     '#1E1A16',
    accentSage:    '#8A9A7E',
    mutedRed:      '#A65252',
  },

  fontFamily: {
    display: ['var(--font-cormorant)', 'Georgia', 'serif'],
    body:    ['var(--font-nunito)', 'system-ui', 'sans-serif'],
  },

  fontSize: {
    display: ['3.5rem',    { lineHeight: '1.1',  fontWeight: '600' }],
    h1:      ['2.5rem',    { lineHeight: '1.15', fontWeight: '600' }],
    h2:      ['1.875rem',  { lineHeight: '1.2',  fontWeight: '600' }],
    h3:      ['1.4375rem', { lineHeight: '1.3',  fontWeight: '500' }],
    subhead: ['1.1875rem', { lineHeight: '1.5',  fontWeight: '400' }],
    lg:      ['1.125rem',  { lineHeight: '1.65' }],
    base:    ['1rem',      { lineHeight: '1.65' }],
    sm:      ['0.875rem',  { lineHeight: '1.55' }],
    label:   ['0.8125rem', { lineHeight: '1.4',  fontWeight: '600' }],
  },

  borderRadius: {
    DEFAULT: '2px',   // one radius across the whole system
  },

  boxShadow: {
    // Deliberately empty. Elevation = 1px bisque border + ivory fill on vellum.
    none: 'none',
  },

  maxWidth: {
    prose: '45rem',   // 720px — body copy
    table: '71.25rem',// 1140px — appraisal inventory, results feed
  },

  ringColor: {
    DEFAULT: '#A67C52',
  },
} as const

/* Confidence indicator mapping — used by the results feed and the PDF.
   Three levels. Do not add a fourth color. */
export const confidenceColor = {
  high:   { fill: '#8A9A7E', text: '#2E2620' },
  medium: { fill: '#A67C52', text: '#2E2620' },
  low:    { fill: '#A65252', text: '#FAF6F0' },
} as const
