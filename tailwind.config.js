/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic color tokens that adapt to theme
        background: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          glass: 'var(--bg-glass)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          success: 'var(--accent-success)',
          warning: 'var(--accent-warning)',
          error: 'var(--accent-error)',
          info: 'var(--accent-info)',
        },
        border: {
          primary: 'var(--border-primary)',
          glass: 'var(--border-glass)',
          accent: 'var(--border-accent)',
        },
        shadow: {
          primary: 'var(--shadow-primary)',
          glass: 'var(--shadow-glass)',
          elevated: 'var(--shadow-elevated)',
        },
        glow: {
          ambient: 'var(--ambient-glow)',
          strong: 'var(--ambient-glow-strong)',
        },
        
        // Direct color values for specific use cases (Executive Lounge palette)
        // Dark mode colors
        'peat-charcoal': '#1C1917',
        'deep-leather': '#2A1D15',
        'single-malt': '#E6A65D',
        'aged-oak': '#5C3A21',
        'growth-emerald': '#4E7A58',
        
        // Light mode colors
        'warm-alabaster': '#F5F5F4',
        'latte-leather': '#E7E5E4',
        'burnt-copper': '#B45309',
        'ink-grey': '#1C1917',
        'pure-white': '#FFFFFF',
        
        // Additional Executive Lounge colors
        'rich-mahogany': '#3A2F23',
        'soft-cream': '#F0EFEE',
        'darker-copper': '#92400E',
        'warm-bronze': '#8B7355',
        'warm-brown': '#8B5A2B',
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
      backgroundImage: {
        'ambient-glow-dark': 'radial-gradient(circle at 80% 20%, rgba(230, 166, 93, 0.15) 0%, transparent 50%)',
        'ambient-glow-light': 'radial-gradient(circle at 80% 20%, rgba(180, 83, 9, 0.08) 0%, transparent 50%)',
      },
    },
  },
  plugins: [],
}