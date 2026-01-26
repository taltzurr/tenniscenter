/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Brand Colors (from logo)
      colors: {
        brand: {
          'blue-dark': '#1a5a7a',
          'blue': '#0099cc',
          'blue-light': '#33b5e5',
          'yellow': '#ffdd00',
        },
        // Primary palette
        primary: {
          50: '#e6f7fc',
          100: '#cceffa',
          200: '#99dff5',
          300: '#66cff0',
          400: '#33bfeb',
          500: '#0099cc', // Main brand blue
          600: '#007ba8',
          700: '#005c7d',
          800: '#003d53',
          900: '#001f29',
        },
        // Accent (yellow from logo)
        accent: {
          50: '#fff9e6',
          100: '#fff3cc',
          200: '#ffe799',
          300: '#ffdb66',
          400: '#ffcf33',
          500: '#ffdd00', // Main brand yellow
          600: '#ccb100',
          700: '#998500',
          800: '#665800',
          900: '#332c00',
        },
        // Soft semantic colors (Tiimo style - no aggressive reds)
        success: {
          soft: '#f0fdf4',
          DEFAULT: '#4ade80',
          dark: '#166534',
        },
        warning: {
          soft: '#fefce8',
          DEFAULT: '#fbbf24',
          dark: '#854d0e',
        },
        info: {
          soft: '#eff6ff',
          DEFAULT: '#60a5fa',
          dark: '#1e40af',
        },
        neutral: {
          soft: '#f8fafc',
          DEFAULT: '#94a3b8',
          dark: '#475569',
        },
        // Timeline colors (pastel)
        timeline: {
          blue: '#bfdbfe',
          green: '#bbf7d0',
          yellow: '#fef08a',
          purple: '#ddd6fe',
          pink: '#fbcfe8',
          orange: '#fed7aa',
          gray: '#e2e8f0',
        },
      },
      // Typography
      fontFamily: {
        sans: ['Heebo', 'Assistant', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['11px', { lineHeight: '1.5' }],
        'sm': ['13px', { lineHeight: '1.5' }],
        'base': ['15px', { lineHeight: '1.5' }],
        'lg': ['17px', { lineHeight: '1.5' }],
        'xl': ['20px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.3' }],
        '3xl': ['30px', { lineHeight: '1.2' }],
        '4xl': ['36px', { lineHeight: '1.1' }],
      },
      // Border radius (Tiimo style - very rounded)
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
      },
      // Shadows (subtle)
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.02)',
        'sm': '0 2px 4px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.08)',
      },
      // Spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      // Animations
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-in-up': 'fadeInUp 0.25s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'celebrate': 'celebrate 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        celebrate: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
