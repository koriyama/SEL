/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F0F2F9',
          100: '#DCE1F0',
          200: '#B9C2E1',
          300: '#96A3D2',
          400: '#7384C3',
          500: '#5B6ABF',
          600: '#4A56A6',
          700: '#3A4487',
          800: '#2A3268',
          900: '#1A2049',
        },
        secondary: {
          50: '#FEF6F0',
          100: '#FDE8D9',
          200: '#FBD1B3',
          300: '#F9BA8D',
          400: '#F7A367',
          500: '#F5A97F',
          600: '#E8915C',
          700: '#D97A3E',
          800: '#C0632A',
          900: '#A64D1A',
        },
        warm: {
          50: '#FAF8F5',
          100: '#F5F0EA',
          200: '#EBE3D9',
          300: '#D6C9BB',
          400: '#B8A999',
          500: '#9A8A7A',
          600: '#7D6D5D',
          700: '#605040',
          800: '#433528',
          900: '#261A14',
        },
        accent: {
          50: '#F0F4F9',
          100: '#DCE6F2',
          200: '#B9CCE5',
          300: '#96B2D8',
          400: '#7398CB',
          500: '#5B7EBF',
          600: '#4A66A6',
          700: '#3A4F87',
          800: '#2A3868',
          900: '#1A2149',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.02)',
        medium: '0 4px 20px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)',
        card: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)',
        hover: '0 8px 30px rgba(0,0,0,0.08), 0 12px 48px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
        input: '10px',
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
  plugins: [],
};