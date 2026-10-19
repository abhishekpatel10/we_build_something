/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tm: {
          blue: '#026cdf',
          dark: '#0a0e17',
          card: '#121826',
          border: '#1f293d',
          accent: '#38bdf8',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          seatAvailable: '#10b981',
          seatReserved: '#f59e0b',
          seatBooked: '#4b5563',
          seatSelected: '#3b82f6',
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.9)' },
        }
      }
    },
  },
  plugins: [],
}
