/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Obsidian palette for premium dashboarding
        slate: {
          900: '#0B0F19',
          800: '#111827',
          700: '#1F2937',
          650: '#2A3441',
          600: '#374151',
          500: '#6B7280',
          400: '#9CA3AF',
          300: '#D1D5DB',
          200: '#E5E7EB',
          100: '#F3F4F6',
          50: '#F9FAFB'
        },
        brand: {
          500: '#10B981', // Emerald
          600: '#059669',
          400: '#34D399',
        }
      }
    },
  },
  plugins: [],
}
