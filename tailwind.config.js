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
        background: '#F8FAFC',
        foreground: '#0F172A',
        royal: {
          DEFAULT: '#1D4ED8',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
        },
        navy: {
          DEFAULT: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        slate: {
          body: '#475569',
          muted: '#64748B',
          border: '#E2E8F0',
        },
        bullish: {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
          glow: 'rgba(16, 185, 129, 0.12)',
        },
        bearish: {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
          glow: 'rgba(239, 68, 68, 0.12)',
        },
        amber: {
          DEFAULT: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'saas-sm': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'saas-card': '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.04)',
        'saas-btn': '0 4px 12px rgba(29, 78, 216, 0.22)',
      },
      backgroundImage: {
        'ice-radial': 'radial-gradient(circle at 50% 50%, rgba(219, 234, 254, 0.85) 0%, rgba(239, 246, 255, 0.5) 45%, rgba(248, 250, 252, 0) 72%)',
      },
    },
  },
  plugins: [],
};
