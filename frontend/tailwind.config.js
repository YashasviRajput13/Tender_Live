/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#F8FAFC',
        card: '#FFFFFF',
        primary: {
          500: '#C9A84C', // Metallic Gold
          600: '#B8973B', // Darker Gold Hover
          400: '#E6C89C', // Lighter Gold Accent
        },
        secondary: {
          500: '#06B6D4', // Cyan
          400: '#22d3ee',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        slate: {
          950: '#030712',
          900: '#111827', // Primary Text
          850: '#182030',
          800: '#1F2937',
          750: '#E5E7EB', // Border Color
          700: '#1e293b', // Dark charcoal/light black
          650: '#334155', // Dark gray/light black
          600: '#334155',
          500: '#111827', // Strong text black
          400: '#334155', // Readable light black
          300: '#E2E8F0', // Border
          200: '#F1F5F9', // Secondary Background
          100: '#FFFFFF', // Primary Background
          50: '#FFFFFF'
        },
        brand: {
          500: '#C9A84C', // Compatibility
          600: '#B8973B',
          400: '#E6C89C',
        }
      },
      fontSize: {
        'xs': ['0.9rem', { lineHeight: '1.35rem' }],   // scaled up for readability
        'sm': ['1.0rem', { lineHeight: '1.5rem' }],     // scaled up for readability
        'base': ['1.15rem', { lineHeight: '1.75rem' }], // scaled up for readability
        'lg': ['1.3rem', { lineHeight: '1.85rem' }],    // scaled up for readability
        'xl': ['1.45rem', { lineHeight: '2.1rem' }],    // scaled up for readability
        '2xl': ['1.7rem', { lineHeight: '2.3rem' }],    // scaled up for readability
        '3xl': ['2.15rem', { lineHeight: '2.6rem' }],   // scaled up for readability
        '4xl': ['2.65rem', { lineHeight: '1.1' }],      // scaled up for readability
      },
      fontFamily: {
        sans: ['"General Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['"Clash Display"', '"General Sans"', 'Manrope', 'Inter', 'sans-serif'],
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'premium': '0 8px 30px rgba(0, 0, 0, 0.05)',
        'premium-glow': '0 0 30px rgba(249, 115, 22, 0.15)',
        'cyan-glow': '0 0 30px rgba(6, 182, 212, 0.15)',
      }
    },
  },
  plugins: [],
}
