/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary: sage green (soft, earthy)
        primary: {
          50: '#f2f6f0',
          100: '#e3ece0',
          200: '#c8d9c0',
          300: '#a8bf9a',
          400: '#8ba87a',
          500: '#6b8a7a',    // main
          600: '#5a7a68',
          700: '#4a6b5a',
          800: '#3a5a4a',
          900: '#2a4a3a',
        },
        // Secondary: warm terracotta
        secondary: {
          50: '#faf5f2',
          100: '#f3ece6',
          200: '#e8d8d0',
          300: '#d8c0b8',
          400: '#c4a898',
          500: '#a67c6e',    // main
          600: '#8a6a5a',
          700: '#6e5248',
          800: '#523a32',
          900: '#36261e',
        },
        // Warm neutrals (creamy beige, no yellow)
        warm: {
          50: '#faf8f5',
          100: '#f5f2ed',
          200: '#ebe6de',
          300: '#d8d2c8',
          400: '#b8b0a4',
          500: '#9a9082',
          600: '#7d7266',
          700: '#60564a',
          800: '#433a30',
          900: '#261e16',
        },
        // Accent: muted olive/gold
        accent: {
          50: '#f4f6f0',
          100: '#e8ece0',
          200: '#d0d8c0',
          300: '#b8c4a0',
          400: '#a0b080',
          500: '#8a9a6a',
          600: '#6e8050',
          700: '#52663a',
          800: '#3a4a26',
          900: '#222e16',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        // These match the professional, subtle card shadows we used
        soft: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        medium: '0 4px 16px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)',
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        hover: '0 8px 30px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.02)',
      },
      borderRadius: {
        card: '1.25rem',     // 20px
        btn: '2rem',         // 32px (pill‑shaped)
        input: '1.5rem',     // 24px
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],   // ✅ Line-clamp removed – it's built into Tailwind v3.3+
}