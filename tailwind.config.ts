import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#020617', // Slate 950 profundo
        surface: {
          DEFAULT: '#0f172a',  // Slate 900
          light: '#1e293b',    // Slate 800
          dark: '#020617'
        },
        primary: {
          DEFAULT: '#6366f1',  // Indigo 500
          hover: '#4f46e5',
          light: '#818cf8'
        },
        accent: {
          DEFAULT: '#06b6d4',  // Cyan 500
          hover: '#0891b2'
        },
        border: '#1e293b'
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config
