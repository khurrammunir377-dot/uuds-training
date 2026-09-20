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
        uuds: {
          50: '#f0f6fe',
          100: '#ddecfd',
          200: '#c3defb',
          300: '#99c7f8',
          400: '#67a7f2',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#0f1f38',
          950: '#091322',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      boxShadow: {
        'glow-valid': '0 0 20px -3px rgba(16, 185, 129, 0.45)',
        'glow-warning': '0 0 20px -3px rgba(245, 158, 11, 0.45)',
        'glow-overdue': '0 0 20px -3px rgba(239, 68, 68, 0.5)',
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.5)',
        'card-3d': '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      }
    },
  },
  plugins: [],
}
