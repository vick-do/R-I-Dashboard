/**
 * Design tokens.
 *
 * `brand` (#0e8fa2) is a darker step of the MEST teal, chosen so it clears 3:1
 * against white as both a chart mark and as text (3.84:1). The original
 * #22b8c9 measures 2.4:1, so it is kept as `brand-bright` for large decorative
 * fills only and never carries text or data.
 *
 * `series-*` are the validated categorical chart slots — see src/lib/chart.ts.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0e8fa2',
          dark: '#0b7284',
          bright: '#22b8c9',
          tint: '#e6f4f7',
        },
        series: {
          1: '#0e8fa2',
          2: '#eb6834',
          3: '#4a3aa7',
        },
        ink: {
          DEFAULT: '#0b0b0b',
          secondary: '#52514e',
          muted: '#898781',
        },
        grid: '#e1e0d9',
        surface: {
          DEFAULT: '#ffffff',
          sunken: '#f5f7fa',
          raised: '#f8f9fb',
        },
      },
      boxShadow: {
        soft: '0 20px 45px rgba(15, 23, 42, 0.08)',
        card: '0 1px 2px rgba(15, 23, 42, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
