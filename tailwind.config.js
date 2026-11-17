/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0B0B',
        foreground: '#F5EBE6',
        chocolate: {
          900: '#150C07',
          800: '#1E120C',
          700: '#2A1810',
          600: '#3D2314',
          500: '#5A341E',
        },
        gold: {
          DEFAULT: '#D4A373',
          50: '#FAF5EE',
          100: '#F3E7D7',
          200: '#E8CEA9',
          300: '#DCB57E',
          400: '#D4A373',
          500: '#C28952',
          600: '#A46B34',
          700: '#7E4E24',
        },
        tan: {
          DEFAULT: '#A8968D',
          muted: '#8C7A71',
          light: '#C4B7B0',
        },
        bullish: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
          glow: 'rgba(16, 185, 129, 0.15)',
        },
        bearish: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
          glow: 'rgba(239, 68, 68, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'gold-glow': '0 0 25px -5px rgba(212, 163, 115, 0.25)',
        'bullish-glow': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'bearish-glow': '0 0 25px -5px rgba(239, 68, 68, 0.3)',
        'card-lux': '0 8px 32px 0 rgba(0, 0, 0, 0.6)',
      },
      borderColor: {
        'gold-subtle': 'rgba(212, 163, 115, 0.25)',
        'gold-strong': 'rgba(212, 163, 115, 0.4)',
      },
      backgroundImage: {
        'chocolate-gradient': 'linear-gradient(135deg, #2A1810 0%, #1E120C 100%)',
        'btn-bronze': 'linear-gradient(135deg, #3D2314 0%, #5A341E 100%)',
        'btn-bronze-hover': 'linear-gradient(135deg, #4A2B19 0%, #6E4025 100%)',
        'gold-shimmer': 'linear-gradient(90deg, transparent, rgba(212, 163, 115, 0.15), transparent)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        pulseGlow: 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
