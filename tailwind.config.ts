import type { Config } from 'tailwindcss';
import { provenance } from './design/tailwind.tokens';

// The token file is `as const` (readonly); Tailwind's theme types want
// mutable arrays. One cast at the boundary, no values re-entered here.
const tokens = provenance as unknown as NonNullable<NonNullable<Config['theme']>['extend']>;

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Provenance tokens (design/tailwind.tokens.ts). Note: this extends
      // text-sm/base/lg line-heights and the bare `rounded` radius globally.
      ...tokens,
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        ...tokens.fontFamily,
      },
    },
  },
  plugins: [],
};

export default config;
