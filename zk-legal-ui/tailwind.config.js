/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'zk-primary': '#7C3AED',
        'zk-secondary': '#10B981',
        'zcash-orange': '#F4B728',
      },
    },
  },
  plugins: [],
}
