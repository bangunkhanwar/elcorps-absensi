/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#25a298',
        'primary-dark': '#1d8a80',
        'primary-light': '#3ac2b5',
      }
    },
  },
  plugins: [],
}