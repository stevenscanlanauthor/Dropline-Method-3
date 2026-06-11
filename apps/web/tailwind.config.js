/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#102a43',
        teal: '#1ca7a8',
        mist: '#f6f9fb',
      },
    },
  },
  plugins: [],
};
