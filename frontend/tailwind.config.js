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
          500: '#F97316', // Orange
          600: '#EA580C', // Orange Hover
          400: '#FDBA74', // Light Orange
        },
        secondary: {
          500: '#06B6D4', // Cyan
          400: '#22d3ee',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        slate: {
          900: '#111827', // Primary Text
          800: '#1F2937',
          750: '#E5E7EB', // Border Color
          700: '#4B5563', // Secondary Text
          650: '#6B7280',
          600: '#9CA3AF',
          500: '#D1D5DB',
          400: '#E5E7EB', // Border
          300: '#F3F4F6',
          200: '#F8FAFC', // Secondary Background
          100: '#FFFFFF', // Primary Background
          50: '#FFFFFF'
        },
        brand: {
          500: '#F97316', // Compatibility
          600: '#EA580C',
          400: '#FDBA74',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Manrope', 'Inter', 'sans-serif'],
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
