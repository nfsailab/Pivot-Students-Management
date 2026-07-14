/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // We can toggle class dark or default dark
  theme: {
    extend: {
      colors: {
        studio: {
          950: '#0b0c10', // Deepest background
          900: '#15171e', // Dark panel background
          800: '#1f222b', // Component background
          700: '#2b2f3a', // Borders / subtle hover
          600: '#3c4250',
          accent: {
            purple: '#8b5cf6', // Studio active color (Violet)
            green: '#10b981',  // Online/active status (Emerald)
            red: '#f43f5e',    // Offline/danger status (Rose)
            yellow: '#eab308',  // Alert/idle status (Amber)
            blue: '#0ea5e9'    // Tech/academic status (Sky)
          }
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        gothic: ['"League Gothic"', '"Gothic A1"', '"Century Gothic"', '"Bank Gothic"', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-glow': '0 8px 32px 0 rgba(139, 92, 246, 0.15)',
        'glow-green': '0 0 12px rgba(16, 185, 129, 0.4)',
        'glow-purple': '0 0 12px rgba(139, 92, 246, 0.4)',
        'glow-red': '0 0 12px rgba(244, 63, 94, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(139, 92, 246, 0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(139, 92, 246, 0.6)' }
        }
      }
    },
  },
  plugins: [],
}
