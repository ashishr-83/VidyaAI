import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0a0f1e', dark: '#0D1B3E' },
        orange: { DEFAULT: '#FF6B00', light: '#FF9800' },
        green: { DEFAULT: '#1B8A4E' },
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
