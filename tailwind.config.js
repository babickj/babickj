/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        edge: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6fd',
          300: '#a5b8fb',
          400: '#818ef7',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        neon: {
          blue:    '#3b82f6',
          purple:  '#8b5cf6',
          cyan:    '#06b6d4',
          green:   '#10b981',
          pink:    '#ec4899',
          orange:  '#f97316',
        },
        dark: {
          50:  '#f8fafc',
          100: '#1e2030',
          200: '#181a2e',
          300: '#131527',
          400: '#0e1020',
          500: '#090b18',
          600: '#060810',
          700: '#030408',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'radial-gradient(at 40% 20%, hsla(228,100%,74%,0.15) 0, transparent 50%), radial-gradient(at 80% 0%, hsla(262,100%,74%,0.15) 0, transparent 50%), radial-gradient(at 0% 50%, hsla(200,100%,74%,0.1) 0, transparent 50%)',
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan-line': 'scan-line 2s linear infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.6), 0 0 80px rgba(99, 102, 241, 0.2)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'neon-blue': '0 0 20px rgba(59, 130, 246, 0.5)',
        'neon-purple': '0 0 20px rgba(139, 92, 246, 0.5)',
        'neon-cyan': '0 0 20px rgba(6, 182, 212, 0.5)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.37)',
        'glass-lg': '0 20px 60px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
