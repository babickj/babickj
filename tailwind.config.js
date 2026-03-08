/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // EdgeRunner AI brand — red primary
        edge: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#ef4444',   // bright red
          600: '#dc2626',   // PRIMARY brand red
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        neon: {
          red:    '#ef4444',
          orange: '#f97316',
          cyan:   '#06b6d4',
          green:  '#10b981',
          pink:   '#ec4899',
          blue:   '#3b82f6',
          // keep purple for syntax highlight utility
          purple: '#8b5cf6',
        },
        // Pure black backgrounds
        dark: {
          50:  '#f8fafc',
          100: '#1c1c1c',
          200: '#161616',
          300: '#111111',
          400: '#0c0c0c',
          500: '#080808',   // base background
          600: '#040404',
          700: '#000000',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // Subtle red-tinted mesh for depth
        'mesh-gradient': 'radial-gradient(at 40% 20%, hsla(0,100%,50%,0.06) 0, transparent 50%), radial-gradient(at 80% 0%, hsla(10,90%,40%,0.06) 0, transparent 50%), radial-gradient(at 0% 50%, hsla(0,80%,30%,0.04) 0, transparent 50%)',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(220, 38, 38, 0.6), 0 0 80px rgba(220, 38, 38, 0.2)' },
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
        'neon-red':    '0 0 20px rgba(220, 38, 38, 0.5)',
        'neon-orange': '0 0 20px rgba(249, 115, 22, 0.5)',
        'neon-cyan':   '0 0 20px rgba(6, 182, 212, 0.4)',
        // legacy aliases kept for components that reference these
        'neon-blue':   '0 0 20px rgba(220, 38, 38, 0.5)',
        'neon-purple': '0 0 20px rgba(220, 38, 38, 0.4)',
        'glass':       '0 8px 32px rgba(0, 0, 0, 0.6)',
        'glass-lg':    '0 20px 60px rgba(0, 0, 0, 0.7)',
      }
    },
  },
  plugins: [],
}
