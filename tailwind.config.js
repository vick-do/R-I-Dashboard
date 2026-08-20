/**
 * Design tokens.
 *
 * The token *names* follow the Material-3 vocabulary the Stitch mockups were
 * generated against (`surface`, `on-surface`, `outline-variant`,
 * `surface-container-*`), so a screen generated there can be pasted in with
 * only its layout translated to JSX.
 *
 * Four values from that generated config are deliberately different:
 *
 *  1. `primary` is the MEST teal #0e8fa2, not the #006574 the generator drifted
 *     to. It clears 3:1 on white as both a chart mark and as text (3.84:1).
 *  2. Status lives in its own `status.*` scale. The generated config used a
 *     single `secondary` for the warning banner AND the male series in the
 *     gender chart — a status colour impersonating a series is how a reader
 *     learns to read "orange = problem" and then misreads a chart.
 *  3. Surfaces are neutral greys rather than blue-tinted (#f9f9ff, #dce2f7).
 *     A blue cast under teal marks shifts their apparent hue.
 *  4. `borderRadius.full` is left at Tailwind's 9999px. The generated config
 *     redefined it as 0.75rem, which turned every avatar and count badge from
 *     a circle into a squircle.
 *
 * `series-*` are the validated categorical chart slots — see src/lib/chart.ts.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0e8fa2',
          hover: '#0b7284',
          container: '#e6f4f7',
        },
        'on-primary': '#ffffff',
        'on-primary-container': '#06414c',

        // Neutral surface ladder, lightest to darkest.
        surface: {
          DEFAULT: '#f7f8fa',
          'container-lowest': '#ffffff',
          'container-low': '#fbfbfc',
          container: '#f3f4f6',
          'container-high': '#eceef1',
          variant: '#f3f4f6',
        },
        'on-surface': '#111827',
        'on-surface-variant': '#4b5563',
        'on-surface-muted': '#6b7280',

        outline: '#d1d5db',
        'outline-variant': '#e5e7eb',

        // Reserved for state. Never used as a chart series.
        status: {
          success: '#0ca30c',
          'success-container': '#e7f5e7',
          'on-success-container': '#0b6b0b',
          warning: '#fab219',
          'warning-container': '#fdf6e6',
          'on-warning-container': '#7a4f0a',
          serious: '#ec835a',
          danger: '#d03b3b',
          'danger-container': '#fdeaea',
          'on-danger-container': '#a52c2c',
        },

        series: {
          1: '#0e8fa2',
          2: '#eb6834',
          3: '#4a3aa7',
          4: '#eda100',
          5: '#e87ba4',
          6: '#008300',
          7: '#e34948',
        },
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
      },
      spacing: {
        'page-padding': '24px',
        'card-padding': '20px',
        'card-gap': '16px',
      },
      fontSize: {
        'page-title': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'section-header': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'card-title': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'kpi-value': ['30px', { lineHeight: '36px', fontWeight: '600' }],
        'body-text': ['14px', { lineHeight: '20px' }],
        'secondary-text': ['13px', { lineHeight: '18px' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '500' }],
      },
      boxShadow: {
        // Reserved for things that genuinely float. Cards use a border.
        floating: '0 10px 30px rgba(17, 24, 39, 0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
