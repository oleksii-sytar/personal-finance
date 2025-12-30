/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark Mode - Night Cockpit
        'peat-charcoal': '#1C1917',
        'deep-leather': '#2A1D15',
        'single-malt': '#E6A65D',
        'aged-oak': '#5C3A21',
        'growth-emerald': '#4E7A58',
        
        // Light Mode - Day Studio
        'warm-alabaster': '#F5F5F4',
        'latte-leather': '#E7E5E4',
        'burnt-copper': '#B45309',
        'ink-grey': '#1C1917',
        'pure-white': '#FFFFFF',
      },
      fontFamily: {
        'space-grotesk': ['var(--font-space-grotesk)', 'sans-serif'],
        'inter': ['var(--font-inter)', 'sans-serif'],
      },
      backdropBlur: {
        'glass': '16px',
      },
      borderRadius: {
        'glass': '20px',
        'pill': '999px',
      },
      letterSpacing: {
        'tight-executive': '-0.02em',
      },
    },
  },
  plugins: [],
}