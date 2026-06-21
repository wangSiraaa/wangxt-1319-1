/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bus-primary': '#2563eb',
        'bus-warn': '#f59e0b',
        'bus-danger': '#dc2626',
        'bus-success': '#16a34a',
        'bus-info': '#0ea5e9',
      },
    },
  },
  plugins: [],
};
